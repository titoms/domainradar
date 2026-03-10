import type {
  DomainResult,
  GeneratedDomain,
  CheckOptions,
  BatchProgress,
  NamecheapCredentials,
} from "./types";
import type { DomainProvider } from "./providers/provider";
import { RdapProvider } from "./providers/rdap-provider";
import { NamecheapProvider } from "./providers/namecheap-provider";

/**
 * Splits an array into chunks.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Delay helper.
 */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

/**
 * Exponential backoff with jitter.
 */
function backoffDelay(attempt: number, baseMs: number = 1000): number {
  const exp = Math.min(baseMs * Math.pow(2, attempt), 30000);
  const jitter = Math.random() * exp * 0.5;
  return exp + jitter;
}

interface BatchProcessorCallbacks {
  onProgress: (progress: BatchProgress) => void;
  onResults: (results: DomainResult[]) => void;
  onError: (error: string) => void;
}

/**
 * Process domains in controlled batches with progressive result emission.
 */
export async function processBatches(
  domains: GeneratedDomain[],
  options: CheckOptions,
  callbacks: BatchProcessorCallbacks,
  signal?: AbortSignal,
  credentials?: NamecheapCredentials
): Promise<void> {
  const batches = chunk(domains, options.batchSize);
  const totalBatches = batches.length;

  let completed = 0;
  let successful = 0;
  let failed = 0;
  let retries = 0;

  // Initialize providers
  const rdapProvider = new RdapProvider();
  let namecheapProvider: NamecheapProvider | null = null;

  if (options.mode === "namecheap-rdap") {
    namecheapProvider = new NamecheapProvider(credentials);
    if (!namecheapProvider.isConfigured()) {
      callbacks.onError(
        "Namecheap API credentials are not configured. Falling back to RDAP-only mode."
      );
      namecheapProvider = null;
    }
  }

  const provider: DomainProvider =
    namecheapProvider || rdapProvider;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    if (signal?.aborted) break;

    const batch = batches[batchIndex];

    // Emit progress before starting batch
    const progress: BatchProgress = {
      total: domains.length,
      completed,
      remaining: domains.length - completed,
      successful,
      failed,
      retries,
      currentBatch: batchIndex + 1,
      totalBatches,
      mode: options.mode,
    };
    callbacks.onProgress(progress);

    // Process batch with retry logic
    let batchResults: DomainResult[] = [];
    let attempt = 0;
    const maxRetries = 3;

    while (attempt <= maxRetries) {
      try {
        if (signal?.aborted) break;

        // Process domains with concurrency limit within the batch
        const concurrencyChunks = chunk(batch, options.concurrency);
        const allResults: DomainResult[] = [];

        for (const concChunk of concurrencyChunks) {
          if (signal?.aborted) break;

          const results = await provider.checkDomains(concChunk, signal);

          // If using Namecheap and some results are unknown, fall back to RDAP
          if (namecheapProvider && options.mode === "namecheap-rdap") {
            const unknowns = results.filter(
              (r) =>
                r.status === "unknown" &&
                r.notes?.includes("fallback")
            );
            if (unknowns.length > 0) {
              const unknownDomains = unknowns.map((r) => {
                const gen = concChunk.find((d) => d.domain === r.domain);
                return gen!;
              }).filter(Boolean);

              const rdapResults = await rdapProvider.checkDomains(
                unknownDomains,
                signal
              );

              // Merge: keep Namecheap pricing data, use RDAP status
              for (const rdapResult of rdapResults) {
                const idx = results.findIndex(
                  (r) => r.domain === rdapResult.domain
                );
                if (idx >= 0) {
                  results[idx] = {
                    ...rdapResult,
                    sourceUsed: "hybrid",
                    notes: "Availability from RDAP fallback. Namecheap was primary but did not return a useful result.",
                  };
                }
              }
            }
          }

          allResults.push(...results);
        }

        batchResults = allResults;
        break; // Success
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") break;

        attempt++;
        retries++;

        if (attempt > maxRetries) {
          callbacks.onError(
            `Batch ${batchIndex + 1} failed after ${maxRetries} retries: ${err instanceof Error ? err.message : "Unknown error"}`
          );
          // Mark all in batch as unknown
          batchResults = batch.map((d) => ({
            domain: d.domain,
            label: d.label,
            baseName: d.baseName,
            prefixUsed: d.prefixUsed,
            suffixUsed: d.suffixUsed,
            tld: d.tld,
            status: "unknown" as const,
            premiumRegistration: false,
            premiumRegistrationPrice: null,
            standardRegistrationPrice: null,
            currency: null,
            aftermarketResalePrice: null,
            aftermarketSource: null,
            sourceUsed: provider.name as "rdap" | "namecheap",
            notes: `Failed after ${maxRetries} retries.`,
          }));
          break;
        }

        // Backoff
        const backoff = backoffDelay(attempt);
        callbacks.onError(
          `Batch ${batchIndex + 1} failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(backoff / 1000)}s...`
        );
        await delay(backoff, signal);
      }
    }

    // Count results
    for (const r of batchResults) {
      completed++;
      if (r.status !== "unknown") {
        successful++;
      } else {
        failed++;
      }
    }

    // Emit results
    if (batchResults.length > 0) {
      callbacks.onResults(batchResults);
    }

    // Delay between batches (skip after last batch)
    if (batchIndex < batches.length - 1 && options.delayMs > 0) {
      try {
        await delay(options.delayMs, signal);
      } catch {
        break; // Aborted
      }
    }
  }

  // Final progress update
  callbacks.onProgress({
    total: domains.length,
    completed,
    remaining: domains.length - completed,
    successful,
    failed,
    retries,
    currentBatch: totalBatches,
    totalBatches,
    mode: options.mode,
  });
}
