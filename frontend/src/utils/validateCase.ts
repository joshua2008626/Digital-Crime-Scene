import type { CaseFile } from '@/types';

const ALLOWED_IP = [/^192\.0\.2\.\d{1,3}$/, /^198\.51\.100\.\d{1,3}$/, /^203\.0\.113\.\d{1,3}$/, /^10\./, /^192\.168\./, /^127\./, /^0\.0\.0\.0$/];

function dupes(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) out.push(id);
    seen.add(id);
  }
  return out;
}

/** Collects every string value inside an object (for safety scanning). */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out));
  return out;
}

/** Returns a list of problems. Empty list = the case is internally consistent and safe. */
export function validateCase(c: CaseFile): string[] {
  const errs: string[] = [];
  const s = c.solution;
  const ev = new Map(c.evidence.map((e) => [e.id, e]));
  const evIds = new Set(ev.keys());
  const eventMap = new Map(c.events.map((e) => [e.id, e]));
  const optionIds = new Set(s.verdictOptions.map((o) => o.id));

  // ----- identifiers -----
  for (const [label, ids] of [
    ['evidence', c.evidence.map((e) => e.id)],
    ['events', c.events.map((e) => e.id)],
    ['objectives', c.objectives.map((o) => o.id)],
    ['hints', c.hints.map((h) => h.id)],
    ['relationships', c.relationships.map((r) => r.id)],
    ['verdict options', s.verdictOptions.map((o) => o.id)],
    ['defensive actions', s.defensiveActions.map((a) => a.id)],
    ['reasoning points', s.reasoningPoints.map((r) => r.id)],
    ['entities', c.entities.map((e) => e.id)],
  ] as [string, string[]][]) {
    const d = dupes(ids);
    if (d.length) errs.push(`duplicate ${label} ids: ${d.join(', ')}`);
  }

  // ----- weights -----
  const wsum = Object.values(c.weights).reduce((a, b) => a + b, 0);
  if (wsum !== 100) errs.push(`rubric weights sum to ${wsum}, expected 100`);

  // ----- solution <-> evidence consistency -----
  for (const id of [...s.keyEvidenceIds, ...s.supportingEvidenceIds, ...s.redHerringIds])
    if (!evIds.has(id)) errs.push(`solution references unknown evidence ${id}`);
  for (const e of c.evidence) {
    const inKey = s.keyEvidenceIds.includes(e.id);
    const inSup = s.supportingEvidenceIds.includes(e.id);
    const inRh = s.redHerringIds.includes(e.id);
    if (Number(inKey) + Number(inSup) + Number(inRh) !== 1) errs.push(`${e.id} must appear in exactly one solution list`);
    const expected = inKey ? 'key' : inSup ? 'supporting' : 'red_herring';
    if (e.relevance !== expected) errs.push(`${e.id} relevance "${e.relevance}" disagrees with solution list "${expected}"`);
    if (e.relevance === 'red_herring' && !e.redHerringReason) errs.push(`${e.id} is a red herring without redHerringReason`);
    if (!e.fields.length) errs.push(`${e.id} has no fields`);
    if (e.timestamp && Number.isNaN(Date.parse(e.timestamp))) errs.push(`${e.id} has an invalid timestamp`);
    for (const k of Object.keys(e.signals ?? {})) if (!optionIds.has(k)) errs.push(`${e.id} signal references unknown verdict ${k}`);
  }
  if (s.keyEvidenceIds.length < 3) errs.push('need at least 3 key evidence items');
  if (s.redHerringIds.length < 2) errs.push('need at least 2 red herrings');
  if (c.evidence.length < 10) errs.push('need at least 10 evidence items');

  // ----- objectives & hints -----
  for (const o of c.objectives) {
    for (const id of o.evidenceIds) if (!evIds.has(id)) errs.push(`objective ${o.id} references unknown evidence ${id}`);
    if (o.threshold < 1 || o.threshold > o.evidenceIds.length) errs.push(`objective ${o.id} has an impossible threshold`);
    const freeCount = o.evidenceIds.filter((id) => c.startEvidenceIds.includes(id)).length;
    if (freeCount >= o.threshold) errs.push(`objective ${o.id} is already complete from the starting evidence alone`);
    const stages = c.hints.filter((h) => h.objectiveId === o.id).map((h) => h.stage).sort();
    if (stages.join(',') !== '1,2,3') errs.push(`objective ${o.id} needs hint stages 1,2,3 (has ${stages.join(',') || 'none'})`);
  }
  for (const h of c.hints) if (!c.objectives.some((o) => o.id === h.objectiveId)) errs.push(`hint ${h.id} references unknown objective`);
  for (const id of s.keyEvidenceIds)
    if (!c.objectives.some((o) => o.evidenceIds.includes(id))) errs.push(`key evidence ${id} is not covered by any objective`);

  // ----- events & timeline -----
  for (const e of c.events) {
    if (Number.isNaN(Date.parse(e.time))) errs.push(`event ${e.id} has an invalid time`);
    for (const id of e.evidenceIds) if (!evIds.has(id)) errs.push(`event ${e.id} references unknown evidence ${id}`);
  }
  const relevantChrono = c.events.filter((e) => e.relevant).sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).map((e) => e.id);
  if (s.timelineOrder.join('|') !== relevantChrono.join('|'))
    errs.push(`timelineOrder (${s.timelineOrder.join(',')}) is not the chronological order of relevant events (${relevantChrono.join(',')})`);
  for (const id of s.timelineOrder) if (!eventMap.has(id)) errs.push(`timelineOrder references unknown event ${id}`);
  if (c.events.filter((e) => !e.relevant).length < 2) errs.push('need at least 2 decoy timeline events');

  // ----- start + graph + relationships -----
  for (const id of c.startEvidenceIds) if (!evIds.has(id)) errs.push(`unknown start evidence ${id}`);
  for (const e of c.starterGraph) {
    if (!c.startEvidenceIds.includes(e.from) || !c.startEvidenceIds.includes(e.to)) errs.push(`starterGraph edge ${e.from}->${e.to} must connect start evidence`);
  }
  for (const r of c.relationships) {
    if (!evIds.has(r.from) || !evIds.has(r.to)) errs.push(`relationship ${r.id} references unknown evidence`);
    if (r.from === r.to) errs.push(`relationship ${r.id} is a self-loop`);
  }

  // ----- verdict options -----
  if (s.verdictOptions.length < 4) errs.push('need at least 4 verdict options');
  const correct = s.verdictOptions.find((o) => o.id === s.correctVerdictId);
  if (!correct) errs.push('correctVerdictId is not a verdict option');
  else if (correct.credit !== 1) errs.push('correct verdict must have credit 1');
  for (const o of s.verdictOptions) if (o.credit < 0 || o.credit > 1) errs.push(`verdict ${o.id} credit out of range`);
  if (s.verdictOptions.filter((o) => o.credit === 1).length !== 1) errs.push('exactly one verdict must have credit 1');

  // ----- rubric content -----
  if (s.reasoningPoints.length < 4) errs.push('need at least 4 reasoning points');
  for (const r of s.reasoningPoints) if (r.weight <= 0 || !r.keywordGroups.length) errs.push(`reasoning point ${r.id} is malformed`);
  const acts = s.defensiveActions;
  if (acts.length < 8) errs.push('need at least 8 defensive actions');
  if (acts.filter((a) => a.quality === 'essential').length < 3) errs.push('need at least 3 essential actions');
  if (acts.filter((a) => a.quality === 'harmful').length < 2) errs.push('need at least 2 harmful actions');
  if (s.idealConfidence[0] >= s.idealConfidence[1]) errs.push('idealConfidence range is invalid');
  if (s.alternativeKeywords.length < 2) errs.push('need at least 2 alternative-explanation groups');
  if (s.limitations.length < 2) errs.push('need at least 2 limitations');
  if (s.explanation.length < 3) errs.push('explanation is too short');
  if (c.learningObjectives.length < 3) errs.push('need at least 3 learning objectives');

  errs.push(...scanFictional(c));
  return errs;
}

/**
 * Safety scan: every IP, URL host and email domain anywhere inside `value` must be
 * fictional (RFC 5737 documentation IPs, private ranges, or the reserved ".example" TLD).
 */
export function scanFictional(value: unknown): string[] {
  const errs: string[] = [];
  for (const str of strings(value)) {
    for (const m of str.matchAll(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/g)) {
      if (!ALLOWED_IP.some((re) => re.test(m[1]))) errs.push(`non-reserved IP address in case text: ${m[1]}`);
    }
    for (const m of str.matchAll(/https?:\/\/([^\s/)"'\]]+)/gi)) {
      if (!/\.example(:\d+)?$/i.test(m[1])) errs.push(`non-.example URL host in case text: ${m[1]}`);
    }
    for (const m of str.matchAll(/\b[\w.-]+@([\w-]+(?:\.[\w-]+)+)/g)) {
      if (!/\.example$/i.test(m[1])) errs.push(`non-.example email domain in case text: ${m[1]}`);
    }
  }
  return errs;
}
