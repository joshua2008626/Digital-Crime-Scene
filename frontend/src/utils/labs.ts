import type { LogEntry, PhishingEmail } from '@/types';
import { containsAny } from './text';

// =====================================================================
// Phishing lab grading (deterministic)
// =====================================================================

export interface PhishingAnswer {
  classification: 'legitimate' | 'suspicious' | 'phishing';
  indicatorIds: string[];
  reasoning: string;
}

export interface PhishingGrade {
  score: number; // 0..100
  correct: boolean;
  classificationPoints: number;
  indicatorPoints: number;
  reasoningPoints: number;
  found: string[];
  missed: string[];
  falseIds: string[];
  feedback: string[];
}

const MIN_REASONING_CHARS = 20;

export function gradePhishing(email: PhishingEmail, answer: PhishingAnswer): PhishingGrade {
  const truth = email.classification;
  const correct = answer.classification === truth;
  const adjacent = !correct && (answer.classification === 'suspicious' || truth === 'suspicious');
  const classificationPoints = correct ? 50 : adjacent ? 20 : 0;

  const truthIds = email.indicators.map((i) => i.id);
  const chosen = Array.from(new Set(answer.indicatorIds));
  const found = chosen.filter((id) => truthIds.includes(id));
  const falseIds = chosen.filter((id) => !truthIds.includes(id));
  const missed = truthIds.filter((id) => !chosen.includes(id));
  let indicatorPoints: number;
  if (truthIds.length === 0) indicatorPoints = Math.max(0, 30 - 10 * chosen.length);
  else indicatorPoints = Math.max(0, Math.round((found.length / truthIds.length) * 30 - 7.5 * falseIds.length));

  const text = answer.reasoning.trim();
  let reasoningPoints = 0;
  if (text.length >= MIN_REASONING_CHARS && email.reasoningKeywords.length) {
    const satisfied = email.reasoningKeywords.filter((g) => containsAny(text, g)).length;
    reasoningPoints = Math.round((satisfied / email.reasoningKeywords.length) * 20);
  }

  const feedback: string[] = [];
  if (correct) feedback.push(`Correct: this message is ${truth}.`);
  else if (adjacent) feedback.push(`Partly right. The best classification is "${truth}"; you chose "${answer.classification}". Borderline cases are normal. What matters is how you justify them.`);
  else feedback.push(`Not quite: this message is ${truth}, and you classified it as ${answer.classification}.`);
  if (truthIds.length) feedback.push(`You spotted ${found.length} of ${truthIds.length} indicators.`);
  else feedback.push(chosen.length ? 'This message has no real warning signs, so ticking indicators counts against you.' : 'Good: you did not invent warning signs where there were none.');
  if (falseIds.length) feedback.push(`${falseIds.length} ticked indicator(s) did not apply here.`);
  if (text.length < MIN_REASONING_CHARS) feedback.push('Write at least a sentence explaining your reasoning to earn reasoning points.');

  return {
    score: classificationPoints + indicatorPoints + reasoningPoints,
    correct,
    classificationPoints,
    indicatorPoints,
    reasoningPoints,
    found,
    missed,
    falseIds,
    feedback,
  };
}

/** XP for a phishing exercise: up to 10, and only improvements over the previous best are rewarded. */
export const phishingXp = (score: number, previousBest: number): number =>
  Math.max(0, Math.round(score / 10) - Math.round(previousBest / 10));

// =====================================================================
// Log lab grading (deterministic)
// =====================================================================

export interface LogGrade {
  total: number;
  found: string[];
  missed: string[];
  falseFlags: string[];
  score: number; // 0..100
  explanations: { id: string; correct: boolean; text: string }[];
}

export function gradeLogFlags(entries: LogEntry[], flagged: string[]): LogGrade {
  const anomalies = entries.filter((e) => e.anomaly);
  const flaggedSet = new Set(flagged);
  const found = anomalies.filter((e) => flaggedSet.has(e.id)).map((e) => e.id);
  const missed = anomalies.filter((e) => !flaggedSet.has(e.id)).map((e) => e.id);
  const falseFlags = entries.filter((e) => !e.anomaly && flaggedSet.has(e.id)).map((e) => e.id);
  const raw = anomalies.length ? (found.length / anomalies.length) * 100 - 12 * falseFlags.length : 0;
  const explanations = [
    ...entries.filter((e) => e.anomaly && flaggedSet.has(e.id)).map((e) => ({ id: e.id, correct: true, text: e.anomalyReason ?? 'Anomalous activity.' })),
    ...entries.filter((e) => !e.anomaly && flaggedSet.has(e.id)).map((e) => ({ id: e.id, correct: false, text: e.raw.note ?? 'This looks unusual but matches normal behaviour for this system.' })),
  ];
  return { total: anomalies.length, found, missed, falseFlags, score: Math.max(0, Math.round(raw)), explanations };
}

/** XP for the log lab: 10 per true anomaly found, only for anomalies beyond your previous best. */
export const logLabXp = (correctNow: number, previousBest: number): number => Math.max(0, correctNow - previousBest) * 10;
