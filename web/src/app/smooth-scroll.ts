import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

type ScrollListener = (scrollY: number) => void;

/** Lenis smooth scrolling for long-form pages; native scrolling whenever motion is reduced. */
export function useSmoothScroll(enabled: boolean) {
  const listeners = useRef(new Set<ScrollListener>());
  useEffect(() => {
    const emit = () => listeners.current.forEach(listener => listener(window.scrollY));
    if (!enabled) {
      window.addEventListener('scroll', emit, { passive: true });
      emit();
      return () => window.removeEventListener('scroll', emit);
    }
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', emit);
    let frame = 0;
    const raf = (time: number) => { lenis.raf(time); frame = requestAnimationFrame(raf); };
    frame = requestAnimationFrame(raf);
    const anchor = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.getAttribute('href') === '#') return;
      const target = document.querySelector(link.getAttribute('href')!);
      if (!(target instanceof HTMLElement)) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -72 });
      target.focus({ preventScroll: true });
    };
    document.addEventListener('click', anchor);
    emit();
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('click', anchor);
      lenis.destroy();
    };
  }, [enabled]);
  return listeners.current;
}
