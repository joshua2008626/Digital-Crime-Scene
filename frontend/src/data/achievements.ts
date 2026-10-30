import type { Achievement } from '@/types';

/** Achievement definitions. Unlock rules live in utils/achievements.ts and use real events only. */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_case', title: 'First Case Closed', description: 'Submit your first verdict.', icon: 'FolderCheck' },
  { id: 'thorough', title: 'Left No Stone Unturned', description: 'Open every evidence item in a case before submitting.', icon: 'Search' },
  { id: 'sharp_eye', title: 'Sharp Eye', description: 'Cite every key evidence item in a case.', icon: 'Eye' },
  { id: 'clean_hands', title: 'Clean Hands', description: 'Reach the correct verdict without citing a single red herring.', icon: 'ShieldCheck' },
  { id: 'unaided', title: 'Unaided', description: 'Reach the correct verdict without using any hints.', icon: 'Brain' },
  { id: 'calibrated', title: 'Calibrated', description: 'Score at least 90% on uncertainty handling in a case.', icon: 'Scale' },
  { id: 'timeline_master', title: 'Timeline Master', description: 'Reconstruct the incident timeline perfectly.', icon: 'Clock' },
  { id: 'defender', title: 'Steady Defender', description: 'Choose every essential defensive action and no harmful ones.', icon: 'Shield' },
  { id: 'graph_builder', title: 'Connector', description: 'Submit a verdict with at least five links in your evidence graph.', icon: 'Network' },
  { id: 'perfectionist', title: 'Near Perfect', description: 'Score 95 or higher on a case.', icon: 'Award' },
  { id: 'advanced_mode', title: 'Hard Mode', description: 'Score 80+ on a case in Advanced mode.', icon: 'Flame' },
  { id: 'comeback', title: 'Comeback', description: 'Improve your score by 15+ points when replaying a case.', icon: 'TrendingUp' },
  { id: 'case_collector', title: 'Case Collector', description: 'Reach the correct verdict in every case.', icon: 'Library' },
  { id: 'phish_spotter', title: 'Phish Spotter', description: 'Classify five training emails correctly.', icon: 'MailWarning' },
  { id: 'log_hunter', title: 'Log Hunter', description: 'Find every anomaly in the Log Analysis Lab without a false flag.', icon: 'ScrollText' },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
