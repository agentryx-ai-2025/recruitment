/**
 * Form-draft persistence for mobile users on flaky connections. Writes
 * form state to localStorage on change and restores on next mount. Keys
 * are scoped so candidates can have multiple concurrent drafts.
 *
 * Use with a small debounce to avoid thrashing localStorage on each
 * keypress.
 */
import { useEffect, useState } from "react";

const NS = "hs-draft:";

export function saveDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify({ at: Date.now(), value }));
  } catch {}
}

export function loadDraft<T>(key: string, maxAgeMs = 7 * 86_400_000): T | null {
  try {
    const raw = localStorage.getItem(NS + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: T };
    if (Date.now() - parsed.at > maxAgeMs) {
      localStorage.removeItem(NS + key);
      return null;
    }
    return parsed.value;
  } catch { return null; }
}

export function clearDraft(key: string): void {
  try { localStorage.removeItem(NS + key); } catch {}
}

// Hook for auto-draft: initializes from saved value, persists on every change.
export function useDraftState<T>(key: string, initial: T): [T, (v: T) => void, () => void] {
  const [state, setState] = useState<T>(() => loadDraft<T>(key) ?? initial);
  useEffect(() => { saveDraft(key, state); }, [key, state]);
  const clear = () => { clearDraft(key); setState(initial); };
  return [state, setState, clear];
}
