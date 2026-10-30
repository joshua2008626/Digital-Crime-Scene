import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Clock, Network } from 'lucide-react';
import { getCase } from '@/data/cases';
import { useApp } from '@/store/AppContext';
import { Badge, DifficultyBadge, EmptyState, ProgressBar, Tabs, TabPanel, btnClass } from '@/components/ui';
import { BriefingPanel } from '@/components/workspace/BriefingPanel';
import { EvidencePanel } from '@/components/workspace/EvidencePanel';
import { NotesPanel } from '@/components/workspace/NotesPanel';
import { AssistantPanel } from '@/components/workspace/AssistantPanel';
import { VerdictPanel } from '@/components/workspace/VerdictPanel';
import { useDocumentTitle, useInterval } from '@/hooks';
import { caseProgress } from '@/utils/investigation';
import { formatDuration } from '@/utils/progress';

export default function Workspace() {
  const { caseId = '' } = useParams();
  const c = getCase(caseId);
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState('briefing');
  const [selected, setSelected] = useState<string | null>(null);
  const inv = c ? state.investigations[c.id] : undefined;
  const active = !!inv && inv.status === 'active';
  useDocumentTitle(c ? `${c.title} — workspace` : 'Case not found');

  // Count time only while the tab is visible.
  useInterval(() => {
    if (c && document.visibilityState === 'visible') dispatch({ type: 'TICK', caseId: c.id, seconds: 1 });
  }, 1000, active);

  if (!c) return <div className="container-app py-12"><EmptyState title="Case not found" action={<Link to="/cases" className={btnClass('primary')}>All cases</Link>} /></div>;
  if (!inv) return <Navigate to={`/cases/${c.id}`} replace />;
  if (inv.status === 'completed') return <Navigate to={`/case/${c.id}/report`} replace />;

  const remaining = inv.timed ? inv.timeLimitSec - inv.elapsedSec : null;

  return (
    <div className="container-app py-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><DifficultyBadge difficulty={c.difficulty} /><Badge tone="violet">{inv.mode}</Badge>{!inv.hintPenalty && <Badge>practice hints</Badge>}</div>
          <h1 className="mt-1 text-xl">{c.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-slate-300" role="timer" aria-label="Elapsed time"><Clock className="h-4 w-4" aria-hidden="true" />{formatDuration(inv.elapsedSec)}</span>
          {remaining !== null && <Badge tone={remaining < 0 ? 'warn' : 'cyan'}>{remaining >= 0 ? `${formatDuration(remaining)} left` : 'Time bonus lost'}</Badge>}
          <div className="w-36"><ProgressBar value={caseProgress(c, inv)} label="Case progress" /></div>
          <Link to={`/case/${c.id}/graph`} className={btnClass('secondary', 'sm')}><Network className="h-4 w-4" aria-hidden="true" />Evidence graph</Link>
        </div>
      </header>

      <Tabs label="Workspace sections" value={tab} onChange={setTab} tabs={[
        { id: 'briefing', label: 'Briefing' },
        { id: 'evidence', label: `Evidence (${inv.inspected.length}/${c.evidence.length})` },
        { id: 'notes', label: `Notes (${inv.notes.length})` },
        { id: 'assistant', label: 'Assistant' },
        { id: 'verdict', label: 'Verdict' },
      ]} />
      <div className="mt-5">
        <TabPanel id="briefing" active={tab === 'briefing'}><BriefingPanel c={c} inv={inv} /></TabPanel>
        <TabPanel id="evidence" active={tab === 'evidence'}><EvidencePanel c={c} inv={inv} selectedId={selected} onSelect={setSelected} /></TabPanel>
        <TabPanel id="notes" active={tab === 'notes'}><NotesPanel c={c} inv={inv} /></TabPanel>
        <TabPanel id="assistant" active={tab === 'assistant'}><AssistantPanel c={c} inv={inv} selectedId={selected} /></TabPanel>
        <TabPanel id="verdict" active={tab === 'verdict'}><VerdictPanel c={c} inv={inv} /></TabPanel>
      </div>
    </div>
  );
}
