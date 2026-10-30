import { useMemo, useState } from 'react';
import { MailWarning, Paperclip } from 'lucide-react';
import { INDICATOR_CATALOG, PHISHING_EMAILS } from '@/data/phishing';
import { nowIso, useApp } from '@/store/AppContext';
import { Badge, Notice, Panel, SectionTitle } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { gradePhishing, type PhishingAnswer } from '@/utils/labs';
import { LIMITS } from '@/store/reducer';
import { cn } from '@/utils/format';

type Cls = PhishingAnswer['classification'];
const CLASSES: { id: Cls; label: string }[] = [
  { id: 'legitimate', label: 'Legitimate' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'phishing', label: 'Phishing' },
];

export default function PhishingLab() {
  useDocumentTitle('Phishing Lab');
  const { state, dispatch } = useApp();
  const [idx, setIdx] = useState(0);
  const email = PHISHING_EMAILS[idx];
  const [cls, setCls] = useState<Cls | ''>('');
  const [ind, setInd] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState<PhishingAnswer | null>(null);
  const prev = state.phishing[email.id];
  const grade = useMemo(() => (submitted ? gradePhishing(email, submitted) : null), [submitted, email]);

  const pick = (i: number) => { setIdx(i); setCls(''); setInd([]); setReason(''); setSubmitted(null); };
  const submit = () => {
    if (!cls) return;
    const answer: PhishingAnswer = { classification: cls, indicatorIds: ind, reasoning: reason };
    dispatch({ type: 'PHISHING_SUBMIT', emailId: email.id, answer, now: nowIso() });
    setSubmitted(answer);
  };

  return (
    <div className="container-app py-8">
      <SectionTitle title="Phishing Lab" subtitle="Study each simulated email, classify it, and name the indicators you relied on." />
      <Notice tone="warn" title="Simulation only">These emails are fictional. Links are shown defanged as plain text and cannot be clicked. Never interact with real suspicious links.</Notice>

      <div className="mt-5 grid gap-5 lg:grid-cols-4">
        <nav aria-label="Emails" className="lg:col-span-1">
          <ul className="space-y-2">
            {PHISHING_EMAILS.map((e, i) => {
              const r = state.phishing[e.id];
              return (
                <li key={e.id}>
                  <button type="button" aria-current={i === idx} onClick={() => pick(i)} className={cn('panel-quiet w-full p-3 text-left text-sm hover:border-cyan2-400/40', i === idx && 'border-cyan2-400/60 bg-ink-800')}>
                    <span className="block font-medium line-clamp-2">{e.subject}</span>
                    <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">{e.fromName}{r && <Badge tone={r.bestScore >= 80 ? 'ok' : 'warn'}>Best {r.bestScore}</Badge>}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-5 lg:col-span-3">
          <Panel className="p-5" aria-label="Email">
            <div className="flex items-start gap-3"><MailWarning className="mt-1 h-5 w-5 text-cyan2-400" aria-hidden="true" /><div className="min-w-0"><h2 className="text-lg">{email.subject}</h2>
              <p className="evidence-text text-sm text-slate-400">From: {email.fromName} &lt;{email.fromAddress}&gt;{email.replyTo ? ` · Reply-To: ${email.replyTo}` : ''}</p>
              <p className="text-xs text-slate-500">To: {email.to} · {email.date}</p></div></div>
            <h3 className="label mt-4">Headers</h3>
            <dl className="divide-y divide-white/5 rounded-lg border border-white/10 text-sm">{email.headers.map((h, i) => <div key={i} className="grid grid-cols-3 gap-2 px-3 py-2"><dt className="text-slate-400">{h.label}</dt><dd className="evidence-text mono col-span-2">{h.value}</dd></div>)}</dl>
            <pre className="evidence-text mono mt-4 rounded-lg border border-white/10 bg-ink-950/80 p-3">{email.body}</pre>
            {email.links.length > 0 && (
              <div className="mt-4"><h3 className="label">Links in this email (not clickable)</h3>
                <ul className="space-y-2 text-sm">{email.links.map((l, i) => <li key={i} className="panel-quiet p-2"><span className="text-slate-400">Shown as: </span><span className="evidence-text mono">{l.text}</span><br /><span className="text-slate-400">Actually goes to: </span><code className="evidence-text mono text-warn-400">{l.target}</code></li>)}</ul></div>
            )}
            {email.attachments.length > 0 && <p className="mt-3 flex items-center gap-2 text-sm text-slate-300"><Paperclip className="h-4 w-4" aria-hidden="true" />{email.attachments.join(', ')} <span className="text-xs text-slate-500">(simulated, cannot be opened)</span></p>}
          </Panel>

          {!grade ? (
            <Panel className="p-5" aria-label="Your analysis">
              <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
                <fieldset><legend className="label">Classification</legend><div className="flex flex-wrap gap-2">{CLASSES.map((c) => <label key={c.id} className={cn('panel-quiet cursor-pointer px-4 py-2 text-sm', cls === c.id && 'border-cyan2-400/60')}><input type="radio" name="cls" className="mr-2 accent-cyan-400" checked={cls === c.id} onChange={() => setCls(c.id)} />{c.label}</label>)}</div></fieldset>
                <fieldset><legend className="label">Indicators you noticed</legend><div className="grid gap-2 sm:grid-cols-2">{INDICATOR_CATALOG.map((i) => <label key={i.id} className="panel-quiet flex cursor-pointer items-start gap-2 p-2 text-sm"><input type="checkbox" className="mt-1 accent-cyan-400" checked={ind.includes(i.id)} onChange={() => setInd((l) => (l.includes(i.id) ? l.filter((x) => x !== i.id) : [...l, i.id]))} />{i.label}</label>)}</div></fieldset>
                <div><label className="label" htmlFor="why">Your reasoning</label><textarea id="why" className="field min-h-[6rem]" maxLength={LIMITS.reasoning} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                <button type="submit" className="btn btn-primary" disabled={!cls}>Check my analysis</button>
                {prev && <p className="text-xs text-slate-500">Previous best: {prev.bestScore}/100. XP is only awarded for improving your best score.</p>}
              </form>
            </Panel>
          ) : (
            <Panel className="p-5" aria-label="Result" id="result">
              <div className="flex flex-wrap items-center gap-3"><h2 className="text-lg">Result: {grade.score}/100</h2><Badge tone={grade.correct ? 'ok' : 'warn'}>{grade.correct ? 'Correct classification' : `Answer: ${email.classification}`}</Badge></div>
              <p className="mt-2 text-sm text-slate-300">{email.explanation}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">{grade.feedback.map((f, i) => <li key={i}>{f}</li>)}</ul>
              <h3 className="label mt-4">Indicators in this email</h3>
              {email.indicators.length === 0 ? <p className="text-sm text-slate-400">None — this one is legitimate.</p> : <ul className="space-y-2 text-sm">{email.indicators.map((i) => <li key={i.id} className="panel-quiet p-2"><Badge tone={grade.found.includes(i.id) ? 'ok' : 'warn'}>{grade.found.includes(i.id) ? 'Found' : 'Missed'}</Badge> <strong>{i.label}</strong><span className="block text-xs text-slate-400">{i.explanation}</span></li>)}</ul>}
              {grade.falseIds.length > 0 && <p className="mt-3 text-sm text-warn-400">Not present here: {grade.falseIds.map((id) => INDICATOR_CATALOG.find((c) => c.id === id)?.label ?? id).join('; ')}</p>}
              <div className="mt-4 flex gap-2"><button type="button" className="btn btn-secondary" onClick={() => pick(idx)}>Try again</button>{idx < PHISHING_EMAILS.length - 1 && <button type="button" className="btn btn-primary" onClick={() => pick(idx + 1)}>Next email</button>}</div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
