/** Joins truthy class names. */
export const cn = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ');

/** "2026-03-09T17:44:12Z" -> "17:44:12" */
export const fmtClock = (iso: string): string => iso.slice(11, 19);

/** "2026-03-09T17:44:12Z" -> "2026-03-09 17:44 UTC" */
export const fmtDateTime = (iso: string): string => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

/** Relative "x minutes ago" for activity feeds (falls back to the date for old items). */
export function fmtAgo(iso: string, nowIso: string): string {
  const diff = Date.parse(nowIso) - Date.parse(iso);
  if (!Number.isFinite(diff) || diff < 0) return iso.slice(0, 10);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return d < 14 ? `${d} d ago` : iso.slice(0, 10);
}

export const pct = (ratio: number): string => `${Math.round(ratio * 100)}%`;

export const titleCase = (s: string): string => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
