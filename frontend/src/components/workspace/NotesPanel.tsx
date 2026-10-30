import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { CaseFile, Investigation } from '@/types';
import { EmptyState, Panel, SectionTitle } from '@/components/ui';
import { nowIso, useApp } from '@/store/AppContext';
import { LIMITS } from '@/store/reducer';
import { fmtClock } from '@/utils/format';

let seq = 0;
export function NotesPanel({ c, inv }: { c: CaseFile; inv: Investigation }) {
  const { dispatch } = useApp();
  const [text, setText] = useState('');
  const [ev, setEv] = useState('');
  const add = () => {
    if (!text.trim()) return;
    const now = nowIso();
    dispatch({ type: 'NOTE_ADD', caseId: c.id, text, evidenceId: ev || undefined, id: `n-${Date.now().toString(36)}-${++seq}`, now });
    setText('');
  };
  return (
    <Panel className="p-5" aria-label="Notes">
      <SectionTitle title="Investigator notes" subtitle="Private scratchpad. Notes are not scored; they help you reason." />
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="space-y-2">
        <label className="label" htmlFor="note-text">New note</label>
        <textarea id="note-text" className="field min-h-[5rem]" maxLength={LIMITS.note} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="note-ev">Link to evidence</label>
          <select id="note-ev" className="field w-auto" value={ev} onChange={(e) => setEv(e.target.value)}>
            <option value="">No linked evidence</option>
            {c.evidence.filter((e) => inv.inspected.includes(e.id)).map((e) => <option key={e.id} value={e.id}>{e.id} — {e.title}</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>Add note</button>
        </div>
      </form>
      {inv.notes.length === 0 ? <div className="mt-4"><EmptyState title="No notes yet" /></div> : (
        <ul className="mt-4 space-y-2">
          {inv.notes.map((n) => (
            <li key={n.id} className="panel-quiet flex items-start justify-between gap-3 p-3 text-sm">
              <div>
                <p className="evidence-text text-slate-200">{n.text}</p>
                <p className="mt-1 text-xs text-slate-500">{fmtClock(n.createdAt)} UTC{n.evidenceId ? ` · ${n.evidenceId}` : ''}</p>
              </div>
              <button type="button" className="text-slate-400 hover:text-alert-400" aria-label="Delete note" onClick={() => dispatch({ type: 'NOTE_REMOVE', caseId: c.id, id: n.id })}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
