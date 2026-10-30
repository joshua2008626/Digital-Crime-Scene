import { useMemo, useState } from 'react';
import { BookmarkCheck, BookmarkPlus, Eye, Search } from 'lucide-react';
import type { CaseFile, EvidenceItem, Investigation } from '@/types';
import { Badge, EmptyState, Notice, Panel } from '@/components/ui';
import { nowIso, useApp } from '@/store/AppContext';
import { fmtDateTime, cn, titleCase } from '@/utils/format';

export function EvidencePanel({ c, inv, selectedId, onSelect }: { c: CaseFile; inv: Investigation; selectedId: string | null; onSelect: (id: string | null) => void }) {
  const { dispatch } = useApp();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [filter, setFilter] = useState<'all' | 'collected' | 'unread'>('all');
  const types = useMemo(() => Array.from(new Set(c.evidence.map((e) => e.type))), [c]);
  const inspected = new Set(inv.inspected);
  const collected = new Set(inv.collected);

  const list = c.evidence.filter((e) => {
    if (type !== 'all' && e.type !== type) return false;
    if (filter === 'collected' && !collected.has(e.id)) return false;
    if (filter === 'unread' && inspected.has(e.id)) return false;
    const n = q.trim().toLowerCase();
    return !n || `${e.title} ${e.source} ${e.summary} ${e.tags.join(' ')}`.toLowerCase().includes(n);
  });

  const open = (e: EvidenceItem) => {
    onSelect(e.id);
    dispatch({ type: 'INSPECT', caseId: c.id, evidenceId: e.id, now: nowIso() });
  };
  const selected = c.evidence.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <div className="mb-3 flex flex-wrap gap-2">
          <div className="relative min-w-[10rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden="true" />
            <input className="field pl-9" type="search" placeholder="Search evidence" aria-label="Search evidence" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="field w-auto" aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            {types.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </select>
          <select className="field w-auto" aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            <option value="all">All</option><option value="unread">Not inspected</option><option value="collected">Collected</option>
          </select>
        </div>
        <p className="mb-2 text-xs text-slate-500" aria-live="polite">{list.length} of {c.evidence.length} items · {inv.inspected.length} inspected · {inv.collected.length} collected</p>
        {list.length === 0 ? <EmptyState title="No evidence matches" body="Clear a filter or change the search." /> : (
          <ul className="space-y-2">
            {list.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => open(e)} aria-current={e.id === selectedId} className={cn('panel-quiet w-full p-3 text-left transition-colors hover:border-cyan2-400/40', e.id === selectedId && 'border-cyan2-400/60 bg-ink-800')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="mono text-xs text-slate-500">{e.id}</span>
                    <span className="flex gap-1">
                      {inspected.has(e.id) && <Badge tone="cyan"><Eye className="h-3 w-3" aria-hidden="true" />Seen</Badge>}
                      {collected.has(e.id) && <Badge tone="ok"><BookmarkCheck className="h-3 w-3" aria-hidden="true" />Collected</Badge>}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-slate-400">{titleCase(e.type)} · {e.source}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="lg:col-span-3">
        {!selected ? <EmptyState title="Select an evidence item" body="Open an item to read it. Inspect it, then collect it to use it in your graph and verdict." /> : (
          <Panel className="p-5" aria-label={`Evidence ${selected.id}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mono text-xs text-slate-500">{selected.id} · {titleCase(selected.type)}</p>
                <h2 className="mt-1 text-xl">{selected.title}</h2>
                <p className="text-sm text-slate-400">{selected.source}{selected.timestamp ? ` · ${fmtDateTime(selected.timestamp)}` : ''}</p>
              </div>
              {collected.has(selected.id) ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => dispatch({ type: 'UNCOLLECT', caseId: c.id, evidenceId: selected.id })}><BookmarkCheck className="h-4 w-4" aria-hidden="true" />Remove from collected</button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'COLLECT', caseId: c.id, evidenceId: selected.id })}><BookmarkPlus className="h-4 w-4" aria-hidden="true" />Collect</button>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-300">{selected.summary}</p>

            {selected.headers && selected.headers.length > 0 && (
              <div className="mt-4"><h3 className="label">Headers</h3><FieldTable fields={selected.headers} /></div>
            )}
            {selected.fields.length > 0 && <div className="mt-4"><h3 className="label">Details</h3><FieldTable fields={selected.fields} /></div>}
            {selected.content && (
              <div className="mt-4">
                <h3 className="label">Raw content</h3>
                <pre className="evidence-text mono max-h-96 overflow-auto rounded-lg border border-white/10 bg-ink-950/80 p-3 text-slate-200">{selected.content}</pre>
              </div>
            )}
            {inv.mode === 'beginner' && <div className="mt-4"><Notice tone="ok" title="Analyst note">{selected.insight}</Notice></div>}
            <p className="mt-4 text-xs text-slate-500">All content is plain text. Links and addresses are fictional and not clickable.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function FieldTable({ fields }: { fields: { label: string; value: string; flag?: 'anomaly' | 'ok' }[] }) {
  return (
    <dl className="divide-y divide-white/5 rounded-lg border border-white/10">
      {fields.map((f, i) => (
        <div key={`${f.label}-${i}`} className="grid grid-cols-3 gap-3 px-3 py-2 text-sm">
          <dt className="text-slate-400">{f.label}</dt>
          <dd className={cn('evidence-text col-span-2 mono', f.flag === 'anomaly' && 'text-warn-400', f.flag === 'ok' && 'text-verified-400')}>
            {f.value}
            {f.flag === 'anomaly' && <span className="sr-only"> (flagged as unusual)</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
