import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Fingerprint, Menu, TriangleAlert, X } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { rankFor } from '@/utils/progress';
import { cn } from '@/utils/format';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/cases', label: 'Cases' },
  { to: '/phishing', label: 'Phishing Lab' },
  { to: '/logs', label: 'Log Lab' },
  { to: '/profile', label: 'Profile' },
];

export function AppLayout() {
  const { state, storageOk } = useApp();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const info = rankFor(state.xp);
  const immersive = loc.pathname.startsWith('/case/');

  const link = ({ isActive }: { isActive: boolean }) =>
    cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white');

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/85 backdrop-blur">
        <div className="container-app flex h-14 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 font-semibold text-white">
            <Fingerprint className="h-5 w-5 text-cyan2-400" aria-hidden="true" />
            <span>Digital Crime Scene</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/profile" className="badge border-violet2-400/40 text-violet-200" title={`Next rank in ${info.xpToNext} XP`}>
              {info.rank.title} · {state.xp} XP
            </Link>
            <button type="button" className="btn btn-ghost btn-sm md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" className="container-app flex flex-col gap-1 pb-3 md:hidden" aria-label="Mobile">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link} onClick={() => setOpen(false)}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      {!storageOk && (
        <div role="status" className="border-b border-warn-400/30 bg-warn-400/10 px-4 py-2 text-center text-xs text-warn-400">
          <TriangleAlert className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
          Browser storage is unavailable, so progress will be lost when you close this tab. Use Profile → Export to keep a backup.
        </div>
      )}
      <main id="main" className="flex-1 outline-none" tabIndex={-1}>
        <Outlet />
      </main>
      {!immersive && (
        <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500">
          <p className="container-app">All cases, people, domains and IP addresses are fictional and simulated. Nothing here scans, attacks or contacts real systems.</p>
        </footer>
      )}
    </div>
  );
}
