import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Fingerprint, GitBranch, Mail, ScrollText, ShieldCheck, Sparkles } from 'lucide-react';
import { btnClass } from '@/components/ui';
import { useDocumentTitle } from '@/hooks';
import { CASES } from '@/data/cases';

const FEATURES = [
  { icon: Fingerprint, title: 'Investigate, do not guess', body: 'Inspect fictional emails, logs and file metadata. Every conclusion must be backed by evidence you collected.' },
  { icon: GitBranch, title: 'Build the evidence graph', body: 'Link artifacts as supports, contradicts or precedes, and see how your reasoning hangs together.' },
  { icon: Mail, title: 'Phishing Lab', body: 'Classify simulated emails and name the indicators. Links are defanged and never clickable.' },
  { icon: ScrollText, title: 'Log Lab', body: 'Sift a day of simulated logs, flag anomalies, and learn to tell real signals from noise.' },
  { icon: ShieldCheck, title: 'Transparent scoring', body: 'Deterministic rubric, no hidden AI grading. You always see exactly why you earned each point.' },
  { icon: Sparkles, title: 'An assistant that teaches', body: 'Graduated hints that cost points, and explanations that never hand you the answer.' },
];

export default function Landing() {
  useDocumentTitle('Every click leaves a trace');
  return (
    <div>
      <section className="container-app py-16 sm:py-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-3xl">
          <p className="mono text-cyan2-400">// every click leaves a trace</p>
          <h1 className="mt-3 text-4xl sm:text-6xl">Digital Crime Scene</h1>
          <p className="mt-5 text-lg text-slate-300">
            A cybersecurity investigation simulator. Work fictional incidents like a digital forensics analyst: gather evidence, test hypotheses, reconstruct the timeline, and defend your verdict.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/cases" className={btnClass('primary')}>
              Open a case
            </Link>
            <Link to="/dashboard" className={btnClass('secondary')}>
              Dashboard
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">No account needed. Progress is saved in your browser. All data is fictional.</p>
        </motion.div>
      </section>

      <section className="container-app pb-16" aria-labelledby="features-h">
        <h2 id="features-h" className="sr-only">
          Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="panel p-5">
              <f.icon className="h-5 w-5 text-cyan2-400" aria-hidden="true" />
              <h3 className="mt-3 text-base">{f.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-app pb-20" aria-labelledby="cases-h">
        <h2 id="cases-h" className="mb-4 text-xl">
          The case files
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {CASES.map((c) => (
            <li key={c.id} className="panel p-5">
              <p className="mono text-xs text-slate-500">CASE {String(c.number).padStart(2, '0')} · {c.difficulty}</p>
              <h3 className="mt-1 text-lg">{c.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{c.tagline}</p>
              <Link to={`/cases/${c.id}`} className="mt-3 inline-block text-sm text-cyan2-400 hover:underline">
                View case →
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
