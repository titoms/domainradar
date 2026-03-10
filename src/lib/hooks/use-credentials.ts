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

let cachedSnapshot: NamecheapCredentials | null = null;
let cachedRaw: string | null = null;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  
  const handleStorage = (e: StorageEvent) => {
    if (e.key === CREDS_STORAGE_KEY) {
      callback();
    }
  };
  
  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function getSnapshot(): NamecheapCredentials {
  if (typeof window === "undefined") return DEFAULT_CREDS;
  
  try {
    const raw = localStorage.getItem(CREDS_STORAGE_KEY);
    if (raw === cachedRaw && cachedSnapshot !== null) {
      return cachedSnapshot;
    }
    
    cachedRaw = raw;
    if (raw) {
      cachedSnapshot = JSON.parse(raw);
    } else {
      cachedSnapshot = DEFAULT_CREDS;
    }
    return cachedSnapshot!;
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
