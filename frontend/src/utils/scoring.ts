// =====================================================================
// Deterministic verdict + scoring engine.
// Pure functions only: same input -> same report. No LLM is involved in scoring.
// The LLM (optional) may *explain* a result, never decide it.
// =====================================================================
import type {
  CaseFile,
  Investigation,
  Report,
  ScoreCategory,
  RubricWeights,
  Mode,
  Difficulty,
} from '@/types';
import { assertedWithoutHedge, clamp01, containsAny, hashString, lcsLength, matchesGroups, normalize } from './text';

export const MIN_CONCLUSION_CHARS = 40;

const CATEGORY_LABELS: Record<keyof RubricWeights, string> = {
  evidence: 'Correct evidence identification',
  reasoning: 'Quality of reasoning',
  verdict: 'Correct verdict',
  support: 'Appropriate use of supporting evidence',
  uncertainty: 'Recognition of uncertainty',
  defense: 'Defensive recommendations',
  hints: 'Efficient hint usage',
};

/** Fraction of the hint category lost per hint, by stage. */
export const HINT_COST: Record<1 | 2 | 3, number> = { 1: 0.1, 2: 0.2, 3: 0.35 };
const UNSUPPORTED_PENALTY = 0.15; // taken from the reasoning ratio per unsupported assumption
const RED_HERRING_PENALTY = 0.15; // taken from the evidence ratio per cited red herring
const WRONG_VERDICT_CAP = 64; // total score cap when the verdict earns < 50% credit

export const BASE_XP: Record<Difficulty, number> = { beginner: 100, intermediate: 160, advanced: 260 };
export const MODE_MULTIPLIER: Record<Mode, number> = { beginner: 0.8, intermediate: 1, advanced: 1.25 };

export interface EvaluateInput {
  caseFile: CaseFile;
  investigation: Investigation;
  now: string;
  /** Best XP already awarded for this case (replays only award improvement). */
  previousBestXp: number;
  /** Hashes of earlier submissions for this case (duplicate submissions award nothing). */
  previousHashes?: string[];
}

export function validateDraft(caseFile: CaseFile, inv: Investigation): string[] {
  const problems: string[] = [];
  const d = inv.draft;
  if (!d.verdictId) problems.push('Choose a verdict.');
  if (normalize(d.conclusion).length < MIN_CONCLUSION_CHARS)
    problems.push(`Write a conclusion of at least ${MIN_CONCLUSION_CHARS} characters explaining your reasoning.`);
  if (d.supportingEvidenceIds.length === 0) problems.push('Cite at least one piece of evidence.');
  const known = new Set(caseFile.evidence.map((e) => e.id));
  if (d.supportingEvidenceIds.some((id) => !known.has(id))) problems.push('One or more cited evidence IDs are invalid.');
  return problems;
}

export function timelineAccuracy(caseFile: CaseFile, submitted: string[]): number {
  const canonical = caseFile.solution.timelineOrder;
  if (canonical.length === 0) return 1;
  const unique = Array.from(new Set(submitted));
  if (unique.length === 0) return 0;
  const lcs = lcsLength(unique, canonical);
  // Penalises both missing events and extra (decoy) events.
  return clamp01(lcs / Math.max(canonical.length, unique.length));
}

export function submissionHash(caseFile: CaseFile, inv: Investigation): string {
  const d = inv.draft;
  const payload = JSON.stringify({
    c: caseFile.id,
    v: d.verdictId,
    t: normalize(d.conclusion),
    e: [...d.supportingEvidenceIds].sort(),
    l: d.timeline,
    a: normalize(d.alternatives),
    k: d.confidence,
    x: [...d.actionIds].sort(),
    n: normalize(d.actionNotes),
  });
  return hashString(payload);
}

export function gradeFor(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function evaluateSubmission(input: EvaluateInput): Report {
  const { caseFile: c, investigation: inv, now } = input;
  const sol = c.solution;
  const d = inv.draft;
  const w = c.weights;
  const hash = submissionHash(c, inv);
  const text = [d.conclusion, d.alternatives, d.actionNotes].join(' ');

  // ---------------- evidence ----------------
  const seen = new Set([...inv.inspected, ...inv.collected]);
  const citedAll = Array.from(new Set(d.supportingEvidenceIds));
  const citedUnseen = citedAll.filter((id) => !seen.has(id));
  const cited = citedAll.filter((id) => seen.has(id));
  const keyHit = cited.filter((id) => sol.keyEvidenceIds.includes(id));
  const supHit = cited.filter((id) => sol.supportingEvidenceIds.includes(id));
  const rhHit = cited.filter((id) => sol.redHerringIds.includes(id));
  const supTarget = Math.max(1, Math.ceil(sol.supportingEvidenceIds.length / 2));
  const evidenceRatio = clamp01(
    0.8 * (keyHit.length / Math.max(1, sol.keyEvidenceIds.length)) +
      0.2 * Math.min(1, supHit.length / supTarget) -
      RED_HERRING_PENALTY * rhHit.length,
  );
  const evidenceFeedback: string[] = [
    `You cited ${keyHit.length} of ${sol.keyEvidenceIds.length} key evidence items.`,
  ];
  if (rhHit.length) evidenceFeedback.push(`${rhHit.length} cited item(s) were red herrings and cost points.`);
  if (citedUnseen.length) evidenceFeedback.push(`${citedUnseen.length} cited item(s) were never opened, so they earned no credit.`);

  // ---------------- verdict ----------------
  const option = sol.verdictOptions.find((o) => o.id === d.verdictId);
  const verdictRatio = option ? clamp01(option.credit) : 0;
  const verdictCorrect = d.verdictId === sol.correctVerdictId;
  const verdictFeedback = [option ? option.feedback : 'No verdict submitted.'];

  // ---------------- reasoning ----------------
  const textLongEnough = normalize(d.conclusion).length >= MIN_CONCLUSION_CHARS;
  const totalReasoningWeight = sol.reasoningPoints.reduce((s, p) => s + p.weight, 0) || 1;
  const satisfied = textLongEnough ? sol.reasoningPoints.filter((p) => matchesGroups(text, p.keywordGroups)) : [];
  const missed = sol.reasoningPoints.filter((p) => !satisfied.includes(p));
  const unsupported = sol.unsupportedAssumptions
    .filter((u) => u.triggers.some((t) => assertedWithoutHedge(text, t)))
    .map((u) => ({ id: u.id, label: u.label, explanation: u.explanation }));
  const baseReasoning = satisfied.reduce((s, p) => s + p.weight, 0) / totalReasoningWeight;
  const reasoningRatio = clamp01(baseReasoning - UNSUPPORTED_PENALTY * unsupported.length);
  const reasoningFeedback = [
    `Your write-up covered ${satisfied.length} of ${sol.reasoningPoints.length} expected reasoning points.`,
  ];
  if (unsupported.length) reasoningFeedback.push(`${unsupported.length} statement(s) went beyond what the evidence proves.`);
  if (!textLongEnough) reasoningFeedback.push('Your conclusion was too short to evaluate.');

  // ---------------- support (precision + timeline) ----------------
  const tAcc = timelineAccuracy(c, d.timeline);
  const precision = cited.length ? (keyHit.length + supHit.length) / cited.length : 0;
  const supportRatio = clamp01(0.5 * precision + 0.5 * tAcc);
  const supportFeedback = [
    `${Math.round(precision * 100)}% of your cited evidence was relevant.`,
    `Timeline accuracy: ${Math.round(tAcc * 100)}% (order and inclusion of the right events).`,
  ];

  // ---------------- uncertainty ----------------
  const [lo, hi] = sol.idealConfidence;
  const dist = d.confidence < lo ? lo - d.confidence : d.confidence > hi ? d.confidence - hi : 0;
  const confRatio = clamp01(1 - dist / 40);
  const altText = normalize(d.alternatives);
  const altMatched = altText.length >= 25 ? sol.alternativeKeywords.filter((g) => containsAny(altText, g)).length : 0;
  const altRatio = clamp01(altMatched / Math.max(1, Math.min(2, sol.alternativeKeywords.length)));
  const kwRatio = containsAny(text, sol.uncertaintyKeywords) ? 1 : 0;
  const uncertaintyRatio = clamp01(0.5 * confRatio + 0.3 * altRatio + 0.2 * kwRatio);
  const uncertaintyFeedback = [
    `Your confidence was ${d.confidence}%. Appropriate range for this evidence: ${lo}–${hi}%.`,
    altMatched
      ? `You weighed ${altMatched} realistic alternative explanation(s).`
      : 'You did not weigh a realistic alternative explanation.',
  ];
  if (!kwRatio) uncertaintyFeedback.push('Name what the evidence cannot prove (e.g. "cannot confirm", "no evidence that").');

  // ---------------- defense ----------------
  const chosen = new Set(d.actionIds);
  const essential = sol.defensiveActions.filter((a) => a.quality === 'essential');
  const good = sol.defensiveActions.filter((a) => a.quality === 'good');
  const harmful = sol.defensiveActions.filter((a) => a.quality === 'harmful');
  const essHit = essential.filter((a) => chosen.has(a.id)).length;
  const goodHit = good.filter((a) => chosen.has(a.id)).length;
  const harmHit = harmful.filter((a) => chosen.has(a.id)).length;
  const defDenominator = essential.length + 0.5 * Math.min(good.length, 3);
  const defenseRatio = clamp01(
    (essHit + 0.5 * Math.min(goodHit, 3)) / Math.max(1, defDenominator) - 0.25 * harmHit,
  );
  const defenseFeedback = [`You selected ${essHit} of ${essential.length} essential actions.`];
  if (harmHit) defenseFeedback.push(`${harmHit} selected action(s) could make things worse (see the breakdown).`);

  // ---------------- hints ----------------
  const hintStages = inv.hintsUsed.map((h) => c.hints.find((x) => x.id === h.hintId)?.stage ?? 1);
  const hintLoss = hintStages.reduce((s, st) => s + HINT_COST[st], 0);
  const hintsRatio = inv.hintPenalty ? clamp01(1 - hintLoss) : 1;
  const hintsFeedback = [
    inv.hintsUsed.length === 0
      ? 'No hints used.'
      : `You used ${inv.hintsUsed.length} hint(s).` + (inv.hintPenalty ? '' : ' Hint penalties were off for this run.'),
  ];

  // ---------------- assemble ----------------
  const ratios: Record<keyof RubricWeights, { ratio: number; feedback: string[] }> = {
    evidence: { ratio: evidenceRatio, feedback: evidenceFeedback },
    reasoning: { ratio: reasoningRatio, feedback: reasoningFeedback },
    verdict: { ratio: verdictRatio, feedback: verdictFeedback },
    support: { ratio: supportRatio, feedback: supportFeedback },
    uncertainty: { ratio: uncertaintyRatio, feedback: uncertaintyFeedback },
    defense: { ratio: defenseRatio, feedback: defenseFeedback },
    hints: { ratio: hintsRatio, feedback: hintsFeedback },
  };
  const categories: ScoreCategory[] = (Object.keys(ratios) as (keyof RubricWeights)[]).map((key) => ({
    key,
    label: CATEGORY_LABELS[key],
    weight: w[key],
    ratio: ratios[key].ratio,
    points: Math.round(w[key] * ratios[key].ratio * 10) / 10,
    feedback: ratios[key].feedback,
  }));
  const totalWeight = categories.reduce((s, x) => s + x.weight, 0) || 100;
  let score = (categories.reduce((s, x) => s + x.points, 0) / totalWeight) * 100;
  if (verdictRatio < 0.5 && score > WRONG_VERDICT_CAP) {
    score = WRONG_VERDICT_CAP;
    verdictFeedback.push(`Score capped at ${WRONG_VERDICT_CAP}: a sound write-up cannot offset a verdict the evidence does not support.`);
  }
  score = Math.round(score);

  // ---------------- XP ----------------
  const duplicate = (input.previousHashes ?? []).includes(hash);
  const base = BASE_XP[c.difficulty] * (score / 100) * MODE_MULTIPLIER[inv.mode];
  const bonuses: [string, number][] = [];
  if (verdictCorrect) bonuses.push(['Correct verdict', 25]);
  if (inv.hintsUsed.length === 0) bonuses.push(['No hints used', 20]);
  if (inv.timed && inv.elapsedSec <= inv.timeLimitSec) bonuses.push(['Finished within the time limit', 30]);
  const gross = Math.round(base + bonuses.reduce((s, [, n]) => s + n, 0));
  const xpEarned = duplicate ? 0 : Math.max(0, gross - input.previousBestXp);
  const xpBreakdown = [
    `Base: ${Math.round(base)} XP (${c.difficulty} case × ${MODE_MULTIPLIER[inv.mode]} ${inv.mode} mode × ${score}% score)`,
    ...bonuses.map(([l, n]) => `${l}: +${n} XP`),
    duplicate
      ? 'Identical submission already scored: 0 XP awarded.'
      : input.previousBestXp > 0
        ? `Replay: only XP above your previous best (${input.previousBestXp}) is awarded → +${xpEarned} XP`
        : `Total: +${xpEarned} XP`,
  ];

  // ---------------- report ----------------
  const actionResults = sol.defensiveActions.map((a) => ({
    id: a.id,
    label: a.label,
    quality: a.quality,
    chosen: chosen.has(a.id),
    explanation: a.explanation,
  }));
  const missedEvidence = [
    ...sol.keyEvidenceIds.filter((id) => !cited.includes(id)),
    ...sol.supportingEvidenceIds.filter((id) => !cited.includes(id)),
  ];
  const weak = categories.filter((x) => x.ratio < 0.6).map((x) => x.label.toLowerCase());
  const recommendations = [
    ...(weak.length ? [`Focus next on: ${weak.join(', ')}.`] : ['Strong across the board — try the next difficulty.']),
    ...(unsupported.length ? ['Practise separating what the logs show from what you infer about motive or intent.'] : []),
    ...(rhHit.length ? ['Review why the red herrings looked suspicious but did not hold up.'] : []),
  ];
  const summary = verdictCorrect
    ? `You reached the verdict best supported by the evidence and scored ${score}/100 (grade ${gradeFor(score)}).`
    : `Your verdict was not the one best supported by the evidence. You scored ${score}/100 (grade ${gradeFor(score)}). The explanation below shows how the evidence points elsewhere.`;

  return {
    id: `${inv.id}-r${inv.attempt}`,
    caseId: c.id,
    investigationId: inv.id,
    attempt: inv.attempt,
    mode: inv.mode,
    createdAt: now,
    submissionHash: hash,
    verdictId: d.verdictId,
    verdictCorrect,
    score,
    grade: gradeFor(score),
    categories,
    correctEvidence: [...keyHit, ...supHit],
    missedEvidence,
    citedRedHerrings: rhHit,
    unsupported,
    satisfiedReasoning: satisfied.map((p) => p.label),
    missedReasoning: missed.map((p) => ({ id: p.id, label: p.label, explanation: p.explanation })),
    timelineAccuracy: tAcc,
    actionResults,
    xpEarned,
    xpBreakdown,
    elapsedSec: inv.elapsedSec,
    hintsUsed: inv.hintsUsed.length,
    learningTopics: c.learningTopics,
    recommendations,
    summary,
    explanation: sol.explanation,
    limitations: sol.limitations,
    confidence: d.confidence,
    draft: d,
  };
}
