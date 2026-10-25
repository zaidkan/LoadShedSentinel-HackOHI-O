import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Color, MathUtils } from 'three';
import type { CutoutStatus } from '../../../../contracts/types';
import { CUTOUT_VISUAL } from '../visual-state';
import { ACCENT, createHighlight, type Highlight } from './materials';
import { SENTINEL_PART_IDS, type SentinelFocus, type SentinelPartId } from './parts';
import { Crossarm, Pole } from './parts/Structure';
import { Cutout } from './parts/Cutout';
import { SentinelNode, type NodeLink } from './parts/SentinelNode';
import { SolarArray } from './parts/SolarArray';
import { Transformer } from './parts/Transformer';
import type { SentinelMode } from './Stage';

export interface SentinelAssemblyProps {
  mode: SentinelMode;
  focus: SentinelFocus;
  cutoutStatus?: CutoutStatus;
  link?: NodeLink;
  reducedMotion: boolean;
  interactive: boolean;
  igniteDelay?: number;
  onSelect?: (part: SentinelPartId) => void;
}

type HighlightKey = SentinelPartId | 'structure';
const EMPHASIS = {
  hero: { focusRim: 0.34, hoverRim: 0.22, dim: 0.62 },
  inspection: { focusRim: 0.42, hoverRim: 0.26, dim: 0.8 },
} as const;
const accent = new Color(ACCENT);
const caution = new Color(CUTOUT_VISUAL.OPEN.color);

/** Illustrative procedural assembly, not a surveyed installation or construction model. */
export function SentinelAssembly({ mode, focus, cutoutStatus, link, reducedMotion, interactive, igniteDelay = 0, onSelect }: SentinelAssemblyProps) {
  const highlights = useMemo(() => Object.fromEntries([...SENTINEL_PART_IDS, 'structure'].map(id => [id, createHighlight()])) as Record<HighlightKey, Highlight>, []);
  const hovered = useRef<SentinelPartId | null>(null);
  const pulse = useRef(0);
  const previousStatus = useRef(cutoutStatus);
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (previousStatus.current !== cutoutStatus && previousStatus.current !== undefined && !reducedMotion) pulse.current = 1;
    previousStatus.current = cutoutStatus;
    invalidate();
  }, [cutoutStatus, invalidate, reducedMotion]);

  useEffect(() => { invalidate(); }, [focus, invalidate]);
  useEffect(() => () => { gl.domElement.style.cursor = ''; }, [gl]);

  useFrame((state, delta) => {
    const emphasis = EMPHASIS[mode];
    const rate = reducedMotion ? 60 : 7;
    let moving = false;
    pulse.current = Math.max(0, pulse.current - delta / 1.8);
    if (pulse.current > 0) moving = true;
    for (const key of [...SENTINEL_PART_IDS, 'structure'] as HighlightKey[]) {
      const h = highlights[key];
      const focused = focus === key;
      const isHovered = hovered.current === key;
      let rim = key === 'structure' ? 0 : focused ? emphasis.focusRim : isHovered ? emphasis.hoverRim : 0;
      const dim = focus !== 'overview' && !focused ? emphasis.dim : 0;
      if (key === 'cutout' && mode === 'inspection') {
        const flash = 0.5 * Math.sin(pulse.current * Math.PI);
        rim = Math.max(rim, (cutoutStatus === 'OPEN' ? 0.16 : 0) + flash);
        h.rimColor.value.copy(cutoutStatus === 'OPEN' ? caution : accent);
      }
      h.rim.value = MathUtils.damp(h.rim.value, rim, rate, delta);
      h.dim.value = MathUtils.damp(h.dim.value, dim, rate * 0.8, delta);
      if (Math.abs(h.rim.value - rim) > 0.002 || Math.abs(h.dim.value - dim) > 0.002) moving = true;
    }
    if (moving) state.invalidate();
  });

  const select = (part: SentinelPartId) => (event: ThreeEvent<MouseEvent>) => {
    if (!interactive || event.delta > 6) return;
    event.stopPropagation();
    onSelect?.(part);
  };
  const over = (part: SentinelPartId) => (event: ThreeEvent<PointerEvent>) => {
    if (!interactive || event.pointerType === 'touch') return;
    event.stopPropagation();
    hovered.current = part; gl.domElement.style.cursor = 'pointer'; invalidate();
  };
  const out = (part: SentinelPartId) => () => {
    if (hovered.current === part) { hovered.current = null; gl.domElement.style.cursor = ''; invalidate(); }
  };
  const target = (id: SentinelPartId, children: ReactNode) => <group name={`part-${id}`} onClick={select(id)} onPointerOver={over(id)} onPointerOut={out(id)}>{children}</group>;

  return <group name="illustrative-pole-assembly">
    <Pole highlight={highlights.structure} />
    {target('crossarm', <Crossarm highlight={highlights.crossarm} />)}
    {target('transformer', <Transformer highlight={highlights.transformer} />)}
    {target('cutout', <Cutout highlight={highlights.cutout} status={cutoutStatus} reducedMotion={reducedMotion} />)}
    {target('solar', <SolarArray highlight={highlights.solar} />)}
    {target('sentinel', <SentinelNode highlight={highlights.sentinel} link={link} igniteDelay={igniteDelay} breathe={mode === 'hero'} reducedMotion={reducedMotion} />)}
  </group>;
}
