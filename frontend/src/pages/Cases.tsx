import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search } from 'lucide-react';
import { CASES } from '@/data/cases';
import { useApp } from '@/store/AppContext';
import { Badge, DifficultyBadge, EmptyState, ProgressBar, SectionTitle } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { bestReports } from '@/utils/progress';
import { caseProgress } from '@/utils/investigation';
import type { Difficulty } from '@/types';

export default function Cases() {
  useDocumentTitle('Cases');
  const { state } = useApp();
  const [q, setQ] = useState('');
  const [diff, setDiff] = useState<'all' | Difficulty>('all');
  const best = bestReports(state);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return CASES.filter((c) => (diff === 'all' || c.difficulty === diff) && (!needle || `${c.title} ${c.tagline} ${c.categories.join(' ')}`.toLowerCase().includes(needle)));
  }, [q, diff]);

  return (
    <div className="container-app py-8">
      <SectionTitle title="Case files" subtitle="Pick an incident. Beginner cases teach the method; advanced cases are full of ambiguity." />
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden="true" />
          <input className="field pl-9" type="search" placeholder="Search cases" aria-label="Search cases" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="field w-auto" aria-label="Filter by difficulty" value={diff} onChange={(e) => setDiff(e.target.value as 'all' | Difficulty)}>
          <option value="all">All difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>
      {list.length === 0 ? (
        <EmptyState title="No matching cases" body="Try clearing the search or the difficulty filter." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map((c) => {
            const inv = state.investigations[c.id];
            const active = inv?.status === 'active';
            const done = best[c.id];
            return (
              <li key={c.id} className="panel flex flex-col p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-xs text-slate-500">CASE {String(c.number).padStart(2, '0')}</span>
                  <DifficultyBadge difficulty={c.difficulty} />
                  {done && <Badge tone="ok">Best {done.score} · {done.grade}</Badge>}
                  {active && <Badge tone="cyan">In progress</Badge>}
                </div>
                <h3 className="mt-2 text-lg">{c.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-400">{c.tagline}</p>
                <p className="mt-3 flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" /> about {c.estimatedMinutes} min · {c.evidence.length} evidence items
                </p>
                {active && inv && <ProgressBar className="mt-3" value={caseProgress(c, inv)} label={`${c.title} progress`} />}
                <Link to={`/cases/${c.id}`} className="btn btn-secondary mt-4 self-start">
                  {active ? 'Review & resume' : done ? 'View / replay' : 'View case'}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
