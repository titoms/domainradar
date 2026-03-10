import Database from "better-sqlite3";
import path from "path";
import type { SavedAnalysis, DomainInput, DomainResult, CheckMode } from "./types";

const DB_PATH = path.join(process.cwd(), "domainchecker.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        input_json TEXT NOT NULL,
        mode TEXT NOT NULL,
        total_checked INTEGER NOT NULL DEFAULT 0,
        available INTEGER NOT NULL DEFAULT 0,
        registered INTEGER NOT NULL DEFAULT 0,
        unknown INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        analysis_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        label TEXT NOT NULL,
        base_name TEXT NOT NULL,
        prefix_used TEXT,
        suffix_used TEXT,
        tld TEXT NOT NULL,
        status TEXT NOT NULL,
        premium_registration INTEGER NOT NULL DEFAULT 0,
        premium_registration_price REAL,
        standard_registration_price REAL,
        currency TEXT,
        aftermarket_resale_price REAL,
        aftermarket_source TEXT,
        source_used TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY (analysis_id) REFERENCES analyses(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_results_analysis_id ON results(analysis_id);
    `);
  }
  return db;
}

/**
 * Save an analysis with its results to SQLite.
 */
export function saveAnalysis(
  input: DomainInput,
  mode: CheckMode,
  results: DomainResult[]
): SavedAnalysis {
  const d = getDb();
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = Date.now();
  const available = results.filter((r) => r.status === "available").length;
  const registered = results.filter((r) => r.status === "registered").length;
  const unknown = results.filter((r) => r.status === "unknown").length;

  const insertAnalysis = d.prepare(`
    INSERT INTO analyses (id, timestamp, input_json, mode, total_checked, available, registered, unknown)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertResult = d.prepare(`
    INSERT INTO results (
      analysis_id, domain, label, base_name, prefix_used, suffix_used, tld,
      status, premium_registration, premium_registration_price,
      standard_registration_price, currency, aftermarket_resale_price,
      aftermarket_source, source_used, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = d.transaction(() => {
    insertAnalysis.run(
      id,
      timestamp,
      JSON.stringify(input),
      mode,
      results.length,
      available,
      registered,
      unknown
    );

    for (const r of results) {
      insertResult.run(
        id,
        r.domain,
        r.label,
        r.baseName,
        r.prefixUsed,
        r.suffixUsed,
        r.tld,
        r.status,
        r.premiumRegistration ? 1 : 0,
        r.premiumRegistrationPrice,
        r.standardRegistrationPrice,
        r.currency,
        r.aftermarketResalePrice,
        r.aftermarketSource,
        r.sourceUsed,
        r.notes
      );
    }
  });

  transaction();

  return {
    id,
    timestamp,
    input,
    mode,
    results,
    totalChecked: results.length,
    available,
    registered,
    unknown,
  };
}

/**
 * List all analyses (without results for performance).
 */
export function listAnalyses(): Omit<SavedAnalysis, "results">[] {
  const d = getDb();
  const rows = d
    .prepare(
      "SELECT id, timestamp, input_json, mode, total_checked, available, registered, unknown FROM analyses ORDER BY timestamp DESC LIMIT 100"
    )
    .all() as {
      id: string;
      timestamp: number;
      input_json: string;
      mode: string;
      total_checked: number;
      available: number;
      registered: number;
      unknown: number;
    }[];

  return rows.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    input: JSON.parse(row.input_json) as DomainInput,
    mode: row.mode as CheckMode,
    totalChecked: row.total_checked,
    available: row.available,
    registered: row.registered,
    unknown: row.unknown,
  }));
}

/**
 * Get a single analysis with full results.
 */
export function getAnalysis(id: string): SavedAnalysis | null {
  const d = getDb();

  const analysis = d
    .prepare(
      "SELECT id, timestamp, input_json, mode, total_checked, available, registered, unknown FROM analyses WHERE id = ?"
    )
    .get(id) as {
      id: string;
      timestamp: number;
      input_json: string;
      mode: string;
      total_checked: number;
      available: number;
      registered: number;
      unknown: number;
    } | undefined;

  if (!analysis) return null;

  const results = d
    .prepare("SELECT * FROM results WHERE analysis_id = ? ORDER BY domain ASC")
    .all(id) as {
      domain: string;
      label: string;
      base_name: string;
      prefix_used: string | null;
      suffix_used: string | null;
      tld: string;
      status: string;
      premium_registration: number;
      premium_registration_price: number | null;
      standard_registration_price: number | null;
      currency: string | null;
      aftermarket_resale_price: number | null;
      aftermarket_source: string | null;
      source_used: string;
      notes: string | null;
    }[];

  return {
    id: analysis.id,
    timestamp: analysis.timestamp,
    input: JSON.parse(analysis.input_json) as DomainInput,
    mode: analysis.mode as CheckMode,
    results: results.map((r) => ({
      domain: r.domain,
      label: r.label,
      baseName: r.base_name,
      prefixUsed: r.prefix_used,
      suffixUsed: r.suffix_used,
      tld: r.tld,
      status: r.status as "available" | "registered" | "unknown",
      premiumRegistration: r.premium_registration === 1,
      premiumRegistrationPrice: r.premium_registration_price,
      standardRegistrationPrice: r.standard_registration_price,
      currency: r.currency,
      aftermarketResalePrice: r.aftermarket_resale_price,
      aftermarketSource: r.aftermarket_source,
      sourceUsed: r.source_used as "rdap" | "namecheap" | "hybrid",
      notes: r.notes,
    })),
    totalChecked: analysis.total_checked,
    available: analysis.available,
    registered: analysis.registered,
    unknown: analysis.unknown,
  };
}

/**
 * Delete an analysis and its results.
 */
export function deleteAnalysis(id: string): boolean {
  const d = getDb();
  const result = d.prepare("DELETE FROM analyses WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * Delete all analyses.
 */
export function clearAllAnalyses(): void {
  const d = getDb();
  d.exec("DELETE FROM results");
  d.exec("DELETE FROM analyses");
}
