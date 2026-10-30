import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';
import { findTerm } from '@/data/glossary';
import { cn } from '@/utils/format';

// ---------------------------------------------------------------------
// Buttons (class helpers so <Link> can be styled the same way)
// ---------------------------------------------------------------------
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'violet' | 'danger';

export const btnClass = (variant: ButtonVariant = 'secondary', size: 'sm' | 'md' = 'md', extra?: string): string =>
  cn('btn', size === 'sm' && 'btn-sm', `btn-${variant}`, extra);

interface ButtonProps {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
}

export function Button({ children, variant = 'secondary', size = 'md', type = 'button', disabled, loading, onClick, className, ...rest }: ButtonProps) {
  return (
    <button type={type} className={btnClass(variant, size, className)} disabled={disabled || loading} onClick={onClick} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------
// Badges / panels / text
// ---------------------------------------------------------------------
export type Tone = 'neutral' | 'cyan' | 'violet' | 'ok' | 'warn' | 'alert';

const TONES: Record<Tone, string> = {
  neutral: 'border-white/15 bg-white/5 text-slate-300',
  cyan: 'border-cyan2-400/40 bg-cyan2-400/10 text-cyan2-300',
  violet: 'border-violet2-400/40 bg-violet2-400/10 text-violet2-300',
  ok: 'border-verified-400/40 bg-verified-400/10 text-verified-400',
  warn: 'border-warn-400/40 bg-warn-400/10 text-warn-400',
  alert: 'border-alert-400/40 bg-alert-400/10 text-alert-400',
};

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn('badge', TONES[tone], className)}>{children}</span>;
}

export function Panel({ children, className, as: Tag = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'aside'; 'aria-label'?: string; 'aria-labelledby'?: string; id?: string }) {
  return (
    <Tag className={cn('panel', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionTitle({ title, subtitle, action, id }: { title: string; subtitle?: string; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id={id} className="text-lg">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function ProgressBar({ value, label, tone = 'cyan', className }: { value: number; label: string; tone?: 'cyan' | 'violet' | 'ok'; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const bar = tone === 'ok' ? 'bg-verified-400' : tone === 'violet' ? 'bg-violet2-400' : 'bg-cyan2-400';
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-white/10', className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}

export function EmptyState({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="panel-quiet flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="text-slate-500" aria-hidden="true">
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <p className="font-medium text-slate-200">{title}</p>
      {body && <p className="max-w-md text-sm text-slate-400">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'neutral', title, children }: { tone?: 'neutral' | 'warn' | 'ok' | 'alert'; title?: string; children: ReactNode }) {
  const styles = {
    neutral: 'border-cyan2-400/30 bg-cyan2-400/5',
    warn: 'border-warn-400/40 bg-warn-400/10',
    ok: 'border-verified-400/40 bg-verified-400/10',
    alert: 'border-alert-400/40 bg-alert-400/10',
  }[tone];
  const Icon = tone === 'ok' ? CheckCircle2 : AlertTriangle;
  return (
    <div role={tone === 'alert' || tone === 'warn' ? 'alert' : 'note'} className={cn('flex gap-3 rounded-lg border p-3 text-sm', styles)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
      <div>
        {title && <p className="font-medium text-slate-100">{title}</p>}
        <div className="text-slate-300">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Glossary tooltip: hover OR keyboard focus shows a plain-language definition.
// ---------------------------------------------------------------------
export function Term({ t, children }: { t: string; children?: ReactNode }) {
  const id = useId();
  const entry = findTerm(t);
  if (!entry) return <>{children ?? t}</>;
  return (
    <span className="group relative inline-block">
      <span className="term" tabIndex={0} aria-describedby={id}>
        {children ?? t}
      </span>
      <span id={id} role="tooltip" className="pointer-events-none invisible absolute bottom-full left-0 z-30 mb-2 w-64 rounded-lg border border-white/15 bg-ink-900 p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-200 opacity-0 shadow-xl transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <strong className="text-cyan2-300">{entry.term}</strong>: {entry.definition}
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------
// Modal / confirm dialog with focus trap, Escape to close and focus return.
// ---------------------------------------------------------------------
interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Modal({ open, title, onClose, children, footer, wide }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const titleId = useId();
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const lastFocus = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusables = (): HTMLElement[] =>
      root ? Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((el) => !el.hasAttribute('disabled')) : [];
    const first = focusables().find((el) => el.dataset.autofocus === 'true') ?? focusables()[0];
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const a = f[0];
        const b = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          b.focus();
        } else if (!e.shiftKey && document.activeElement === b) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      lastFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn('panel fade-up relative max-h-[90vh] w-full overflow-y-auto p-5', wide ? 'max-w-3xl' : 'max-w-md')}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg">
            {title}
          </h2>
          <button type="button" className="btn btn-ghost btn-sm -mr-2 -mt-1" onClick={onClose} aria-label="Close dialog">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="text-sm text-slate-300">{children}</div>
        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel, danger, onConfirm, onCancel }: { open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body}
    </Modal>
  );
}

// ---------------------------------------------------------------------
// Accessible tabs (roving arrow-key navigation)
// ---------------------------------------------------------------------
export interface TabDef {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: ReactNode;
}

export function Tabs({ tabs, value, onChange, label }: { tabs: TabDef[]; value: string; onChange: (id: string) => void; label: string }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (e: { key: string; preventDefault(): void }, idx: number) => {
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[next].id);
    refs.current[tabs[next].id]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-white/10 pb-px">
      {tabs.map((t, i) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[t.id] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`panel-${t.id}`}
            tabIndex={selected ? 0 : -1}
            type="button"
            onClick={() => onChange(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn('flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors', selected ? 'border-cyan2-400 text-cyan2-300' : 'border-transparent text-slate-400 hover:text-slate-200')}
          >
            {t.icon}
            {t.label}
            {t.badge}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ id, active, children }: { id: string; active: boolean; children: ReactNode }) {
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} hidden={!active} tabIndex={0} className="focus-visible:outline-none">
      {active ? children : null}
    </div>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: 'beginner' | 'intermediate' | 'advanced' }) {
  const tone: Tone = difficulty === 'beginner' ? 'ok' : difficulty === 'intermediate' ? 'cyan' : 'violet';
  return <Badge tone={tone}>{difficulty[0].toUpperCase() + difficulty.slice(1)}</Badge>;
}
