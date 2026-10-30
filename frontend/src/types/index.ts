// =====================================================================
// Digital Crime Scene — shared domain types
// All case content is FICTIONAL. Case data lives in src/data/cases/*.ts
// and is kept separate from UI components.
// =====================================================================

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
/** Game mode controls help level and XP multiplier. */
export type Mode = 'beginner' | 'intermediate' | 'advanced';

export type EvidenceType =
  | 'email'
  | 'auth_log'
  | 'system_log'
  | 'network_log'
  | 'browser'
  | 'file_metadata'
  | 'witness'
  | 'document'
  | 'config'
  | 'asset';

/** Hidden classification of each evidence item (never shown during play). */
export type Relevance = 'key' | 'supporting' | 'red_herring';

export type HypothesisSignal = 'supports' | 'contradicts';

export interface EvidenceField {
  label: string;
  value: string;
  /** Visual hint only: highlights notable values once an item is inspected. */
  flag?: 'anomaly' | 'ok';
}

export interface EvidenceItem {
  id: string;
  title: string;
  type: EvidenceType;
  source: string;
  /** ISO-8601 time of the artifact (when known). */
  timestamp?: string;
  summary: string;
  fields: EvidenceField[];
  /** Raw artifact text (email body, log excerpt, statement). Rendered as plain text only. */
  content?: string;
  headers?: EvidenceField[];
  tags: string[];
  // ---- hidden solution data ----
  relevance: Relevance;
  /** Analyst note. Visible on inspection in Beginner mode only. */
  insight: string;
  redHerringReason?: string;
  /** How this item bears on each hypothesis (verdict option id -> signal). */
  signals?: Record<string, HypothesisSignal>;
}

export interface Entity {
  id: string;
  name: string;
  role: string;
  kind: 'person' | 'account' | 'host' | 'org' | 'service' | 'asset';
  note?: string;
}

export interface Objective {
  id: string;
  text: string;
  /** Evidence whose inspection advances this objective. */
  evidenceIds: string[];
  /** Minimum number of those items that must be inspected. */
  threshold: number;
}

export interface TimelineEvent {
  id: string;
  time: string; // ISO
  label: string;
  evidenceIds: string[];
  /** false = decoy event that does not belong in the reconstructed incident timeline. */
  relevant: boolean;
  note?: string;
}

export type RelationType = 'supports' | 'contradicts' | 'precedes' | 'related';

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  label: string;
}

export interface VerdictOption {
  id: string;
  label: string;
  /** 0..1 credit toward the verdict score. Correct option = 1. */
  credit: number;
  feedback: string;
}

export interface ReasoningPoint {
  id: string;
  label: string;
  /** Every group must match (case-insensitive substring of any keyword in the group). */
  keywordGroups: string[][];
  weight: number;
  explanation: string;
}

export type ActionQuality = 'essential' | 'good' | 'neutral' | 'harmful';
export type ActionCategory =
  | 'detect'
  | 'contain'
  | 'preserve'
  | 'eradicate'
  | 'recover'
  | 'communicate'
  | 'harden'
  | 'harmful';

export interface DefensiveAction {
  id: string;
  label: string;
  category: ActionCategory;
  quality: ActionQuality;
  explanation: string;
}

export interface UnsupportedAssumption {
  id: string;
  label: string;
  /** Trigger phrases; ignored when negated/hedged just before the phrase. */
  triggers: string[];
  explanation: string;
}

export interface RubricWeights {
  evidence: number;
  reasoning: number;
  verdict: number;
  support: number;
  uncertainty: number;
  defense: number;
  hints: number;
}

export interface HintStage {
  id: string;
  objectiveId: string;
  stage: 1 | 2 | 3;
  text: string;
}

export interface CaseSolution {
  correctVerdictId: string;
  verdictOptions: VerdictOption[];
  keyEvidenceIds: string[];
  supportingEvidenceIds: string[];
  redHerringIds: string[];
  reasoningPoints: ReasoningPoint[];
  /** Canonical order of relevant timeline event ids. */
  timelineOrder: string[];
  /** Each group = one alternative explanation a good analyst would weigh. */
  alternativeKeywords: string[][];
  idealConfidence: [number, number];
  uncertaintyKeywords: string[];
  /** What the evidence cannot establish (shown in the report). */
  limitations: string[];
  defensiveActions: DefensiveAction[];
  unsupportedAssumptions: UnsupportedAssumption[];
  explanation: string[];
}

export interface CaseFile {
  id: string;
  slug: string;
  number: number;
  title: string;
  tagline: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  categories: string[];
  briefing: string[];
  entities: Entity[];
  objectives: Objective[];
  evidence: EvidenceItem[];
  events: TimelineEvent[];
  relationships: Relationship[];
  hints: HintStage[];
  weights: RubricWeights;
  /** First-responder evidence handed to the investigator at the start. */
  startEvidenceIds: string[];
  /** Tutorial graph edges between the start evidence (shown as the initial example). */
  starterGraph: { from: string; to: string; type: RelationType; label: string }[];
  learningObjectives: string[];
  learningTopics: string[];
  solution: CaseSolution;
}

// ---------------------------------------------------------------------
// Investigation state
// ---------------------------------------------------------------------

export interface Note {
  id: string;
  text: string;
  evidenceId?: string;
  createdAt: string;
}

export interface GraphNodeData {
  id: string; // evidence id
  x: number;
  y: number;
}

export interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: RelationType;
  label: string;
}

export interface GraphState {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  savedAt?: string;
}

export interface VerdictDraft {
  verdictId: string;
  conclusion: string;
  supportingEvidenceIds: string[];
  /** Ordered event ids the student believes belong to the incident timeline. */
  timeline: string[];
  alternatives: string;
  confidence: number; // 0..100
  actionIds: string[];
  actionNotes: string;
}

export interface HintUse {
  hintId: string;
  at: string;
}

export interface Investigation {
  id: string;
  caseId: string;
  attempt: number;
  mode: Mode;
  timed: boolean;
  timeLimitSec: number;
  hintPenalty: boolean;
  startedAt: string;
  updatedAt: string;
  elapsedSec: number;
  status: 'active' | 'completed';
  inspected: string[];
  collected: string[];
  notes: Note[];
  hintsUsed: HintUse[];
  graph: GraphState;
  draft: VerdictDraft;
  reportId?: string;
}

export interface ScoreCategory {
  key: keyof RubricWeights;
  label: string;
  weight: number;
  /** 0..1 */
  ratio: number;
  points: number;
  feedback: string[];
}

export interface Report {
  id: string;
  caseId: string;
  investigationId: string;
  attempt: number;
  mode: Mode;
  createdAt: string;
  submissionHash: string;
  verdictId: string;
  verdictCorrect: boolean;
  score: number; // 0..100
  grade: string;
  categories: ScoreCategory[];
  correctEvidence: string[];
  missedEvidence: string[];
  citedRedHerrings: string[];
  unsupported: { id: string; label: string; explanation: string }[];
  satisfiedReasoning: string[];
  missedReasoning: { id: string; label: string; explanation: string }[];
  timelineAccuracy: number;
  actionResults: { id: string; label: string; quality: ActionQuality; chosen: boolean; explanation: string }[];
  xpEarned: number;
  xpBreakdown: string[];
  elapsedSec: number;
  hintsUsed: number;
  learningTopics: string[];
  recommendations: string[];
  summary: string;
  explanation: string[];
  limitations: string[];
  confidence: number;
  draft: VerdictDraft;
}

export interface PhishingResult {
  emailId: string;
  classification: 'legitimate' | 'suspicious' | 'phishing';
  reasoning: string;
  /** Indicator ids the learner ticked. */
  indicatorsFound: string[];
  correct: boolean;
  /** Score of the latest attempt (0..100). */
  score: number;
  /** Best score across attempts; XP only rewards improvement over this. */
  bestScore: number;
  at: string;
}

export interface LogLabState {
  flagged: string[]; // log entry ids the user flagged as anomalous
  checked: boolean;
  /** Best number of true anomalies found so far (XP only rewards improvement). */
  correctFlags: number;
  falseFlags: number;
}

export interface Settings {
  hintPenalty: boolean;
  defaultMode: Mode;
  timedChallenges: boolean;
  useAiBackend: boolean;
  reducedMotion: boolean;
}

export interface AppState {
  version: 1;
  profile: { name: string; createdAt: string; guestId: string };
  settings: Settings;
  investigations: Record<string, Investigation>;
  reports: Report[];
  /** Best XP already awarded per case id (prevents repeat farming). */
  caseXp: Record<string, number>;
  xp: number;
  achievements: Record<string, string>; // id -> unlockedAt
  phishing: Record<string, PhishingResult>;
  logLab: Record<string, LogLabState>;
  activity: { id: string; at: string; text: string }[];
  onboardingSeen: boolean;
}

// ---------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------

export interface PhishingIndicator {
  id: string;
  label: string;
  explanation: string;
}

export interface PhishingEmail {
  id: string;
  subject: string;
  fromName: string;
  fromAddress: string;
  replyTo?: string;
  to: string;
  date: string;
  headers: EvidenceField[];
  body: string;
  /** Link display text vs defanged real destination. Never rendered as <a href>. */
  links: { text: string; target: string }[];
  attachments: string[];
  classification: 'legitimate' | 'suspicious' | 'phishing';
  indicators: PhishingIndicator[];
  explanation: string;
  /** Keyword groups used to check the learner's written reasoning. */
  reasoningKeywords: string[][];
}

export type LogSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';
export type LogEventType = 'auth' | 'file' | 'network' | 'process' | 'email' | 'admin' | 'system';

export interface LogEntry {
  id: string;
  time: string; // ISO
  type: LogEventType;
  severity: LogSeverity;
  user: string;
  host: string;
  action: string;
  message: string;
  sourceIp?: string;
  anomaly: boolean;
  anomalyReason?: string;
  raw: Record<string, string>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// ---------------------------------------------------------------------
// Assistant
// ---------------------------------------------------------------------

export type AssistantAction =
  | 'explain_evidence'
  | 'subtle_hint'
  | 'stronger_hint'
  | 'inconsistencies'
  | 'next_steps'
  | 'explain_term'
  | 'compare_hypotheses'
  | 'review_report';

export interface AssistantRequest {
  action: AssistantAction;
  evidenceId?: string;
  term?: string;
  hypothesisA?: string;
  hypothesisB?: string;
}

export interface AssistantReply {
  action: AssistantAction;
  text: string;
  bullets?: string[];
  source: 'offline' | 'llm';
  hintId?: string;
  refused?: boolean;
}
