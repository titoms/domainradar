import { useSyncExternalStore, useCallback } from "react";
import type { NamecheapCredentials } from "@/lib/types";

const CREDS_STORAGE_KEY = "domainchecker_nc_creds";
const DEFAULT_CREDS: NamecheapCredentials = {
  apiUser: "",
  apiKey: "",
  username: "",
  clientIp: "",
};

// Set of subscribers for useSyncExternalStore
const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): NamecheapCredentials {
  try {
    const raw =
      typeof window !== "undefined"
        ? localStorage.getItem(CREDS_STORAGE_KEY)
        : null;
    return raw ? JSON.parse(raw) : DEFAULT_CREDS;
  } catch {
    return DEFAULT_CREDS;
  }
}

function getServerSnapshot(): NamecheapCredentials {
  return DEFAULT_CREDS;
}

/**
 * Hook to read/write Namecheap credentials using useSyncExternalStore.
 * - No useEffect flash on mount
 * - React Compiler friendly (no setState in effects)
 */
export function useCredentials(): [
  NamecheapCredentials,
  (creds: NamecheapCredentials) => void,
] {
  const credentials = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setCredentials = useCallback((creds: NamecheapCredentials) => {
    try {
      localStorage.setItem(CREDS_STORAGE_KEY, JSON.stringify(creds));
    } catch {
      // ignore
    }
    // Notify all subscribers
    listeners.forEach((l) => l());
  }, []);

  return [credentials, setCredentials];
}
