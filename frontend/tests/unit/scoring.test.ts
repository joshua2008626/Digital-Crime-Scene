import { describe, expect, it } from 'vitest';
import { CASES } from '@/data/cases';
import { validateCase } from '@/utils/validateCase';
import { evaluateSubmission, validateDraft } from '@/utils/scoring';
import { createInvestigation } from '@/utils/investigation';
import { ANSWERS } from '../fixtures/answers';
import type { CaseFile, VerdictDraft } from '@/types';

const NOW = '2026-10-28T00:00:00Z';
const inv = (c: CaseFile, draft: VerdictDraft) => {
  const i = createInvestigation(c, { mode: 'intermediate', timed: false, hintPenalty: true, attempt: 1, now: NOW, id: `t-${c.id}` });
  i.inspected = c.evidence.map((e) => e.id);
  i.collected = Array.from(new Set([...i.collected, ...draft.supportingEvidenceIds]));
  i.draft = draft;
  return i;
};
const score = (c: CaseFile, d: VerdictDraft) => evaluateSubmission({ caseFile: c, investigation: inv(c, d), now: NOW, previousBestXp: 0 });

describe.each(CASES.map((c) => [c.id, c] as const))('case %s', (_id, c) => {
  it('passes content validation (consistent, fictional)', () => {
    expect(validateCase(c)).toEqual([]);
  });
  it('rubric weights sum to 100', () => {
    expect(Object.values(c.weights).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it('model answer scores at least 90 and the correct verdict', () => {
    const r = score(c, ANSWERS[c.id].model);
    expect(r.verdictCorrect).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(90);
  });
  it('partial answer lands in its expected band', () => {
    const a = ANSWERS[c.id];
    const r = score(c, a.partial);
    expect(r.score).toBeGreaterThanOrEqual(a.partialMin);
    expect(r.score).toBeLessThanOrEqual(a.partialMax);
  });
  it('confidently wrong answer scores 35 or less and is capped below 65', () => {
    const r = score(c, ANSWERS[c.id].wrong);
    expect(r.verdictCorrect).toBe(false);
    expect(r.score).toBeLessThanOrEqual(35);
  });
  it('is deterministic', () => {
    expect(score(c, ANSWERS[c.id].model)).toEqual(score(c, ANSWERS[c.id].model));
  });
  it('rejects an empty draft', () => {
    const i = inv(c, { ...ANSWERS[c.id].model, verdictId: '', conclusion: '', supportingEvidenceIds: [] });
    expect(validateDraft(c, i).length).toBeGreaterThanOrEqual(3);
  });
  it('gives no XP for a duplicate submission', () => {
    const first = score(c, ANSWERS[c.id].model);
    const again = evaluateSubmission({ caseFile: c, investigation: inv(c, ANSWERS[c.id].model), now: NOW, previousBestXp: first.xpEarned, previousHashes: [first.submissionHash] });
    expect(again.xpEarned).toBe(0);
  });
});
