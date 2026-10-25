import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'sentinel:motion';

interface MotionState {
  /** True when the system asks for reduced motion or the visitor turned motion off. */
  reduced: boolean;
  systemReduced: boolean;
  userReduced: boolean;
  setUserReduced: (value: boolean) => void;
}

const MotionContext = createContext<MotionState | null>(null);

export function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const systemReduced = useSystemReducedMotion();
  const [userReduced, setUserReducedState] = useState(() => {
    try { return window.localStorage.getItem(STORAGE_KEY) === 'reduced'; } catch { return false; }
  });
  const setUserReduced = (value: boolean) => {
    setUserReducedState(value);
    try { window.localStorage.setItem(STORAGE_KEY, value ? 'reduced' : 'full'); } catch { /* storage unavailable */ }
  };
  const reduced = systemReduced || userReduced;
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);
  const value = useMemo(() => ({ reduced, systemReduced, userReduced, setUserReduced }), [reduced, systemReduced, userReduced]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useMotion() {
  const value = useContext(MotionContext);
  if (!value) throw new Error('useMotion must be used inside MotionProvider');
  return value;
}
