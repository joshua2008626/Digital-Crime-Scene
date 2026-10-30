import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { CaseFile, Investigation, VerdictDraft } from '@/types';
import { ConfirmDialog, Notice, Panel, SectionTitle } from '@/components/ui';
import { nowIso, useApp } from '@/store/AppContext';
import { LIMITS } from '@/store/reducer';
import { MIN_CONCLUSION_CHARS, validateDraft } from '@/utils/scoring';
import { fmtClock } from '@/utils/format';

export function VerdictPanel({ c, inv }: { c: CaseFile; inv: Investigation }) {
  const { dispatch } = useApp();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const d = inv.draft;
  const set = (patch: Partial<VerdictDraft>) => dispatch({ type: 'DRAFT_UPDATE', caseId: c.id, patch });
  const problems = validateDraft(c, inv);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const seen = new Set(inv.inspected);
  const events = c.events.filter((e) => e.evidenceIds.length === 0 || e.evidenceIds.some((id) => seen.has(id)));
  const pool = events.filter((e) => !d.timeline.includes(e.id)).sort((x, y) => x.label.localeCompare(y.label));
  const move = (i: number, dir: -1 | 1) => {
    const t = [...d.timeline];
    const j = i + dir;
    if (j < 0 || j >= t.length) return;
    [t[i], t[j]] = [t[j], t[i]];
    set({ timeline: t });
  };
  const evTitle = (id: string) => c.evidence.find((e) => e.id === id)?.title ?? id;
  const submit = () => {
    setConfirm(false);
    dispatch({ type: 'SUBMIT', caseId: c.id, now: nowIso() });
    nav(`/case/${c.id}/report`);
  };

  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (!problems.length) setConfirm(true); }} aria-label="Verdict form">
      <Panel className="p-5">
        <SectionTitle title="1. Verdict" subtitle="Which explanation best fits the evidence?" />
        <fieldset>
          <legend className="sr-only">Verdict</legend>
          <div className="space-y-2">
            {c.solution.verdictOptions.map((o) => (
              <label key={o.id} className={`panel-quiet flex cursor-pointer items-start gap-3 p-3 text-sm ${d.verdictId === o.id ? 'border-cyan2-400/60' : ''}`}>
                <input type="radio" name="verdict" className="mt-1 accent-cyan-400" checked={d.verdictId === o.id} onChange={() => set({ verdictId: o.id })} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="2. Conclusion" subtitle={`Explain your reasoning in your own words (at least ${MIN_CONCLUSION_CHARS} characters).`} />
        <label className="sr-only" htmlFor="conclusion">Conclusion</label>
        <textarea id="conclusion" className="field min-h-[9rem]" maxLength={LIMITS.conclusion} value={d.conclusion} onChange={(e) => set({ conclusion: e.target.value })} />
        <p className="mt-1 text-right text-xs text-slate-500">{d.conclusion.length}/{LIMITS.conclusion}</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="3. Supporting evidence" subtitle="Cite only collected items that truly support your verdict." />
        {inv.collected.length === 0 ? <Notice tone="warn">Collect evidence first (Evidence tab).</Notice> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {inv.collected.map((id) => (
              <li key={id}>
                <label className="panel-quiet flex cursor-pointer items-start gap-2 p-3 text-sm">
                  <input type="checkbox" className="mt-1 accent-cyan-400" checked={d.supportingEvidenceIds.includes(id)} onChange={() => set({ supportingEvidenceIds: toggle(d.supportingEvidenceIds, id) })} />
                  <span><span className="mono text-xs text-slate-500">{id}</span> {evTitle(id)}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="4. Timeline" subtitle="Add the events that belong to the incident and put them in order. Some listed events are unrelated." />
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="label">Available events</h3>
            {pool.length === 0 ? <p className="text-sm text-slate-500">No more events. Inspect more evidence to reveal more.</p> : (
              <ul className="space-y-2">{pool.map((e) => (
                <li key={e.id} className="panel-quiet flex items-center justify-between gap-2 p-2 text-sm">
                  <span><span className="mono text-xs text-slate-500">{fmtClock(e.time)}</span> {e.label}</span>
                  <button type="button" className="btn btn-ghost btn-sm" aria-label={`Add ${e.label} to timeline`} onClick={() => set({ timeline: [...d.timeline, e.id] })}><Plus className="h-4 w-4" aria-hidden="true" /></button>
                </li>))}</ul>
            )}
          </div>
          <div>
            <h3 className="label">Your timeline (earliest first)</h3>
            {d.timeline.length === 0 ? <p className="text-sm text-slate-500">Empty.</p> : (
              <ol className="space-y-2">{d.timeline.map((id, i) => {
                const e = c.events.find((x) => x.id === id);
                if (!e) return null;
                return (
                  <li key={id} className="panel-quiet flex items-center justify-between gap-2 p-2 text-sm">
                    <span>{i + 1}. {e.label}</span>
                    <span className="flex">
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${e.label} up`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Move ${e.label} down`} disabled={i === d.timeline.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                      <button type="button" className="btn btn-ghost btn-sm" aria-label={`Remove ${e.label}`} onClick={() => set({ timeline: d.timeline.filter((x) => x !== id) })}><X className="h-4 w-4" aria-hidden="true" /></button>
                    </span>
                  </li>);
              })}</ol>
            )}
          </div>
        </div>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="5. Alternatives & confidence" subtitle="What else could explain the evidence, and what would change your mind?" />
        <label className="sr-only" htmlFor="alts">Alternative explanations</label>
        <textarea id="alts" className="field min-h-[6rem]" maxLength={LIMITS.alternatives} value={d.alternatives} onChange={(e) => set({ alternatives: e.target.value })} />
        <label className="label mt-4" htmlFor="conf">Confidence: {d.confidence}%</label>
        <input id="conf" type="range" min={0} max={100} step={5} className="w-full accent-cyan-400" value={d.confidence} onChange={(e) => set({ confidence: Number(e.target.value) })} />
        <p className="text-xs text-slate-500">Good analysts match confidence to what the evidence can actually prove.</p>
      </Panel>

      <Panel className="p-5">
        <SectionTitle title="6. Recommended response" subtitle="Select the actions you would take. Some choices can make things worse." />
        <ul className="grid gap-2 sm:grid-cols-2">
          {c.solution.defensiveActions.map((a) => (
            <li key={a.id}><label className="panel-quiet flex cursor-pointer items-start gap-2 p-3 text-sm"><input type="checkbox" className="mt-1 accent-cyan-400" checked={d.actionIds.includes(a.id)} onChange={() => set({ actionIds: toggle(d.actionIds, a.id) })} /><span>{a.label}</span></label></li>
          ))}
        </ul>
        <label className="label mt-4" htmlFor="actnotes">Notes on response (optional)</label>
        <textarea id="actnotes" className="field min-h-[4rem]" maxLength={LIMITS.actionNotes} value={d.actionNotes} onChange={(e) => set({ actionNotes: e.target.value })} />
      </Panel>

      <div className="panel p-5">
        {problems.length > 0 && <Notice tone="warn" title="Before you can submit"><ul className="list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul></Notice>}
        <button type="submit" className="btn btn-primary mt-3" disabled={problems.length > 0}>Submit verdict</button>
      </div>
      <ConfirmDialog open={confirm} title="Submit your verdict?" body="Submitting ends this investigation and generates your report. You can replay the case afterwards." confirmLabel="Submit" onConfirm={submit} onCancel={() => setConfirm(false)} />
    </form>
  );
}
