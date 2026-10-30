import type { CaseFile, Investigation } from '@/types';
import { Badge, Panel, ProgressBar, SectionTitle } from '@/components/ui';
import { objectiveProgress } from '@/utils/investigation';
import { CheckCircle2, Circle } from 'lucide-react';

export function BriefingPanel({ c, inv }: { c: CaseFile; inv: Investigation }) {
  const objs = objectiveProgress(c, inv);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel className="p-5 lg:col-span-2" aria-label="Briefing">
        <SectionTitle title="Briefing" subtitle="All people, accounts, hosts and organisations in this case are fictional." />
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">{c.briefing.map((p, i) => <p key={i}>{p}</p>)}</div>
        <h3 className="mt-6 mb-2 text-sm">Entities</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {c.entities.map((e) => (
            <li key={e.id} className="panel-quiet p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><span className="font-medium">{e.name}</span><Badge>{e.kind}</Badge></div>
              <p className="mt-0.5 text-xs text-slate-400">{e.role}</p>
              {e.note && <p className="mt-1 text-xs text-slate-500">{e.note}</p>}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel className="p-5" aria-label="Objectives">
        <SectionTitle title="Objectives" subtitle="Inspect evidence to advance them." />
        <ul className="space-y-3">
          {objs.map((o) => (
            <li key={o.objective.id} className="text-sm">
              <div className="flex items-start gap-2">
                {o.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified-400" aria-label="Done" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-label="Not done" />}
                <span className={o.done ? 'text-slate-300' : 'text-slate-200'}>{o.objective.text}</span>
              </div>
              <ProgressBar className="mt-1.5" value={(Math.min(o.have, o.need) / o.need) * 100} label={`${o.objective.text} progress`} tone={o.done ? 'ok' : 'cyan'} />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
