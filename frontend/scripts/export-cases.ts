/* `npm run export:cases` — writes ../backend/app/case_data/public_cases.json.
 * The export deliberately EXCLUDES every solution field (verdict, relevance, insights, red herrings,
 * signals, scoring rubric) so the backend — and therefore any LLM it calls — can never leak answers. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASES } from '../src/data/cases';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../../backend/app/case_data/public_cases.json');

const pub = CASES.map((c) => ({
  id: c.id,
  slug: c.slug,
  number: c.number,
  title: c.title,
  tagline: c.tagline,
  description: c.description,
  difficulty: c.difficulty,
  estimatedMinutes: c.estimatedMinutes,
  categories: c.categories,
  briefing: c.briefing,
  entities: c.entities,
  objectives: c.objectives.map((o) => ({ id: o.id, text: o.text })),
  evidence: c.evidence.map((e) => ({ id: e.id, title: e.title, type: e.type, source: e.source, timestamp: e.timestamp ?? null, summary: e.summary, fields: e.fields.map(({ label, value }) => ({ label, value })), headers: (e.headers ?? []).map(({ label, value }) => ({ label, value })), content: e.content ?? null })),
  learningObjectives: c.learningObjectives,
  verdictOptions: c.solution.verdictOptions.map((o) => ({ id: o.id, label: o.label })),
}));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedBy: 'frontend/scripts/export-cases.ts', cases: pub }, null, 1) + '\n');
console.log(`wrote ${pub.length} cases to ${out}`);
