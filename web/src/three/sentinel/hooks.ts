import { useEffect, useState, type RefObject } from 'react';

export function useMediaQuery(media: string) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(media).matches));
  useEffect(() => {
    const query = window.matchMedia(media);
    const update = () => setMatches(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, [media]);
  return matches;
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');

/** Pauses rendering while the scene is scrolled out of view or the tab is hidden. */
export function useInView(ref: RefObject<Element>, rootMargin = '120px') {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  useEffect(() => {
    const element = ref.current;
    let intersecting = true;
    const update = () => setVisible(intersecting && document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', update);
    const observer = element && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update(); }, { rootMargin })
      : null;
    if (element) observer?.observe(element);
    update();
    return () => {
      document.removeEventListener('visibilitychange', update);
      observer?.disconnect();
    };
  }, [ref, rootMargin]);
  return visible;
}

export function webglAvailable() {
  if (typeof window === 'undefined' || typeof window.WebGL2RenderingContext !== 'function') return false;
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}
