import { describe, expect, it } from 'vitest';
import { CASES } from '@/data/cases';
import { initialState, reducer, type Action } from '@/store/reducer';
import { ANSWERS } from '../fixtures/answers';
import type { AppState } from '@/types';

const T = (n: number) => `2026-10-28T00:${String(n).padStart(2, '0')}:00Z`;
const S0 = initialState(T(0), 'guest-test');
const c = CASES[0];

function play(s: AppState, at: number): AppState {
  const a = ANSWERS[c.id];
  let st = reducer(s, { type: 'START', caseId: c.id, mode: 'intermediate', timed: false, hintPenalty: true, now: T(at) });
  for (const e of c.evidence) st = reducer(st, { type: 'INSPECT', caseId: c.id, evidenceId: e.id, now: T(at) });
  for (const id of a.model.supportingEvidenceIds) st = reducer(st, { type: 'COLLECT', caseId: c.id, evidenceId: id });
  st = reducer(st, { type: 'DRAFT_UPDATE', caseId: c.id, patch: a.model });
  return reducer(st, { type: 'SUBMIT', caseId: c.id, now: T(at + 1) });
}

describe('reducer', () => {
  it('starting an active case again resumes instead of overwriting', () => {
    const start: Action = { type: 'START', caseId: c.id, mode: 'beginner', timed: false, hintPenalty: true, now: T(1) };
    const s1 = reducer(S0, start);
    const s2 = reducer(reducer(s1, { type: 'INSPECT', caseId: c.id, evidenceId: c.evidence[0].id, now: T(2) }), { ...start, mode: 'advanced' });
    expect(s2.investigations[c.id].inspected).toContain(c.evidence[0].id);
    expect(s2.investigations[c.id].mode).toBe('beginner');
  });
  it('cannot collect evidence that has not been inspected', () => {
    const s1 = reducer(S0, { type: 'START', caseId: c.id, mode: 'beginner', timed: false, hintPenalty: true, now: T(1) });
    const other = c.evidence.find((e) => !c.startEvidenceIds.includes(e.id))!;
    expect(reducer(s1, { type: 'COLLECT', caseId: c.id, evidenceId: other.id })).toBe(s1);
  });
  it('submitting awards XP once; a second SUBMIT is a no-op', () => {
    const done = play(S0, 1);
    expect(done.xp).toBeGreaterThan(0);
    expect(reducer(done, { type: 'SUBMIT', caseId: c.id, now: T(30) })).toBe(done);
  });
  it('replaying the same answer awards no additional case XP', () => {
    const first = play(S0, 1);
    const caseXpAfterFirst = first.caseXp[c.id];
    const second = play(first, 10);
    expect(second.caseXp[c.id]).toBe(caseXpAfterFirst);
    expect(second.reports).toHaveLength(2);
  });
  it('ignores an invalid draft on submit', () => {
    const s1 = reducer(S0, { type: 'START', caseId: c.id, mode: 'beginner', timed: false, hintPenalty: true, now: T(1) });
    expect(reducer(s1, { type: 'SUBMIT', caseId: c.id, now: T(2) })).toBe(s1);
  });
  it('clamps hostile draft input', () => {
    const s1 = reducer(S0, { type: 'START', caseId: c.id, mode: 'beginner', timed: false, hintPenalty: true, now: T(1) });
    const s2 = reducer(s1, { type: 'DRAFT_UPDATE', caseId: c.id, patch: { confidence: 999, verdictId: 'bogus', conclusion: 'x'.repeat(50000) } });
    const d = s2.investigations[c.id].draft;
    expect(d.confidence).toBeLessThanOrEqual(100);
    expect(d.verdictId).toBe('');
    expect(d.conclusion.length).toBeLessThanOrEqual(4000);
  });
});
