/**
 * Optional backend client. The app is fully functional without it.
 * Every call has a timeout and returns null on any failure so callers fall back to offline behaviour.
 * No secrets live here: the base URL is public config, the LLM key lives only on the server.
 */
const RAW = (import.meta.env?.VITE_API_URL as string | undefined) ?? '';
export const API_BASE = RAW.replace(/\/+$/, '');
export const apiConfigured = (): boolean => API_BASE.length > 0;

export async function apiFetch<T>(path: string, init: RequestInit = {}, timeoutMs = 6000): Promise<T | null> {
  if (!apiConfigured()) return null;
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function backendHealthy(): Promise<boolean> {
  const r = await apiFetch<{ status?: string }>('/api/health', {}, 2500);
  return r?.status === 'ok';
}
