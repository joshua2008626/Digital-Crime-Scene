import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Download, Network, Printer, RotateCcw } from 'lucide-react';
import { getCase } from '@/data/cases';
import { useApp } from '@/store/AppContext';
import { Badge, EmptyState, Panel, ProgressBar, SectionTitle, btnClass } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { downloadText } from '@/utils/export';
import { formatDuration } from '@/utils/progress';
import { fmtDateTime, pct } from '@/utils/format';

export default function Report() {
  const { caseId = '' } = useParams();
  const [params] = useSearchParams();
  const c = getCase(caseId);
  const { state } = useApp();
  useDocumentTitle(c ? `${c.title} — report` : 'Report');
  const all = state.reports.filter((r) => r.caseId === caseId);
  const wanted = params.get('r');
  const r = all.find((x) => x.id === wanted) ?? all[all.length - 1];

  if (!c || !r) return <div className="container-app py-12"><EmptyState title="No report yet" body="Submit a verdict in the workspace to generate a report." action={<Link to={c ? `/case/${c.id}` : '/cases'} className={btnClass('primary')}>Go to case</Link>} /></div>;

  const title = (id: string) => c.evidence.find((e) => e.id === id)?.title ?? id;
  const verdictLabel = (id: string) => c.solution.verdictOptions.find((o) => o.id === id)?.label ?? id;
  const correctLabel = verdictLabel(c.solution.correctVerdictId);
  const exportMd = () => {
    const lines = [`# ${c.title} — Investigation report`, '', `Score: ${r.score}/100 (${r.grade}) · XP earned: ${r.xpEarned} · Mode: ${r.mode}`, `Your verdict: ${verdictLabel(r.verdictId)}`, `Outcome: ${r.verdictCorrect ? 'correct' : 'incorrect'}`, '', '## Summary', r.summary, '', '## Scoring', ...r.categories.map((x) => `- ${x.label}: ${x.points.toFixed(1)}/${x.weight}`), '', '## Your conclusion', r.draft.conclusion, '', '## Explanation', ...r.explanation, '', '## Limitations', ...r.limitations.map((l) => `- ${l}`), '', '_All data in this case is fictional._'];
    downloadText(`report-${c.slug}.md`, lines.join('\n'), 'text/markdown;charset=utf-8');
  };

  return (
    <div className="container-app max-w-5xl py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <Link to="/cases" className="text-sm text-slate-400 hover:text-white">← All cases</Link>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnClass('secondary', 'sm')} onClick={exportMd}><Download className="h-4 w-4" aria-hidden="true" />Export .md</button>
          <button type="button" className={btnClass('secondary', 'sm')} onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden="true" />Print</button>
          <Link to={`/case/${c.id}/graph`} className={btnClass('secondary', 'sm')}><Network className="h-4 w-4" aria-hidden="true" />Graph</Link>
          <Link to={`/cases/${c.id}`} className={btnClass('primary', 'sm')}><RotateCcw className="h-4 w-4" aria-hidden="true" />Replay</Link>
        </div>
      </div>

      <header className="mt-4">
        <p className="mono text-xs text-slate-500">ATTEMPT {r.attempt} · {fmtDateTime(r.createdAt)} · {r.mode}</p>
        <h1 className="mt-1 text-3xl">{c.title}: report</h1>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="panel px-6 py-3 text-center"><p className="text-4xl font-semibold">{r.score}</p><p className="text-xs text-slate-400">of 100 · grade {r.grade}</p></div>
          <div className="space-y-1 text-sm"><p><Badge tone={r.verdictCorrect ? 'ok' : 'warn'}>{r.verdictCorrect ? 'Correct verdict' : 'Verdict needs rework'}</Badge></p><p className="text-slate-300">You chose: {verdictLabel(r.verdictId)}</p><p className="text-slate-400">+{r.xpEarned} XP · {formatDuration(r.elapsedSec)} · {r.hintsUsed} hint{r.hintsUsed === 1 ? '' : 's'}</p></div>
        </div>
        <p className="mt-4 text-slate-300">{r.summary}</p>
        {r.attempt > 1 && all.length > 1 && <p className="mt-2 text-xs text-slate-500">Other attempts: {all.filter((x) => x.id !== r.id).map((x) => <Link key={x.id} className="mr-2 text-cyan2-400 hover:underline" to={`/case/${c.id}/report?r=${encodeURIComponent(x.id)}`}>#{x.attempt} ({x.score})</Link>)}</p>}
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel className="p-5" aria-label="Score breakdown">
          <SectionTitle title="Score breakdown" subtitle="Deterministic rubric. No AI decides your score." />
          <ul className="space-y-4">{r.categories.map((x) => (
            <li key={x.key}><div className="flex justify-between text-sm"><span>{x.label}</span><span className="mono">{x.points.toFixed(1)} / {x.weight}</span></div><ProgressBar className="mt-1" value={x.ratio * 100} label={x.label} tone={x.ratio >= 0.75 ? 'ok' : 'cyan'} />
              {x.feedback.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs text-slate-400">{x.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul>}</li>))}</ul>
          <h3 className="label mt-5">XP</h3><ul className="text-sm text-slate-300">{r.xpBreakdown.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </Panel>

        <Panel className="p-5" aria-label="Evidence review">
          <SectionTitle title="Evidence review" />
          <h3 className="label">Strong evidence you cited ({r.correctEvidence.length})</h3>
          <ul className="mb-3 text-sm text-slate-300">{r.correctEvidence.map((id) => <li key={id}><span className="mono text-xs text-verified-400">✓ {id}</span> {title(id)}</li>)}{r.correctEvidence.length === 0 && <li className="text-slate-500">None</li>}</ul>
          <h3 className="label">Important evidence you did not cite ({r.missedEvidence.length})</h3>
          <ul className="mb-3 text-sm text-slate-300">{r.missedEvidence.map((id) => <li key={id}><span className="mono text-xs text-warn-400">○ {id}</span> {title(id)}</li>)}{r.missedEvidence.length === 0 && <li className="text-slate-500">None</li>}</ul>
          <h3 className="label">Misleading evidence you relied on ({r.citedRedHerrings.length})</h3>
          <ul className="text-sm text-slate-300">{r.citedRedHerrings.map((id) => { const e = c.evidence.find((x) => x.id === id); return <li key={id} className="mb-1"><span className="mono text-xs text-warn-400">! {id}</span> {title(id)}{e?.redHerringReason && <span className="block text-xs text-slate-400">{e.redHerringReason}</span>}</li>; })}{r.citedRedHerrings.length === 0 && <li className="text-slate-500">None — well done.</li>}</ul>
          <p className="mt-4 text-sm text-slate-400">Timeline accuracy: {pct(r.timelineAccuracy)}</p>
        </Panel>

        <Panel className="p-5" aria-label="Reasoning">
          <SectionTitle title="Reasoning" />
          {r.satisfiedReasoning.length > 0 && <><h3 className="label">You covered</h3><ul className="mb-3 list-disc pl-5 text-sm text-slate-300">{r.satisfiedReasoning.map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {r.missedReasoning.length > 0 && <><h3 className="label">You could add</h3><ul className="mb-3 space-y-2 text-sm text-slate-300">{r.missedReasoning.map((x) => <li key={x.id}><strong>{x.label}</strong><span className="block text-xs text-slate-400">{x.explanation}</span></li>)}</ul></>}
          {r.unsupported.length > 0 && <><h3 className="label">Unsupported assumptions</h3><ul className="space-y-2 text-sm text-slate-300">{r.unsupported.map((x) => <li key={x.id}><strong>{x.label}</strong><span className="block text-xs text-slate-400">{x.explanation}</span></li>)}</ul></>}
          <h3 className="label mt-3">Your conclusion</h3><p className="evidence-text panel-quiet p-3 text-sm text-slate-300">{r.draft.conclusion}</p>
        </Panel>

        <Panel className="p-5" aria-label="Response actions">
          <SectionTitle title="Defensive response" />
          <ul className="space-y-2 text-sm">{r.actionResults.map((a) => (
            <li key={a.id} className="panel-quiet p-2"><div className="flex items-center justify-between gap-2"><span>{a.label}</span><span className="flex gap-1"><Badge tone={a.quality === 'essential' ? 'ok' : a.quality === 'harmful' ? 'alert' : a.quality === 'good' ? 'cyan' : 'neutral'}>{a.quality}</Badge><Badge tone={a.chosen ? 'violet' : 'neutral'}>{a.chosen ? 'chosen' : 'not chosen'}</Badge></span></div><p className="mt-1 text-xs text-slate-400">{a.explanation}</p></li>))}</ul>
        </Panel>
      </div>

      <Panel className="mt-5 p-5" aria-label="What happened">
        <SectionTitle title="What actually happened" subtitle={`The best-supported conclusion: ${correctLabel}`} />
        <div className="space-y-2 text-sm text-slate-300">{r.explanation.map((p, i) => <p key={i}>{p}</p>)}</div>
        <h3 className="label mt-4">What the evidence cannot tell us</h3><ul className="list-disc pl-5 text-sm text-slate-300">{r.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <h3 className="label mt-4">Next steps for you</h3><ul className="list-disc pl-5 text-sm text-slate-300">{r.recommendations.map((l, i) => <li key={i}>{l}</li>)}</ul>
        <p className="mt-4 text-xs text-slate-500">Topics: {r.learningTopics.join(' · ')}. All people, systems and data in this case are fictional.</p>
      </Panel>
    </div>
  );
}
