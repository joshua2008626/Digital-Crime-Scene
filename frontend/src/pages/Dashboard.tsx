import { Link } from 'react-router-dom';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { Award, Target, Trophy } from 'lucide-react';
import { CASES } from '@/data/cases';
import { ACHIEVEMENTS } from '@/data/achievements';
import { useApp, nowIso } from '@/store/AppContext';
import { Badge, EmptyState, Panel, ProgressBar, SectionTitle, btnClass } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { accuracy, bestReports, rankFor, skillProfile } from '@/utils/progress';
import { caseProgress } from '@/utils/investigation';
import { fmtAgo } from '@/utils/format';

export default function Dashboard() {
  useDocumentTitle('Dashboard');
  const { state } = useApp();
  const info = rankFor(state.xp);
  const acc = accuracy(state.reports);
  const skills = skillProfile(state.reports);
  const best = bestReports(state);
  const unlocked = Object.keys(state.achievements).length;
  const now = nowIso();
  const active = CASES.filter((c) => state.investigations[c.id]?.status === 'active');

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl">Welcome back, {state.profile.name || 'Investigator'}</h1>
      <p className="text-sm text-slate-400">Every click leaves a trace.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel className="p-4" aria-label="Rank"><p className="label">Rank</p><p className="text-lg font-semibold">{info.rank.title}</p><ProgressBar className="mt-2" value={info.progress * 100} label="Progress to next rank" tone="violet" /><p className="mt-1 text-xs text-slate-500">{info.next ? `${info.xpToNext} XP to ${info.next.title}` : 'Top rank reached'}</p></Panel>
        <Panel className="p-4" aria-label="XP"><p className="label">Total XP</p><p className="text-2xl font-semibold">{state.xp}</p></Panel>
        <Panel className="p-4" aria-label="Accuracy"><p className="label">Verdict accuracy</p><p className="text-2xl font-semibold">{acc.verdictRate === null ? '—' : `${acc.verdictRate}%`}</p><p className="text-xs text-slate-500">{acc.attempts} submission{acc.attempts === 1 ? '' : 's'}{acc.averageScore !== null && ` · avg ${acc.averageScore}`}</p></Panel>
        <Panel className="p-4" aria-label="Achievements"><p className="label">Achievements</p><p className="text-2xl font-semibold">{unlocked}/{ACHIEVEMENTS.length}</p></Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel className="p-5" aria-label="Cases">
            <SectionTitle title="Cases" action={<Link to="/cases" className="text-sm text-cyan2-400 hover:underline">All cases</Link>} />
            <ul className="divide-y divide-white/5">
              {CASES.map((c) => {
                const inv = state.investigations[c.id];
                const b = best[c.id];
                return (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link to={`/cases/${c.id}`} className="font-medium hover:text-cyan2-300">{c.title}</Link>
                      <p className="text-xs text-slate-500">{c.difficulty}</p>
                      {inv?.status === 'active' && <ProgressBar className="mt-2 max-w-xs" value={caseProgress(c, inv)} label={`${c.title} progress`} />}
                    </div>
                    {b ? <Badge tone="ok">Best {b.score} · {b.grade}</Badge> : inv?.status === 'active' ? <Badge tone="cyan">In progress</Badge> : <Badge>Not started</Badge>}
                  </li>
                );
              })}
            </ul>
            {active.length > 0 && <Link to={`/case/${active[0].id}`} className={btnClass('primary', 'md', 'mt-3')}>Resume “{active[0].title}”</Link>}
          </Panel>

          <Panel className="p-5" aria-label="Recent activity">
            <SectionTitle title="Recent activity" />
            {state.activity.length === 0 ? <EmptyState title="Nothing yet" body="Open a case to get started." /> : (
              <ul className="space-y-2 text-sm">
                {state.activity.slice(0, 8).map((a) => (
                  <li key={a.id} className="flex justify-between gap-3"><span className="text-slate-300">{a.text}</span><span className="shrink-0 text-xs text-slate-500">{fmtAgo(a.at, now)}</span></li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel className="p-5" aria-label="Skill profile">
            <SectionTitle title="Skill profile" subtitle="Average across your submissions" />
            {skills ? (
              <>
                <div className="h-64" role="img" aria-label={`Skill radar: ${skills.map((s) => `${s.label} ${s.value}%`).join(', ')}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={skills} outerRadius="70%">
                      <PolarGrid stroke="rgba(255,255,255,0.12)" />
                      <PolarAngleAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="sr-only">{skills.map((s) => <li key={s.key}>{s.label}: {s.value}%</li>)}</ul>
              </>
            ) : <EmptyState title="No data yet" body="Submit a verdict to see your skills." icon={<Target className="h-6 w-6" aria-hidden="true" />} />}
          </Panel>
          <Panel className="p-5" aria-label="Labs">
            <SectionTitle title="Labs" />
            <div className="flex flex-col gap-2">
              <Link to="/phishing" className={btnClass('secondary')}><Award className="h-4 w-4" aria-hidden="true" /> Phishing Lab</Link>
              <Link to="/logs" className={btnClass('secondary')}><Trophy className="h-4 w-4" aria-hidden="true" /> Log Lab</Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
