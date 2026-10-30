import { useState } from 'react';
import { Lightbulb, MessageSquare } from 'lucide-react';
import type { AssistantAction, AssistantReply, CaseFile, Investigation } from '@/types';
import { Badge, Notice, Panel, SectionTitle } from '@/components/ui';
import { nowIso, useApp } from '@/store/AppContext';
import { askAssistant } from '@/services/assistant';

interface Msg { id: number; label: string; reply: AssistantReply }
let mid = 0;

export function AssistantPanel({ c, inv, selectedId }: { c: CaseFile; inv: Investigation; selectedId: string | null }) {
  const { state, dispatch } = useApp();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [evId, setEvId] = useState(selectedId ?? '');
  const [term, setTerm] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const opts = c.solution.verdictOptions;
  const revealed = inv.hintsUsed.map((h) => c.hints.find((x) => x.id === h.hintId)).filter((h): h is NonNullable<typeof h> => !!h);

  const run = async (action: AssistantAction, label: string, extra: { evidenceId?: string; term?: string; hypothesisA?: string; hypothesisB?: string } = {}) => {
    setBusy(true);
    try {
      const reply = await askAssistant(c, inv, { action, ...extra }, state.settings.useAiBackend);
      if (reply.hintId) dispatch({ type: 'HINT_USE', caseId: c.id, hintId: reply.hintId, now: nowIso() });
      setMsgs((m) => [{ id: ++mid, label, reply }, ...m].slice(0, 12));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel className="p-5 lg:col-span-1" aria-label="Assistant tools">
        <SectionTitle title="Assistant" subtitle="Explains and nudges. Never reveals the answer and never affects your score." />
        <div className="space-y-4 text-sm">
          <div>
            <label className="label" htmlFor="as-ev">Evidence</label>
            <select id="as-ev" className="field" value={evId} onChange={(e) => setEvId(e.target.value)}>
              <option value="">Choose inspected evidence…</option>
              {c.evidence.filter((e) => inv.inspected.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.id} — {e.title}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={busy || !evId} onClick={() => run('explain_evidence', 'Explain evidence', { evidenceId: evId })}>Explain this evidence</button>
          </div>
          <div>
            <label className="label" htmlFor="as-term">Glossary term</label>
            <input id="as-term" className="field" value={term} maxLength={60} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. DKIM" />
            <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={busy || !term.trim()} onClick={() => run('explain_term', 'Explain term', { term })}>Explain term</button>
          </div>
          <div>
            <p className="label">Compare hypotheses</p>
            <select className="field" aria-label="Hypothesis A" value={a} onChange={(e) => setA(e.target.value)}><option value="">Hypothesis A…</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            <select className="field mt-2" aria-label="Hypothesis B" value={b} onChange={(e) => setB(e.target.value)}><option value="">Hypothesis B…</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
            <button type="button" className="btn btn-secondary btn-sm mt-2" disabled={busy || !a || !b || a === b} onClick={() => run('compare_hypotheses', 'Compare hypotheses', { hypothesisA: a, hypothesisB: b })}>Compare</button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => run('inconsistencies', 'Check inconsistencies')}>Check inconsistencies</button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => run('next_steps', 'Suggest next steps')}>Next steps</button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => run('review_report', 'Review my draft')}>Review my draft</button>
          </div>
          <div className="border-t border-white/10 pt-4">
            <p className="label">Hints {inv.hintPenalty ? '(cost points)' : '(free in practice mode)'}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-violet btn-sm" disabled={busy} onClick={() => run('subtle_hint', 'Subtle hint')}><Lightbulb className="h-4 w-4" aria-hidden="true" />Subtle hint</button>
              <button type="button" className="btn btn-violet btn-sm" disabled={busy} onClick={() => run('stronger_hint', 'Stronger hint')}>Stronger hint</button>
            </div>
            {inv.hintPenalty && <p className="mt-2 text-xs text-slate-500">Each hint stage lowers your independence score (later stages cost more). Hints used: {inv.hintsUsed.length}.</p>}
          </div>
        </div>
      </Panel>

      <div className="space-y-4 lg:col-span-2">
        {revealed.length > 0 && (
          <Panel className="p-4" aria-label="Hints revealed">
            <h3 className="text-sm">Hints you have revealed</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-300">{revealed.map((h) => <li key={h.id}><Badge tone="violet">Stage {h.stage}</Badge> <span className="evidence-text">{h.text}</span></li>)}</ul>
          </Panel>
        )}
        {msgs.length === 0 ? (
          <Notice title="Ask for help">Use the tools on the left. The assistant works offline from the evidence you have opened, so it will not mention anything you have not found yet.</Notice>
        ) : (
          <ul className="space-y-3" aria-live="polite">
            {msgs.map((m) => (
              <li key={m.id} className="panel p-4">
                <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4 text-cyan2-400" aria-hidden="true" />{m.label}</span><Badge>{m.reply.source === 'llm' ? 'AI' : 'Offline'}</Badge></div>
                <p className="evidence-text mt-2 text-sm text-slate-200">{m.reply.text}</p>
                {m.reply.bullets && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">{m.reply.bullets.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
