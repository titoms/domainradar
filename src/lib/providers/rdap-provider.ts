import type { DomainProvider } from "./provider";
import type { DomainResult, GeneratedDomain, DomainStatus } from "../types";

const RDAP_BASE_URL = "https://rdap.org/domain";

/**
 * RDAP-based domain availability provider.
 *
 * Uses the public RDAP bootstrap service.
 * - HTTP 200 → registered
 * - HTTP 404 → available
 * - Other → unknown
 *
 * Checks all domains concurrently with Promise.allSettled for maximum throughput.
 */
export class RdapProvider implements DomainProvider {
  name = "rdap";

  async checkDomains(
    domains: GeneratedDomain[],
    signal?: AbortSignal
  ): Promise<DomainResult[]> {
    // Fire all lookups concurrently — allSettled never rejects
    const settled = await Promise.allSettled(
      domains.map((domain) =>
        signal?.aborted
          ? Promise.reject(new DOMException("Aborted", "AbortError"))
          : this.checkSingle(domain, signal)
      )
    );

    return settled.map((outcome, i) =>
      outcome.status === "fulfilled"
        ? outcome.value
        : makeResult(domains[i], "unknown", `Error: ${outcome.reason?.message ?? "Unknown error"}`)
    );
  }

  private async checkSingle(
    domain: GeneratedDomain,
    signal?: AbortSignal
  ): Promise<DomainResult> {
    const url = `${RDAP_BASE_URL}/${domain.domain}`;

    const response = await fetch(url, {
      signal,
      headers: { Accept: "application/rdap+json" },
    }).catch((err: Error) => {
      if (err.name === "AbortError") throw err;
      return null;
    });

    if (!response) {
      return makeResult(domain, "unknown", "RDAP lookup failed: network error.");
    }

    if (response.status === 200) {
      return makeResult(domain, "registered", "Domain is registered (RDAP lookup).");
    }
    if (response.status === 404) {
      return makeResult(domain, "available", "Domain appears available (RDAP lookup).");
    }
    if (response.status === 429) {
      return makeResult(domain, "unknown", "Rate limited by RDAP server.");
    }
    return makeResult(domain, "unknown", `RDAP returned HTTP ${response.status}.`);
  }
}

/** Build a DomainResult from a GeneratedDomain + status. */
function makeResult(
  domain: GeneratedDomain,
  status: DomainStatus,
  notes: string
): DomainResult {
  return {
    domain: domain.domain,
    label: domain.label,
    baseName: domain.baseName,
    prefixUsed: domain.prefixUsed,
    suffixUsed: domain.suffixUsed,
    tld: domain.tld,
    status,
    premiumRegistration: false,
    premiumRegistrationPrice: null,
    standardRegistrationPrice: null,
    currency: null,
    aftermarketResalePrice: null,
    aftermarketSource: null,
    sourceUsed: "rdap",
    notes,
  };
}
