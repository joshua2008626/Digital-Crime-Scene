import { useRef, useState } from 'react';
import { Award, Download, Lock, Upload } from 'lucide-react';
import { ACHIEVEMENTS } from '@/data/achievements';
import { nowIso, useApp } from '@/store/AppContext';
import { Badge, ConfirmDialog, Notice, Panel, ProgressBar, SectionTitle } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useDocumentTitle } from '@/hooks';
import { exportState, parseState } from '@/store/persist';
import { downloadText } from '@/utils/export';
import { accuracy, rankFor, RANKS } from '@/utils/progress';
import { apiConfigured } from '@/services/api';
import { pullProgress, pushProgress } from '@/services/sync';
import { fmtDateTime } from '@/utils/format';
import type { Mode } from '@/types';

export default function Profile() {
  useDocumentTitle('Profile');
  const { state, dispatch } = useApp();
  const toast = useToast();
  const info = rankFor(state.xp);
  const acc = accuracy(state.reports);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const s = state.settings;
  const set = (patch: Partial<typeof s>) => dispatch({ type: 'SETTINGS_UPDATE', patch });

  const [busy, setBusy] = useState(false);
  const cloud = async (dir: 'push' | 'pull') => {
    setBusy(true);
    try {
      if (dir === 'push') { const r = await pushProgress(state); toast.push(r.message, r.ok ? 'success' : 'warn'); }
      else { const r = await pullProgress(state, nowIso()); if (r.ok && r.state) dispatch({ type: 'IMPORT', state: r.state }); toast.push(r.message, r.ok ? 'success' : 'warn'); }
    } finally { setBusy(false); }
  };
  const onImport = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) { toast.push('That file is too large to be a backup.', 'warn'); return; }
    const text = await file.text();
    const parsed = parseState(text, nowIso(), state.profile.guestId);
    if (!parsed) { toast.push('That file is not a valid Digital Crime Scene backup.', 'warn'); return; }
    dispatch({ type: 'IMPORT', state: parsed });
    toast.push('Progress imported.', 'success');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="container-app max-w-5xl py-8">
      <h1 className="text-2xl">Profile</h1>
      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <Panel className="p-5 md:col-span-2" aria-label="Identity">
          <label className="label" htmlFor="pname">Display name</label>
          <input id="pname" className="field max-w-sm" maxLength={40} value={state.profile.name} onChange={(e) => dispatch({ type: 'PROFILE_NAME', name: e.target.value })} placeholder="Investigator" />
          <p className="mt-1 text-xs text-slate-500">Stored only in this browser. Guest since {fmtDateTime(state.profile.createdAt)}.</p>
          <div className="mt-5"><p className="text-lg font-semibold">{info.rank.title} · {state.xp} XP</p><ProgressBar className="mt-2" value={info.progress * 100} label="Progress to next rank" tone="violet" /><p className="mt-1 text-xs text-slate-500">{info.next ? `${info.xpToNext} XP to ${info.next.title}` : 'Top rank reached'}</p></div>
          <ol className="mt-3 flex flex-wrap gap-2 text-xs">{RANKS.map((r) => <li key={r.title}><Badge tone={state.xp >= r.minXp ? 'violet' : 'neutral'}>{r.title} ({r.minXp})</Badge></li>)}</ol>
        </Panel>
        <Panel className="p-5" aria-label="Stats">
          <SectionTitle title="Stats" />
          <dl className="grid grid-cols-2 gap-y-2 text-sm"><dt className="text-slate-500">Submissions</dt><dd>{acc.attempts}</dd><dt className="text-slate-500">Verdict accuracy</dt><dd>{acc.verdictRate === null ? '—' : `${acc.verdictRate}%`}</dd><dt className="text-slate-500">Average score</dt><dd>{acc.averageScore ?? '—'}</dd><dt className="text-slate-500">Evidence precision</dt><dd>{acc.evidencePrecision === null ? '—' : `${acc.evidencePrecision}%`}</dd></dl>
        </Panel>
      </div>

      <Panel className="mt-5 p-5" aria-label="Achievements">
        <SectionTitle title="Achievements" subtitle={`${Object.keys(state.achievements).length} of ${ACHIEVEMENTS.length} unlocked · +25 XP each`} />
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const at = state.achievements[a.id];
            return (
              <li key={a.id} className={`panel-quiet flex gap-3 p-3 ${at ? 'border-verified-400/30' : 'opacity-70'}`}>
                {at ? <Award className="mt-0.5 h-5 w-5 shrink-0 text-verified-400" aria-hidden="true" /> : <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />}
                <div><p className="text-sm font-medium">{a.title}<span className="sr-only">{at ? ' (unlocked)' : ' (locked)'}</span></p><p className="text-xs text-slate-400">{a.description}</p>{at && <p className="mt-1 text-[11px] text-slate-500">{fmtDateTime(at)}</p>}</div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel className="mt-5 p-5" aria-label="Settings">
        <SectionTitle title="Settings" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="dm">Default mode</label><select id="dm" className="field" value={s.defaultMode} onChange={(e) => set({ defaultMode: e.target.value as Mode })}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></div>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-cyan-400" checked={s.hintPenalty} onChange={(e) => set({ hintPenalty: e.target.checked })} />Hints cost points by default</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-cyan-400" checked={s.timedChallenges} onChange={(e) => set({ timedChallenges: e.target.checked })} />Timed challenges by default</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-cyan-400" checked={s.reducedMotion} onChange={(e) => set({ reducedMotion: e.target.checked })} />Reduce motion</label>
            <label className="flex items-center gap-2"><input type="checkbox" className="accent-cyan-400" checked={s.useAiBackend} disabled={!apiConfigured()} onChange={(e) => set({ useAiBackend: e.target.checked })} />Use optional AI assistant backend{!apiConfigured() && <span className="text-xs text-slate-500">(no backend configured)</span>}</label>
          </div>
        </div>
        {s.useAiBackend && <div className="mt-3"><Notice tone="neutral">When enabled, your questions to the assistant are sent to your configured backend. Hints, scoring and verdicts always stay in your browser.</Notice></div>}
      </Panel>

      <Panel className="mt-5 p-5" aria-label="Your data">
        <SectionTitle title="Your data" subtitle="Progress lives in this browser. Export a backup to move it or keep it safe." />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => downloadText('digital-crime-scene-backup.json', exportState(state), 'application/json;charset=utf-8')}><Download className="h-4 w-4" aria-hidden="true" />Export backup</button>
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" aria-hidden="true" />Import backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import backup file" onChange={(e) => void onImport(e.target.files?.[0])} />
          {apiConfigured() && <><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void cloud('push')}>Back up to server</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void cloud('pull')}>Restore from server</button></>}
          <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>Reset all progress</button>
        </div>
      </Panel>
      <ConfirmDialog open={confirmReset} danger title="Reset all progress?" body="This permanently deletes your XP, reports, achievements and notes from this browser. Export a backup first if you might want them." confirmLabel="Reset everything" onConfirm={() => { setConfirmReset(false); dispatch({ type: 'RESET', now: nowIso() }); toast.push('Progress reset.', 'info'); }} onCancel={() => setConfirmReset(false)} />
    </div>
  );
}
