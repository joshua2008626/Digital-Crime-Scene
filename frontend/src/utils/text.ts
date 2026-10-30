// Small, dependency-free text helpers shared by the scoring engine and the offline assistant.

export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** True when every keyword group has at least one keyword present in the text. */
export function matchesGroups(text: string, groups: string[][]): boolean {
  const t = normalize(text);
  return groups.every((group) => group.some((kw) => t.includes(kw.toLowerCase())));
}

/** True when any keyword in the list appears in the text. */
export function containsAny(text: string, keywords: string[]): boolean {
  const t = normalize(text);
  return keywords.some((kw) => t.includes(kw.toLowerCase()));
}

const HEDGE =
  /\b(not|no|never|cannot|can't|cant|don't|dont|doesn't|doesnt|isn't|isnt|wasn't|wasnt|unlikely|might|may|maybe|possibly|possible|perhaps|could|if|whether|unless|without|nothing|unproven|unconfirmed|alleged|suspect|suspected|suspicion|hypothesis|hypothesise|hypothesize|rule out|ruled out|cannot confirm|not enough)\b/;

/**
 * Returns true if `trigger` appears in `text` at least once WITHOUT a hedge/negation
 * earlier in the same sentence. Used to detect stated-as-fact assumptions while letting
 * careful analysts write "this does not prove X" or "X is possible" without penalty.
 */
export function assertedWithoutHedge(text: string, trigger: string): boolean {
  const t = normalize(text);
  const needle = trigger.toLowerCase();
  let from = 0;
  while (true) {
    const idx = t.indexOf(needle, from);
    if (idx === -1) return false;
    const before = t.slice(0, idx);
    const sentenceStart = Math.max(before.lastIndexOf('.'), before.lastIndexOf('!'), before.lastIndexOf('?'), before.lastIndexOf(';'));
    const sentencePrefix = before.slice(sentenceStart + 1);
    if (!HEDGE.test(sentencePrefix)) return true;
    from = idx + needle.length;
  }
}

/** Longest common subsequence length of two string arrays. */
export function lcsLength(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/** cyrb53 — small, fast, deterministic non-cryptographic hash (used only to dedupe submissions). */
export function hashString(str: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
