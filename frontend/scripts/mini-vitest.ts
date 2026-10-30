/* Minimal stand-in for Vitest used ONLY to sanity-run tests/unit in environments where npm install is blocked.
 * It is not a replacement: `npm test` (real Vitest) is the authority. */
import assert from 'node:assert/strict';
type Fn = () => void | Promise<void>;
const queue: { name: string; fn: Fn }[] = [];
let prefix: string[] = [];
export function describe(name: string, fn: () => void): void { prefix.push(name); try { fn(); } finally { prefix.pop(); } }
describe.each = <T extends readonly unknown[]>(rows: readonly T[]) => (name: string, fn: (...a: T) => void) => {
  for (const r of rows) describe(name.replace('%s', String(r[0])), () => fn(...r));
};
export function it(name: string, fn: Fn): void { queue.push({ name: [...prefix, name].join(' › '), fn }); }
export const test = it;
export function expect(actual: any) {
  const mk = (neg: boolean) => {
    const t = (ok: boolean, msg: string) => assert.ok(neg ? !ok : ok, (neg ? 'NOT ' : '') + msg);
    return {
      toBe: (e: any) => t(Object.is(actual, e), `expected ${String(actual)} to be ${String(e)}`),
      toEqual: (e: any) => { try { assert.deepStrictEqual(actual, e); t(true, ''); } catch (err) { if (!neg) throw err; } },
      toBeGreaterThan: (e: number) => t(actual > e, `${actual} > ${e}`),
      toBeGreaterThanOrEqual: (e: number) => t(actual >= e, `${actual} >= ${e}`),
      toBeLessThan: (e: number) => t(actual < e, `${actual} < ${e}`),
      toBeLessThanOrEqual: (e: number) => t(actual <= e, `${actual} <= ${e}`),
      toHaveLength: (n: number) => t(actual.length === n, `length ${actual.length} === ${n}`),
      toBeNull: () => t(actual === null, `${String(actual)} is null`),
      toContain: (e: any) => t(actual.includes(e), `${String(actual)} contains ${String(e)}`),
    };
  };
  return { ...mk(false), not: mk(true) };
}
export async function run(): Promise<void> {
  let pass = 0, fail = 0;
  for (const q of queue) {
    try { await q.fn(); pass++; } catch (e) { fail++; console.log(`  FAIL  ${q.name}\n        ${(e as Error).message.split('\n')[0]}`); }
  }
  console.log(`\n${pass} passed, ${fail} failed (mini runner, ${queue.length} tests)`);
  process.exit(fail ? 1 : 0);
}
