import type { LogEntry, LogEventType, LogSeverity } from '@/types';

export interface LogQuery {
  query: string;
  types: LogEventType[];
  severities: LogSeverity[];
  anomaliesOnly: boolean;
  sort: 'time_asc' | 'time_desc' | 'severity_desc';
  fromHour?: number; // inclusive, 0..23
  toHour?: number; // inclusive, 0..23
}

export const DEFAULT_LOG_QUERY: LogQuery = { query: '', types: [], severities: [], anomaliesOnly: false, sort: 'time_asc' };

const SEVERITY_RANK: Record<LogSeverity, number> = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

export function filterLogs(entries: LogEntry[], q: LogQuery): LogEntry[] {
  const needle = q.query.trim().toLowerCase();
  const out = entries.filter((e) => {
    if (q.types.length && !q.types.includes(e.type)) return false;
    if (q.severities.length && !q.severities.includes(e.severity)) return false;
    if (q.anomaliesOnly && !e.anomaly) return false;
    const hour = Number(e.time.slice(11, 13));
    if (q.fromHour !== undefined && hour < q.fromHour) return false;
    if (q.toHour !== undefined && hour > q.toHour) return false;
    if (needle) {
      const hay = [e.id, e.user, e.host, e.action, e.message, e.sourceIp ?? '', ...Object.values(e.raw)].join(' ').toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  const cmpTime = (a: LogEntry, b: LogEntry) => a.time.localeCompare(b.time) || a.id.localeCompare(b.id);
  if (q.sort === 'time_desc') out.sort((a, b) => -cmpTime(a, b));
  else if (q.sort === 'severity_desc') out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || cmpTime(a, b));
  else out.sort(cmpTime);
  return out;
}

export interface HourBucket {
  hour: string; // "00".."23"
  total: number;
  /** Count of entries the learner has flagged in this hour. */
  flagged: number;
}

/** Timeline visualisation data. It deliberately does NOT reveal which entries are true anomalies. */
export function bucketByHour(entries: LogEntry[], flagged: string[] = []): HourBucket[] {
  const flaggedSet = new Set(flagged);
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, h) => ({ hour: String(h).padStart(2, '0'), total: 0, flagged: 0 }));
  for (const e of entries) {
    const b = buckets[Number(e.time.slice(11, 13))];
    b.total++;
    if (flaggedSet.has(e.id)) b.flagged++;
  }
  return buckets;
}

/** Visual highlighting is based on severity (what a real SIEM would show), not on hidden answers. */
export const isHighSeverity = (e: LogEntry): boolean => SEVERITY_RANK[e.severity] >= SEVERITY_RANK.high;
