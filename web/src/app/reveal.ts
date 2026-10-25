import { useLayoutEffect, useRef } from 'react';
import { useMotion } from './motion';

/**
 * Marks an element for a scroll reveal. Content already in view, or any content when motion is reduced,
 * is never hidden; only elements below the fold start pending and are shown once they intersect.
 * `intro` plays the reveal immediately on mount for first-viewport content.
 */
export function useReveal<T extends HTMLElement>(options: { intro?: boolean; delay?: number } = {}) {
  const ref = useRef<T>(null);
  const { reduced } = useMotion();
  const { intro = false, delay = 0 } = options;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (reduced) { element.dataset.reveal = 'shown'; return; }
    if (intro) {
      element.dataset.reveal = 'pending';
      const timer = window.setTimeout(() => requestAnimationFrame(() => { element.dataset.reveal = 'shown'; }), 60 + delay);
      return () => window.clearTimeout(timer);
    }
    if (element.getBoundingClientRect().top < window.innerHeight * 0.9) { element.dataset.reveal = 'shown'; return; }
    element.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        window.setTimeout(() => { element.dataset.reveal = 'shown'; }, delay);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [reduced, intro, delay]);
  return ref;
}
