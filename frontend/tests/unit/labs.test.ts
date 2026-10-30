import { describe, expect, it } from 'vitest';
import { PHISHING_EMAILS } from '@/data/phishing';
import { LOG_ENTRIES } from '@/data/logs';
import { gradeLogFlags, gradePhishing, logLabXp, phishingXp } from '@/utils/labs';
import { csvCell, logsToCsv } from '@/utils/export';
import { filterLogs, DEFAULT_LOG_QUERY } from '@/utils/logs';

describe('phishing lab', () => {
  it('wrong classification scores below a correct one', () => {
    const e = PHISHING_EMAILS.find((x) => x.classification === 'phishing')!;
    const right = gradePhishing(e, { classification: 'phishing', indicatorIds: e.indicators.map((i) => i.id), reasoning: '' });
    const wrong = gradePhishing(e, { classification: 'legitimate', indicatorIds: [], reasoning: '' });
    expect(right.score).toBeGreaterThan(wrong.score);
    expect(right.correct).toBe(true);
    expect(wrong.correct).toBe(false);
  });
  it('XP only rewards improvement over the best score', () => {
    expect(phishingXp(80, 80)).toBe(0);
    expect(phishingXp(60, 80)).toBe(0);
    expect(phishingXp(100, 80)).toBeGreaterThan(0);
  });
  it('shows links only as defanged text', () => {
    for (const e of PHISHING_EMAILS.filter((x) => x.classification === 'phishing')) {
      for (const l of e.links) expect(/hxxp|\[\.\]/.test(l.target)).toBe(true);
    }
  });
});

describe('log lab', () => {
  const anomalies = LOG_ENTRIES.filter((e) => e.anomaly).map((e) => e.id);
  it('flagging every anomaly and nothing else is a perfect score', () => {
    expect(gradeLogFlags(LOG_ENTRIES, anomalies).score).toBe(100);
  });
  it('false flags reduce the score', () => {
    const decoy = LOG_ENTRIES.find((e) => !e.anomaly)!.id;
    expect(gradeLogFlags(LOG_ENTRIES, [...anomalies, decoy]).score).toBeLessThan(100);
  });
  it('log XP only counts newly found anomalies', () => {
    expect(logLabXp(3, 3)).toBe(0);
    expect(logLabXp(5, 3)).toBe(20);
  });
  it('filters by text', () => {
    const first = LOG_ENTRIES[0];
    expect(filterLogs(LOG_ENTRIES, { ...DEFAULT_LOG_QUERY, query: first.user }).length).toBeGreaterThan(0);
  });
});

describe('CSV export safety', () => {
  it('neutralises spreadsheet formula injection', () => {
    for (const bad of ['=1+1', '+cmd', '-2+3', '@SUM(A1)']) expect(csvCell(bad).startsWith("'") || csvCell(bad).startsWith('"\'')).toBe(true);
  });
  it('quotes commas and quotes', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it('exports a header plus one row per entry', () => {
    expect(logsToCsv(LOG_ENTRIES.slice(0, 3)).trim().split('\n')).toHaveLength(4);
  });
});
