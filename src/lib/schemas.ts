import { z } from "zod";

export const domainInputSchema = z.object({
  base_names: z
    .array(z.string().min(1, "Base name cannot be empty"))
    .min(1, "At least one base name is required"),
  prefixes: z.array(z.string()).default([]),
  suffixes: z.array(z.string()).default([]),
  tlds: z
    .array(z.string().min(1, "TLD cannot be empty"))
    .min(1, "At least one TLD is required"),
});

export const namecheapCredentialsSchema = z.object({
  apiUser: z.string().min(1),
  apiKey: z.string().min(1),
  username: z.string().min(1),
  clientIp: z.string().min(1),
});

export const checkOptionsSchema = z.object({
  mode: z.enum(["rdap", "namecheap-rdap"]).default("rdap"),
  batchSize: z.number().int().min(1).max(50).default(5),
  concurrency: z.number().int().min(1).max(10).default(2),
  delayMs: z.number().int().min(0).max(30000).default(1500),
  tryAftermarket: z.boolean().default(false),
});

export const checkRequestSchema = z.object({
  input: domainInputSchema,
  options: checkOptionsSchema,
  credentials: namecheapCredentialsSchema.optional(),
  // Optional: specific domains to retry (overrides generation)
  retryDomains: z.array(z.object({
    domain: z.string(),
    label: z.string(),
    baseName: z.string(),
    prefixUsed: z.string().nullable(),
    suffixUsed: z.string().nullable(),
    tld: z.string(),
  })).optional(),
});

export type CheckOptionsSchema = z.infer<typeof checkOptionsSchema>;
export type CheckRequestSchema = z.infer<typeof checkRequestSchema>;
