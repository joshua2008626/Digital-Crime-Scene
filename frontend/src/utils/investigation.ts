import type { CaseFile, Investigation, Mode, VerdictDraft } from '@/types';

export const emptyDraft = (): VerdictDraft => ({
  verdictId: '',
  conclusion: '',
  supportingEvidenceIds: [],
  timeline: [],
  alternatives: '',
  confidence: 50,
  actionIds: [],
  actionNotes: '',
});

export const TIME_LIMIT_BY_DIFFICULTY = { beginner: 30 * 60, intermediate: 40 * 60, advanced: 50 * 60 } as const;

export interface NewInvestigationOptions {
  mode: Mode;
  timed: boolean;
  hintPenalty: boolean;
  attempt: number;
  now: string;
  id: string;
}

/** Creates a fresh investigation. Start evidence is handed over collected and inspected. */
export function createInvestigation(c: CaseFile, o: NewInvestigationOptions): Investigation {
  const nodes = c.startEvidenceIds.map((id, i) => ({ id, x: 40 + i * 260, y: 60 }));
  const edges = c.starterGraph.map((e, i) => ({
    id: `starter-${i}`,
    source: e.from,
    target: e.to,
    type: e.type,
    label: e.label,
  }));
  return {
    id: o.id,
    caseId: c.id,
    attempt: o.attempt,
    mode: o.mode,
    timed: o.timed,
    timeLimitSec: TIME_LIMIT_BY_DIFFICULTY[c.difficulty],
    hintPenalty: o.hintPenalty,
    startedAt: o.now,
    updatedAt: o.now,
    elapsedSec: 0,
    status: 'active',
    inspected: [...c.startEvidenceIds],
    collected: [...c.startEvidenceIds],
    notes: [],
    hintsUsed: [],
    graph: { nodes, edges },
    draft: emptyDraft(),
  };
}

/** Objective progress: counts inspected evidence toward each objective's threshold. */
export function objectiveProgress(c: CaseFile, inv: Investigation) {
  const seen = new Set(inv.inspected);
  return c.objectives.map((o) => {
    const have = o.evidenceIds.filter((id) => seen.has(id)).length;
    return { objective: o, have, need: o.threshold, done: have >= o.threshold };
  });
}

/** Overall 0..100 progress: inspected evidence share (60%) + objectives (40%). */
export function caseProgress(c: CaseFile, inv: Investigation): number {
  const ev = c.evidence.length ? inv.inspected.length / c.evidence.length : 0;
  const objs = objectiveProgress(c, inv);
  const ob = objs.length ? objs.filter((o) => o.done).length / objs.length : 0;
  return Math.round(Math.min(1, 0.6 * ev + 0.4 * ob) * 100);
}
