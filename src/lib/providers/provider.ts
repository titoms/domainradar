import type { DomainResult, GeneratedDomain } from "../types";

/**
 * Interface for domain availability checking providers.
 */
export interface DomainProvider {
  name: string;

  /**
   * Check availability of a list of domains.
   * Returns results for each domain (may be partial on failure).
   */
  checkDomains(
    domains: GeneratedDomain[],
    signal?: AbortSignal
  ): Promise<DomainResult[]>;
}

/**
 * Interface for aftermarket price lookup providers (extension point).
 */
export interface AftermarketProvider {
  name: string;

  /**
   * Look up aftermarket resale price for a domain.
   * Returns null if not available or not supported.
   */
  lookupPrice(
    domain: string,
    signal?: AbortSignal
  ): Promise<{
    price: number | null;
    source: string | null;
  }>;
}
