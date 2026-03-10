"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { JsonInput } from "@/components/json-input";
import { ModeSelector } from "@/components/mode-selector";
import { OptionsPanel } from "@/components/options-panel";
import { ProgressPanel } from "@/components/progress-panel";
import { SummaryCards } from "@/components/summary-cards";
import { ResultsTable } from "@/components/results-table";
import { HistoryPanel } from "@/components/history-panel";
import { Play, Zap } from "lucide-react";
import { useDomainChecker } from "@/lib/hooks/use-domain-checker";
import { useCredentials } from "@/lib/hooks/use-credentials";
import type { AppConfig, DomainResult, SavedAnalysis } from "@/lib/types";

export default function HomePage() {
  const { state, dispatch, runCheck, cancel, loadAnalysis, deleteAnalysis, clearHistory } =
    useDomainChecker();
  const [credentials, setCredentials] = useCredentials();
  const [namecheapConfigured, setNamecheapConfigured] = useState(false);

  // Fetch server config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((config: AppConfig) => setNamecheapConfigured(config.namecheapConfigured))
      .catch(() => {});
  }, []);

  const handleRun = useCallback(() => {
    if (!state.input) return;
    runCheck(state.input, credentials);
  }, [state.input, runCheck, credentials]);

  const handleRetryFailed = useCallback(
    (failedDomains: DomainResult[]) => {
      if (!state.input) return;
      runCheck(state.input, credentials, failedDomains);
    },
    [state.input, runCheck, credentials]
  );

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
            disabled={!state.input || state.isRunning}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm px-5 shadow-lg shadow-blue-500/15 transition-shadow hover:shadow-blue-500/25"
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            {state.isRunning ? "Running..." : "Run Check"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Config Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <JsonInput
            onInputChange={(v) => dispatch({ type: "SET_INPUT", payload: v })}
            disabled={state.isRunning}
          />
          <ModeSelector
            mode={state.mode}
            onModeChange={(m) => dispatch({ type: "SET_MODE", payload: m })}
            namecheapConfigured={namecheapConfigured}
            disabled={state.isRunning}
            credentials={credentials}
            onCredentialsChange={setCredentials}
          />
          <OptionsPanel
            options={state.options}
            onOptionsChange={(o) => dispatch({ type: "SET_OPTIONS", payload: o })}
            disabled={state.isRunning}
          />
        </div>

        {/* History */}
        <HistoryPanel
          analyses={state.history as SavedAnalysis[]}
          onLoad={loadAnalysis}
          onDelete={deleteAnalysis}
          onClear={clearHistory}
        />

        {/* Progress */}
        <ProgressPanel
          progress={state.progress}
          errors={state.errors}
          isRunning={state.isRunning}
          onCancel={cancel}
        />

        {/* Summary */}
        <SummaryCards results={state.results} />

        {/* Results Table */}
        <ResultsTable
          results={state.results}
          onRetryFailed={handleRetryFailed}
          isRunning={state.isRunning}
        />

        {/* Empty state */}
        {!state.isRunning &&
          state.results.length === 0 &&
          state.history.length === 0 && (
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
