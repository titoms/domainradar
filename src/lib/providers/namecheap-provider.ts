import { XMLParser } from "fast-xml-parser";
import type { DomainProvider } from "./provider";
import type { DomainResult, GeneratedDomain, DomainStatus, NamecheapCredentials } from "../types";

const NAMECHEAP_API_URL = "https://api.namecheap.com/xml.response";

interface NamecheapConfig {
  apiUser: string;
  apiKey: string;
  username: string;
  clientIp: string;
}

interface NamecheapDomainCheckResult {
  Domain: string;
  Available: boolean | string;
  IsPremiumName?: boolean | string;
  PremiumRegistrationPrice?: number | string;
  PremiumRenewalPrice?: number | string;
  IcannFee?: number | string;
  EapFee?: number | string;
}

/**
 * Namecheap-based domain availability provider.
 *
 * Uses the Namecheap API:
 * - `domains.check` for availability + premium info
 * - `users.getPricing` for standard TLD pricing
 *
 * Accepts credentials either from env vars or runtime (UI-provided).
 */
export class NamecheapProvider implements DomainProvider {
  name = "namecheap";
  private config: NamecheapConfig;
  private parser: XMLParser;
  private tldPricingCache: Map<string, number | null> = new Map();

  constructor(credentials?: NamecheapCredentials) {
    // Runtime credentials take priority over env vars
    this.config = {
      apiUser: credentials?.apiUser || process.env.NAMECHEAP_API_USER || "",
      apiKey: credentials?.apiKey || process.env.NAMECHEAP_API_KEY || "",
      username: credentials?.username || process.env.NAMECHEAP_USERNAME || "",
      clientIp: credentials?.clientIp || process.env.NAMECHEAP_CLIENT_IP || "",
    };
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    });
  }

  isConfigured(): boolean {
    return !!(
      this.config.apiUser &&
      this.config.apiKey &&
      this.config.username &&
      this.config.clientIp
    );
  }

  async checkDomains(
    domains: GeneratedDomain[],
    signal?: AbortSignal
  ): Promise<DomainResult[]> {
    if (!this.isConfigured()) {
      throw new Error(
        "Namecheap API credentials are not configured. Set NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_USERNAME, and NAMECHEAP_CLIENT_IP environment variables."
      );
    }

    // Namecheap supports checking multiple domains at once (up to ~50)
    const domainNames = domains.map((d) => d.domain).join(",");
    const domainMap = new Map(domains.map((d) => [d.domain.toLowerCase(), d]));

    try {
      const checkResults = await this.domainsCheck(domainNames, signal);

      // Get unique TLDs for pricing lookup
      const uniqueTlds = [...new Set(domains.map((d) => d.tld))];
      await this.prefetchTldPricing(uniqueTlds, signal);

      const results: DomainResult[] = [];

      for (const checkResult of checkResults) {
        const domainName = checkResult.Domain?.toLowerCase();
        const generated = domainMap.get(domainName);

        if (!generated) continue;

        const isAvailable = this.parseBoolean(checkResult.Available);
        const isPremium = this.parseBoolean(checkResult.IsPremiumName);
        const premiumPrice = this.parseNumber(checkResult.PremiumRegistrationPrice);
        const standardPrice = this.tldPricingCache.get(generated.tld) ?? null;

        const status: DomainStatus = isAvailable ? "available" : "registered";

        results.push({
          domain: generated.domain,
          label: generated.label,
          baseName: generated.baseName,
          prefixUsed: generated.prefixUsed,
          suffixUsed: generated.suffixUsed,
          tld: generated.tld,
          status,
          premiumRegistration: isPremium,
          premiumRegistrationPrice: isPremium ? premiumPrice : null,
          standardRegistrationPrice: standardPrice,
          currency: standardPrice != null || premiumPrice != null ? "USD" : null,
          aftermarketResalePrice: null,
          aftermarketSource: null,
          sourceUsed: "namecheap",
          notes: isPremium
            ? `Premium domain via Namecheap.`
            : null,
        });
      }

      // Mark any domains not returned by the API
      for (const domain of domains) {
        if (!results.some((r) => r.domain === domain.domain)) {
          results.push({
            domain: domain.domain,
            label: domain.label,
            baseName: domain.baseName,
            prefixUsed: domain.prefixUsed,
            suffixUsed: domain.suffixUsed,
            tld: domain.tld,
            status: "unknown",
            premiumRegistration: false,
            premiumRegistrationPrice: null,
            standardRegistrationPrice: null,
            currency: null,
            aftermarketResalePrice: null,
            aftermarketSource: null,
            sourceUsed: "namecheap",
            notes: "Namecheap did not return result for this domain; requires RDAP fallback.",
          });
        }
      }

      return results;
    } catch (err) {
      // On total failure, return all as unknown so RDAP can fallback
      return domains.map((domain) => ({
        domain: domain.domain,
        label: domain.label,
        baseName: domain.baseName,
        prefixUsed: domain.prefixUsed,
        suffixUsed: domain.suffixUsed,
        tld: domain.tld,
        status: "unknown" as DomainStatus,
        premiumRegistration: false,
        premiumRegistrationPrice: null,
        standardRegistrationPrice: null,
        currency: null,
        aftermarketResalePrice: null,
        aftermarketSource: null,
        sourceUsed: "namecheap",
        notes: `Namecheap API error: ${err instanceof Error ? err.message : "Unknown error"}. Requires RDAP fallback.`,
      }));
    }
  }

  private async domainsCheck(
    domainList: string,
    signal?: AbortSignal
  ): Promise<NamecheapDomainCheckResult[]> {
    const params = new URLSearchParams({
      ApiUser: this.config.apiUser,
      ApiKey: this.config.apiKey,
      UserName: this.config.username,
      ClientIp: this.config.clientIp,
      Command: "namecheap.domains.check",
      DomainList: domainList,
    });

    const response = await fetch(`${NAMECHEAP_API_URL}?${params}`, { signal });

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      throw new Error(
        `Namecheap rate limited (429).${retryAfter ? ` Retry after ${retryAfter}s.` : ""}`
      );
    }

    if (!response.ok) {
      throw new Error(`Namecheap API returned HTTP ${response.status}`);
    }

    const xml = await response.text();
    const parsed = this.parser.parse(xml);

    const apiResponse = parsed?.ApiResponse;
    if (!apiResponse || apiResponse.Status === "ERROR") {
      const errors = apiResponse?.Errors?.Error;
      const errorMsg = Array.isArray(errors)
        ? errors.map((e: { "#text"?: string }) => e["#text"] || String(e)).join("; ")
        : errors?.["#text"] || String(errors) || "Unknown API error";
      throw new Error(`Namecheap API error: ${errorMsg}`);
    }

    const results =
      apiResponse?.CommandResponse?.DomainCheckResult;
    if (!results) return [];

    // Normalize to array
    return Array.isArray(results) ? results : [results];
  }

  private async prefetchTldPricing(
    tlds: string[],
    signal?: AbortSignal
  ): Promise<void> {
    const uncached = tlds.filter((tld) => !this.tldPricingCache.has(tld));
    if (uncached.length === 0) return;

    // Fetch all uncached TLD prices concurrently
    const results = await Promise.allSettled(
      uncached.map((tld) => this.getTldPrice(tld, signal))
    );

    for (let i = 0; i < uncached.length; i++) {
      const result = results[i];
      this.tldPricingCache.set(
        uncached[i],
        result.status === "fulfilled" ? result.value : null
      );
    }
  }

  private async getTldPrice(
    tld: string,
    signal?: AbortSignal
  ): Promise<number | null> {
    const params = new URLSearchParams({
      ApiUser: this.config.apiUser,
      ApiKey: this.config.apiKey,
      UserName: this.config.username,
      ClientIp: this.config.clientIp,
      Command: "namecheap.users.getPricing",
      ProductType: "DOMAIN",
      ProductCategory: "REGISTER",
      ProductName: tld,
    });

    const response = await fetch(`${NAMECHEAP_API_URL}?${params}`, { signal });
    if (!response.ok) return null;

    const xml = await response.text();
    const parsed = this.parser.parse(xml);

    const apiResponse = parsed?.ApiResponse;
    if (!apiResponse || apiResponse.Status === "ERROR") return null;

    // Navigate the nested pricing structure
    const productType =
      apiResponse?.CommandResponse?.UserGetPricingResult?.ProductType;
    if (!productType) return null;

    const categories = Array.isArray(productType.ProductCategory)
      ? productType.ProductCategory
      : [productType.ProductCategory];

    const registerCat = categories.find(
      (c: { Name?: string }) => c?.Name === "register"
    );
    if (!registerCat) return null;

    const products = Array.isArray(registerCat.Product)
      ? registerCat.Product
      : [registerCat.Product];

    const product = products.find(
      (p: { Name?: string }) =>
        p?.Name?.toLowerCase() === tld.toLowerCase()
    );
    if (!product) return null;

    const prices = Array.isArray(product.Price)
      ? product.Price
      : [product.Price];

    // First year registration price
    const yearOne = prices.find(
      (p: { Duration?: string | number }) => String(p?.Duration) === "1"
    );

    return yearOne?.Price != null ? parseFloat(String(yearOne.Price)) : null;
  }

  private parseBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value.toLowerCase() === "true";
    return false;
  }

  private parseNumber(value: unknown): number | null {
    if (value == null) return null;
    const num = parseFloat(String(value));
    return isNaN(num) ? null : num;
  }
}
