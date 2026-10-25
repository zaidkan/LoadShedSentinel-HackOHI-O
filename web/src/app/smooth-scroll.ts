import { useEffect, useRef } from 'react';

type ScrollListener = (scrollY: number) => void;

/** Smooth scrolling for long-form pages; native scrolling whenever motion is reduced. */
export function useSmoothScroll(enabled: boolean) {
  const listeners = useRef(new Set<ScrollListener>());
  useEffect(() => {
    const emit = () => listeners.current.forEach(listener => listener(window.scrollY));
    window.addEventListener('scroll', emit, { passive: true });
    emit();

    const anchor = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.getAttribute('href') === '#') return;
      const target = document.querySelector(link.getAttribute('href')!);
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: enabled ? 'smooth' : 'auto', block: 'start' });
      target.focus({ preventScroll: true });
    };
    document.addEventListener('click', anchor);

    return () => {
      window.removeEventListener('scroll', emit);
      document.removeEventListener('click', anchor);
    };
  }, [enabled]);
  return listeners.current;
}
