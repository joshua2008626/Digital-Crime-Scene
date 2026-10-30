import type { AppState, CaseFile, Investigation, Report } from '@/types';
import { ACHIEVEMENTS } from '@/data/achievements';
import { LOG_ANOMALY_COUNT } from '@/data/logs';

export const LOG_LAB_ID = 'log-lab-1';

export interface AchievementContext {
  /** The report just produced (if this evaluation follows a verdict submission). */
  latest?: Report;
  caseFile?: CaseFile;
  /** The investigation that just completed. */
  investigation?: Investigation;
  allCases: CaseFile[];
}

type Rule = (state: AppState, ctx: AchievementContext) => boolean;

const essentialClean = (r: Report): boolean => {
  const essential = r.actionResults.filter((a) => a.quality === 'essential');
  const harmful = r.actionResults.filter((a) => a.quality === 'harmful');
  return essential.length > 0 && essential.every((a) => a.chosen) && harmful.every((a) => !a.chosen);
};

const RULES: Record<string, Rule> = {
  first_case: (s) => s.reports.length >= 1,
  thorough: (_s, c) => !!c.caseFile && !!c.investigation && c.investigation.inspected.length === c.caseFile.evidence.length,
  sharp_eye: (_s, c) => !!c.latest && !!c.caseFile && c.caseFile.solution.keyEvidenceIds.every((id) => c.latest!.correctEvidence.includes(id)),
  clean_hands: (_s, c) => !!c.latest && c.latest.verdictCorrect && c.latest.citedRedHerrings.length === 0 && c.latest.correctEvidence.length > 0,
  unaided: (_s, c) => !!c.latest && c.latest.verdictCorrect && c.latest.hintsUsed === 0,
  calibrated: (_s, c) => !!c.latest && (c.latest.categories.find((x) => x.key === 'uncertainty')?.ratio ?? 0) >= 0.9,
  timeline_master: (_s, c) => !!c.latest && c.latest.timelineAccuracy === 1,
  defender: (_s, c) => !!c.latest && essentialClean(c.latest),
  graph_builder: (_s, c) => !!c.investigation && c.investigation.graph.edges.length >= 5,
  perfectionist: (_s, c) => !!c.latest && c.latest.score >= 95,
  advanced_mode: (_s, c) => !!c.latest && c.latest.mode === 'advanced' && c.latest.score >= 80,
  comeback: (s, c) => {
    if (!c.latest) return false;
    const earlier = s.reports.filter((r) => r.caseId === c.latest!.caseId && r.id !== c.latest!.id);
    if (!earlier.length) return false;
    const prevBest = Math.max(...earlier.map((r) => r.score));
    return c.latest.score - prevBest >= 15;
  },
  case_collector: (s, c) => c.allCases.length > 0 && c.allCases.every((cf) => s.reports.some((r) => r.caseId === cf.id && r.verdictCorrect)),
  phish_spotter: (s) => Object.values(s.phishing).filter((p) => p.correct).length >= 5,
  log_hunter: (s) => {
    const lab = s.logLab[LOG_LAB_ID];
    return !!lab && lab.checked && lab.correctFlags >= LOG_ANOMALY_COUNT && lab.falseFlags === 0;
  },
};

/** Returns ids of achievements newly earned (not already in state.achievements). Pure. */
export function evaluateAchievements(state: AppState, ctx: AchievementContext): string[] {
  return ACHIEVEMENTS.map((a) => a.id).filter((id) => !state.achievements[id] && RULES[id]?.(state, ctx));
}
