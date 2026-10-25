import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Texture } from 'three';
import { nameplateTexture, solarCellTexture, surfaceNoise, woodTextures, wordmarkTexture } from './textures';

/**
 * Per-part emphasis uniforms. `rim` adds a fresnel edge light for hover/focus; `dim`
 * desaturates and darkens a part so a focused component reads clearly against the rest.
 */
export interface Highlight {
  rim: { value: number };
  dim: { value: number };
  rimColor: { value: Color };
}

export const ACCENT = '#7fd8e8';

export function createHighlight(): Highlight {
  return { rim: { value: 0 }, dim: { value: 0 }, rimColor: { value: new Color(ACCENT) } };
}

/** Thin tubes are almost all grazing angle, so a full-strength rim would flood them with accent. */
const THIN_RIM = 0.3;

function withHighlight<T extends MeshStandardMaterial>(material: T, highlight: Highlight, rimScale: number): T {
  const scale = { value: rimScale };
  material.onBeforeCompile = shader => {
    shader.uniforms.uSentinelRim = highlight.rim;
    shader.uniforms.uSentinelRimScale = scale;
    shader.uniforms.uSentinelDim = highlight.dim;
    shader.uniforms.uSentinelRimColor = highlight.rimColor;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSentinelRim;\nuniform float uSentinelRimScale;\nuniform float uSentinelDim;\nuniform vec3 uSentinelRimColor;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float sentinelFresnel = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.4);
        totalEmissiveRadiance += uSentinelRimColor * uSentinelRim * uSentinelRimScale * (0.06 + 1.1 * sentinelFresnel);`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        float sentinelLuma = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(sentinelLuma) * 0.38, uSentinelDim * 0.72);`);
  };
  material.customProgramCacheKey = () => 'sentinel-highlight-v2';
  return material;
}

const repeat = (source: Texture, x: number, y: number) => {
  const clone = source.clone();
  clone.repeat.set(x, y);
  clone.needsUpdate = true;
  return clone;
};

/**
 * Lazily-built material set bound to one part's highlight uniforms. Textures are shared
 * across kits; materials are per part so emphasis never bleeds between components.
 */
export class MaterialKit {
  private readonly materials = new Map<string, Material>();
  private readonly textures: Texture[] = [];
  constructor(private readonly highlight: Highlight) {}

  private make<T extends MeshStandardMaterial>(key: string, create: () => T, rimScale = 1): T {
    const existing = this.materials.get(key);
    if (existing) return existing as T;
    const material = withHighlight(create(), this.highlight, rimScale);
    this.materials.set(key, material);
    return material;
  }

  private tiled(source: Texture, x: number, y: number) {
    const result = repeat(source, x, y);
    this.textures.push(result);
    return result;
  }

  get wood() {
    return this.make('wood', () => {
      const { map, bump } = woodTextures();
      return new MeshStandardMaterial({ map: this.tiled(map, 1, 5), bumpMap: this.tiled(bump, 1, 5), bumpScale: 1.6, roughness: 0.94, color: '#e8ddd0' });
    });
  }
  get crossarmWood() {
    return this.make('crossarmWood', () => {
      const { map, bump } = woodTextures();
      const tiledMap = this.tiled(map, 0.5, 2.2); tiledMap.rotation = Math.PI / 2;
      const tiledBump = this.tiled(bump, 0.5, 2.2); tiledBump.rotation = Math.PI / 2;
      return new MeshStandardMaterial({ map: tiledMap, bumpMap: tiledBump, bumpScale: 1.2, roughness: 0.9, color: '#f2e6d6' });
    });
  }
  get galvanized() {
    return this.make('galvanized', () => new MeshStandardMaterial({ color: '#8d969c', metalness: 0.78, roughness: 0.52, roughnessMap: this.tiled(surfaceNoise(), 2, 2) }));
  }
  get darkSteel() {
    return this.make('darkSteel', () => new MeshStandardMaterial({ color: '#5a636a', metalness: 0.55, roughness: 0.5 }));
  }
  get stainless() {
    return this.make('stainless', () => new MeshStandardMaterial({ color: '#d2d6d9', metalness: 1, roughness: 0.27 }));
  }
  get bronze() {
    return this.make('bronze', () => new MeshStandardMaterial({ color: '#b48f5d', metalness: 1, roughness: 0.34 }));
  }
  get copper() {
    return this.make('copper', () => new MeshStandardMaterial({ color: '#c07a4c', metalness: 1, roughness: 0.4 }));
  }
  get conductor() {
    return this.make('conductor', () => new MeshStandardMaterial({ color: '#aeb4b8', metalness: 0.9, roughness: 0.42 }), THIN_RIM);
  }
  get porcelain() {
    return this.make('porcelain', () => new MeshPhysicalMaterial({ color: '#c4cbce', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06 }));
  }
  get tankPaint() {
    return this.make('tankPaint', () => new MeshPhysicalMaterial({ color: '#a1a9ad', roughness: 0.44, roughnessMap: this.tiled(surfaceNoise(), 3, 3), clearcoat: 0.35, clearcoatRoughness: 0.32 }));
  }
  get tankTrim() {
    return this.make('tankTrim', () => new MeshPhysicalMaterial({ color: '#8f989d', roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.3 }));
  }
  get nameplate() {
    return this.make('nameplate', () => new MeshStandardMaterial({ map: nameplateTexture(), metalness: 0.7, roughness: 0.38 }));
  }
  get fuseTube() {
    return this.make('fuseTube', () => new MeshPhysicalMaterial({ color: '#7d5034', roughness: 0.36, clearcoat: 0.7, clearcoatRoughness: 0.18 }));
  }
  get cable() {
    return this.make('cable', () => new MeshPhysicalMaterial({ color: '#16191c', roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4 }), THIN_RIM);
  }
  get coveredLead() {
    return this.make('coveredLead', () => new MeshPhysicalMaterial({ color: '#2a2f33', roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 }), THIN_RIM);
  }
  get nylon() {
    return this.make('nylon', () => new MeshStandardMaterial({ color: '#1d2125', roughness: 0.62 }));
  }
  get shell() {
    return this.make('shell', () => new MeshPhysicalMaterial({ color: '#e9ebe8', roughness: 0.52, roughnessMap: this.tiled(surfaceNoise(), 4, 4), clearcoat: 0.25, clearcoatRoughness: 0.45 }));
  }
  get graphite() {
    return this.make('graphite', () => new MeshPhysicalMaterial({ color: '#272d33', roughness: 0.48, metalness: 0.15, clearcoat: 0.3, clearcoatRoughness: 0.4 }));
  }
  get seam() {
    return this.make('seam', () => new MeshStandardMaterial({ color: '#12161a', roughness: 0.7 }));
  }
  get glass() {
    return this.make('glass', () => new MeshPhysicalMaterial({ color: '#0b1014', roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03, metalness: 0.1 }));
  }
  get wordmark() {
    return this.make('wordmark', () => new MeshStandardMaterial({ color: '#c9d2d8', metalness: 0.85, roughness: 0.32, alphaMap: wordmarkTexture(), transparent: true, depthWrite: false }));
  }
  get grille() {
    return this.make('grille', () => new MeshStandardMaterial({ color: '#06080a', roughness: 0.9 }));
  }
  get solarCells() {
    return this.make('solarCells', () => new MeshPhysicalMaterial({ map: solarCellTexture(), roughness: 0.16, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.025 }));
  }
  get anodized() {
    return this.make('anodized', () => new MeshStandardMaterial({ color: '#c3c9cd', metalness: 1, roughness: 0.3 }));
  }
  get backsheet() {
    return this.make('backsheet', () => new MeshStandardMaterial({ color: '#dfe3e6', roughness: 0.82, side: DoubleSide }));
  }

  /** Materials whose parameters a part animates directly (status light, fuse indicator). */
  custom<T extends MeshStandardMaterial>(key: string, create: () => T, options: { thin?: boolean } = {}): T {
    return this.make(key, create, options.thin ? THIN_RIM : 1);
  }

  dispose() {
    this.materials.forEach(material => material.dispose());
    this.textures.forEach(texture => texture.dispose());
    this.materials.clear();
    this.textures.length = 0;
  }
}
