import { useEffect, useRef, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

export type RoutePath = '/' | '/operator' | '/customer';

const NAVIGATE_EVENT = 'sentinel:navigate';

function normalize(pathname: string, previous: RoutePath = '/'): RoutePath {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash.startsWith('#/operator') || hash === '#operator') return '/operator';
    if (hash.startsWith('#/customer') || hash === '#customer') return '/customer';
  }
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  if (trimmed === '/operator' || trimmed === '/customer') return trimmed;
  // A native section anchor replaces the hash route, so retain its audience.
  if (window.location.hash && !window.location.hash.startsWith('#/')) return previous;
  return '/';
}

function locationRoute(previous: RoutePath = '/'): RoutePath {
  const saved = window.history.state?.sentinelRoute;
  return normalize(window.location.pathname, saved === '/operator' || saved === '/customer' || saved === '/' ? saved : previous);
}

export function navigate(to: RoutePath, options: { hash?: string } = {}) {
  const url = to + (options.hash ? `#${options.hash}` : '');
  if (window.location.pathname + window.location.hash !== url) window.history.pushState({ sentinelRoute: to }, '', url);
  else window.history.replaceState({ ...window.history.state, sentinelRoute: to }, '');
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function useRoute(): RoutePath {
  const [route, setRoute] = useState<RoutePath>(() => locationRoute());
  const active = useRef(route);
  useEffect(() => {
    const update = () => {
      const next = locationRoute(active.current);
      active.current = next;
      // Preserve the audience with each history entry, including native fragments.
      window.history.replaceState({ ...window.history.state, sentinelRoute: next }, '');
      setRoute(next);
    };
    update();
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);
  return route;
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: RoutePath; hash?: string };

export function Link({ to, hash, onClick, ...rest }: LinkProps) {
  const handle = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(to, { hash });
  };
  return <a href={to + (hash ? `#${hash}` : '')} onClick={handle} {...rest} />;
}
