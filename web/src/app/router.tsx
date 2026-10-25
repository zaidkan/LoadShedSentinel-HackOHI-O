import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react';

export type RoutePath = '/' | '/operator' | '/customer' | '/prevention';

const NAVIGATE_EVENT = 'sentinel:navigate';

function normalize(pathname: string): RoutePath {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash.startsWith('#/operator') || hash === '#operator') return '/operator';
    if (hash.startsWith('#/customer') || hash === '#customer') return '/customer';
    if (hash.startsWith('#/prevention')) return '/prevention';
  }
  const trimmed = pathname.replace(/\/+$/, '') || '/';
  return trimmed === '/operator' || trimmed === '/customer' || trimmed === '/prevention' ? trimmed : '/';
}

export function navigate(to: RoutePath, options: { hash?: string } = {}) {
  const url = to + (options.hash ? `#${options.hash}` : '');
  if (window.location.pathname + window.location.hash !== url) window.history.pushState({}, '', url);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function useRoute(): RoutePath {
  const [route, setRoute] = useState<RoutePath>(() => normalize(window.location.pathname));
  useEffect(() => {
    const update = () => setRoute(normalize(window.location.pathname));
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
