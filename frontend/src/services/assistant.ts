import type { AssistantReply, AssistantRequest, CaseFile, Investigation } from '@/types';
import { offlineAssistant } from '@/utils/assistant';
import { apiFetch } from './api';

const HINT_ACTIONS = new Set(['subtle_hint', 'stronger_hint']);

/**
 * Asks the assistant. Hints are ALWAYS answered offline from pre-authored text so they can be
 * charged and never leak solutions. Other actions may use the optional backend LLM; on any
 * failure (or when disabled) the deterministic offline assistant answers instead.
 * The assistant never affects scoring.
 */
export async function askAssistant(c: CaseFile, inv: Investigation, req: AssistantRequest, useBackend: boolean): Promise<AssistantReply> {
  const offline = offlineAssistant(c, inv, req);
  if (!useBackend || HINT_ACTIONS.has(req.action) || offline.refused) return offline;
  const remote = await apiFetch<{ text?: string; bullets?: string[]; fallback?: boolean }>(
    '/api/assistant',
    {
      method: 'POST',
      body: JSON.stringify({
        caseId: c.id,
        action: req.action,
        evidenceId: req.evidenceId,
        term: req.term,
        hypothesisA: req.hypothesisA,
        hypothesisB: req.hypothesisB,
        inspected: inv.inspected,
        collected: inv.collected,
      }),
    },
    12000,
  );
  if (!remote || remote.fallback || typeof remote.text !== 'string' || !remote.text.trim()) return offline;
  return { action: req.action, text: remote.text.slice(0, 2000), bullets: Array.isArray(remote.bullets) ? remote.bullets.slice(0, 8).map((b) => String(b).slice(0, 400)) : undefined, source: 'llm' };
}
