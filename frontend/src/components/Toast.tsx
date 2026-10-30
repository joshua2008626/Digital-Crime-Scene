import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/utils/format';

type Kind = 'info' | 'success' | 'warn';
interface ToastItem {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastApi {
  push: (message: string, kind?: Kind) => void;
}

const ToastCtx = createContext<ToastApi>({ push: () => undefined });

export const useToast = (): ToastApi => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timers = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message: string, kind: Kind = 'info') => {
      const id = ++counter.current;
      setItems((cur) => [...cur.slice(-3), { id, kind, message }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), 5500));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2" role="status" aria-live="polite" aria-atomic="false">
        {items.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'warn' ? TriangleAlert : Info;
          return (
            <div key={t.id} className={cn('panel fade-up pointer-events-auto flex items-start gap-3 p-3 text-sm', t.kind === 'success' && 'border-verified-400/40', t.kind === 'warn' && 'border-warn-400/40')}>
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.kind === 'success' ? 'text-verified-400' : t.kind === 'warn' ? 'text-warn-400' : 'text-cyan2-400')} aria-hidden="true" />
              <p className="flex-1 text-slate-200">{t.message}</p>
              <button type="button" className="text-slate-400 hover:text-white" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
