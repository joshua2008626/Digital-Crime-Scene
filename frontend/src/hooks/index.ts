import { useEffect, useRef, useState } from 'react';

/** Sets the browser tab title for a page. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = `${title} · Digital Crime Scene`;
    return () => {
      document.title = prev;
    };
  }, [title]);
}

/** Calls `fn` every `ms` while `active`. Uses the latest `fn` without resetting the timer. */
export function useInterval(fn: () => void, ms: number, active: boolean): void {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
}

/** Tracks a CSS media query (e.g. "(min-width: 1024px)"). Safe where matchMedia is missing. */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState<boolean>(get);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [query]);
  return matches;
}
