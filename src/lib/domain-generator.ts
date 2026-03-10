import type { DomainInput, GeneratedLabel, GeneratedDomain } from "./types";

/**
 * Generate all unique labels from base names, prefixes, and suffixes.
 *
 * Combinations:
 *  1. base_name
 *  2. prefix + base_name
 *  3. base_name + suffix
 *  4. prefix + base_name + suffix
 *
 * @param separator - default "" for plain concatenation (extensible later)
 */
export function generateLabels(
  input: DomainInput,
  separator: string = ""
): GeneratedLabel[] {
  const seen = new Set<string>();
  const labels: GeneratedLabel[] = [];

  const baseNames = input.base_names.map((n) => n.trim().toLowerCase());
  const prefixes = input.prefixes.map((p) => p.trim().toLowerCase());
  const suffixes = input.suffixes.map((s) => s.trim().toLowerCase());

  function addLabel(
    label: string,
    baseName: string,
    prefix: string | null,
    suffix: string | null
  ) {
    if (label && !seen.has(label)) {
      seen.add(label);
      labels.push({
        label,
        baseName,
        prefixUsed: prefix,
        suffixUsed: suffix,
      });
    }
  }

  for (const base of baseNames) {
    if (!base) continue;

    // 1. base_name only
    addLabel(base, base, null, null);

    // 2. prefix + base_name
    for (const prefix of prefixes) {
      if (!prefix) continue;
      addLabel(`${prefix}${separator}${base}`, base, prefix, null);
    }

    // 3. base_name + suffix
    for (const suffix of suffixes) {
      if (!suffix) continue;
      addLabel(`${base}${separator}${suffix}`, base, null, suffix);
    }

    // 4. prefix + base_name + suffix
    for (const prefix of prefixes) {
      if (!prefix) continue;
      for (const suffix of suffixes) {
        if (!suffix) continue;
        addLabel(
          `${prefix}${separator}${base}${separator}${suffix}`,
          base,
          prefix,
          suffix
        );
      }
    }
  }

  return labels;
}

/**
 * Generate all domain combinations from labels × TLDs (deduplicated).
 */
export function generateDomains(
  labels: GeneratedLabel[],
  tlds: string[]
): GeneratedDomain[] {
  const seen = new Set<string>();
  const domains: GeneratedDomain[] = [];

  const normalizedTlds = tlds.map((t) =>
    t.trim().toLowerCase().replace(/^\./, "")
  );

  for (const labelEntry of labels) {
    for (const tld of normalizedTlds) {
      if (!tld) continue;
      const domain = `${labelEntry.label}.${tld}`;
      if (!seen.has(domain)) {
        seen.add(domain);
        domains.push({
          domain,
          label: labelEntry.label,
          baseName: labelEntry.baseName,
          prefixUsed: labelEntry.prefixUsed,
          suffixUsed: labelEntry.suffixUsed,
          tld,
        });
      }
    }
  }

  return domains;
}

/**
 * Convenience: generate all domains directly from input.
 */
export function generateAllDomains(
  input: DomainInput,
  separator: string = ""
): GeneratedDomain[] {
  const labels = generateLabels(input, separator);
  return generateDomains(labels, input.tlds);
}
