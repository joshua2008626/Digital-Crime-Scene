/* `npm run verify:engine` — runs with tsx, no browser/Vite needed.
 * Verifies labs, logs, CSV safety, progress, achievements, the offline assistant,
 * the pure reducer (XP anti-farming!) and persistence. */
import { CASES, getCase } from '../src/data/cases';
import { PHISHING_EMAILS, INDICATOR_CATALOG } from '../src/data/phishing';
import { LOG_ENTRIES, LOG_ANOMALY_COUNT } from '../src/data/logs';
import { GLOSSARY, findTerm } from '../src/data/glossary';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { scanFictional } from '../src/utils/validateCase';
import { gradePhishing, gradeLogFlags, phishingXp, logLabXp } from '../src/utils/labs';
import { bucketByHour, DEFAULT_LOG_QUERY, filterLogs } from '../src/utils/logs';
import { csvCell, logsToCsv, toCsv } from '../src/utils/export';
import { accuracy, formatDuration, rankFor, RANKS, skillProfile } from '../src/utils/progress';
import { offlineAssistant } from '../src/utils/assistant';
import { createInvestigation } from '../src/utils/investigation';
import { ACHIEVEMENT_XP, initialState, reducer, type Action } from '../src/store/reducer';
import { exportState, loadState, normalizeState, parseState, saveState, STORAGE_KEY, type StorageLike } from '../src/store/persist';
import { LOG_LAB_ID } from '../src/utils/achievements';
import { ANSWERS } from '../tests/fixtures/answers';
import { check, finish, section } from './harness';
import type { AppState, AssistantRequest, CaseFile, Investigation } from '../src/types';

const T = (n: number) => `2026-10-28T00:${String(n).padStart(2, '0')}:00Z`;

// ---------------------------------------------------------------- phishing
section('Phishing lab');
{
  check('at least 6 emails', PHISHING_EMAILS.length >= 6);
  check('unique ids', new Set(PHISHING_EMAILS.map((e) => e.id)).size === PHISHING_EMAILS.length);
  const cls = new Set(PHISHING_EMAILS.map((e) => e.classification));
  check('all three classifications are represented', cls.size === 3);
  const catalog = new Set(INDICATOR_CATALOG.map((i) => i.id));
  check('every indicator id is in the catalog', PHISHING_EMAILS.every((e) => e.indicators.every((i) => catalog.has(i.id))));
  check('legitimate emails have no indicators; others have some', PHISHING_EMAILS.every((e) => (e.classification === 'legitimate') === (e.indicators.length === 0)));
  check('all data is fictional (.example, RFC 5737 IPs)', scanFictional(PHISHING_EMAILS).length === 0, scanFictional(PHISHING_EMAILS).join('|'));
  check('phishing link targets are defanged text', PHISHING_EMAILS.filter((e) => e.classification === 'phishing').every((e) => e.links.every((l) => /hxxp|\[\.\]/.test(l.target)) ));
  const perfect = (e: (typeof PHISHING_EMAILS)[number]) =>
    gradePhishing(e, { classification: e.classification, indicatorIds: e.indicators.map((i) => i.id), reasoning: 'Because ' + e.reasoningKeywords.map((g) => g[0]).join(' and ') + ' all point to this conclusion.' });
  check('perfect answers score 100 for every email', PHISHING_EMAILS.every((e) => perfect(e).score === 100), PHISHING_EMAILS.map((e) => perfect(e).score).join(','));
  const ph1 = PHISHING_EMAILS[0];
  const wrong = gradePhishing(ph1, { classification: 'legitimate', indicatorIds: [], reasoning: '' });
  check('calling phishing "legitimate" scores 0 with feedback', wrong.score === 0 && !wrong.correct && wrong.feedback.length >= 2);
  const adj = gradePhishing(ph1, { classification: 'suspicious', indicatorIds: [], reasoning: '' });
  check('adjacent classification earns partial credit (20)', adj.classificationPoints === 20);
  const legit = PHISHING_EMAILS.find((e) => e.classification === 'legitimate')!;
  const paranoid = gradePhishing(legit, { classification: 'legitimate', indicatorIds: ['urgency', 'odd_domain'], reasoning: '' });
  check('inventing indicators on a legitimate email is penalised', paranoid.indicatorPoints === 10 && paranoid.falseIds.length === 2);
  const spam = gradePhishing(ph1, { classification: 'phishing', indicatorIds: INDICATOR_CATALOG.map((i) => i.id), reasoning: '' });
  const exact = gradePhishing(ph1, { classification: 'phishing', indicatorIds: ph1.indicators.map((i) => i.id), reasoning: '' });
  check('ticking everything scores below ticking the right ones', spam.score < exact.score);
  check('short reasoning earns no reasoning points', gradePhishing(ph1, { classification: 'phishing', indicatorIds: [], reasoning: 'bad' }).reasoningPoints === 0);
  check('phishing XP rewards only improvement', phishingXp(100, 0) === 10 && phishingXp(100, 100) === 0 && phishingXp(50, 80) === 0 && phishingXp(80, 50) === 3);
}

// ---------------------------------------------------------------- logs
section('Log lab');
{
  check('anomaly count is 8', LOG_ANOMALY_COUNT === 8, String(LOG_ANOMALY_COUNT));
  check('70 entries, unique ids', LOG_ENTRIES.length === 70 && new Set(LOG_ENTRIES.map((e) => e.id)).size === 70, String(LOG_ENTRIES.length));
  check('entries are time-sorted', LOG_ENTRIES.every((e, i) => i === 0 || LOG_ENTRIES[i - 1].time <= e.time));
  check('anomalies each have a reason; decoys each have a note', LOG_ENTRIES.filter((e) => e.anomaly).every((e) => !!e.anomalyReason) && LOG_ENTRIES.filter((e) => e.raw.note).every((e) => !e.anomaly));
  check('all log data is fictional', scanFictional(LOG_ENTRIES).length === 0, scanFictional(LOG_ENTRIES).join('|'));
  check('anomalies include severity high or critical or medium only', LOG_ENTRIES.filter((e) => e.anomaly).every((e) => ['medium', 'high', 'critical'].includes(e.severity)));
  const anomalyIds = LOG_ENTRIES.filter((e) => e.anomaly).map((e) => e.id);
  check('flagging exactly the anomalies scores 100', gradeLogFlags(LOG_ENTRIES, anomalyIds).score === 100);
  check('flagging nothing scores 0', gradeLogFlags(LOG_ENTRIES, []).score === 0);
  check('flagging everything scores 0 (false flags penalised)', gradeLogFlags(LOG_ENTRIES, LOG_ENTRIES.map((e) => e.id)).score === 0);
  const decoy = LOG_ENTRIES.find((e) => !e.anomaly && e.raw.note)!;
  const oneFalse = gradeLogFlags(LOG_ENTRIES, [...anomalyIds, decoy.id]);
  check('one false flag costs 12 points and explains the decoy', oneFalse.score === 88 && oneFalse.explanations.some((x) => x.id === decoy.id && !x.correct && x.text.length > 10));
  check('log XP rewards only new anomalies found', logLabXp(8, 0) === 80 && logLabXp(8, 8) === 0 && logLabXp(3, 5) === 0 && logLabXp(6, 3) === 30);

  const q = (patch: Partial<typeof DEFAULT_LOG_QUERY>) => filterLogs(LOG_ENTRIES, { ...DEFAULT_LOG_QUERY, ...patch });
  check('default query returns everything in time order', q({}).length === 70 && q({})[0].time <= q({})[69].time);
  check('search by user matches (admin-ops appears in exactly 3 entries)', q({ query: 'admin-ops' }).length === 3 && q({ query: 'admin-ops' }).every((e) => JSON.stringify(e).toLowerCase().includes('admin-ops')));
  check('search by IP matches', q({ query: '203.0.113.77' }).length >= 5);
  check('search is case-insensitive and trims', q({ query: '  ADMIN-OPS ' }).length === q({ query: 'admin-ops' }).length);
  check('type filter', q({ types: ['admin'] }).every((e) => e.type === 'admin') && q({ types: ['admin'] }).length >= 2);
  check('severity filter', q({ severities: ['critical'] }).every((e) => e.severity === 'critical') && q({ severities: ['critical'] }).length >= 3);
  check('anomaliesOnly returns the 8', q({ anomaliesOnly: true }).length === 8);
  check('descending sort is the reverse order', q({ sort: 'time_desc' })[0].id === q({ sort: 'time_asc' })[69].id);
  check('severity sort puts critical first', q({ sort: 'severity_desc' })[0].severity === 'critical');
  check('hour range filter', q({ fromHour: 3, toHour: 3 }).length >= 4 && q({ fromHour: 3, toHour: 3 }).every((e) => e.time.slice(11, 13) === '03'));
  check('no matches returns an empty array (empty state)', q({ query: 'zzzz-no-such-thing' }).length === 0);
  const buckets = bucketByHour(LOG_ENTRIES, anomalyIds.slice(0, 2));
  check('24 hourly buckets summing to total', buckets.length === 24 && buckets.reduce((s, b) => s + b.total, 0) === 70);
  check('buckets only count LEARNER flags, never hidden answers', buckets.reduce((s, b) => s + b.flagged, 0) === 2 && !('anomalies' in buckets[0]));
}

// ---------------------------------------------------------------- CSV
section('CSV export safety');
{
  check('formula cells are neutralised', csvCell('=HYPERLINK("x")').startsWith(`"'=`) || csvCell('=1+1') === "'=1+1");
  check('+ - @ prefixes are neutralised', csvCell('+1').startsWith("'") && csvCell('-2').startsWith("'") && csvCell('@SUM(A1)').startsWith("'"));
  check('commas and quotes are escaped', csvCell('a,b') === '"a,b"' && csvCell('say "hi"') === '"say ""hi"""');
  check('newlines are quoted', csvCell('a\nb') === '"a\nb"');
  check('numbers/booleans are raw, undefined is empty', csvCell(5) === '5' && csvCell(true) === 'true' && csvCell(undefined) === '');
  const csv = logsToCsv(LOG_ENTRIES);
  check('CSV has header + 70 rows', csv.trimEnd().split('\r\n').length === 71 && csv.startsWith('id,time_utc,type'));
  check('CSV does not leak the answer key', !LOG_ENTRIES.some((e) => e.anomalyReason && csv.includes(e.anomalyReason)) && !/anomal/i.test(csv.split('\r\n')[0]));
  check('toCsv generic works', toCsv([{ a: 'x', b: 2 }], [{ key: 'a', header: 'A' }, { key: 'b', header: 'B' }]) === 'A,B\r\nx,2\r\n');
}

// ---------------------------------------------------------------- glossary / progress
section('Glossary, ranks and progress');
{
  check('glossary has 40+ unique terms', GLOSSARY.length >= 40 && new Set(GLOSSARY.map((g) => g.term.toLowerCase())).size === GLOSSARY.length);
  check('term lookup: exact, alias, partial, missing', findTerm('mfa')?.term === 'MFA' && findTerm('2fa')?.term === 'MFA' && findTerm('spray')?.term === 'Password spraying' && findTerm('qqqq') === undefined && findTerm('') === undefined);
  check('every achievement has unique id, title, description', new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length && ACHIEVEMENTS.every((a) => a.title && a.description));
  check('rank thresholds are ascending', RANKS.every((r, i) => i === 0 || r.minXp > RANKS[i - 1].minXp));
  check('rankFor(0) is Rookie level 1', rankFor(0).rank.title === 'Rookie Examiner' && rankFor(0).level === 1 && rankFor(0).xpToNext === 150);
  check('rankFor(150) promotes', rankFor(150).rank.title === 'Analyst' && rankFor(149).rank.title === 'Rookie Examiner');
  check('top rank has progress 1 and nothing next', rankFor(99999).progress === 1 && rankFor(99999).next === undefined);
  check('rankFor tolerates negatives/NaN-ish', rankFor(-50).level === 1);
  check('progress inside a rank is fractional', Math.abs(rankFor(75).progress - 0.5) < 1e-9);
  check('empty profile/accuracy handled (no fake stats)', skillProfile([]) === null && accuracy([]).verdictRate === null && accuracy([]).attempts === 0);
  check('formatDuration', formatDuration(65) === '1m 05s' && formatDuration(3700) === '1h 01m' && formatDuration(-5) === '0m 00s');
}

// ---------------------------------------------------------------- assistant
section('Offline assistant');
function freshInv(c: CaseFile, mode: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'): Investigation {
  return createInvestigation(c, { mode, timed: false, hintPenalty: true, attempt: 1, now: T(0), id: `t-${c.id}` });
}
function openAll(inv: Investigation, c: CaseFile): Investigation {
  return { ...inv, inspected: c.evidence.map((e) => e.id), collected: c.evidence.map((e) => e.id) };
}
for (const c of CASES) {
  console.log(`  -- ${c.title}`);
  const correct = c.solution.verdictOptions.find((o) => o.id === c.solution.correctVerdictId)!;
  const hintReq: AssistantRequest = { action: 'subtle_hint' };

  // graduated hints
  let inv = freshInv(c);
  const first = offlineAssistant(c, inv, hintReq);
  const firstObj = c.objectives[0];
  const stage1 = c.hints.find((h) => h.objectiveId === firstObj.id && h.stage === 1)!;
  check('first subtle hint is stage 1 of the first open objective', first.hintId === stage1.id && first.text.includes(stage1.text));
  inv = { ...inv, hintsUsed: [{ hintId: first.hintId!, at: T(1) }] };
  const second = offlineAssistant(c, inv, hintReq);
  check('a second SUBTLE hint is refused (stage 2 needs the stronger request)', second.refused === true && !second.hintId);
  const strong = offlineAssistant(c, inv, { action: 'stronger_hint' });
  const stage2 = c.hints.find((h) => h.objectiveId === firstObj.id && h.stage === 2)!;
  check('stronger hint releases stage 2 next (no skipping to 3)', strong.hintId === stage2.id);

  // drain all hints; verify order per objective and that they run out
  let drain = freshInv(c);
  const order: string[] = [];
  for (let i = 0; i < 60; i++) {
    const r = offlineAssistant(c, drain, { action: 'stronger_hint' });
    if (!r.hintId) break;
    order.push(r.hintId);
    drain = { ...drain, hintsUsed: [...drain.hintsUsed, { hintId: r.hintId, at: T(2) }] };
  }
  const stagesByObj = new Map<string, number[]>();
  for (const id of order) {
    const h = c.hints.find((x) => x.id === id)!;
    stagesByObj.set(h.objectiveId, [...(stagesByObj.get(h.objectiveId) ?? []), h.stage]);
  }
  check('hints per objective are always released 1 -> 2 -> 3', [...stagesByObj.values()].every((s) => s.join(',') === '1,2,3'));
  check('hints run out and never repeat', new Set(order).size === order.length && order.length === c.hints.length && offlineAssistant(c, drain, { action: 'stronger_hint' }).refused === true);

  // evidence explanation
  const target = c.evidence.find((e) => !c.startEvidenceIds.includes(e.id))!;
  check('explain refuses unopened evidence', offlineAssistant(c, freshInv(c), { action: 'explain_evidence', evidenceId: target.id }).refused === true);
  check('explain refuses missing selection', offlineAssistant(c, freshInv(c), { action: 'explain_evidence' }).refused === true);
  const opened = openAll(freshInv(c, 'advanced'), c);
  const ex = offlineAssistant(c, opened, { action: 'explain_evidence', evidenceId: target.id });
  check('explain works for opened evidence and gives guidance bullets', !ex.refused && (ex.bullets?.length ?? 0) >= 3 && ex.text.includes(target.title));
  check('advanced mode explanation omits the analyst insight', !ex.text.includes(target.insight));
  const exB = offlineAssistant(c, openAll(freshInv(c, 'beginner'), c), { action: 'explain_evidence', evidenceId: target.id });
  check('beginner mode explanation includes the analyst note', exB.text.includes(target.insight));

  // inconsistencies & next steps & terms
  check('no inconsistencies reported before evidence is opened', !offlineAssistant(c, freshInv(c), { action: 'inconsistencies' }).bullets);
  const incon = offlineAssistant(c, openAll(freshInv(c), c), { action: 'inconsistencies' });
  check('inconsistencies appear once both sides are opened', (incon.bullets?.length ?? 0) >= 1 || c.relationships.every((r) => r.type !== 'contradicts'));
  const ns = offlineAssistant(c, freshInv(c), { action: 'next_steps' });
  check('next steps names an objective and unopened evidence', ns.text.includes('Next objective') && (ns.bullets?.length ?? 0) >= 1);
  check('next steps when all done points to synthesis', offlineAssistant(c, openAll(freshInv(c), c), { action: 'next_steps' }).text.includes('covered'));
  check('explain_term works and refuses unknown terms', offlineAssistant(c, freshInv(c), { action: 'explain_term', term: 'DMARC' }).text.includes('DMARC') && offlineAssistant(c, freshInv(c), { action: 'explain_term', term: 'zzzz' }).refused === true);

  // hypotheses
  const [o1, o2] = c.solution.verdictOptions;
  check('compare needs two different hypotheses', offlineAssistant(c, freshInv(c), { action: 'compare_hypotheses', hypothesisA: o1.id, hypothesisB: o1.id }).refused === true);
  const cmp = offlineAssistant(c, openAll(freshInv(c), c), { action: 'compare_hypotheses', hypothesisA: o1.id, hypothesisB: o2.id });
  check('compare returns grounded bullets', !cmp.refused && (cmp.bullets?.length ?? 0) >= 3);
  const cmpSwapped = offlineAssistant(c, openAll(freshInv(c), c), { action: 'compare_hypotheses', hypothesisA: o2.id, hypothesisB: o1.id });
  const wrongPair = offlineAssistant(c, openAll(freshInv(c), c), { action: 'compare_hypotheses', hypothesisA: c.solution.verdictOptions[2].id, hypothesisB: c.solution.verdictOptions[3].id });
  check('compare is symmetric: swapping the order gives the same lines (no favouritism)', JSON.stringify([...(cmp.bullets ?? [])].sort()) === JSON.stringify([...(cmpSwapped.bullets ?? [])].sort()) && cmp.text === cmpSwapped.text);
  check('compare never names a "best" hypothesis', ![cmp, wrongPair].some((r) => /\b(correct|best|right answer|most likely|winner)\b/i.test(r.text + (r.bullets ?? []).join(' '))));

  // report review
  const emptyReview = offlineAssistant(c, openAll(freshInv(c), c), { action: 'review_report' });
  check('review of an empty draft lists problems', (emptyReview.bullets?.length ?? 0) >= 4);
  const a = ANSWERS[c.id];
  const goodInv = { ...openAll(freshInv(c), c), draft: a.model };
  const goodReview = offlineAssistant(c, goodInv, { action: 'review_report' });
  check('review of the model answer is clean', !goodReview.bullets, JSON.stringify(goodReview.bullets));
  const trig = c.solution.unsupportedAssumptions[0].triggers[0];
  const bad = offlineAssistant(c, { ...goodInv, draft: { ...a.model, conclusion: a.model.conclusion + ` It is certain that ${trig}.` } }, { action: 'review_report' });
  check('review flags an unhedged unsupported claim', !!bad.bullets?.some((b) => b.includes(trig)));
  const overconf = offlineAssistant(c, { ...goodInv, draft: { ...a.model, confidence: 100, alternatives: '' } }, { action: 'review_report' });
  check('review flags overconfidence and missing alternatives', !!overconf.bullets?.some((b) => /confidence/i.test(b)) && !!overconf.bullets?.some((b) => /alternative/i.test(b)));

  // NO-SPOILER battery: nothing the assistant says may reveal the verdict, labels, or the explanation text
  const actions: AssistantRequest[] = [
    { action: 'subtle_hint' }, { action: 'stronger_hint' }, { action: 'inconsistencies' }, { action: 'next_steps' }, { action: 'review_report' },
    { action: 'compare_hypotheses', hypothesisA: o1.id, hypothesisB: o2.id },
    ...c.evidence.map((e) => ({ action: 'explain_evidence' as const, evidenceId: e.id })),
  ];
  const leaks: string[] = [];
  for (const mode of ['beginner', 'intermediate', 'advanced'] as const) {
    const base = { ...openAll(freshInv(c, mode), c), draft: { ...a.partial } };
    for (const req of actions) {
      const r = offlineAssistant(c, base, req);
      const blob = (r.text + '\n' + (r.bullets ?? []).join('\n')).toLowerCase();
      // compare_hypotheses legitimately echoes the two options the learner chose; it is checked for symmetry below.
      if (req.action !== 'compare_hypotheses' && blob.includes(correct.label.toLowerCase())) leaks.push(`${mode}/${req.action}: correct verdict label`);
      if (/red herring/.test(blob) && !(mode === 'beginner' && req.action === 'explain_evidence')) leaks.push(`${mode}/${req.action}: says red herring`);
      if (c.solution.explanation.some((p) => blob.includes(p.slice(0, 60).toLowerCase()))) leaks.push(`${mode}/${req.action}: copies the explanation`);
      if (/\bkey evidence\b/.test(blob)) leaks.push(`${mode}/${req.action}: labels key evidence`);
    }
  }
  check('assistant never leaks the verdict, key/red-herring labels or the explanation', leaks.length === 0, leaks.slice(0, 3).join(' | '));
  check('assistant replies are all marked offline', actions.every((r) => offlineAssistant(c, freshInv(c), r).source === 'offline'));
}

// ---------------------------------------------------------------- reducer
section('Reducer: state, XP and anti-farming');
const run = (s: AppState, ...acts: Action[]) => acts.reduce(reducer, s);
const S0 = initialState(T(0), 'guest-1');
const pc = CASES[0];
const startPc: Action = { type: 'START', caseId: pc.id, mode: 'intermediate', timed: false, hintPenalty: true, now: T(1) };
function playModel(s: AppState, c: CaseFile, now: number, mode: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'): AppState {
  const a = ANSWERS[c.id];
  let st = reducer(s, { type: 'START', caseId: c.id, mode, timed: false, hintPenalty: true, now: T(now) });
  for (const e of c.evidence) st = reducer(st, { type: 'INSPECT', caseId: c.id, evidenceId: e.id, now: T(now) });
  for (const id of a.model.supportingEvidenceIds) st = reducer(st, { type: 'COLLECT', caseId: c.id, evidenceId: id });
  st = reducer(st, { type: 'DRAFT_UPDATE', caseId: c.id, patch: a.model });
  return reducer(st, { type: 'SUBMIT', caseId: c.id, now: T(now + 1) });
}
{
  const s1 = run(S0, startPc);
  check('START creates an active investigation with start evidence', s1.investigations[pc.id]?.status === 'active' && s1.investigations[pc.id].inspected.length === pc.startEvidenceIds.length);
  check('START on an active case resumes and never overwrites progress', reducer(run(s1, { type: 'INSPECT', caseId: pc.id, evidenceId: 'P-01', now: T(2) }), { ...startPc, mode: 'advanced' }).investigations[pc.id].inspected.includes('P-01'));
  check('START on an unknown case is ignored', reducer(S0, { ...startPc, caseId: 'nope' }) === S0);
  check('INSPECT ignores unknown evidence and duplicates', reducer(s1, { type: 'INSPECT', caseId: pc.id, evidenceId: 'ZZ', now: T(2) }) === s1 && reducer(run(s1, { type: 'INSPECT', caseId: pc.id, evidenceId: 'P-01', now: T(2) }), { type: 'INSPECT', caseId: pc.id, evidenceId: 'P-01', now: T(3) }).investigations[pc.id].inspected.filter((x) => x === 'P-01').length === 1);
  check('COLLECT requires prior inspection', reducer(s1, { type: 'COLLECT', caseId: pc.id, evidenceId: 'P-06' }) === s1);
  const s2 = run(s1, { type: 'INSPECT', caseId: pc.id, evidenceId: 'P-01', now: T(2) }, { type: 'COLLECT', caseId: pc.id, evidenceId: 'P-01' });
  check('COLLECT after inspection works', s2.investigations[pc.id].collected.includes('P-01'));
  const s3 = run(s2, { type: 'GRAPH_SET', caseId: pc.id, now: T(3), graph: { nodes: [{ id: 'P-01', x: 1.4, y: 2 }, { id: 'P-03', x: 5, y: 5 }, { id: 'P-06', x: 9, y: 9 }], edges: [{ id: 'e1', source: 'P-01', target: 'P-03', type: 'precedes', label: 'x'.repeat(200) }, { id: 'e2', source: 'P-01', target: 'P-01', type: 'related', label: 'self' }, { id: 'e3', source: 'P-01', target: 'P-06', type: 'supports', label: 'uncollected' }, { id: 'e4', source: 'P-01', target: 'P-03', type: 'precedes', label: 'dup' }, { id: 'e5', source: 'P-01', target: 'P-03', type: 'bogus' as never, label: 'bad type' }] } });
  const g = s3.investigations[pc.id].graph;
  check('GRAPH_SET drops uncollected nodes, self-loops, duplicates and bad types; clamps labels', g.nodes.length === 2 && g.edges.length === 1 && g.edges[0].label.length === 60 && g.nodes[0].x === 1 && g.savedAt === T(3), JSON.stringify(g.edges));
  const s4 = reducer(s3, { type: 'UNCOLLECT', caseId: pc.id, evidenceId: 'P-01' });
  check('UNCOLLECT removes the node and its edges from the graph', !s4.investigations[pc.id].graph.nodes.some((n) => n.id === 'P-01') && s4.investigations[pc.id].graph.edges.length === 0);
  const sn = run(s1, { type: 'NOTE_ADD', caseId: pc.id, text: '   ', id: 'n0', now: T(2) }, { type: 'NOTE_ADD', caseId: pc.id, text: '<img src=x onerror=alert(1)>\u0007' + 'y'.repeat(5000), id: 'n1', now: T(2) });
  check('empty notes ignored; long notes clamped; control chars stripped; markup kept as inert text', sn.investigations[pc.id].notes.length === 1 && sn.investigations[pc.id].notes[0].text.length === 2000 && !sn.investigations[pc.id].notes[0].text.includes('\u0007') && sn.investigations[pc.id].notes[0].text.startsWith('<img'));
  check('NOTE_REMOVE works', run(sn, { type: 'NOTE_REMOVE', caseId: pc.id, id: 'n1' }).investigations[pc.id].notes.length === 0);
  const sh = run(s1, { type: 'HINT_USE', caseId: pc.id, hintId: 'p-h1-1', now: T(2) });
  check('HINT_USE records once; duplicates and unknown ids ignored', sh.investigations[pc.id].hintsUsed.length === 1 && reducer(sh, { type: 'HINT_USE', caseId: pc.id, hintId: 'p-h1-1', now: T(3) }) === sh && reducer(sh, { type: 'HINT_USE', caseId: pc.id, hintId: 'zzz', now: T(3) }) === sh);
  const sd = reducer(s2, { type: 'DRAFT_UPDATE', caseId: pc.id, patch: { confidence: 150, verdictId: 'not-an-option', supportingEvidenceIds: ['P-01', 'P-01', 'BAD'], timeline: ['p-e2', 'nope'], actionIds: ['p-a1', 'x'], conclusion: 'a'.repeat(9000) } });
  const dd = sd.investigations[pc.id].draft;
  check('DRAFT_UPDATE clamps confidence, rejects bad verdicts, filters/dedupes ids, caps text', dd.confidence === 100 && dd.verdictId === '' && dd.supportingEvidenceIds.join() === 'P-01' && dd.timeline.join() === 'p-e2' && dd.actionIds.join() === 'p-a1' && dd.conclusion.length === 4000);
  check('TICK accumulates, rejects negatives, caps abuse', run(s1, { type: 'TICK', caseId: pc.id, seconds: 5 }, { type: 'TICK', caseId: pc.id, seconds: -9 }, { type: 'TICK', caseId: pc.id, seconds: 99999 }).investigations[pc.id].elapsedSec === 3605);

  // submit gating
  check('SUBMIT with an incomplete draft changes nothing', reducer(s1, { type: 'SUBMIT', caseId: pc.id, now: T(5) }) === s1);

  // full play
  const done = playModel(S0, pc, 10);
  const rep = done.reports[0];
  check('SUBMIT completes the case, stores one report, scores 100', done.investigations[pc.id].status === 'completed' && done.reports.length === 1 && rep.score === 100);
  const unlocked = Object.keys(done.achievements);
  check('achievements are earned from real events', ['first_case', 'thorough', 'sharp_eye', 'clean_hands', 'unaided', 'calibrated', 'timeline_master', 'defender', 'perfectionist'].every((id) => unlocked.includes(id)), unlocked.join());
  check('events that did not happen are not unlocked', !unlocked.includes('case_collector') && !unlocked.includes('advanced_mode') && !unlocked.includes('comeback') && !unlocked.includes('phish_spotter') && !unlocked.includes('log_hunter'));
  check('graph_builder requires 5 real links (none were drawn)', !unlocked.includes('graph_builder'));
  check('XP = report XP + 25 per achievement', done.xp === rep.xpEarned + unlocked.length * ACHIEVEMENT_XP, `${done.xp} vs ${rep.xpEarned}+${unlocked.length}*25`);
  const xpAfter = done.xp;
  check('double SUBMIT is a no-op (cannot farm XP by clicking twice)', reducer(done, { type: 'SUBMIT', caseId: pc.id, now: T(30) }) === done);
  check('edits after completion are ignored', reducer(done, { type: 'DRAFT_UPDATE', caseId: pc.id, patch: { confidence: 1 } }) === done && reducer(done, { type: 'HINT_USE', caseId: pc.id, hintId: 'p-h1-1', now: T(31) }) === done);

  // replay
  const replayDone = playModel(done, pc, 40);
  check('replay creates attempt #2 and a second report', replayDone.reports.length === 2 && replayDone.reports[1].attempt === 2 && replayDone.investigations[pc.id].id.endsWith('-a2'));
  check('replaying an identical answer awards 0 case XP', replayDone.reports[1].xpEarned === 0 && replayDone.caseXp[pc.id] === done.caseXp[pc.id], `xp=${replayDone.reports[1].xpEarned}`);
  check('replay does not re-award achievements', replayDone.xp === xpAfter);
  // a worse replay cannot reduce XP or beat the best
  const worse = (() => {
    let st = reducer(done, { type: 'START', caseId: pc.id, mode: 'advanced', timed: false, hintPenalty: true, now: T(50) });
    for (const e of pc.evidence) st = reducer(st, { type: 'INSPECT', caseId: pc.id, evidenceId: e.id, now: T(50) });
    st = reducer(st, { type: 'DRAFT_UPDATE', caseId: pc.id, patch: ANSWERS[pc.id].partial });
    st = reducer(st, { type: 'COLLECT', caseId: pc.id, evidenceId: 'P-01' });
    return reducer(st, { type: 'SUBMIT', caseId: pc.id, now: T(51) });
  })();
  check('a weaker replay awards no XP and keeps the previous best', worse.reports[1].score < 100 && worse.xp === xpAfter && worse.caseXp[pc.id] === done.caseXp[pc.id]);

  // comeback: weak first attempt then strong replay
  const weakFirst = (() => {
    let st = reducer(S0, { type: 'START', caseId: pc.id, mode: 'intermediate', timed: false, hintPenalty: true, now: T(60) });
    for (const e of pc.evidence) st = reducer(st, { type: 'INSPECT', caseId: pc.id, evidenceId: e.id, now: T(60) });
    st = reducer(st, { type: 'COLLECT', caseId: pc.id, evidenceId: 'P-01' });
    st = reducer(st, { type: 'DRAFT_UPDATE', caseId: pc.id, patch: ANSWERS[pc.id].partial });
    return reducer(st, { type: 'SUBMIT', caseId: pc.id, now: T(61) });
  })();
  const comeback = playModel(weakFirst, pc, 70);
  check('replay XP is only the improvement over the previous best', comeback.xp - weakFirst.xp >= comeback.reports[1].xpEarned && comeback.reports[1].xpEarned > 0 && comeback.caseXp[pc.id] === weakFirst.caseXp[pc.id] + comeback.reports[1].xpEarned);
  check('comeback achievement earned for a 15+ point improvement', !!comeback.achievements.comeback);

  // all four cases
  let all = S0;
  CASES.forEach((c, i) => (all = playModel(all, c, 10 + i * 5, i === 2 ? 'advanced' : 'intermediate')));
  check('all four cases can be completed end to end with scores >= 90', all.reports.length === 4 && all.reports.every((r) => r.score >= 90), all.reports.map((r) => r.score).join());
  check('case_collector unlocks after all four correct verdicts', !!all.achievements.case_collector);
  check('advanced_mode unlocks for an 80+ advanced run', !!all.achievements.advanced_mode);
  check('XP total is consistent after four cases', all.xp === all.reports.reduce((s, r) => s + r.xpEarned, 0) + Object.keys(all.achievements).length * ACHIEVEMENT_XP);
  check('activity log is capped and newest-first', all.activity.length > 0 && all.activity.length <= 50 && all.activity[0].at >= all.activity[all.activity.length - 1].at);
  check('replay mode: a completed case can be restarted', reducer(all, { type: 'START', caseId: CASES[0].id, mode: 'beginner', timed: true, hintPenalty: false, now: T(59) }).investigations[CASES[0].id].status === 'active');

  // timed bonus
  const timed = (() => {
    const a = ANSWERS[pc.id];
    let st = reducer(S0, { type: 'START', caseId: pc.id, mode: 'intermediate', timed: true, hintPenalty: true, now: T(1) });
    for (const e of pc.evidence) st = reducer(st, { type: 'INSPECT', caseId: pc.id, evidenceId: e.id, now: T(1) });
    for (const id of a.model.supportingEvidenceIds) st = reducer(st, { type: 'COLLECT', caseId: pc.id, evidenceId: id });
    st = reducer(st, { type: 'DRAFT_UPDATE', caseId: pc.id, patch: a.model });
    return st;
  })();
  const inTime = reducer(reducer(timed, { type: 'TICK', caseId: pc.id, seconds: 600 }), { type: 'SUBMIT', caseId: pc.id, now: T(2) });
  const late = reducer(run(timed, { type: 'TICK', caseId: pc.id, seconds: 3600 }, { type: 'TICK', caseId: pc.id, seconds: 3600 }), { type: 'SUBMIT', caseId: pc.id, now: T(2) });
  check('finishing a timed challenge in time earns the +30 XP bonus; overtime does not', inTime.reports[0].xpEarned - late.reports[0].xpEarned === 30, `${inTime.reports[0].xpEarned} vs ${late.reports[0].xpEarned}`);
  check('hint penalty off keeps full hint score', (() => {
    const a = ANSWERS[pc.id];
    let st = reducer(S0, { type: 'START', caseId: pc.id, mode: 'intermediate', timed: false, hintPenalty: false, now: T(1) });
    for (const e of pc.evidence) st = reducer(st, { type: 'INSPECT', caseId: pc.id, evidenceId: e.id, now: T(1) });
    for (const id of a.model.supportingEvidenceIds) st = reducer(st, { type: 'COLLECT', caseId: pc.id, evidenceId: id });
    st = run(st, { type: 'DRAFT_UPDATE', caseId: pc.id, patch: a.model }, { type: 'HINT_USE', caseId: pc.id, hintId: 'p-h1-3', now: T(2) }, { type: 'HINT_USE', caseId: pc.id, hintId: 'p-h2-3', now: T(2) });
    const r = reducer(st, { type: 'SUBMIT', caseId: pc.id, now: T(3) }).reports[0];
    return r.categories.find((c) => c.key === 'hints')!.ratio === 1 && r.hintsUsed === 2;
  })());

  // labs through the reducer
  const email = PHISHING_EMAILS[0];
  const good = { classification: email.classification, indicatorIds: email.indicators.map((i) => i.id), reasoning: 'The sender domain is a look-alike and the link destination does not match; the 24 hours threat is pressure.' };
  const p1 = reducer(S0, { type: 'PHISHING_SUBMIT', emailId: email.id, answer: good, now: T(1) });
  check('phishing result is stored with score and XP awarded', p1.phishing[email.id].score === 100 && p1.xp === 10);
  check('resubmitting the same phishing answer awards no extra XP', reducer(p1, { type: 'PHISHING_SUBMIT', emailId: email.id, answer: good, now: T(2) }).xp === 10);
  const p0 = reducer(S0, { type: 'PHISHING_SUBMIT', emailId: email.id, answer: { classification: 'suspicious', indicatorIds: [], reasoning: '' }, now: T(1) });
  const p0b = reducer(p0, { type: 'PHISHING_SUBMIT', emailId: email.id, answer: good, now: T(2) });
  check('improving a phishing answer awards only the difference', p0.xp === 2 && p0b.xp === 10 && p0b.phishing[email.id].bestScore === 100);
  check('a worse phishing retry keeps the best score', reducer(p1, { type: 'PHISHING_SUBMIT', emailId: email.id, answer: { classification: 'legitimate', indicatorIds: [], reasoning: '' }, now: T(3) }).phishing[email.id].bestScore === 100);
  check('unknown phishing email is ignored', reducer(S0, { type: 'PHISHING_SUBMIT', emailId: 'x', answer: good, now: T(1) }) === S0);
  let ps = S0;
  for (const e of PHISHING_EMAILS.slice(0, 5)) ps = reducer(ps, { type: 'PHISHING_SUBMIT', emailId: e.id, answer: { classification: e.classification, indicatorIds: e.indicators.map((i) => i.id), reasoning: '' }, now: T(1) });
  check('phish_spotter after five correct classifications', !!ps.achievements.phish_spotter);

  const anomalyIds = LOG_ENTRIES.filter((e) => e.anomaly).map((e) => e.id);
  const l1 = run(S0, { type: 'LOG_FLAGS_SET', flagged: [...anomalyIds, 'LOG-999', anomalyIds[0]] });
  check('LOG_FLAGS_SET dedupes and drops unknown ids', l1.logLab[LOG_LAB_ID].flagged.length === 8);
  const l2 = reducer(l1, { type: 'LOG_CHECK', now: T(1) });
  check('LOG_CHECK awards 80 XP + log_hunter for a perfect run', l2.xp === 80 + ACHIEVEMENT_XP && !!l2.achievements.log_hunter && l2.logLab[LOG_LAB_ID].correctFlags === 8);
  check('re-checking awards nothing more', reducer(l2, { type: 'LOG_CHECK', now: T(2) }).xp === l2.xp);
  const l3 = run(l2, { type: 'LOG_FLAGS_SET', flagged: [] }, { type: 'LOG_CHECK', now: T(3) });
  check('a worse later check cannot erase the best result', l3.logLab[LOG_LAB_ID].correctFlags === 8 && l3.xp === l2.xp);
  const lf = run(S0, { type: 'LOG_FLAGS_SET', flagged: [...anomalyIds, LOG_ENTRIES.find((e) => !e.anomaly)!.id] }, { type: 'LOG_CHECK', now: T(1) });
  check('false flags block log_hunter', !lf.achievements.log_hunter && lf.logLab[LOG_LAB_ID].falseFlags === 1 && lf.xp === 80);
  check('LOG_RESET clears flags but keeps the best result', run(l2, { type: 'LOG_RESET' }).logLab[LOG_LAB_ID].flagged.length === 0 && run(l2, { type: 'LOG_RESET' }).logLab[LOG_LAB_ID].correctFlags === 8);

  // settings / profile / reset
  check('SETTINGS_UPDATE accepts valid values and ignores invalid ones', (() => {
    const s = run(S0, { type: 'SETTINGS_UPDATE', patch: { defaultMode: 'advanced', hintPenalty: false } }, { type: 'SETTINGS_UPDATE', patch: { defaultMode: 'godmode' as never, timedChallenges: 'yes' as never } });
    return s.settings.defaultMode === 'advanced' && s.settings.hintPenalty === false && s.settings.timedChallenges === false;
  })());
  check('PROFILE_NAME trims, caps at 40, ignores empty', reducer(S0, { type: 'PROFILE_NAME', name: '  ' }) === S0 && reducer(S0, { type: 'PROFILE_NAME', name: 'n'.repeat(100) }).profile.name.length === 40);
  const reset = reducer(done, { type: 'RESET', now: T(9) });
  check('RESET clears progress but keeps the guest id', reset.xp === 0 && reset.reports.length === 0 && Object.keys(reset.investigations).length === 0 && reset.profile.guestId === 'guest-1');
  check('a fresh state has no fake data', S0.xp === 0 && S0.reports.length === 0 && S0.activity.length === 0 && Object.keys(S0.achievements).length === 0);
}

// ---------------------------------------------------------------- persistence
section('Persistence');
{
  const mem = (): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>();
    return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  };
  const st = playModel(S0, pc, 10);
  const store = mem();
  check('saveState returns true and round-trips exactly', saveState(store, st) && JSON.stringify(loadState(store, T(0), 'g')) === JSON.stringify(st));
  check('refresh keeps an in-progress investigation', (() => {
    const mid = run(S0, startPc, { type: 'INSPECT', caseId: pc.id, evidenceId: 'P-06', now: T(2) });
    const s2 = mem();
    saveState(s2, mid);
    return loadState(s2, T(5), 'g2').investigations[pc.id].inspected.includes('P-06');
  })());
  const corrupt = mem();
  corrupt.setItem(STORAGE_KEY, '{not json');
  check('corrupt JSON falls back to a fresh state without throwing', loadState(corrupt, T(0), 'g').xp === 0);
  const wrongVer = mem();
  wrongVer.setItem(STORAGE_KEY, JSON.stringify({ ...st, version: 99 }));
  check('unknown version falls back to a fresh state', loadState(wrongVer, T(0), 'g').reports.length === 0);
  const throwing: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('x'); } };
  check('blocked storage never throws (load and save)', loadState(throwing, T(0), 'g').xp === 0 && saveState(throwing, st) === false);
  check('missing storage never throws', loadState(undefined, T(0), 'g').xp === 0 && saveState(undefined, st) === false);
  const hostile = normalizeState({ version: 1, xp: -5, profile: { name: 'x'.repeat(500), guestId: 7 }, settings: { defaultMode: 'root' }, reports: 'nope', evil: { __proto__: { polluted: true } } }, T(0), 'g')!;
  check('normalizeState sanitises hostile input (bad types, long names, unknown keys)', hostile.xp === 0 && hostile.profile.name.length === 40 && hostile.profile.guestId === 'g' && hostile.settings.defaultMode === 'beginner' && Array.isArray(hostile.reports) && !('evil' in hostile) && !({} as Record<string, unknown>).polluted);
  check('normalizeState rejects non-objects and arrays', normalizeState(null, T(0), 'g') === null && normalizeState([], T(0), 'g') === null && normalizeState('x', T(0), 'g') === null);
  check('export/import round trip', JSON.stringify(parseState(exportState(st), T(0), 'g')) === JSON.stringify(st) && parseState('garbage', T(0), 'g') === null);
  check('getCase resolves by id and slug', getCase(pc.slug)?.id === pc.id && getCase('nope') === undefined);
}

finish();
