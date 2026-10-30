import type { AppState } from '@/types';
import { defaultSettings, initialState } from './reducer';

export const STORAGE_KEY = 'dcs.state.v1';

/** Minimal Storage shape so tests can use an in-memory fake. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validates and normalises untrusted JSON (from localStorage or an imported backup).
 * Returns null when the data is not a usable v1 state. Unknown keys are dropped.
 */
export function normalizeState(raw: unknown, now: string, guestId: string): AppState | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const base = initialState(now, guestId);
  const profile = isObj(raw.profile) ? raw.profile : {};
  const settings = isObj(raw.settings) ? raw.settings : {};
  const modes = ['beginner', 'intermediate', 'advanced'];
  return {
    version: 1,
    profile: {
      name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.slice(0, 40) : base.profile.name,
      createdAt: typeof profile.createdAt === 'string' ? profile.createdAt : base.profile.createdAt,
      guestId: typeof profile.guestId === 'string' && profile.guestId ? profile.guestId.slice(0, 64) : guestId,
    },
    settings: {
      ...defaultSettings(),
      hintPenalty: typeof settings.hintPenalty === 'boolean' ? settings.hintPenalty : true,
      defaultMode: modes.includes(settings.defaultMode as string) ? (settings.defaultMode as AppState['settings']['defaultMode']) : 'beginner',
      timedChallenges: settings.timedChallenges === true,
      useAiBackend: settings.useAiBackend === true,
      reducedMotion: settings.reducedMotion === true,
    },
    investigations: isObj(raw.investigations) ? (raw.investigations as unknown as AppState['investigations']) : {},
    reports: Array.isArray(raw.reports) ? (raw.reports as AppState['reports']) : [],
    caseXp: isObj(raw.caseXp) ? (raw.caseXp as Record<string, number>) : {},
    xp: typeof raw.xp === 'number' && Number.isFinite(raw.xp) && raw.xp >= 0 ? Math.floor(raw.xp) : 0,
    achievements: isObj(raw.achievements) ? (raw.achievements as Record<string, string>) : {},
    phishing: isObj(raw.phishing) ? (raw.phishing as unknown as AppState['phishing']) : {},
    logLab: isObj(raw.logLab) ? (raw.logLab as unknown as AppState['logLab']) : {},
    activity: Array.isArray(raw.activity) ? (raw.activity as AppState['activity']).slice(0, 50) : [],
    onboardingSeen: raw.onboardingSeen === true,
  };
}

export function parseState(text: string, now: string, guestId: string): AppState | null {
  try {
    return normalizeState(JSON.parse(text), now, guestId);
  } catch {
    return null;
  }
}

/** Loads state; any failure (blocked storage, corrupt JSON) yields a fresh state. Never throws. */
export function loadState(storage: StorageLike | undefined, now: string, guestId: string): AppState {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    if (text) {
      const parsed = parseState(text, now, guestId);
      if (parsed) return parsed;
    }
  } catch {
    /* storage unavailable: fall through */
  }
  return initialState(now, guestId);
}

/** Returns false (instead of throwing) when storage is unavailable or full. */
export function saveState(storage: StorageLike | undefined, state: AppState): boolean {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
    return !!storage;
  } catch {
    return false;
  }
}

export const exportState = (state: AppState): string => JSON.stringify(state, null, 2);
