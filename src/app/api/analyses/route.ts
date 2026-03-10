import { NextRequest, NextResponse } from "next/server";
import { listAnalyses, saveAnalysis, clearAllAnalyses } from "@/lib/database";

export async function GET() {
  try {
    const analyses = listAnalyses();
    return NextResponse.json(analyses);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load analyses", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, mode, results } = body;

    if (!input || !mode || !results) {
      return NextResponse.json(
        { error: "Missing required fields: input, mode, results" },
        { status: 400 }
      );
    }

    const analysis = saveAnalysis(input, mode, results);
    return NextResponse.json(analysis, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save analysis", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    clearAllAnalyses();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to clear analyses", message: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
