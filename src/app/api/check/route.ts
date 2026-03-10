import { NextRequest, NextResponse } from "next/server";
import { checkRequestSchema } from "@/lib/schemas";
import { generateAllDomains } from "@/lib/domain-generator";
import { processBatches } from "@/lib/batch-processor";
import type { StreamEvent } from "@/lib/types";

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { input, options, credentials, retryDomains } = parsed.data;

    // Use retryDomains if provided, otherwise generate all combinations
    const domains = retryDomains && retryDomains.length > 0
      ? retryDomains.map((d) => ({
          domain: d.domain,
          label: d.label,
          baseName: d.baseName,
          prefixUsed: d.prefixUsed,
          suffixUsed: d.suffixUsed,
          tld: d.tld,
        }))
      : generateAllDomains(input);

    if (domains.length === 0) {
      return NextResponse.json(
        { error: "No domain combinations generated from the provided input." },
        { status: 400 }
      );
    }

    // Set up streaming response (NDJSON)
    const encoder = new TextEncoder();
    const abortController = new AbortController();

    const stream = new ReadableStream({
      async start(controller) {
        function emit(event: StreamEvent) {
          try {
            controller.enqueue(
              encoder.encode(JSON.stringify(event) + "\n")
            );
          } catch {
            // Stream may be closed
          }
        }

        try {
          await processBatches(
            domains,
            options,
            {
              onProgress: (progress) => emit({ type: "progress", data: progress }),
              onResults: (results) => emit({ type: "results", data: results }),
              onError: (message) => emit({ type: "error", data: { message } }),
            },
            abortController.signal,
            credentials
          );

          emit({
            type: "done",
            data: { totalProcessed: domains.length },
          });
        } catch (err) {
          if (err instanceof Error && err.name !== "AbortError") {
            emit({
              type: "error",
              data: { message: err.message },
            });
          }
        } finally {
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Server error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
