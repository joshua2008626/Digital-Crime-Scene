import type { EvidenceField } from '@/types';

/** Shorthand for an evidence field. flag: 'a' = anomaly, 'ok' = normal. */
export function f(label: string, value: string, flag?: 'a' | 'ok'): EvidenceField {
  return { label, value, flag: flag === 'a' ? 'anomaly' : flag === 'ok' ? 'ok' : undefined };
}

/** Generic cross-case phrases that signal calibrated, evidence-bound language. */
export const UNCERTAINTY_WORDS = [
  'cannot confirm',
  "can't confirm",
  'cannot prove',
  'does not prove',
  'no evidence that',
  'not enough evidence',
  'unable to determine',
  'cannot determine',
  'cannot be determined',
  'unclear',
  'unknown',
  'uncertain',
  'insufficient',
  'cannot establish',
  'not established',
];
