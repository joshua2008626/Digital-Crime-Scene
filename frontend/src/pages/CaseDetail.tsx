import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getCase } from '@/data/cases';
import { nowIso, useApp } from '@/store/AppContext';
import { Badge, ConfirmDialog, DifficultyBadge, EmptyState, Notice, Panel, SectionTitle } from '@/components/ui';
import { btnClass } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { BASE_XP, MODE_MULTIPLIER } from '@/utils/scoring';
import { TIME_LIMIT_BY_DIFFICULTY } from '@/utils/investigation';
import { formatDuration } from '@/utils/progress';
import type { Mode } from '@/types';

const MODES: { id: Mode; label: string; body: string }[] = [
  { id: 'beginner', label: 'Beginner', body: 'Analyst notes appear when you inspect evidence. XP ×0.8.' },
  { id: 'intermediate', label: 'Intermediate', body: 'No analyst notes. Hints available. XP ×1.' },
  { id: 'advanced', label: 'Advanced', body: 'No analyst notes. Expect ambiguity. XP ×1.25.' },
];

export default function CaseDetail() {
  const { caseId = '' } = useParams();
  const c = getCase(caseId);
  const nav = useNavigate();
  const { state, dispatch } = useApp();
  const [mode, setMode] = useState<Mode>(state.settings.defaultMode);
  const [timed, setTimed] = useState(state.settings.timedChallenges);
  const [penalty, setPenalty] = useState(state.settings.hintPenalty);
  const [confirmReplay, setConfirmReplay] = useState(false);
  useDocumentTitle(c ? c.title : 'Case not found');

  if (!c) return <div className="container-app py-12"><EmptyState title="Case not found" action={<Link to="/cases" className={btnClass('primary')}>All cases</Link>} /></div>;

  const inv = state.investigations[c.id];
  const active = inv?.status === 'active';
  const attempts = state.reports.filter((r) => r.caseId === c.id);
  const latest = attempts[attempts.length - 1];

  const start = () => {
    dispatch({ type: 'START', caseId: c.id, mode, timed, hintPenalty: penalty, now: nowIso() });
    nav(`/case/${c.id}`);
  };

  return (
    <div className="container-app max-w-4xl py-8">
      <Link to="/cases" className="text-sm text-slate-400 hover:text-white">← All cases</Link>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mono text-xs text-slate-500">CASE {String(c.number).padStart(2, '0')}</span>
        <DifficultyBadge difficulty={c.difficulty} />
        {c.categories.map((x) => <Badge key={x}>{x}</Badge>)}
      </div>
      <h1 className="mt-2 text-3xl">{c.title}</h1>
      <p className="mt-2 text-slate-300">{c.description}</p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Panel className="p-5" aria-label="What you will learn">
          <SectionTitle title="You will practise" />
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">{c.learningObjectives.map((o) => <li key={o}>{o}</li>)}</ul>
        </Panel>
        <Panel className="p-5" aria-label="Case facts">
          <SectionTitle title="Case facts" />
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Evidence items</dt><dd>{c.evidence.length}</dd>
            <dt className="text-slate-500">Estimated time</dt><dd>~{c.estimatedMinutes} min</dd>
            <dt className="text-slate-500">Base XP</dt><dd>{BASE_XP[c.difficulty]}</dd>
            <dt className="text-slate-500">Attempts</dt><dd>{attempts.length}</dd>
            {latest && (<><dt className="text-slate-500">Latest score</dt><dd>{latest.score} ({latest.grade})</dd></>)}
          </dl>
        </Panel>
      </div>

      {active && inv ? (
        <Panel className="mt-6 p-5" aria-label="Resume">
          <h2 className="text-lg">Investigation in progress</h2>
          <p className="mt-1 text-sm text-slate-400">Mode: {inv.mode} · {inv.inspected.length}/{c.evidence.length} items inspected · {formatDuration(inv.elapsedSec)} elapsed</p>
          <Link to={`/case/${c.id}`} className={btnClass('primary', 'md', 'mt-4')}>Resume investigation</Link>
        </Panel>
      ) : (
        <Panel className="mt-6 p-5" aria-label="Start options">
          <h2 className="text-lg">{attempts.length ? 'Replay this case' : 'Start investigation'}</h2>
          {attempts.length > 0 && <Notice tone="neutral">Replays award XP only for improving your best score on this case.</Notice>}
          <fieldset className="mt-4">
            <legend className="label">Mode</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {MODES.map((m) => (
                <label key={m.id} className={`panel-quiet cursor-pointer p-3 text-sm ${mode === m.id ? 'border-cyan2-400/60' : ''}`}>
                  <input type="radio" name="mode" className="mr-2 accent-cyan-400" checked={mode === m.id} onChange={() => setMode(m.id)} />
                  <span className="font-medium">{m.label}</span>
                  <span className="mt-1 block text-xs text-slate-400">{m.body}</span>
                  <span className="mt-1 block text-xs text-slate-500">XP ≈ {Math.round(BASE_XP[c.difficulty] * MODE_MULTIPLIER[m.id])} max</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-cyan-400" checked={timed} onChange={(e) => setTimed(e.target.checked)} /> Timed challenge ({formatDuration(TIME_LIMIT_BY_DIFFICULTY[c.difficulty])}) — small XP bonus if you finish in time</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-cyan-400" checked={penalty} onChange={(e) => setPenalty(e.target.checked)} /> Hint penalties (hints cost score; turn off for practice)</label>
          </div>
          <button type="button" className="btn btn-primary mt-5" onClick={() => (attempts.length ? setConfirmReplay(true) : start())}>
            {attempts.length ? 'Start replay' : 'Begin investigation'}
          </button>
        </Panel>
      )}
      <ConfirmDialog open={confirmReplay} title="Start a replay?" body="You will begin with a fresh investigation. Your previous reports and best XP are kept." confirmLabel="Start replay" onConfirm={() => { setConfirmReplay(false); start(); }} onCancel={() => setConfirmReplay(false)} />
    </div>
  );
}
