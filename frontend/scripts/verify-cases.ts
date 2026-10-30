/* Runs without a browser or Vite: `npm run verify:cases` (uses tsx).
 * Proves for every case that: the data is internally consistent and fictional,
 * the model answer scores >= 90, a wrong answer scores low, scoring is deterministic,
 * duplicates/replays cannot farm XP, and hedged language is not penalised. */
import { CASES } from '../src/data/cases';
import { validateCase } from '../src/utils/validateCase';
import { evaluateSubmission, validateDraft, HINT_COST } from '../src/utils/scoring';
import { createInvestigation, objectiveProgress, caseProgress } from '../src/utils/investigation';
import { assertedWithoutHedge } from '../src/utils/text';
import { ANSWERS } from '../tests/fixtures/answers';
import type { CaseFile, Investigation, VerdictDraft } from '../src/types';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

const NOW = '2026-10-28T00:00:00Z';

function investigate(c: CaseFile, draft: VerdictDraft, opts: { hints?: number; penalty?: boolean; timed?: boolean; elapsed?: number } = {}): Investigation {
  const inv = createInvestigation(c, { mode: 'intermediate', timed: !!opts.timed, hintPenalty: opts.penalty ?? true, attempt: 1, now: NOW, id: `inv-${c.id}` });
  inv.inspected = c.evidence.map((e) => e.id); // the learner opened everything
  inv.collected = [...draft.supportingEvidenceIds];
  inv.draft = draft;
  inv.elapsedSec = opts.elapsed ?? 600;
  const stage3 = c.hints.filter((h) => h.stage === 3).slice(0, opts.hints ?? 0);
  inv.hintsUsed = stage3.map((h) => ({ hintId: h.id, at: NOW }));
  return inv;
}

for (const c of CASES) {
  console.log(`\n=== ${c.title} (${c.id}) ===`);
  const problems = validateCase(c);
  check('case data is consistent and fictional', problems.length === 0, problems.join(' | '));
  if (problems.length) continue;

  const a = ANSWERS[c.id];
  check('answer fixtures exist', !!a);
  if (!a) continue;

  const ev = (d: VerdictDraft, o = {}, prevXp = 0, hashes: string[] = []) =>
    evaluateSubmission({ caseFile: c, investigation: investigate(c, d, o), now: NOW, previousBestXp: prevXp, previousHashes: hashes });

  const model = ev(a.model);
  const partial = ev(a.partial);
  const wrong = ev(a.wrong);
  console.log(`  scores: model=${model.score} partial=${partial.score} wrong=${wrong.score}`);

  check('model answer is valid', validateDraft(c, investigate(c, a.model)).length === 0);
  check('model answer scores >= 90', model.score >= 90, `got ${model.score}`);
  check('model answer: correct verdict, no unsupported assumptions, no red herrings cited',
    model.verdictCorrect && model.unsupported.length === 0 && model.citedRedHerrings.length === 0,
    `unsupported=${model.unsupported.map((u) => u.id)} rh=${model.citedRedHerrings}`);
  check('model answer: timeline accuracy 100%', model.timelineAccuracy === 1);
  check(`partial answer in [${a.partialMin}, ${a.partialMax}]`, partial.score >= a.partialMin && partial.score <= a.partialMax, `got ${partial.score}`);
  check('wrong answer scores <= 35', wrong.score <= 35, `got ${wrong.score}`);
  check('ordering: model > partial > wrong', model.score > partial.score && partial.score > wrong.score);
  check('category points sum to total (±1)', Math.abs(model.categories.reduce((s, x) => s + x.points, 0) - model.score) <= 1.5);
  check('wrong verdict cannot score above the cap', ev({ ...a.model, verdictId: c.solution.verdictOptions.find((o) => o.credit < 0.5)!.id }).score <= 64);

  // determinism
  check('scoring is deterministic', JSON.stringify(ev(a.model)) === JSON.stringify(ev(a.model)));

  // XP anti-farming
  const first = ev(a.model);
  const dup = ev(a.model, {}, first.xpEarned, [first.submissionHash]);
  const replay = ev({ ...a.model, alternatives: a.model.alternatives + ' Also considered.' }, {}, first.xpEarned + 500);
  check('first completion awards XP', first.xpEarned > 0, `xp=${first.xpEarned}`);
  check('identical resubmission awards 0 XP', dup.xpEarned === 0);
  check('replay never awards XP below previous best', replay.xpEarned === 0);

  // hints
  const noPenalty = ev(a.model, { hints: 3, penalty: false });
  const penalty = ev(a.model, { hints: 3, penalty: true });
  const hintCat = (r: typeof model) => r.categories.find((x) => x.key === 'hints')!;
  check('hint penalty off: hint category unaffected', hintCat(noPenalty).ratio === 1);
  const expectedLoss = c.hints.filter((h) => h.stage === 3).slice(0, 3).reduce((s) => s + HINT_COST[3], 0);
  check('hint penalty on: hint category reduced', Math.abs(hintCat(penalty).ratio - Math.max(0, 1 - expectedLoss)) < 1e-9 && penalty.score < noPenalty.score);

  // validation gate
  const thin = validateDraft(c, investigate(c, { ...a.model, conclusion: 'It was them.' }));
  check('thin conclusion is rejected before scoring', thin.length > 0);
  check('missing verdict is rejected', validateDraft(c, investigate(c, { ...a.model, verdictId: '' })).length > 0);

  // hedging: "X" is penalised, "this does not prove X" is not
  const trig = c.solution.unsupportedAssumptions[0].triggers[0];
  check(`unhedged "${trig}" is flagged`, assertedWithoutHedge(`It is clear that ${trig} here.`, trig));
  check(`hedged "${trig}" is not flagged`, !assertedWithoutHedge(`This does not prove ${trig}.`, trig) && !assertedWithoutHedge(`It is possible that ${trig}.`, trig));
  const flaggedRun = ev({ ...a.model, conclusion: a.model.conclusion + ` It is certain that ${trig}.` });
  check('asserting an unsupported assumption lowers the score', flaggedRun.unsupported.length >= 1 && flaggedRun.score < model.score);

  // uncertainty: overconfident but otherwise perfect answer should lose points
  const overconf = ev({ ...a.model, confidence: 100, alternatives: '' });
  check('overconfidence with no alternatives scores below the model answer', overconf.score < model.score);

  // objectives + progress
  const full = investigate(c, a.model);
  check('all objectives achievable by inspecting evidence', objectiveProgress(c, full).every((o) => o.done));
  check('progress reaches 100 when everything is inspected', caseProgress(c, full) === 100);
  const fresh = createInvestigation(c, { mode: 'beginner', timed: false, hintPenalty: true, attempt: 1, now: NOW, id: 'x' });
  check('fresh investigation starts with start evidence only', fresh.inspected.length === c.startEvidenceIds.length && caseProgress(c, fresh) < 40);
}

// ---- negative tests: the validator must actually catch bad data ----
console.log('\n=== validator negative tests ===');
{
  const base = CASES[0];
  const clone = (): CaseFile => JSON.parse(JSON.stringify(base)) as CaseFile;
  const bad1 = clone();
  bad1.evidence[0].content = 'connect to 8.8.8.8 now';
  check('flags a non-reserved IP address', validateCase(bad1).some((e) => e.includes('8.8.8.8')));
  const bad2 = clone();
  bad2.evidence[0].content = 'visit https://real-bank.com/login';
  check('flags a real-looking URL host', validateCase(bad2).some((e) => e.includes('real-bank.com')));
  const bad3 = clone();
  bad3.evidence[0].content = 'mail me at someone@gmail.com';
  check('flags a real email domain', validateCase(bad3).some((e) => e.includes('gmail.com')));
  const bad4 = clone();
  bad4.weights.evidence += 5;
  check('flags weights that do not sum to 100', validateCase(bad4).some((e) => e.includes('weights')));
  const bad5 = clone();
  bad5.solution.timelineOrder = [...bad5.solution.timelineOrder].reverse();
  check('flags a wrong timeline order', validateCase(bad5).some((e) => e.includes('timelineOrder')));
  const bad6 = clone();
  bad6.hints = bad6.hints.filter((h) => !(h.objectiveId === bad6.objectives[0].id && h.stage === 2));
  check('flags a missing hint stage', validateCase(bad6).some((e) => e.includes('hint stages')));
  const bad8 = clone();
  bad8.objectives[0].evidenceIds = [...bad8.startEvidenceIds];
  bad8.objectives[0].threshold = bad8.startEvidenceIds.length;
  check('flags an objective already complete from the starting evidence', validateCase(bad8).some((e) => e.includes('already complete')));
  const bad7 = clone();
  bad7.evidence[0].relevance = 'red_herring';
  check('flags evidence/solution relevance mismatch', validateCase(bad7).some((e) => e.includes('relevance')));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
