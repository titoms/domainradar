"use client";

import { useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { Button } from "@/components/ui/button";
import { JsonInput } from "@/components/json-input";
import { ModeSelector } from "@/components/mode-selector";
import { OptionsPanel } from "@/components/options-panel";
import { ProgressPanel } from "@/components/progress-panel";
import dynamic from "next/dynamic";
import { SummaryCards } from "@/components/summary-cards";

const ResultsTable = dynamic(() => import("@/components/results-table").then(mod => mod.ResultsTable), {
  ssr: false,
  loading: () => <div className="h-40 w-full animate-pulse bg-zinc-900/50 rounded-xl border border-zinc-800" />
});
const HistoryPanel = dynamic(() => import("@/components/history-panel").then(mod => mod.HistoryPanel), {
  ssr: false
});
import { Play, Zap } from "lucide-react";
import { useDomainChecker } from "@/lib/hooks/use-domain-checker";
import { useCredentials } from "@/lib/hooks/use-credentials";
import type { AppConfig, DomainResult, SavedAnalysis } from "@/lib/types";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { HeroSection } from "@/components/hero-section";

export default function HomePage() {
  const { state, dispatch, runCheck, cancel, loadAnalysis, retryAnalysis, deleteAnalysis, clearHistory } =
    useDomainChecker();
  const [credentials, setCredentials] = useCredentials();

  // Fetch server config
  const { data: config } = useSWR<AppConfig>("/api/config", fetcher);
  const namecheapConfigured = config?.namecheapConfigured ?? false;

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
    <div className="min-h-screen text-zinc-100 relative flex flex-col font-sans">
      {/* Smooth Global Background */}
      <div className="fixed inset-0 -z-10 bg-zinc-950">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
      </div>

      <Header 
        onRun={handleRun} 
        disabled={!state.input || state.isRunning} 
        isRunning={state.isRunning} 
      />

      <HeroSection />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        {/* Equal Height Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="h-full flex flex-col">
            <JsonInput
              value={state.input}
              onInputChange={(v) => dispatch({ type: "SET_INPUT", payload: v })}
              disabled={state.isRunning}
              className="h-full flex-grow"
            />
          </div>

          <div className="h-full flex flex-col">
            <ModeSelector
              mode={state.mode}
              onModeChange={(m) => dispatch({ type: "SET_MODE", payload: m })}
              namecheapConfigured={namecheapConfigured}
              disabled={state.isRunning}
              credentials={credentials}
              onCredentialsChange={setCredentials}
              className="h-full flex-grow"
            />
          </div>

          <div className="h-full flex flex-col">
            <OptionsPanel
              options={state.options}
              onOptionsChange={(o) => dispatch({ type: "SET_OPTIONS", payload: o })}
              disabled={state.isRunning}
              className="h-full flex-grow"
            />
          </div>
        </div>

        {/* History */}
        <HistoryPanel
          analyses={state.history as SavedAnalysis[]}
          onLoad={loadAnalysis}
          onRetry={retryAnalysis}
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
            <div className="text-center py-24 animate-in fade-in zoom-in-95 duration-1000 delay-300 fill-mode-both">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-zinc-900/80 mb-6 shadow-2xl shadow-black/40 border border-zinc-800/50">
                <Zap className="h-10 w-10 text-zinc-700" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">
                Ready to find your next domain?
              </h3>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                Paste or build your configuration on the left, then click Start to begin the research.
              </p>
            </div>
          )}
      </main>

      <Footer />
    </div>
  );
}
