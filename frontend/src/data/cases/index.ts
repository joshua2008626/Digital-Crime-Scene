import type { CaseFile } from '@/types';
import { phantomLogin } from './phantom-login';
import { missingBlueprint } from './missing-blueprint';
import { lockedOffice } from './locked-office';
import { insiderParadox } from './insider-paradox';

/** All playable cases, in display order. Add new cases here. */
export const CASES: CaseFile[] = [phantomLogin, missingBlueprint, lockedOffice, insiderParadox];

export const getCase = (idOrSlug: string): CaseFile | undefined =>
  CASES.find((c) => c.id === idOrSlug || c.slug === idOrSlug);
