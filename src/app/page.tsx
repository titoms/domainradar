"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { JsonInput } from "@/components/json-input";
import { ModeSelector } from "@/components/mode-selector";
import { OptionsPanel } from "@/components/options-panel";
import { ProgressPanel } from "@/components/progress-panel";
import { SummaryCards } from "@/components/summary-cards";
import { ResultsTable } from "@/components/results-table";
import { HistoryPanel } from "@/components/history-panel";
import { Play, Zap } from "lucide-react";
import type {
  DomainInput,
  CheckMode,
  CheckOptions,
  BatchProgress,
  DomainResult,
  StreamEvent,
  AppConfig,
  NamecheapCredentials,
  SavedAnalysis,
} from "@/lib/types";

const CREDS_STORAGE_KEY = "domainchecker_nc_creds";

function loadCredentials(): NamecheapCredentials {
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    return raw
      ? JSON.parse(raw)
      : { apiUser: "", apiKey: "", username: "", clientIp: "" };
  } catch {
    return { apiUser: "", apiKey: "", username: "", clientIp: "" };
  }
}

function saveCredentials(creds: NamecheapCredentials) {
  try {
    localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(creds));
  } catch {
    // ignore
  }
}

export default function HomePage() {
  // State
  const [input, setInput] = useState<DomainInput | null>(null);
  const [mode, setMode] = useState<CheckMode>("rdap");
  const [options, setOptions] = useState<CheckOptions>({
    mode: "rdap",
    batchSize: 5,
    concurrency: 2,
    delayMs: 1500,
    tryAftermarket: false,
  });
  const [namecheapConfigured, setNamecheapConfigured] = useState(false);
  const [credentials, setCredentials] = useState<NamecheapCredentials>({
    apiUser: "",
    apiKey: "",
    username: "",
    clientIp: "",
  });
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [history, setHistory] = useState<Omit<SavedAnalysis, "results">[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<DomainResult[]>([]);

  // Load credentials on mount
  useEffect(() => {
    setCredentials(loadCredentials());
  }, []);

  // Load history from SQLite on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  // Fetch config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((config: AppConfig) => {
        setNamecheapConfigured(config.namecheapConfigured);
      })
      .catch(() => {});
  }, []);

  // Sync mode with options
  useEffect(() => {
    setOptions((prev) => ({ ...prev, mode }));
  }, [mode]);

  // ─── SQLite persistence helpers ────────────────────────────
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/analyses");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // ignore
    }
  };

  const persistAnalysis = useCallback(
    async (input: DomainInput, mode: CheckMode, results: DomainResult[]) => {
      try {
        await fetch("/api/analyses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input, mode, results }),
        });
        await fetchHistory();
      } catch {
        // ignore
      }
    },
    []
  );

  // Save credentials when they change
  const handleCredentialsChange = useCallback((creds: NamecheapCredentials) => {
    setCredentials(creds);
    saveCredentials(creds);
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  // Core run function
  const runCheck = useCallback(
    async (checkInput: DomainInput, retryDomains?: DomainResult[]) => {
      setIsRunning(true);
      if (!retryDomains) {
        setResults([]);
        resultsRef.current = [];
      }
      setErrors([]);
      setProgress(null);

      const controller = new AbortController();
      abortRef.current = controller;

      // Build request body
      const body: Record<string, unknown> = {
        input: checkInput,
        options: { ...options, mode },
      };

      // Add credentials if Namecheap mode
      if (mode === "namecheap-rdap") {
        const hasCreds = !!(
          credentials.apiUser &&
          credentials.apiKey &&
          credentials.username &&
          credentials.clientIp
        );
        if (hasCreds) {
          body.credentials = credentials;
        }
      }

      // If retrying failed domains, add them
      if (retryDomains) {
        body.retryDomains = retryDomains.map((d) => ({
          domain: d.domain,
          label: d.label,
          baseName: d.baseName,
          prefixUsed: d.prefixUsed,
          suffixUsed: d.suffixUsed,
          tld: d.tld,
        }));
      }

      const allNewResults: DomainResult[] = [];

      try {
        const response = await fetch("/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json();
          setErrors([err.error || "Request failed"]);
          setIsRunning(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setErrors(["No response stream"]);
          setIsRunning(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event: StreamEvent = JSON.parse(line);

              switch (event.type) {
                case "progress":
                  setProgress(event.data);
                  break;
                case "results":
                  allNewResults.push(...event.data);
                  if (retryDomains) {
                    setResults((prev) => {
                      const retryDomainNames = new Set(
                        retryDomains.map((d) => d.domain)
                      );
                      const kept = prev.filter(
                        (r) => !retryDomainNames.has(r.domain)
                      );
                      const updated = [...kept, ...allNewResults];
                      resultsRef.current = updated;
                      return updated;
                    });
                  } else {
                    setResults((prev) => {
                      const updated = [...prev, ...event.data];
                      resultsRef.current = updated;
                      return updated;
                    });
                  }
                  break;
                case "error":
                  setErrors((prev) => [...prev, event.data.message]);
                  break;
                case "done":
                  break;
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setErrors((prev) => [...prev, err.message]);
        }
      } finally {
        setIsRunning(false);

        // Auto-save to SQLite when done (use ref to avoid React double-invoke)
        const finalResults = resultsRef.current;
        if (finalResults.length > 0 && checkInput) {
          persistAnalysis(checkInput, mode, finalResults);
        }
      }
    },
    [options, mode, credentials, persistAnalysis]
  );

  const handleRun = useCallback(() => {
    if (!input) return;
    runCheck(input);
  }, [input, runCheck]);

  const handleRetryFailed = useCallback(
    (failedDomains: DomainResult[]) => {
      if (!input) return;
      runCheck(input, failedDomains);
    },
    [input, runCheck]
  );

  const handleLoadHistory = useCallback(async (analysis: Omit<SavedAnalysis, "results">) => {
    try {
      const res = await fetch(`/api/analyses/${analysis.id}`);
      if (res.ok) {
        const full: SavedAnalysis = await res.json();
        setResults(full.results);
        setInput(full.input);
        setProgress(null);
        setErrors([]);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDeleteHistory = useCallback(async (id: string) => {
    try {
      await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      await fetchHistory();
    } catch {
      // ignore
    }
  }, []);

  const handleClearHistory = useCallback(async () => {
    try {
      await fetch("/api/analyses", { method: "DELETE" });
      setHistory([]);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen text-zinc-100 relative">
      {/* Gradient background */}
      <div className="fixed inset-0 -z-10 bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900/50 to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[500px] bg-purple-600/[0.03] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-zinc-800/40 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">
                Domain Checker
              </h1>
              <p className="text-[10px] text-zinc-500">
                Bulk availability research
              </p>
            </div>
          </div>
          <Button
            onClick={handleRun}
            disabled={!input || isRunning}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm px-5 shadow-lg shadow-blue-500/15 transition-shadow hover:shadow-blue-500/25"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {isRunning ? "Running..." : "Run Check"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Config Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <JsonInput onInputChange={setInput} disabled={isRunning} />
          <ModeSelector
            mode={mode}
            onModeChange={setMode}
            namecheapConfigured={namecheapConfigured}
            disabled={isRunning}
            credentials={credentials}
            onCredentialsChange={handleCredentialsChange}
          />
          <OptionsPanel
            options={options}
            onOptionsChange={setOptions}
            disabled={isRunning}
          />
        </div>

        {/* History */}
        <HistoryPanel
          analyses={history as SavedAnalysis[]}
          onLoad={handleLoadHistory}
          onDelete={handleDeleteHistory}
          onClear={handleClearHistory}
        />

        {/* Progress */}
        <ProgressPanel
          progress={progress}
          errors={errors}
          isRunning={isRunning}
          onCancel={handleCancel}
        />

        {/* Summary */}
        <SummaryCards results={results} />

        {/* Results Table */}
        <ResultsTable
          results={results}
          onRetryFailed={handleRetryFailed}
          isRunning={isRunning}
        />

        {/* Empty state */}
        {!isRunning && results.length === 0 && history.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-zinc-800/50 mb-4 shadow-lg shadow-black/20">
              <Zap className="h-7 w-7 text-zinc-600" />
            </div>
            <h3 className="text-sm font-medium text-zinc-400 mb-1">
              No results yet
            </h3>
            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
              Paste or upload a JSON configuration, select a check mode, then
              click Run Check to start.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
