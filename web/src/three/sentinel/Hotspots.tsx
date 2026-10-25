import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import { PART_STAGING, SENTINEL_PARTS, SENTINEL_PART_IDS, type SentinelFocus, type SentinelPartId } from './parts';

/**
 * Anchored part markers. They duplicate DOM controls that live outside the canvas, so
 * they are hidden from assistive technology and skipped in the tab order.
 */
export function Hotspots({ focus, ready, onSelect, variant }: { focus: SentinelFocus; ready: boolean; onSelect: (part: SentinelPartId) => void; variant: 'hero' | 'inspection' }) {
  return <>{SENTINEL_PART_IDS.map(id => <Hotspot key={id} id={id} active={focus === id} muted={focus !== 'overview' && focus !== id} ready={ready} onSelect={onSelect} variant={variant} />)}</>;
}

function Hotspot({ id, active, muted, ready, onSelect, variant }: { id: SentinelPartId; active: boolean; muted: boolean; ready: boolean; onSelect: (part: SentinelPartId) => void; variant: 'hero' | 'inspection' }) {
  const part = SENTINEL_PARTS[id];
  const staging = PART_STAGING[id];
  const element = useRef<HTMLButtonElement>(null);
  const anchor = useMemo(() => new Vector3(...staging.anchor), [staging.anchor]);
  const facing = useMemo(() => new Vector3(...staging.facing).normalize(), [staging.facing]);
  const toCamera = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    const node = element.current;
    if (!node) return;
    const visible = toCamera.copy(camera.position).sub(anchor).normalize().dot(facing) > -0.15;
    const state = visible ? 'visible' : 'hidden';
    if (node.dataset.facing !== state) node.dataset.facing = state;
  });
  return <Html position={staging.anchor} zIndexRange={[4, 0]} center>
    <button
      ref={element}
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      className={`sentinel-hotspot sentinel-hotspot-${variant}`}
      data-active={active}
      data-muted={muted}
      data-ready={ready}
      onClick={event => { event.stopPropagation(); onSelect(id); }}
    >
      <span className="sentinel-hotspot-dot"><span /></span>
      <span className="sentinel-hotspot-label"><small>{part.index}</small>{part.short}</span>
    </button>
  </Html>;
}
