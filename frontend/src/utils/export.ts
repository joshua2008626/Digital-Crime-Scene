import type { LogEntry } from '@/types';

/**
 * Escapes one CSV cell. Besides RFC 4180 quoting, cells that start with a spreadsheet
 * formula character are prefixed with an apostrophe so opening the file in Excel/Sheets
 * can never execute injected formulas ("CSV injection").
 */
export function csvCell(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  let s = value;
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T extends object>(rows: T[], columns: { key: keyof T & string; header: string }[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell((r as Record<string, never>)[c.key])).join(','));
  return [head, ...body].join('\r\n') + '\r\n';
}

/** Exports FABRICATED log records only. Anomaly answers are intentionally not exported. */
export function logsToCsv(entries: LogEntry[]): string {
  const rows = entries.map((e) => ({
    id: e.id,
    time: e.time,
    type: e.type,
    severity: e.severity,
    user: e.user,
    host: e.host,
    source_ip: e.sourceIp ?? '',
    action: e.action,
    message: e.message,
  }));
  return toCsv(rows, [
    { key: 'id', header: 'id' },
    { key: 'time', header: 'time_utc' },
    { key: 'type', header: 'type' },
    { key: 'severity', header: 'severity' },
    { key: 'user', header: 'user' },
    { key: 'host', header: 'host' },
    { key: 'source_ip', header: 'source_ip' },
    { key: 'action', header: 'action' },
    { key: 'message', header: 'message' },
  ]);
}

/** Browser helper: triggers a file download from text. Not used in tests. */
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
