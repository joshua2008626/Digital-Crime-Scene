import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type Dispatch, type ReactNode } from 'react';
import type { AppState } from '@/types';
import { reducer, type Action } from './reducer';
import { loadState, saveState, STORAGE_KEY } from './persist';
import { useToast } from '@/components/Toast';
import { ACHIEVEMENT_BY_ID } from '@/data/achievements';

interface Ctx {
  state: AppState;
  dispatch: Dispatch<Action>;
  /** False when localStorage is unavailable (private mode, blocked storage). Progress then lasts for this tab only. */
  storageOk: boolean;
}

const AppCtx = createContext<Ctx | null>(null);

export const nowIso = (): string => new Date().toISOString().replace(/\.\d+Z$/, 'Z');

function getStorage(): Storage | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}

function newGuestId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(getStorage(), nowIso(), newGuestId()));
  const [storageOk, setStorageOk] = useState(true);
  const latest = useRef(state);
  const prevAch = useRef(Object.keys(state.achievements));

  useEffect(() => {
    latest.current = state;
    const t = window.setTimeout(() => setStorageOk(saveState(getStorage(), state)), 400);
    return () => window.clearTimeout(t);
  }, [state]);

  // Flush on tab hide / close so a pending debounce is never lost.
  useEffect(() => {
    const flush = () => {
      saveState(getStorage(), latest.current);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // Toast newly unlocked achievements.
  useEffect(() => {
    const keys = Object.keys(state.achievements);
    const fresh = keys.filter((k) => !prevAch.current.includes(k));
    prevAch.current = keys;
    fresh.forEach((id) => toast.push(`Achievement unlocked: ${ACHIEVEMENT_BY_ID[id]?.title ?? id}`, 'success'));
  }, [state.achievements, toast]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(state.settings.reducedMotion);
  }, [state.settings.reducedMotion]);

  const value = useMemo(() => ({ state, dispatch, storageOk }), [state, storageOk]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside <AppProvider>');
  return c;
}

export { STORAGE_KEY };
