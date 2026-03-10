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
 * Does not provide premium pricing or aftermarket data.
 */
export class RdapProvider implements DomainProvider {
  name = "rdap";

  async checkDomains(
    domains: GeneratedDomain[],
    signal?: AbortSignal
  ): Promise<DomainResult[]> {
    const results: DomainResult[] = [];

    for (const domain of domains) {
      if (signal?.aborted) break;

      try {
        const result = await this.checkSingle(domain, signal);
        results.push(result);
      } catch (err) {
        // Partial failure: still return results for other domains
        results.push(this.makeResult(domain, "unknown", `Error: ${err instanceof Error ? err.message : "Unknown error"}`));
      }
    }

    return results;
  }

  private async checkSingle(
    domain: GeneratedDomain,
    signal?: AbortSignal
  ): Promise<DomainResult> {
    const url = `${RDAP_BASE_URL}/${domain.domain}`;

    try {
      const response = await fetch(url, {
        signal,
        headers: {
          Accept: "application/rdap+json",
        },
      });

      let status: DomainStatus;
      let notes: string;

      if (response.status === 200) {
        status = "registered";
        notes = "Domain is registered (RDAP lookup). RDAP mode does not provide premium or aftermarket pricing.";
      } else if (response.status === 404) {
        status = "available";
        notes = "Domain appears available (RDAP lookup). RDAP mode does not provide premium or aftermarket pricing.";
      } else if (response.status === 429) {
        // Rate limited — surface as unknown with note
        notes = "Rate limited by RDAP server. RDAP mode does not provide premium or aftermarket pricing.";
        status = "unknown";
      } else {
        status = "unknown";
        notes = `RDAP returned HTTP ${response.status}. RDAP mode does not provide premium or aftermarket pricing.`;
      }

      return this.makeResult(domain, status, notes);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw err;
      }
      return this.makeResult(
        domain,
        "unknown",
        `RDAP lookup failed: ${err instanceof Error ? err.message : "Unknown error"}. RDAP mode does not provide premium or aftermarket pricing.`
      );
    }
  }

  private makeResult(
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
}
