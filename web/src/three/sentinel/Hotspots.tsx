import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Vector3, type Group } from 'three';
import { PART_STAGING, SENTINEL_PARTS, SENTINEL_PART_IDS, type SentinelFocus, type SentinelPartId } from './parts';

/**
 * Anchored part markers. They duplicate DOM controls that live outside the canvas, so
 * they are hidden from assistive technology and skipped in the tab order.
 */
export function Hotspots({ focus, ready, onSelect, onHoverChange, variant }: { focus: SentinelFocus; ready: boolean; onSelect: (part: SentinelPartId) => void; onHoverChange: (part: SentinelPartId | null) => void; variant: 'hero' | 'inspection' }) {
  return <>{SENTINEL_PART_IDS.map(id => <Hotspot key={id} id={id} active={focus === id} muted={focus !== 'overview' && focus !== id} ready={ready} onSelect={onSelect} onHoverChange={onHoverChange} variant={variant} />)}</>;
}

function Hotspot({ id, active, muted, ready, onSelect, onHoverChange, variant }: { id: SentinelPartId; active: boolean; muted: boolean; ready: boolean; onSelect: (part: SentinelPartId) => void; onHoverChange: (part: SentinelPartId | null) => void; variant: 'hero' | 'inspection' }) {
  const part = SENTINEL_PARTS[id];
  const staging = PART_STAGING[id];
  const element = useRef<HTMLButtonElement>(null);
  const group = useRef<Group>(null);
  const anchor = useMemo(() => new Vector3(), []);
  const worldFacing = useMemo(() => new Vector3(), []);
  const facing = useMemo(() => new Vector3(...staging.facing).normalize(), [staging.facing]);
  const toCamera = useMemo(() => new Vector3(), []);
  useFrame(({ camera }) => {
    const node = element.current;
    if (!node || !group.current) return;
    group.current.updateWorldMatrix(true, false);
    group.current.getWorldPosition(anchor);
    worldFacing.copy(facing).transformDirection(group.current.matrixWorld);
    const visible = camera.getWorldPosition(toCamera).sub(anchor).normalize().dot(worldFacing) > -0.15;
    const state = visible ? 'visible' : 'hidden';
    if (node.dataset.facing !== state) node.dataset.facing = state;
  });
  return <group ref={group} position={staging.anchor}><Html zIndexRange={[4, 0]} center>
    <button
      ref={element}
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      className={`sentinel-hotspot sentinel-hotspot-${variant}`}
      data-active={active}
      data-muted={muted}
      data-ready={ready}
      data-side={staging.label}
      onPointerEnter={() => onHoverChange(id)}
      onPointerLeave={() => onHoverChange(null)}
      onClick={event => { event.stopPropagation(); onSelect(id); }}
    >
      <span className="sentinel-hotspot-dot"><span /></span>
      <span className="sentinel-hotspot-label"><small>{part.index}</small>{part.short}</span>
    </button>
  </Html></group>;
}
