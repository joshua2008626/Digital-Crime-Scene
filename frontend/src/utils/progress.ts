import type { AppState, Report, RubricWeights } from '@/types';

export interface Rank {
  title: string;
  minXp: number;
}

export const RANKS: Rank[] = [
  { title: 'Rookie Examiner', minXp: 0 },
  { title: 'Analyst', minXp: 150 },
  { title: 'Senior Analyst', minXp: 400 },
  { title: 'Investigator', minXp: 800 },
  { title: 'Lead Investigator', minXp: 1400 },
  { title: 'Chief Forensic Examiner', minXp: 2200 },
];

export interface RankInfo {
  level: number; // 1-based
  rank: Rank;
  next?: Rank;
  /** 0..1 progress toward the next rank (1 at the top rank). */
  progress: number;
  xpToNext: number;
}

export function rankFor(xp: number): RankInfo {
  const safe = Math.max(0, Math.floor(xp));
  let idx = 0;
  for (let i = 0; i < RANKS.length; i++) if (safe >= RANKS[i].minXp) idx = i;
  const rank = RANKS[idx];
  const next = RANKS[idx + 1];
  if (!next) return { level: idx + 1, rank, progress: 1, xpToNext: 0 };
  return { level: idx + 1, rank, next, progress: (safe - rank.minXp) / (next.minXp - rank.minXp), xpToNext: next.minXp - safe };
}

export type SkillKey = keyof RubricWeights;

export const SKILL_LABELS: Record<SkillKey, string> = {
  evidence: 'Evidence analysis',
  reasoning: 'Reasoning',
  verdict: 'Verdict accuracy',
  support: 'Use of support',
  uncertainty: 'Handling uncertainty',
  defense: 'Defensive response',
  hints: 'Independence',
};

/** Average ratio (0..100) per skill across all reports; null when there are no reports yet. */
export function skillProfile(reports: Report[]): { key: SkillKey; label: string; value: number }[] | null {
  if (!reports.length) return null;
  return (Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => {
    const vals = reports.map((r) => r.categories.find((c) => c.key === key)?.ratio ?? 0);
    return { key, label: SKILL_LABELS[key], value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) };
  });
}

export interface Accuracy {
  attempts: number;
  verdictRate: number | null; // % of submissions with the correct verdict
  averageScore: number | null;
  evidencePrecision: number | null; // % of cited evidence that was relevant
}

export function accuracy(reports: Report[]): Accuracy {
  if (!reports.length) return { attempts: 0, verdictRate: null, averageScore: null, evidencePrecision: null };
  const verdict = reports.filter((r) => r.verdictCorrect).length / reports.length;
  const avg = reports.reduce((s, r) => s + r.score, 0) / reports.length;
  const cited = reports.reduce((s, r) => s + r.correctEvidence.length + r.citedRedHerrings.length, 0);
  const good = reports.reduce((s, r) => s + r.correctEvidence.length, 0);
  return {
    attempts: reports.length,
    verdictRate: Math.round(verdict * 100),
    averageScore: Math.round(avg),
    evidencePrecision: cited ? Math.round((good / cited) * 100) : null,
  };
}

/** Best report per case (highest score), for dashboards. */
export function bestReports(state: Pick<AppState, 'reports'>): Record<string, Report> {
  const best: Record<string, Report> = {};
  for (const r of state.reports) if (!best[r.caseId] || r.score > best[r.caseId].score) best[r.caseId] = r;
  return best;
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
}
