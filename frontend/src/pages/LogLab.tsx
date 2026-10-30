import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Flag } from 'lucide-react';
import { LOG_ENTRIES, LOG_EVENT_TYPES, LOG_SEVERITIES } from '@/data/logs';
import { LOG_LAB_ID } from '@/utils/achievements';
import { nowIso, useApp } from '@/store/AppContext';
import { Badge, ConfirmDialog, Modal, Notice, SectionTitle } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { bucketByHour, DEFAULT_LOG_QUERY, filterLogs, isHighSeverity, type LogQuery } from '@/utils/logs';
import { gradeLogFlags } from '@/utils/labs';
import { downloadText, logsToCsv } from '@/utils/export';
import { cn, fmtClock } from '@/utils/format';
import type { LogEntry, LogEventType, LogSeverity } from '@/types';

const SEV_TONE: Record<LogSeverity, 'neutral' | 'cyan' | 'warn' | 'alert' | 'violet'> = { info: 'neutral', low: 'cyan', medium: 'violet', high: 'warn', critical: 'alert' };

export default function LogLab() {
  useDocumentTitle('Log Lab');
  const { state, dispatch } = useApp();
  const lab = state.logLab[LOG_LAB_ID];
  const flagged = lab?.flagged ?? [];
  const [q, setQ] = useState<LogQuery>(DEFAULT_LOG_QUERY);
  const [detail, setDetail] = useState<LogEntry | null>(null);
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const rows = useMemo(() => filterLogs(LOG_ENTRIES, q), [q]);
  const buckets = useMemo(() => bucketByHour(LOG_ENTRIES, flagged), [flagged]);
  const grade = useMemo(() => gradeLogFlags(LOG_ENTRIES, flagged), [flagged]);
  const flagSet = new Set(flagged);
  const toggleFlag = (id: string) => dispatch({ type: 'LOG_FLAGS_SET', flagged: flagSet.has(id) ? flagged.filter((x) => x !== id) : [...flagged, id] });
  const toggleList = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const check = () => { setConfirmCheck(false); dispatch({ type: 'LOG_CHECK', now: nowIso() }); setShowResult(true); };

  return (
    <div className="container-app py-8">
      <SectionTitle title="Log Lab" subtitle="A day of simulated logs. Flag the entries you believe are malicious or anomalous — noise and look-alikes are included." action={<button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadText('log-lab-export.csv', logsToCsv(rows))}><Download className="h-4 w-4" aria-hidden="true" />Export {rows.length} rows (CSV)</button>} />
      <Notice tone="warn">Simulated data only. Severity is not proof of malice: some high-severity entries are normal, and some quiet ones matter.</Notice>

      <div className="panel mt-5 p-4">
        <h3 className="text-sm">Activity by hour (UTC)</h3>
        <div className="mt-2 h-44" role="img" aria-label="Bar chart of log volume per hour. Flagged entries are shown in violet.">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={buckets}>
              <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 10 }} width={28} />
              <Tooltip contentStyle={{ background: '#101a2e', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0' }} />
              <Bar dataKey="total" name="Entries" fill="#22d3ee" radius={[3, 3, 0, 0]} />
              <Bar dataKey="flagged" name="Flagged by you" fill="#a78bfa" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[12rem] flex-1"><label className="label" htmlFor="lq">Search</label><input id="lq" className="field" type="search" value={q.query} onChange={(e) => setQ({ ...q, query: e.target.value })} placeholder="user, host, IP, action…" /></div>
        <div><label className="label" htmlFor="sort">Sort</label><select id="sort" className="field" value={q.sort} onChange={(e) => setQ({ ...q, sort: e.target.value as LogQuery['sort'] })}><option value="time_asc">Oldest first</option><option value="time_desc">Newest first</option><option value="severity_desc">Severity</option></select></div>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" className="accent-cyan-400" checked={q.anomaliesOnly} onChange={(e) => setQ({ ...q, anomaliesOnly: e.target.checked })} disabled={!lab?.checked} /> Reveal anomalies only{!lab?.checked && <span className="text-xs text-slate-500">(after checking)</span>}</label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setQ(DEFAULT_LOG_QUERY)}>Reset filters</button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter by type">{LOG_EVENT_TYPES.map((t: LogEventType) => <button key={t} type="button" aria-pressed={q.types.includes(t)} className={cn('badge', q.types.includes(t) ? 'border-cyan2-400 text-cyan2-300' : 'border-white/15 text-slate-400')} onClick={() => setQ({ ...q, types: toggleList(q.types, t) })}>{t}</button>)}</div>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Filter by severity">{LOG_SEVERITIES.map((s) => <button key={s} type="button" aria-pressed={q.severities.includes(s)} className={cn('badge', q.severities.includes(s) ? 'border-violet2-400 text-violet-200' : 'border-white/15 text-slate-400')} onClick={() => setQ({ ...q, severities: toggleList(q.severities, s) })}>{s}</button>)}</div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">Simulated log entries</caption>
          <thead className="bg-ink-800 text-xs uppercase text-slate-400"><tr><th scope="col" className="px-3 py-2">Flag</th><th scope="col" className="px-3 py-2">Time</th><th scope="col" className="px-3 py-2">Type</th><th scope="col" className="px-3 py-2">Sev</th><th scope="col" className="px-3 py-2">User</th><th scope="col" className="px-3 py-2">Host</th><th scope="col" className="px-3 py-2">Message</th></tr></thead>
          <tbody className="divide-y divide-white/5">
            {rows.slice(0, 200).map((e) => (
              <tr key={e.id} className={cn('hover:bg-white/[0.03]', flagSet.has(e.id) && 'bg-violet2-500/10')}>
                <td className="px-3 py-1.5"><button type="button" className={cn('rounded p-1', flagSet.has(e.id) ? 'text-violet-300' : 'text-slate-500 hover:text-white')} aria-pressed={flagSet.has(e.id)} aria-label={`${flagSet.has(e.id) ? 'Unflag' : 'Flag'} ${e.id}`} onClick={() => toggleFlag(e.id)}><Flag className="h-4 w-4" aria-hidden="true" /></button></td>
                <td className="mono whitespace-nowrap px-3 py-1.5">{fmtClock(e.time)}</td>
                <td className="px-3 py-1.5">{e.type}</td>
                <td className="px-3 py-1.5"><Badge tone={SEV_TONE[e.severity]}>{e.severity}</Badge>{isHighSeverity(e) && <span className="sr-only"> high severity</span>}</td>
                <td className="px-3 py-1.5">{e.user}</td>
                <td className="px-3 py-1.5">{e.host}</td>
                <td className="px-3 py-1.5"><button type="button" className="text-left hover:text-cyan2-300" onClick={() => setDetail(e)}>{e.message}</button>{lab?.checked && e.anomaly && <Badge tone="ok" className="ml-2">anomaly</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-slate-400">No entries match the filters.</p>}
        {rows.length > 200 && <p className="p-3 text-center text-xs text-slate-500">Showing the first 200 of {rows.length}. Narrow your filters.</p>}
      </div>

      <div className="panel mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-slate-300">{flagged.length} entr{flagged.length === 1 ? 'y' : 'ies'} flagged. Wrong flags reduce your score, so flag only what you can justify.</p>
        <div className="flex gap-2"><button type="button" className="btn btn-ghost btn-sm" disabled={!flagged.length} onClick={() => dispatch({ type: 'LOG_RESET' })}>Clear flags</button><button type="button" className="btn btn-primary" disabled={!flagged.length} onClick={() => setConfirmCheck(true)}>Check my flags</button></div>
      </div>

      {lab?.checked && showResult && (
        <div className="panel mt-5 p-5" role="region" aria-label="Log lab results">
          <h3 className="text-lg">Result: {grade.score}/100</h3>
          <p className="text-sm text-slate-300">Found {grade.found.length} of {grade.total} anomalies; {grade.falseFlags.length} false flag(s). Best so far: {lab.correctFlags}/{grade.total}.</p>
          <ul className="mt-3 space-y-2 text-sm">{grade.explanations.map((x) => <li key={x.id} className="panel-quiet p-2"><Badge tone={x.correct ? 'ok' : 'warn'}>{x.correct ? 'Correct' : 'False alarm'}</Badge> <span className="mono text-xs text-slate-500">{x.id}</span> {x.text}</li>)}</ul>
          {grade.missed.length > 0 && <p className="mt-3 text-sm text-slate-400">{grade.missed.length} anomal{grade.missed.length === 1 ? 'y' : 'ies'} still missed. Turn on “Reveal anomalies only” to review them.</p>}
        </div>
      )}

      <Modal open={!!detail} title={detail ? `Log entry ${detail.id}` : ''} onClose={() => setDetail(null)}>
        {detail && (<div className="space-y-3 text-sm"><p className="evidence-text">{detail.message}</p>
          <dl className="divide-y divide-white/5 rounded-lg border border-white/10">{[['Time', detail.time], ['Type', detail.type], ['Severity', detail.severity], ['User', detail.user], ['Host', detail.host], ['Action', detail.action], ['Source IP', detail.sourceIp ?? '—'], ...Object.entries(detail.raw)].map(([k, v]) => <div key={k} className="grid grid-cols-3 gap-2 px-3 py-2"><dt className="text-slate-400">{k}</dt><dd className="evidence-text mono col-span-2">{v}</dd></div>)}</dl>
          {lab?.checked && detail.anomalyReason && <Notice tone="ok" title="Why this matters">{detail.anomalyReason}</Notice>}</div>)}
      </Modal>
      <ConfirmDialog open={confirmCheck} title="Check your flags?" body="You will see your score and explanations. You can keep refining and check again; XP is awarded only for improving your best result." confirmLabel="Check" onConfirm={check} onCancel={() => setConfirmCheck(false)} />
    </div>
  );
}
