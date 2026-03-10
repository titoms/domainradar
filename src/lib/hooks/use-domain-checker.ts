import { useReducer, useCallback, useRef, useEffect } from "react";
import type {
  DomainInput,
  CheckMode,
  CheckOptions,
  BatchProgress,
  DomainResult,
  StreamEvent,
  NamecheapCredentials,
  SavedAnalysis,
} from "@/lib/types";

// ─── State ────────────────────────────────────────────────────
interface CheckerState {
  input: DomainInput | null;
  mode: CheckMode;
  options: CheckOptions;
  isRunning: boolean;
  progress: BatchProgress | null;
  results: DomainResult[];
  errors: string[];
  history: Omit<SavedAnalysis, "results">[];
}

const initialState: CheckerState = {
  input: null,
  mode: "rdap",
  options: {
    mode: "rdap",
    batchSize: 5,
    concurrency: 2,
    delayMs: 1500,
    tryAftermarket: false,
  },
  isRunning: false,
  progress: null,
  results: [],
  errors: [],
  history: [],
};

// ─── Actions ──────────────────────────────────────────────────
type CheckerAction =
  | { type: "SET_INPUT"; payload: DomainInput | null }
  | { type: "SET_MODE"; payload: CheckMode }
  | { type: "SET_OPTIONS"; payload: CheckOptions }
  | { type: "START_CHECK"; retrying: boolean }
  | { type: "STOP_CHECK" }
  | { type: "SET_PROGRESS"; payload: BatchProgress }
  | { type: "APPEND_RESULTS"; payload: DomainResult[] }
  | { type: "REPLACE_RETRY_RESULTS"; payload: { retryDomains: Set<string>; allNew: DomainResult[] } }
  | { type: "APPEND_ERROR"; payload: string }
  | { type: "SET_ERRORS"; payload: string[] }
  | { type: "SET_HISTORY"; payload: Omit<SavedAnalysis, "results">[] }
  | { type: "LOAD_ANALYSIS"; payload: { input: DomainInput; results: DomainResult[] } }
  | { type: "CLEAR_HISTORY" };

function checkerReducer(state: CheckerState, action: CheckerAction): CheckerState {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.payload };
    case "SET_MODE":
      return {
        ...state,
        mode: action.payload,
        options: { ...state.options, mode: action.payload },
      };
    case "SET_OPTIONS":
      return { ...state, options: action.payload };
    case "START_CHECK":
      return {
        ...state,
        isRunning: true,
        errors: [],
        progress: null,
        ...(action.retrying ? {} : { results: [] }),
      };
    case "STOP_CHECK":
      return { ...state, isRunning: false };
    case "SET_PROGRESS":
      return { ...state, progress: action.payload };
    case "APPEND_RESULTS":
      return { ...state, results: [...state.results, ...action.payload] };
    case "REPLACE_RETRY_RESULTS": {
      const kept = state.results.filter(
        (r) => !action.payload.retryDomains.has(r.domain)
      );
      return { ...state, results: [...kept, ...action.payload.allNew] };
    }
    case "APPEND_ERROR":
      return { ...state, errors: [...state.errors, action.payload] };
    case "SET_ERRORS":
      return { ...state, errors: action.payload };
    case "SET_HISTORY":
      return { ...state, history: action.payload };
    case "LOAD_ANALYSIS":
      return {
        ...state,
        input: action.payload.input,
        results: action.payload.results,
        progress: null,
        errors: [],
      };
    case "CLEAR_HISTORY":
      return { ...state, history: [] };
    default:
      return state;
  }
}

// ─── Stream processing (pure function, no try/finally) ────────
async function processStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  let done = false;
  while (!done) {
    const chunk = await reader.read();
    done = chunk.done;
    if (chunk.value) {
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          onEvent(JSON.parse(line) as StreamEvent);
        } catch {
          // skip malformed line
        }
      }
    }
  }
}

// ─── SQLite persistence helpers ───────────────────────────────
async function fetchHistoryFromApi(): Promise<Omit<SavedAnalysis, "results">[]> {
  const res = await fetch("/api/analyses");
  if (!res.ok) return [];
  return res.json();
}

async function persistAnalysisToApi(
  input: DomainInput,
  mode: CheckMode,
  results: DomainResult[]
): Promise<void> {
  await fetch("/api/analyses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, mode, results }),
  });
}

// ─── Hook ─────────────────────────────────────────────────────
export function useDomainChecker() {
  const [state, dispatch] = useReducer(checkerReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<DomainResult[]>([]);

  // Fetch history on mount
  useEffect(() => {
    fetchHistoryFromApi()
      .then((data) => dispatch({ type: "SET_HISTORY", payload: data }))
      .catch(() => {});
  }, []);

  // Refresh history from API
  const refreshHistory = useCallback(async () => {
    const data = await fetchHistoryFromApi().catch(() => []);
    dispatch({ type: "SET_HISTORY", payload: data });
  }, []);

  // Cancel running check
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "STOP_CHECK" });
  }, []);

  // Core check runner — no try/finally (React Compiler safe)
  const runCheck = useCallback(
    async (
      checkInput: DomainInput,
      credentials: NamecheapCredentials,
      retryDomains?: DomainResult[]
    ) => {
      dispatch({ type: "START_CHECK", retrying: !!retryDomains });
      resultsRef.current = retryDomains ? [...resultsRef.current] : [];

      const controller = new AbortController();
      abortRef.current = controller;

      // Build body
      const body: Record<string, unknown> = {
        input: checkInput,
        options: { ...state.options, mode: state.mode },
      };

      if (state.mode === "namecheap-rdap") {
        const hasCreds = !!(
          credentials.apiUser &&
          credentials.apiKey &&
          credentials.username &&
          credentials.clientIp
        );
        if (hasCreds) body.credentials = credentials;
      }

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

      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }).catch((err: Error) => {
        if (err.name !== "AbortError") {
          dispatch({ type: "APPEND_ERROR", payload: err.message });
        }
        return null;
      });

      if (!response) {
        dispatch({ type: "STOP_CHECK" });
        return;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        dispatch({ type: "SET_ERRORS", payload: [err.error || "Request failed"] });
        dispatch({ type: "STOP_CHECK" });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        dispatch({ type: "SET_ERRORS", payload: ["No response stream"] });
        dispatch({ type: "STOP_CHECK" });
        return;
      }

      const retryDomainNames = retryDomains
        ? new Set(retryDomains.map((d) => d.domain))
        : null;

      await processStream(reader, (event) => {
        switch (event.type) {
          case "progress":
            dispatch({ type: "SET_PROGRESS", payload: event.data });
            break;
          case "results":
            allNewResults.push(...event.data);
            if (retryDomainNames) {
              resultsRef.current = [
                ...resultsRef.current.filter((r) => !retryDomainNames.has(r.domain)),
                ...allNewResults,
              ];
              dispatch({
                type: "REPLACE_RETRY_RESULTS",
                payload: { retryDomains: retryDomainNames, allNew: allNewResults },
              });
            } else {
              resultsRef.current = [...resultsRef.current, ...event.data];
              dispatch({ type: "APPEND_RESULTS", payload: event.data });
            }
            break;
          case "error":
            dispatch({ type: "APPEND_ERROR", payload: event.data.message });
            break;
          case "done":
            break;
        }
      }).catch((err: Error) => {
        if (err.name !== "AbortError") {
          dispatch({ type: "APPEND_ERROR", payload: err.message });
        }
      });

      dispatch({ type: "STOP_CHECK" });

      // Auto-save to SQLite
      const finalResults = resultsRef.current;
      if (finalResults.length > 0) {
        await persistAnalysisToApi(checkInput, state.mode, finalResults).catch(() => {});
        await refreshHistory();
      }
    },
    [state.options, state.mode, refreshHistory]
  );

  // Load analysis from history
  const loadAnalysis = useCallback(
    async (analysis: Omit<SavedAnalysis, "results">) => {
      const res = await fetch(`/api/analyses/${analysis.id}`).catch(() => null);
      if (!res?.ok) return;
      const full: SavedAnalysis = await res.json();
      dispatch({
        type: "LOAD_ANALYSIS",
        payload: { input: full.input, results: full.results },
      });
    },
    []
  );

  // Delete analysis
  const deleteAnalysis = useCallback(
    async (id: string) => {
      await fetch(`/api/analyses/${id}`, { method: "DELETE" }).catch(() => {});
      await refreshHistory();
    },
    [refreshHistory]
  );

  // Clear all history
  const clearHistory = useCallback(async () => {
    await fetch("/api/analyses", { method: "DELETE" }).catch(() => {});
    dispatch({ type: "CLEAR_HISTORY" });
  }, []);

  return {
    state,
    dispatch,
    runCheck,
    cancel,
    loadAnalysis,
    deleteAnalysis,
    clearHistory,
  };
}
