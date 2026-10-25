import { forwardRef, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { webglAvailable } from './sentinel/hooks';
import type { SentinelFocus } from './sentinel/catalog';
import type { SubjectOffset } from './sentinel/CameraDirector';
import type { SentinelSceneHandle } from './sentinel/SentinelScene';

const SentinelScene = lazy(() => import('./sentinel/SentinelScene'));

export interface SentinelHeroProps {
  focus: SentinelFocus;
  onFocusChange?: (focus: SentinelFocus) => void;
  hotspots?: boolean;
  intro?: boolean;
  /** Override the automatic composition (subject right of centre on wide layouts). */
  subjectOffset?: SubjectOffset;
  className?: string;
  onIntroComplete?: () => void;
}

function autoOffset(width: number, height: number): SubjectOffset {
  if (width >= 900 && width / Math.max(height, 1) > 1.15) return { x: 0.3, y: 0.08 };
  return { x: 0, y: 0.34 };
}

/**
 * Immersive presentation of the Sentinel assembly for a page hero. It shows no incident
 * state: the cutout is drawn in its installed position and the light bar is a neutral
 * product light. Wheel and vertical touch gestures stay with the page so scrolling works.
 */
export const SentinelHero = forwardRef<SentinelSceneHandle, SentinelHeroProps>(function SentinelHero({ focus, onFocusChange, hotspots = true, intro = true, subjectOffset, className, onIntroComplete }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<SubjectOffset>({ x: 0, y: 0 });
  const [supported] = useState(webglAvailable);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const update = () => {
      const next = autoOffset(element.clientWidth, element.clientHeight);
      setOffset(current => current.x === next.x && current.y === next.y ? current : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const unavailable = !supported || failed;
  return <div ref={container} className={['sentinel-hero', className].filter(Boolean).join(' ')}>
    {unavailable ? <div className="sentinel-hero-fallback"><p role="status">The interactive 3D view is unavailable on this device.</p></div> :
      <Suspense fallback={null}>
        <SentinelScene
          ref={ref}
          mode="hero"
          focus={focus}
          onFocusChange={onFocusChange}
          intro={intro}
          hotspots={hotspots}
          subjectOffset={subjectOffset ?? offset}
          label="Illustrative 3D model of a utility pole with a distribution transformer, protective cutout, solar module and the Sentinel sensing node"
          onUnavailable={() => setFailed(true)}
          onIntroComplete={onIntroComplete}
        />
      </Suspense>}
  </div>;
});
