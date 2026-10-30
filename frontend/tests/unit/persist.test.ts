import { describe, expect, it } from 'vitest';
import { initialState } from '@/store/reducer';
import { exportState, loadState, parseState, saveState, STORAGE_KEY, type StorageLike } from '@/store/persist';

const NOW = '2026-10-28T00:00:00Z';
const memory = (): StorageLike & { data: Record<string, string> } => {
  const data: Record<string, string> = {};
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, removeItem: (k) => { delete data[k]; } };
};

describe('persistence', () => {
  it('round-trips state', () => {
    const m = memory();
    const s = { ...initialState(NOW, 'g'), xp: 42 };
    expect(saveState(m, s)).toBe(true);
    expect(loadState(m, NOW, 'g').xp).toBe(42);
  });
  it('falls back to a fresh state on corrupt JSON', () => {
    const m = memory();
    m.data[STORAGE_KEY] = '{not json';
    expect(loadState(m, NOW, 'g').xp).toBe(0);
  });
  it('rejects wrong versions and non-objects', () => {
    expect(parseState('[]', NOW, 'g')).toBeNull();
    expect(parseState(JSON.stringify({ version: 99 }), NOW, 'g')).toBeNull();
  });
  it('never throws when storage is unavailable or throws', () => {
    const bad: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); }, removeItem: () => undefined };
    expect(loadState(bad, NOW, 'g').xp).toBe(0);
    expect(saveState(bad, initialState(NOW, 'g'))).toBe(false);
    expect(loadState(undefined, NOW, 'g').xp).toBe(0);
  });
  it('export is parseable JSON that imports back', () => {
    const s = { ...initialState(NOW, 'g'), xp: 7 };
    expect(parseState(exportState(s), NOW, 'g')?.xp).toBe(7);
  });
});
