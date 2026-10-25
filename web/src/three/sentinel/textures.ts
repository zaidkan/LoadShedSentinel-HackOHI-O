import { CanvasTexture, ClampToEdgeWrapping, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, SRGBColorSpace, type Texture } from 'three';

/**
 * Procedural textures drawn on 2D canvases at runtime. The scene never fetches image,
 * HDR or font assets, so it renders offline and has no external asset URLs.
 */
const cache = new Map<string, unknown>();

function cached<T>(key: string, create: () => T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = create();
  cache.set(key, value);
  return value;
}

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = width; element.height = height;
  const context = element.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable');
  return { element, context };
}

/** Small deterministic PRNG so textures are identical on every load. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function texture(element: HTMLCanvasElement, color: boolean, wrap = true) {
  const result = new CanvasTexture(element);
  result.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  result.wrapS = result.wrapT = wrap ? RepeatWrapping : ClampToEdgeWrapping;
  result.minFilter = LinearMipmapLinearFilter;
  result.anisotropy = 8;
  return result;
}

/** Weathered, pressure-treated wood: vertical grain, seasoning checks and grey patina. */
export function woodTextures(): { map: Texture; bump: Texture } {
  return cached('wood', () => {
    const W = 512, H = 1024;
    const { element, context: ctx } = canvas(W, H);
    const rand = random(7);
    const base = ctx.createLinearGradient(0, 0, W, 0);
    base.addColorStop(0, '#6f5c49'); base.addColorStop(0.3, '#7a6550'); base.addColorStop(0.55, '#6a5745'); base.addColorStop(0.8, '#76624e'); base.addColorStop(1, '#6f5c49');
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    const streak = (x: number, width: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha; ctx.fillStyle = color;
      for (const offset of [-W, 0, W]) ctx.fillRect(x + offset, 0, width, H);
    };
    for (let i = 0; i < 36; i += 1) streak(rand() * W, 8 + rand() * 40, rand() > 0.5 ? '#8c8072' : '#54453a', 0.06 + rand() * 0.08);
    for (let i = 0; i < 900; i += 1) streak(rand() * W, 0.6 + rand() * 2.2, rand() > 0.45 ? '#4d3f33' : '#9b8a76', 0.05 + rand() * 0.14);
    ctx.globalAlpha = 1;
    const checks: Array<{ x: number; y: number; length: number; width: number }> = [];
    for (let i = 0; i < 22; i += 1) checks.push({ x: rand() * W, y: rand() * H, length: 60 + rand() * 360, width: 0.8 + rand() * 2.2 });
    ctx.strokeStyle = '#2c231c'; ctx.lineCap = 'round';
    for (const check of checks) {
      for (const offset of [-H, 0, H]) {
        ctx.globalAlpha = 0.55; ctx.lineWidth = check.width; ctx.beginPath();
        let x = check.x; ctx.moveTo(x, check.y + offset);
        for (let s = 0; s <= check.length; s += 12) { x += (rand() - 0.5) * 1.6; ctx.lineTo(x, check.y + s + offset); }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    const colorMap = texture(element, true);

    const bump = canvas(W, H);
    const source = ctx.getImageData(0, 0, W, H);
    const out = bump.context.createImageData(W, H);
    for (let i = 0; i < source.data.length; i += 4) {
      const luminance = source.data[i] * 0.3 + source.data[i + 1] * 0.59 + source.data[i + 2] * 0.11;
      const value = Math.min(255, Math.max(0, (luminance - 70) * 2.4 + 128));
      out.data[i] = out.data[i + 1] = out.data[i + 2] = value; out.data[i + 3] = 255;
    }
    bump.context.putImageData(out, 0, 0);
    return { map: colorMap, bump: texture(bump.element, false) };
  });
}

/** Soft value noise used to break up roughness on paint and galvanized steel. */
export function surfaceNoise() {
  return cached('noise', () => {
    const S = 256;
    const { element, context: ctx } = canvas(S, S);
    const rand = random(19);
    ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i += 1) {
      const x = rand() * S, y = rand() * S, r = 2 + rand() * 12;
      ctx.globalAlpha = 0.05 + rand() * 0.08;
      ctx.fillStyle = rand() > 0.5 ? '#a6a6a6' : '#5c5c5c';
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { ctx.beginPath(); ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    return texture(element, false);
  });
}

/** Monocrystalline module: chamfered cells on a white backsheet with busbars and fingers. */
export function solarCellTexture() {
  return cached('solar', () => {
    const W = 1200, H = 812, cols = 6, rows = 4, margin = 16, gap = 7;
    const { element, context: ctx } = canvas(W, H);
    const rand = random(31);
    ctx.fillStyle = '#d5dbe0'; ctx.fillRect(0, 0, W, H);
    const cw = (W - margin * 2 - gap * (cols - 1)) / cols;
    const ch = (H - margin * 2 - gap * (rows - 1)) / rows;
    const chamfer = Math.min(cw, ch) * 0.12;
    for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
      const x = margin + c * (cw + gap), y = margin + r * (ch + gap);
      const shade = 0.92 + rand() * 0.12;
      const fill = ctx.createLinearGradient(x, y, x + cw, y + ch);
      fill.addColorStop(0, `rgb(${18 * shade}, ${30 * shade}, ${52 * shade})`);
      fill.addColorStop(1, `rgb(${11 * shade}, ${19 * shade}, ${35 * shade})`);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(x + chamfer, y); ctx.lineTo(x + cw - chamfer, y); ctx.lineTo(x + cw, y + chamfer); ctx.lineTo(x + cw, y + ch - chamfer);
      ctx.lineTo(x + cw - chamfer, y + ch); ctx.lineTo(x + chamfer, y + ch); ctx.lineTo(x, y + ch - chamfer); ctx.lineTo(x, y + chamfer); ctx.closePath();
      ctx.fill();
      ctx.save(); ctx.clip();
      ctx.globalAlpha = 0.28; ctx.strokeStyle = '#3a4c69'; ctx.lineWidth = 1;
      for (let fy = y + 4; fy < y + ch; fy += 5.5) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x + cw, fy); ctx.stroke(); }
      ctx.globalAlpha = 0.9; ctx.fillStyle = '#a9b3bd';
      for (let b = 1; b <= 4; b += 1) ctx.fillRect(x + (cw * b) / 5 - 1.4, y, 2.8, ch);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return texture(element, true, false);
  });
}

/** White-on-black mask for the engraved SENTINEL wordmark (used as an alpha map). */
export function wordmarkTexture() {
  return cached('wordmark', () => {
    const W = 1024, H = 160, text = 'SENTINEL';
    const { element, context: ctx } = canvas(W, H);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle';
    ctx.font = '600 92px "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    const tracking = 34;
    const widths = [...text].map(letter => ctx.measureText(letter).width);
    const total = widths.reduce((sum, w) => sum + w, 0) + tracking * (text.length - 1);
    let x = (W - total) / 2;
    [...text].forEach((letter, i) => { ctx.fillText(letter, x, H / 2 + 4); x += widths[i] + tracking; });
    return texture(element, false, false);
  });
}

/** Brushed aluminium nameplate with abstract engraved rows; carries no rating data. */
export function nameplateTexture() {
  return cached('nameplate', () => {
    const W = 320, H = 208;
    const { element, context: ctx } = canvas(W, H);
    const rand = random(43);
    ctx.fillStyle = '#b9bfc3'; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 1) { ctx.globalAlpha = 0.05 + rand() * 0.08; ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#7d858b'; ctx.fillRect(0, y, W, 1); }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#59626a'; ctx.lineWidth = 4; ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = '#4f5961';
    ctx.fillRect(26, 28, 150, 16);
    for (let row = 0; row < 6; row += 1) {
      const y = 64 + row * 22;
      ctx.globalAlpha = 0.75; ctx.fillRect(26, y, 70 + rand() * 40, 8);
      ctx.globalAlpha = 0.5; ctx.fillRect(160, y, 50 + rand() * 90, 8);
    }
    ctx.globalAlpha = 1;
    return texture(element, true, false);
  });
}

/** Horizontal alpha ramp for conductors that fade out as they leave the composition. */
export function fadeTexture(fadeIn: number, fadeOut: number) {
  return cached(`fade-${fadeIn}-${fadeOut}`, () => {
    const W = 256;
    const { element, context: ctx } = canvas(W, 2);
    const ramp = ctx.createLinearGradient(0, 0, W, 0);
    ramp.addColorStop(0, '#000'); ramp.addColorStop(fadeIn, '#fff'); ramp.addColorStop(fadeOut, '#fff'); ramp.addColorStop(1, '#000');
    ctx.fillStyle = ramp; ctx.fillRect(0, 0, W, 2);
    return texture(element, false, false);
  });
}

/** Opaque luminance falloff: an alpha map for the inspection floor, an additive map for glows. */
export function radialTexture() {
  return cached('radial', () => {
    const S = 256;
    const { element, context: ctx } = canvas(S, S);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
    const gradient = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, '#5a5a5a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, S, S);
    return texture(element, false, false);
  });
}
