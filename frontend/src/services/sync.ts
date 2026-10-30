/** Optional cloud backup of progress to the backend. The browser remains the source of truth. */
import type { AppState } from '@/types';
import { API_BASE, apiConfigured } from './api';
import { normalizeState } from '@/store/persist';

const KEY = 'dcs.sync.v1';
interface Creds { guestId: string; token: string }

const store = (): Storage | undefined => { try { return window.localStorage; } catch { return undefined; } };
export function loadCreds(): Creds | null {
  try {
    const raw = store()?.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as Partial<Creds>) : null;
    return v && typeof v.guestId === 'string' && typeof v.token === 'string' ? { guestId: v.guestId, token: v.token } : null;
  } catch { return null; }
}
const saveCreds = (c: Creds): void => { try { store()?.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ } };
export const forgetCreds = (): void => { try { store()?.removeItem(KEY); } catch { /* ignore */ } };

export function toSnapshot(s: AppState) {
  return {
    name: s.profile.name,
    xp: s.xp,
    investigations: Object.values(s.investigations),
    reports: s.reports,
    achievements: s.achievements,
    extras: { caseXp: s.caseXp, phishing: s.phishing, logLab: s.logLab, activity: s.activity },
  };
}

async function call(path: string, init: RequestInit, token?: string): Promise<Response | null> {
  if (!apiConfigured()) return null;
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), 10000);
  try {
    return await fetch(`${API_BASE}${path}`, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  } catch { return null; } finally { window.clearTimeout(t); }
}

export async function pushProgress(state: AppState): Promise<{ ok: boolean; message: string }> {
  let creds = loadCreds();
  if (!creds) {
    const r = await call('/api/guests', { method: 'POST' });
    if (!r || !r.ok) return { ok: false, message: 'Backend not reachable.' };
    const j = (await r.json()) as { guestId: string; token: string };
    creds = { guestId: j.guestId, token: j.token };
    saveCreds(creds);
  }
  const r = await call(`/api/guests/${creds.guestId}/progress`, { method: 'PUT', body: JSON.stringify(toSnapshot(state)) }, creds.token);
  if (!r) return { ok: false, message: 'Backend not reachable.' };
  if (r.status === 401) { forgetCreds(); return { ok: false, message: 'Backup credentials were rejected. Try again to create a new backup.' }; }
  return r.ok ? { ok: true, message: 'Progress backed up.' } : { ok: false, message: `Backup failed (${r.status}).` };
}

export async function pullProgress(current: AppState, now: string): Promise<{ ok: boolean; message: string; state?: AppState }> {
  const creds = loadCreds();
  if (!creds) return { ok: false, message: 'No backup has been made from this browser yet.' };
  const r = await call(`/api/guests/${creds.guestId}/progress`, { method: 'GET' }, creds.token);
  if (!r || !r.ok) return { ok: false, message: r ? `Restore failed (${r.status}).` : 'Backend not reachable.' };
  const snap = (await r.json()) as ReturnType<typeof toSnapshot> & { extras?: Record<string, unknown> };
  const ex = snap.extras ?? {};
  const raw = {
    version: 1,
    profile: { ...current.profile, name: snap.name },
    settings: current.settings,
    investigations: Object.fromEntries(snap.investigations.map((i) => [i.caseId, i])),
    reports: snap.reports,
    caseXp: ex.caseXp ?? {},
    xp: snap.xp,
    achievements: snap.achievements,
    phishing: ex.phishing ?? {},
    logLab: ex.logLab ?? {},
    activity: ex.activity ?? [],
    onboardingSeen: true,
  };
  const state = normalizeState(raw, now, current.profile.guestId);
  return state ? { ok: true, message: 'Progress restored.', state } : { ok: false, message: 'Backup data was not valid.' };
}
