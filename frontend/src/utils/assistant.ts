// =====================================================================
// Offline, rule-based investigation assistant.
// - Fully deterministic; needs no network or API key.
// - Grounded ONLY in case data the learner has already opened.
// - Never states the verdict, never labels evidence as key / red herring, and
//   releases hints one stage at a time (pre-authored text, never generated).
// =====================================================================
import type { AssistantReply, AssistantRequest, CaseFile, EvidenceType, Investigation } from '@/types';
import { findTerm, GLOSSARY } from '@/data/glossary';
import { objectiveProgress } from './investigation';
import { validateDraft } from './scoring';
import { assertedWithoutHedge, containsAny } from './text';

const reply = (action: AssistantRequest['action'], text: string, extra: Partial<AssistantReply> = {}): AssistantReply => ({
  action,
  text,
  source: 'offline',
  ...extra,
});

const TYPE_GUIDANCE: Record<EvidenceType, string[]> = {
  email: ['Read the real sender address, not just the display name.', 'Check the authentication headers (SPF, DKIM, DMARC).', 'Compare link text with the real destination.', 'Ask what the sender wants you to do and how urgent they make it.'],
  auth_log: ['Compare the source IP, time and method with the account\'s normal pattern.', 'Was MFA actually evaluated?', 'What happened just before and just after this event?'],
  system_log: ['Who or what performed the action, and from which session?', 'How soon after other events did it happen?', 'Is it a change that persists after the session ends?'],
  network_log: ['Compare source and destination with what is normal.', 'Check volume and direction, not just whether something happened.', 'Do other records mention the same address?'],
  browser: ['What page was visited and what was submitted?', 'Does the timing line up with another event?', 'Is the destination the real site or a look-alike?'],
  file_metadata: ['Who accessed or changed the file, and from where?', 'Does the access fit the person\'s role?', 'What are the sharing and sensitivity settings, and when did they change?'],
  witness: ['What can be checked against a record? What cannot?', 'Where does the account agree or disagree with other evidence?', 'Statements show recollection, not necessarily fact.'],
  document: ['What claim does this make, and who made it?', 'What does it leave out?', 'Can another record confirm or contradict it?'],
  config: ['What does this setting allow that should have been blocked?', 'How does it relate to the events in the logs?', 'Is it a cause, or a contributing weakness?'],
  asset: ['What is in scope and what is unknown?', 'Which items have no monitoring?', 'Does this change what you can safely assume?'],
};

function nextHint(c: CaseFile, inv: Investigation, subtleOnly: boolean) {
  const used = new Set(inv.hintsUsed.map((h) => h.hintId));
  for (const p of objectiveProgress(c, inv)) {
    if (p.done) continue;
    const hints = c.hints.filter((h) => h.objectiveId === p.objective.id).sort((a, b) => a.stage - b.stage);
    const next = hints.find((h) => !used.has(h.id));
    if (!next) continue;
    if (subtleOnly && next.stage > 1) return { blocked: true as const, objective: p.objective };
    return { hint: next, objective: p.objective };
  }
  return {};
}

export function offlineAssistant(c: CaseFile, inv: Investigation, req: AssistantRequest): AssistantReply {
  const opened = new Set(inv.inspected);
  const title = (id: string) => c.evidence.find((e) => e.id === id)?.title ?? id;

  switch (req.action) {
    case 'explain_evidence': {
      const ev = c.evidence.find((e) => e.id === req.evidenceId);
      if (!ev) return reply(req.action, 'Select an evidence item first and I will help you read it.', { refused: true });
      if (!opened.has(ev.id)) return reply(req.action, `Open "${ev.title}" first. I only explain evidence you have inspected.`, { refused: true });
      const anomalies = ev.fields.filter((f) => f.flag === 'anomaly').map((f) => `${f.label}: ${f.value}`);
      const bullets = [...(anomalies.length ? ['Fields that stand out:', ...anomalies] : ['No fields are visually flagged. Read the raw content closely.']), 'Questions to ask:', ...TYPE_GUIDANCE[ev.type]];
      const text = `${ev.title} is a ${ev.type.replace('_', ' ')} from ${ev.source}${ev.timestamp ? ` timestamped ${ev.timestamp.replace('T', ' ').replace('Z', ' UTC')}` : ''}. ${ev.summary}`;
      return reply(req.action, inv.mode === 'beginner' ? `${text}\n\nAnalyst note: ${ev.insight}` : text, { bullets });
    }

    case 'subtle_hint':
    case 'stronger_hint': {
      const r = nextHint(c, inv, req.action === 'subtle_hint');
      if ('blocked' in r && r.blocked)
        return reply(req.action, `You have already used the gentle hint for "${r.objective.text}". If you are still stuck, ask for a stronger hint. It will cost a little more hint score.`, { refused: true });
      if (!r.hint) return reply(req.action, 'Every open objective already has its hints used, or the objectives are met. Review your evidence, connect it in the graph and write your verdict. Consider what the evidence cannot show.', { refused: true });
      return reply(req.action, `Hint ${r.hint.stage} of 3 for "${r.objective.text}"\n\n${r.hint.text}`, { hintId: r.hint.id });
    }

    case 'inconsistencies': {
      const pairs = c.relationships.filter((r) => r.type === 'contradicts' && opened.has(r.from) && opened.has(r.to));
      if (!pairs.length)
        return reply(req.action, 'I do not see clear tension between the items you have opened so far. Open more evidence, especially statements and the records that could check them, then ask again.');
      const bullets = pairs.map((r) => (inv.mode === 'beginner' ? `${title(r.from)} and ${title(r.to)}: ${r.label}.` : `Compare ${title(r.from)} with ${title(r.to)}. Do they fully agree?`));
      return reply(req.action, 'These pairs of evidence may not fit together. Decide for yourself which is more reliable and why.', { bullets });
    }

    case 'next_steps': {
      const next = objectiveProgress(c, inv).find((p) => !p.done);
      if (!next)
        return reply(req.action, 'Your objectives are covered. Next: build your timeline, connect evidence in the graph, weigh at least one alternative explanation, and write down what the evidence cannot prove.', {
          bullets: ['Order the events you consider part of the incident.', 'Label links as supports, contradicts, precedes or related.', 'State a confidence level that matches how strong the evidence really is.'],
        });
      const unopened = next.objective.evidenceIds.filter((id) => !opened.has(id)).slice(0, 3);
      return reply(req.action, `Next objective: "${next.objective.text}" (${next.have} of ${next.need} needed).`, {
        bullets: unopened.length ? unopened.map((id) => `Open: ${title(id)}`) : ['Re-read what you have opened for this objective and connect it to the others.'],
      });
    }

    case 'explain_term': {
      const entry = req.term ? findTerm(req.term) : undefined;
      if (!entry)
        return reply(req.action, `I do not have "${req.term ?? ''}" in my glossary. Try one of: ${GLOSSARY.slice(0, 8).map((g) => g.term).join(', ')}.`, { refused: true });
      return reply(req.action, `${entry.term}: ${entry.definition}`);
    }

    case 'compare_hypotheses': {
      const a = c.solution.verdictOptions.find((o) => o.id === req.hypothesisA);
      const b = c.solution.verdictOptions.find((o) => o.id === req.hypothesisB);
      if (!a || !b || a.id === b.id) return reply(req.action, 'Pick two different hypotheses to compare.', { refused: true });
      const seen = c.evidence.filter((e) => opened.has(e.id));
      const lines = (id: string, dir: 'supports' | 'contradicts') =>
        seen.filter((e) => e.signals?.[id] === dir).slice(0, 4).map((e) => e.title);
      const bullets: string[] = [];
      if (inv.mode === 'advanced') {
        const touching = seen.filter((e) => e.signals && (a.id in e.signals || b.id in e.signals)).slice(0, 6);
        bullets.push('Evidence you have opened that bears on one or both. Decide the direction yourself:', ...touching.map((e) => e.title));
      } else {
        for (const h of [a, b]) {
          const sup = lines(h.id, 'supports');
          const con = lines(h.id, 'contradicts');
          bullets.push(`"${h.label}"`, ...(sup.length ? sup.map((t) => `  supports: ${t}`) : ['  nothing you have opened clearly supports it']), ...(con.length ? con.map((t) => `  contradicts: ${t}`) : []));
        }
      }
      bullets.push('Ask: what evidence would make me change my mind about each one?');
      return reply(req.action, 'Here is how what you have opened bears on each hypothesis. Direction is not the same as reliability: weigh how trustworthy and independent each item is.', { bullets });
    }

    case 'review_report': {
      const d = inv.draft;
      const notes: string[] = [];
      notes.push(...validateDraft(c, inv));
      const text = [d.conclusion, d.alternatives, d.actionNotes].join(' ');
      if (d.conclusion.trim().length > 0 && d.conclusion.trim().length < 150) notes.push('Your conclusion is brief. Explain which evidence leads where, and how.');
      if (d.supportingEvidenceIds.length > 0 && d.supportingEvidenceIds.length < 3) notes.push('You cite very few items. Strong conclusions are usually corroborated by several independent records.');
      const unopened = d.supportingEvidenceIds.filter((id) => !opened.has(id));
      if (unopened.length) notes.push(`You cite ${unopened.length} item(s) you never opened.`);
      if (d.alternatives.trim().length < 25) notes.push('You have not weighed an alternative explanation. Name at least one and say why you set it aside.');
      if (d.confidence >= 95) notes.push('Very high confidence is hard to justify when some questions remain unanswered.');
      if (!containsAny(text, ['cannot', "can't", 'unknown', 'unclear', 'not enough', 'does not prove', 'no evidence', 'unable', 'uncertain'])) notes.push('Say explicitly what the evidence cannot show.');
      if (!d.timeline.length) notes.push('You have not reconstructed a timeline.');
      if (!d.actionIds.length) notes.push('You have not chosen any defensive actions.');
      for (const u of c.solution.unsupportedAssumptions) {
        const hit = u.triggers.find((t) => assertedWithoutHedge(text, t));
        if (hit) notes.push(`"${hit}" is stated as fact. Does the evidence establish it, or are you inferring it?`);
      }
      if (!notes.length) return reply(req.action, 'Your report is well structured. Before submitting, re-read it for any sentence that goes beyond what the records strictly show.');
      return reply(req.action, 'Here is feedback on your draft. I am not scoring it, only pointing at gaps:', { bullets: notes });
    }
  }
}
