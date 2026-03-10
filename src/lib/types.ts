// ─── Input Types ──────────────────────────────────────────────
export interface DomainInput {
  base_names: string[];
  prefixes: string[];
  suffixes: string[];
  tlds: string[];
}

// ─── Generated Domain Types ───────────────────────────────────
export interface GeneratedLabel {
  label: string;
  baseName: string;
  prefixUsed: string | null;
  suffixUsed: string | null;
}

export interface GeneratedDomain {
  domain: string;
  label: string;
  baseName: string;
  prefixUsed: string | null;
  suffixUsed: string | null;
  tld: string;
}

// ─── Check Mode ───────────────────────────────────────────────
export type CheckMode = "rdap" | "namecheap-rdap";

// ─── Result Types ─────────────────────────────────────────────
export type DomainStatus = "available" | "registered" | "unknown";
export type SourceUsed = "rdap" | "namecheap" | "hybrid";

export interface DomainResult {
  domain: string;
  label: string;
  baseName: string;
  prefixUsed: string | null;
  suffixUsed: string | null;
  tld: string;
  status: DomainStatus;
  premiumRegistration: boolean;
  premiumRegistrationPrice: number | null;
  standardRegistrationPrice: number | null;
  currency: string | null;
  aftermarketResalePrice: number | null;
  aftermarketSource: string | null;
  sourceUsed: SourceUsed;
  notes: string | null;
}

// ─── Batch Processing ─────────────────────────────────────────
export interface CheckOptions {
  mode: CheckMode;
  batchSize: number;
  concurrency: number;
  delayMs: number;
  tryAftermarket: boolean;
}

export interface BatchProgress {
  total: number;
  completed: number;
  remaining: number;
  successful: number;
  failed: number;
  retries: number;
  currentBatch: number;
  totalBatches: number;
  mode: CheckMode;
}

// ─── Stream Events ────────────────────────────────────────────
export type StreamEvent =
  | { type: "progress"; data: BatchProgress }
  | { type: "results"; data: DomainResult[] }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data: { totalProcessed: number } };

// ─── Config ───────────────────────────────────────────────────
export interface AppConfig {
  namecheapConfigured: boolean;
}

// ─── Namecheap Credentials (runtime, from UI) ─────────────────
export interface NamecheapCredentials {
  apiUser: string;
  apiKey: string;
  username: string;
  clientIp: string;
}

// ─── Saved Analysis (persistence) ─────────────────────────────
export interface SavedAnalysis {
  id: string;
  timestamp: number;
  input: DomainInput;
  mode: CheckMode;
  results: DomainResult[];
  totalChecked: number;
  available: number;
  registered: number;
  unknown: number;
}
