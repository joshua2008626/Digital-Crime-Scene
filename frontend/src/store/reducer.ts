// =====================================================================
// Pure application reducer. No React, no localStorage, no Date.now():
// every time/id is passed in, so it is deterministic and unit-testable.
// All user-provided text is length-limited and plain (React escapes it on render).
// =====================================================================
import type { AppState, GraphState, Investigation, Mode, RelationType, Settings, VerdictDraft } from '@/types';
import { CASES, getCase } from '@/data/cases';
import { PHISHING_EMAILS } from '@/data/phishing';
import { LOG_ENTRIES } from '@/data/logs';
import { createInvestigation } from '@/utils/investigation';
import { evaluateSubmission, validateDraft } from '@/utils/scoring';
import { evaluateAchievements, LOG_LAB_ID } from '@/utils/achievements';
import { ACHIEVEMENT_BY_ID } from '@/data/achievements';
import { gradeLogFlags, gradePhishing, logLabXp, phishingXp, type PhishingAnswer } from '@/utils/labs';

export const ACHIEVEMENT_XP = 25;
export const LIMITS = { note: 2000, conclusion: 4000, alternatives: 3000, actionNotes: 2000, edgeLabel: 60, name: 40, reasoning: 2000, notes: 100 } as const;
const RELATION_TYPES: RelationType[] = ['supports', 'contradicts', 'precedes', 'related'];

export const defaultSettings = (): Settings => ({ hintPenalty: true, defaultMode: 'beginner', timedChallenges: false, useAiBackend: false, reducedMotion: false });

export function initialState(now: string, guestId: string): AppState {
  return {
    version: 1,
    profile: { name: 'Investigator', createdAt: now, guestId },
    settings: defaultSettings(),
    investigations: {},
    reports: [],
    caseXp: {},
    xp: 0,
    achievements: {},
    phishing: {},
    logLab: {},
    activity: [],
    onboardingSeen: false,
  };
}

export type Action =
  | { type: 'START'; caseId: string; mode: Mode; timed: boolean; hintPenalty: boolean; now: string }
  | { type: 'INSPECT'; caseId: string; evidenceId: string; now: string }
  | { type: 'COLLECT'; caseId: string; evidenceId: string }
  | { type: 'UNCOLLECT'; caseId: string; evidenceId: string }
  | { type: 'NOTE_ADD'; caseId: string; text: string; evidenceId?: string; id: string; now: string }
  | { type: 'NOTE_REMOVE'; caseId: string; id: string }
  | { type: 'HINT_USE'; caseId: string; hintId: string; now: string }
  | { type: 'DRAFT_UPDATE'; caseId: string; patch: Partial<VerdictDraft> }
  | { type: 'GRAPH_SET'; caseId: string; graph: GraphState; now: string }
  | { type: 'TICK'; caseId: string; seconds: number }
  | { type: 'SUBMIT'; caseId: string; now: string }
  | { type: 'PHISHING_SUBMIT'; emailId: string; answer: PhishingAnswer; now: string }
  | { type: 'LOG_FLAGS_SET'; flagged: string[] }
  | { type: 'LOG_CHECK'; now: string }
  | { type: 'LOG_RESET' }
  | { type: 'SETTINGS_UPDATE'; patch: Partial<Settings> }
  | { type: 'PROFILE_NAME'; name: string }
  | { type: 'ONBOARDING_SEEN' }
  | { type: 'RESET'; now: string }
  | { type: 'IMPORT'; state: AppState };

const clampText = (s: unknown, max: number): string => (typeof s === 'string' ? s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max) : '');
const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

function addActivity(s: AppState, now: string, text: string): AppState {
  const entry = { id: `${now}#${s.activity.length}`, at: now, text };
  return { ...s, activity: [entry, ...s.activity].slice(0, 50) };
}

function withInv(s: AppState, caseId: string, fn: (inv: Investigation) => Investigation | null): AppState {
  const inv = s.investigations[caseId];
  if (!inv || inv.status !== 'active') return s;
  const next = fn(inv);
  if (!next || next === inv) return s;
  return { ...s, investigations: { ...s.investigations, [caseId]: next } };
}

function sanitizeGraph(graph: GraphState, collected: string[], now: string): GraphState {
  const allowed = new Set(collected);
  const seen = new Set<string>();
  const nodes = graph.nodes
    .filter((n) => allowed.has(n.id) && !seen.has(n.id) && seen.add(n.id))
    .map((n) => ({ id: n.id, x: Number.isFinite(n.x) ? Math.round(n.x) : 0, y: Number.isFinite(n.y) ? Math.round(n.y) : 0 }));
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edgeKeys = new Set<string>();
  const edges = graph.edges
    .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target) && e.source !== e.target && RELATION_TYPES.includes(e.type))
    .filter((e) => {
      const key = `${e.source}>${e.target}>${e.type}`;
      if (edgeKeys.has(key)) return false;
      edgeKeys.add(key);
      return true;
    })
    .map((e) => ({ id: clampText(e.id, 80) || `${e.source}-${e.target}`, source: e.source, target: e.target, type: e.type, label: clampText(e.label, LIMITS.edgeLabel) }));
  return { nodes, edges, savedAt: now };
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'START': {
      const c = getCase(a.caseId);
      if (!c) return s;
      const existing = s.investigations[c.id];
      if (existing && existing.status === 'active') return s; // resume, never overwrite progress
      const attempt = s.reports.filter((r) => r.caseId === c.id).length + 1;
      const inv = createInvestigation(c, { mode: a.mode, timed: a.timed, hintPenalty: a.hintPenalty, attempt, now: a.now, id: `${c.id}-a${attempt}` });
      return addActivity({ ...s, investigations: { ...s.investigations, [c.id]: inv } }, a.now, attempt > 1 ? `Started replay #${attempt} of "${c.title}"` : `Opened case "${c.title}"`);
    }

    case 'INSPECT': {
      const c = getCase(a.caseId);
      if (!c || !c.evidence.some((e) => e.id === a.evidenceId)) return s;
      return withInv(s, a.caseId, (inv) => (inv.inspected.includes(a.evidenceId) ? null : { ...inv, inspected: [...inv.inspected, a.evidenceId], updatedAt: a.now }));
    }

    case 'COLLECT':
      return withInv(s, a.caseId, (inv) => (!inv.inspected.includes(a.evidenceId) || inv.collected.includes(a.evidenceId) ? null : { ...inv, collected: [...inv.collected, a.evidenceId] }));

    case 'UNCOLLECT':
      return withInv(s, a.caseId, (inv) => {
        if (!inv.collected.includes(a.evidenceId)) return null;
        const nodes = inv.graph.nodes.filter((n) => n.id !== a.evidenceId);
        const edges = inv.graph.edges.filter((e) => e.source !== a.evidenceId && e.target !== a.evidenceId);
        return { ...inv, collected: inv.collected.filter((id) => id !== a.evidenceId), graph: { ...inv.graph, nodes, edges } };
      });

    case 'NOTE_ADD': {
      const text = clampText(a.text, LIMITS.note).trim();
      if (!text) return s;
      return withInv(s, a.caseId, (inv) => {
        if (inv.notes.length >= LIMITS.notes) return null;
        return { ...inv, notes: [...inv.notes, { id: a.id, text, evidenceId: a.evidenceId, createdAt: a.now }] };
      });
    }

    case 'NOTE_REMOVE':
      return withInv(s, a.caseId, (inv) => ({ ...inv, notes: inv.notes.filter((n) => n.id !== a.id) }));

    case 'HINT_USE': {
      const c = getCase(a.caseId);
      if (!c || !c.hints.some((h) => h.id === a.hintId)) return s;
      return withInv(s, a.caseId, (inv) => (inv.hintsUsed.some((h) => h.hintId === a.hintId) ? null : { ...inv, hintsUsed: [...inv.hintsUsed, { hintId: a.hintId, at: a.now }] }));
    }

    case 'DRAFT_UPDATE': {
      const c = getCase(a.caseId);
      if (!c) return s;
      return withInv(s, a.caseId, (inv) => {
        const p = a.patch;
        const d = { ...inv.draft };
        if (p.verdictId !== undefined) d.verdictId = c.solution.verdictOptions.some((o) => o.id === p.verdictId) ? p.verdictId : '';
        if (p.conclusion !== undefined) d.conclusion = clampText(p.conclusion, LIMITS.conclusion);
        if (p.alternatives !== undefined) d.alternatives = clampText(p.alternatives, LIMITS.alternatives);
        if (p.actionNotes !== undefined) d.actionNotes = clampText(p.actionNotes, LIMITS.actionNotes);
        if (p.confidence !== undefined) d.confidence = Math.max(0, Math.min(100, Math.round(Number(p.confidence) || 0)));
        if (p.supportingEvidenceIds !== undefined) d.supportingEvidenceIds = unique(p.supportingEvidenceIds).filter((id) => c.evidence.some((e) => e.id === id));
        if (p.timeline !== undefined) d.timeline = unique(p.timeline).filter((id) => c.events.some((e) => e.id === id));
        if (p.actionIds !== undefined) d.actionIds = unique(p.actionIds).filter((id) => c.solution.defensiveActions.some((x) => x.id === id));
        return { ...inv, draft: d };
      });
    }

    case 'GRAPH_SET':
      return withInv(s, a.caseId, (inv) => ({ ...inv, graph: sanitizeGraph(a.graph, inv.collected, a.now) }));

    case 'TICK': {
      const sec = Math.max(0, Math.min(3600, Math.floor(a.seconds)));
      if (!sec) return s;
      return withInv(s, a.caseId, (inv) => ({ ...inv, elapsedSec: inv.elapsedSec + sec }));
    }

    case 'SUBMIT': {
      const c = getCase(a.caseId);
      const inv = s.investigations[a.caseId];
      if (!c || !inv || inv.status !== 'active') return s; // already submitted: nothing to award twice
      if (validateDraft(c, inv).length) return s;
      const prior = s.reports.filter((r) => r.caseId === c.id);
      const report = evaluateSubmission({ caseFile: c, investigation: inv, now: a.now, previousBestXp: s.caseXp[c.id] ?? 0, previousHashes: prior.map((r) => r.submissionHash) });
      const completed: Investigation = { ...inv, status: 'completed', reportId: report.id, updatedAt: a.now };
      let next: AppState = {
        ...s,
        investigations: { ...s.investigations, [c.id]: completed },
        reports: [...s.reports, report],
        xp: s.xp + report.xpEarned,
        caseXp: { ...s.caseXp, [c.id]: (s.caseXp[c.id] ?? 0) + report.xpEarned },
      };
      next = addActivity(next, a.now, `Submitted verdict for "${c.title}": ${report.score}/100 (${report.grade})`);
      const unlocked = evaluateAchievements(next, { latest: report, caseFile: c, investigation: completed, allCases: CASES });
      for (const id of unlocked) {
        next = { ...next, achievements: { ...next.achievements, [id]: a.now }, xp: next.xp + ACHIEVEMENT_XP };
        next = addActivity(next, a.now, `Achievement unlocked: ${ACHIEVEMENT_BY_ID[id]?.title ?? id} (+${ACHIEVEMENT_XP} XP)`);
      }
      return next;
    }

    case 'PHISHING_SUBMIT': {
      const email = PHISHING_EMAILS.find((e) => e.id === a.emailId);
      if (!email) return s;
      const answer: PhishingAnswer = { classification: a.answer.classification, indicatorIds: unique(a.answer.indicatorIds), reasoning: clampText(a.answer.reasoning, LIMITS.reasoning) };
      const grade = gradePhishing(email, answer);
      const prev = s.phishing[email.id];
      const prevBest = prev?.bestScore ?? 0;
      const xp = phishingXp(grade.score, prevBest);
      let next: AppState = {
        ...s,
        xp: s.xp + xp,
        phishing: { ...s.phishing, [email.id]: { emailId: email.id, classification: answer.classification, reasoning: answer.reasoning, indicatorsFound: answer.indicatorIds, correct: grade.correct, score: grade.score, bestScore: Math.max(prevBest, grade.score), at: a.now } },
      };
      next = addActivity(next, a.now, `Phishing lab "${email.subject.slice(0, 40)}": ${grade.score}/100`);
      return awardLabAchievements(next, a.now);
    }

    case 'LOG_FLAGS_SET': {
      const valid = new Set(LOG_ENTRIES.map((e) => e.id));
      const prev = s.logLab[LOG_LAB_ID] ?? { flagged: [], checked: false, correctFlags: 0, falseFlags: 0 };
      return { ...s, logLab: { ...s.logLab, [LOG_LAB_ID]: { ...prev, flagged: unique(a.flagged).filter((id) => valid.has(id)) } } };
    }

    case 'LOG_CHECK': {
      const prev = s.logLab[LOG_LAB_ID] ?? { flagged: [], checked: false, correctFlags: 0, falseFlags: 0 };
      const grade = gradeLogFlags(LOG_ENTRIES, prev.flagged);
      const betterThanBest = grade.found.length > prev.correctFlags || (grade.found.length === prev.correctFlags && (!prev.checked || grade.falseFlags.length < prev.falseFlags));
      const xp = logLabXp(grade.found.length, prev.correctFlags);
      let next: AppState = {
        ...s,
        xp: s.xp + xp,
        logLab: { ...s.logLab, [LOG_LAB_ID]: { flagged: prev.flagged, checked: true, correctFlags: betterThanBest ? grade.found.length : prev.correctFlags, falseFlags: betterThanBest ? grade.falseFlags.length : prev.falseFlags } },
      };
      next = addActivity(next, a.now, `Log lab check: ${grade.found.length}/${grade.total} anomalies found, ${grade.falseFlags.length} false flag(s)`);
      return awardLabAchievements(next, a.now);
    }

    case 'LOG_RESET': {
      const prev = s.logLab[LOG_LAB_ID];
      if (!prev) return s;
      return { ...s, logLab: { ...s.logLab, [LOG_LAB_ID]: { ...prev, flagged: [] } } };
    }

    case 'SETTINGS_UPDATE': {
      const p = a.patch;
      const cur = s.settings;
      const modes: Mode[] = ['beginner', 'intermediate', 'advanced'];
      return {
        ...s,
        settings: {
          hintPenalty: typeof p.hintPenalty === 'boolean' ? p.hintPenalty : cur.hintPenalty,
          defaultMode: p.defaultMode && modes.includes(p.defaultMode) ? p.defaultMode : cur.defaultMode,
          timedChallenges: typeof p.timedChallenges === 'boolean' ? p.timedChallenges : cur.timedChallenges,
          useAiBackend: typeof p.useAiBackend === 'boolean' ? p.useAiBackend : cur.useAiBackend,
          reducedMotion: typeof p.reducedMotion === 'boolean' ? p.reducedMotion : cur.reducedMotion,
        },
      };
    }

    case 'PROFILE_NAME': {
      const name = clampText(a.name, LIMITS.name).trim();
      return name ? { ...s, profile: { ...s.profile, name } } : s;
    }

    case 'ONBOARDING_SEEN':
      return s.onboardingSeen ? s : { ...s, onboardingSeen: true };

    case 'RESET':
      return { ...initialState(a.now, s.profile.guestId), onboardingSeen: true };

    case 'IMPORT':
      return a.state;
  }
}

function awardLabAchievements(s: AppState, now: string): AppState {
  let next = s;
  for (const id of evaluateAchievements(next, { allCases: CASES })) {
    next = { ...next, achievements: { ...next.achievements, [id]: now }, xp: next.xp + ACHIEVEMENT_XP };
    next = addActivity(next, now, `Achievement unlocked: ${ACHIEVEMENT_BY_ID[id]?.title ?? id} (+${ACHIEVEMENT_XP} XP)`);
  }
  return next;
}
