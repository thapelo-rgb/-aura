// AURA built-in wallpaper pack — generator.
//
// WHY THIS FILE EXISTS
// --------------------
// AURA ships a large built-in wallpaper pack so the APK is a real, offline
// wallpaper library (~100 MB). The images are procedural, so they are NOT
// committed to this repo: this script renders them. See WALLPAPERS.md for the
// exact rebuild recipe (it also holds the hosted zip URL the Android build
// downloads).
//
// Pure browser / worker APIs only (OffscreenCanvas) — no dependencies.

import { WP_PALETTES } from "../web/wallpapers.js";

// The palette table lives in src/web/wallpapers.js so the baked JPEGs and the
// runtime web renderer can never drift apart.
export const PALETTES = WP_PALETTES;

export const STYLES = [
  { id: "aurora", name: "Aurora" },
  { id: "nebula", name: "Nebula" },
  { id: "mesh", name: "Mesh" },
  { id: "starry", name: "Starfield" },
  { id: "matte", name: "Matte" },
  { id: "silk", name: "Silk" },
  { id: "topo", name: "Topograph" },
  { id: "bokeh", name: "Bokeh" },
];

export const FULL_W = 1620;
export const FULL_H = 3510;
export const THUMB_W = 300;
export const THUMB_H = 650;

// A spec is one wallpaper: one style + one palette + a seed, so no two images
// repeat even when the style/palette pair does.
export function buildSpecs(stylesPer = 8, perStyle = 8) {
  const specs = [];
  let n = 0;
  for (let si = 0; si < stylesPer; si++) {
    for (let k = 0; k < perStyle; k++) {
      const pi = (si * 3 + k * 5) % PALETTES.length;
      n++;
      specs.push({
        id: "aura-" + String(n).padStart(2, "0") + "-" + STYLES[si].id,
        name: PALETTES[pi].name + " " + STYLES[si].name,
        tag: STYLES[si].id,
        style: STYLES[si].id,
        palette: PALETTES[pi].id,
        colors: PALETTES[pi].colors,
        seed: n * 7919 + si * 131 + k * 17,
      });
    }
  }
  return specs;
}

/* ------------------------------------------------------------------ utils */

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex) {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, a) {
  const p = rgb(hex);
  return "rgba(" + p[0] + "," + p[1] + "," + p[2] + "," + Math.max(0, Math.min(1, a)) + ")";
}

function mix(hexA, hexB, t) {
  const a = rgb(hexA);
  const b = rgb(hexB);
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return "rgb(" + r + "," + g + "," + bl + ")";
}

// Soft radial falloff. `hot` adds a small blown-out core, which is what makes
// light sources read as light sources instead of as flat circles.
function blob(ctx, x, y, r, hex, alpha, squash, hot) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, alpha));
  g.addColorStop(0.4, rgba(hex, alpha * 0.5));
  g.addColorStop(0.72, rgba(hex, alpha * 0.17));
  g.addColorStop(1, rgba(hex, 0));
  ctx.save();
  if (squash && squash !== 1) {
    ctx.translate(x, y);
    ctx.scale(1, squash);
    ctx.translate(-x, -y);
  }
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6);
  ctx.restore();
  if (hot) {
    const hg = ctx.createRadialGradient(x, y, 0, x, y, r * 0.24);
    hg.addColorStop(0, "rgba(255,255,255," + Math.min(0.85, alpha * 3) + ")");
    hg.addColorStop(0.5, rgba(hex, alpha * 0.8));
    hg.addColorStop(1, rgba(hex, 0));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = hg;
    ctx.fillRect(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.6);
    ctx.restore();
  }
}

function vignette(ctx, w, h, strength) {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.44, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.66, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0," + strength + ")");
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Gaussian-ish noise tile. Uniform noise looks like TV static and reads as
// "dirty"; averaging three uniforms gives a soft, photographic grain.
function noiseTile(seed, size, sigma) {
  const c = new OffscreenCanvas(size, size);
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const R = mulberry(seed);
  const k = sigma * 2;
  for (let i = 0; i < d.length; i += 4) {
    const v = 128 + (R() + R() + R() - 1.5) * k;
    const n = v < 0 ? 0 : v > 255 ? 255 : v | 0;
    d[i] = n;
    d[i + 1] = n;
    d[i + 2] = n;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

let _tile = null;
let _tileKey = "";

function grain(ctx, w, h, seed, strength, sigma) {
  const size = 512;
  const key = seed + ":" + size + ":" + sigma;
  if (_tileKey !== key) {
    _tile = noiseTile(seed, size, sigma);
    _tileKey = key;
  }
  const pat = ctx.createPattern(_tile, "repeat");
  if (!pat) return;
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = strength;
  const R = mulberry(seed + 991);
  ctx.translate(-R() * size, -R() * size);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w + size, h + size);
  ctx.restore();
}

// Particle counts below are written for the full-size render; this scales them
// by the actual canvas area (and softens grain for the linear scale) so a
// thumbnail is a faithful miniature instead of a wall of noise.
let AREA_K = 1;
let LIN_S = 1;
function scaled(n, floor) {
  return Math.max(floor == null ? 4 : floor, Math.round(n * AREA_K));
}

/* ----------------------------------------------------------------- styles */

// Every particle count is expressed for the full 1620x3510 render and scaled by
// area so a 300x650 thumbnail of a wallpaper looks like that wallpaper, not like
// a wall of noise. `K` is the area scale, `S` the linear one.
function styleAurora(ctx, w, h, pal, R) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#01020a");
  g.addColorStop(0.45, pal[0]);
  g.addColorStop(1, "#010207");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // horizon glow + sky glow, so the ribbons sit in a lit atmosphere
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  blob(ctx, w * (0.3 + R() * 0.4), h * 0.9, w * 1.1, pal[1], 0.10, 0.42);
  for (let i = 0; i < 6; i++) {
    blob(ctx, R() * w, h * (0.05 + R() * 0.45), w * (0.5 + R() * 0.7), i % 2 ? pal[2] : pal[1], 0.05 + R() * 0.05, 0.5);
  }
  ctx.restore();

  const curtains = 3 + ((R() * 3) | 0);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let k = 0; k < curtains; k++) {
    const phase = R() * 6.28;
    const base = 0.14 + k * 0.12 + R() * 0.05;
    const amp = 0.03 + R() * 0.05;
    const freq = 0.6 + R() * 1.5;
    const colA = k % 2 ? pal[3] : pal[2];
    const colB = k % 2 ? pal[2] : pal[3];
    const thick = 0.28 + R() * 0.18;
    const flick = 0.6 + R() * 0.6;
    const lift = h * (0.16 + R() * 0.3);
    for (let x = 0; x < w; x += 1) {
      const u = x / w;
      const y0 = h * base + Math.sin(u * 6.2832 * freq + phase) * h * amp + Math.sin(u * 6.2832 * freq * 3.1 + phase * 2) * h * amp * 0.3;
      const y1 = y0 + h * thick * (0.7 + 0.55 * Math.sin(u * 6.2832 * 1.7 + phase));
      const f = 0.30 + 0.70 * Math.abs(Math.sin(u * 6.2832 * (1.0 + freq * 0.7) + phase));
      const drop = Math.max(0, 1 - y0 / (h * 0.95));
      const lg = ctx.createLinearGradient(0, y0, 0, y1);
      lg.addColorStop(0, rgba(colA, 0));
      lg.addColorStop(0.4, rgba(colA, 0.26 * flick * f * drop));
      lg.addColorStop(0.58, rgba(colB, 0.20 * flick * f * drop));
      lg.addColorStop(1, rgba(colB, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(x, y0, 1.4, y1 - y0);
      // vertical ray structure: real aurorae are made of fine rays, and this is
      // also what gives the image its photographic detail.
      if (x % 2 === 0) {
        const rr = R();
        if (rr > 0.42) {
          const len = (y1 - y0) * (0.25 + rr * 0.75);
          ctx.fillStyle = rgba(pal[3], 0.035 + rr * 0.09 * flick);
          ctx.fillRect(x, y0, 1, len);
        }
      }
    }
    void lift;
  }
  ctx.restore();
  vignette(ctx, w, h, 0.42);
}

function styleNebula(ctx, w, h, pal, R) {
  ctx.fillStyle = "#01020a";
  ctx.fillRect(0, 0, w, h);
  const cx = w * (0.28 + R() * 0.44);
  const cy = h * (0.3 + R() * 0.36);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < scaled(26, 6); i++) {
    const r = w * (0.22 + R() * 0.55);
    const x = cx + (R() - 0.5) * w * 0.9;
    const y = cy + (R() - 0.5) * h * 0.5;
    const col = [pal[1], pal[2], pal[3]][(R() * 3) | 0];
    blob(ctx, x, y, r, col, 0.05 + R() * 0.05, 0.6 + R() * 0.7);
  }
  // filament arms give the cloud actual structure instead of a flat haze
  const arms = 3 + ((R() * 2) | 0);
  for (let a = 0; a < arms; a++) {
    const rot = R() * 6.28;
    const len = h * (0.18 + R() * 0.3);
    for (let i = 0; i < scaled(46, 8); i++) {
      const t = i / 46;
      const ang = rot + t * (1.6 + R() * 0.9);
      const rad = len * t;
      const x = cx + Math.cos(ang) * rad + (R() - 0.5) * w * 0.1;
      const y = cy + Math.sin(ang) * rad * 0.72 + (R() - 0.5) * h * 0.05;
      const r = w * (0.035 + R() * 0.075) * (1 - t * 0.5);
      const col = R() < 0.5 ? pal[2] : pal[1];
      blob(ctx, x, y, r, col, 0.09 + R() * 0.14, 0.7 + R() * 0.8);
    }
  }
  // fine filaments: short bright strokes along the cloud, the detail that makes
  // a nebula read as gas rather than as a blur
  for (let i = 0; i < scaled(900, 40); i++) {
    const ang = R() * 6.28;
    const rad = w * (0.05 + R() * 0.55);
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad * 0.7;
    const len = w * (0.01 + R() * 0.05);
    const a = ang + 1.57 + (R() - 0.5) * 0.8;
    ctx.strokeStyle = rgba(R() < 0.55 ? pal[2] : pal[3], 0.04 + R() * 0.14);
    ctx.lineWidth = 0.6 + R() * 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.6);
    ctx.stroke();
  }
  // bright core
  blob(ctx, cx, cy, w * 0.4, pal[2], 0.16, 0.85);
  blob(ctx, cx, cy, w * 0.16, "#ffffff", 0.22, 0.9, true);
  ctx.restore();

  // dark dust lanes carve depth out of the glow
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 9; i++) {
    const ang = R() * 6.28;
    const x = cx + Math.cos(ang) * w * R() * 0.35;
    const y = cy + Math.sin(ang) * h * R() * 0.14;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(R() * 6.28);
    blob(ctx, 0, 0, w * (0.14 + R() * 0.3), "#000000", 0.16 + R() * 0.16, 0.20 + R() * 0.25);
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < scaled(4200, 60); i++) {
    const x = R() * w;
    const y = R() * h;
    const t = R();
    const s = t > 0.99 ? 2.2 : t > 0.95 ? 1.4 : 1;
    ctx.fillStyle = "rgba(255,255,255," + (0.06 + R() * 0.6) + ")";
    ctx.fillRect(x, y, s, s);
  }
  for (let i = 0; i < scaled(10, 3); i++) {
    const x = R() * w;
    const y = R() * h;
    blob(ctx, x, y, w * (0.012 + R() * 0.03), pal[3], 0.4, 1, true);
  }
  ctx.restore();
  vignette(ctx, w, h, 0.5);
}

function styleMesh(ctx, w, h, pal, R) {
  ctx.fillStyle = mix("#000000", pal[0], 0.95);
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const spots = [
    [0.16 + R() * 0.18, 0.14 + R() * 0.2, pal[1], 0.26],
    [0.8 - R() * 0.2, 0.24 + R() * 0.18, pal[2], 0.24],
    [0.3 + R() * 0.28, 0.6 + R() * 0.18, pal[2], 0.22],
    [0.74, 0.82 - R() * 0.18, pal[3], 0.18],
    [0.5, 0.42, pal[3], 0.14],
  ];
  for (const [fx, fy, col, a] of spots) {
    blob(ctx, w * fx, h * fy, w * (0.55 + R() * 0.45), col, a, 0.85 + R() * 0.35);
  }
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, rgba(pal[3], 0.06));
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  vignette(ctx, w, h, 0.38);
}

// A starfield is judged entirely on one thing: whether the points of light read
// as *stars*. So this style is built the way a camera makes them — a dense
// gaussian band of faint pinpricks, dark dust lanes carving the band into
// structure, then a sparse foreground field, and finally a few bright stars
// with diffraction spikes (the single strongest "this is a star" cue, and one
// that survives being scaled down to a thumbnail).
function styleStarry(ctx, w, h, pal, R) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#010105");
  g.addColorStop(0.5, mix(pal[0], "#000000", 0.55));
  g.addColorStop(1, "#01020a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const ang = -0.55 + R() * 0.35;
  const cx = w * (0.42 + R() * 0.16);
  const cy = h * (0.44 + R() * 0.14);
  const sigma = h * (0.115 + R() * 0.05);
  const reach = (w + h) * 1.05;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = "lighter";

  // barely-there atmospheric tint inside the band — the band itself must be
  // made of stars, so this is a whisper, not a wash
  const bg = ctx.createLinearGradient(0, -sigma * 3, 0, sigma * 3);
  bg.addColorStop(0, "rgba(255,255,255,0)");
  bg.addColorStop(0.34, rgba(pal[3], 0.028));
  bg.addColorStop(0.5, rgba(pal[2], 0.05));
  bg.addColorStop(0.66, rgba(pal[3], 0.03));
  bg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bg;
  ctx.fillRect(-reach, -sigma * 3, reach * 2, sigma * 6);
  // faint deep-sky clouds along the band, stretched along it so they layer
  // rather than smudge
  for (let i = 0; i < scaled(16, 4); i++) {
    const x = (R() * 2 - 1) * reach * 0.85;
    const y = (R() - 0.5) * sigma * 1.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(2.8 + R() * 2.4, 0.5 + R() * 0.35);
    blob(ctx, 0, 0, w * (0.09 + R() * 0.16), R() < 0.55 ? pal[2] : pal[3], 0.03 + R() * 0.035, 1);
    ctx.restore();
  }

  // the band: gaussian-distributed pinpricks with a dense core ridge. Stars
  // that fall outside the (rotated) frame are rejected, so the whole budget
  // lands on the image instead of being spent off-canvas.
  const cosA = Math.cos(ang);
  const sinA = Math.sin(ang);
  const inFrame = (x, y) => {
    const wx = cx + cosA * x - sinA * y;
    const wy = cy + sinA * x + cosA * y;
    return wx > -24 && wx < w + 24 && wy > -24 && wy < h + 24;
  };
  const bandN = scaled(420000, 3000);
  const core = sigma * 0.62;
  for (let i = 0; i < bandN; i++) {
    const x = (R() * 2 - 1) * reach;
    const y = ((R() + R() + R()) / 1.5 - 1) * sigma * 1.9;
    const dens = Math.exp(-(y * y) / (2 * core * core));
    if (R() > 0.24 + dens * 0.76) continue;
    if (!inFrame(x, y)) continue;
    const b = Math.pow(R(), 2.3);
    const s = b > 0.985 ? 1.8 : b > 0.9 ? 1.2 : 1;
    ctx.fillStyle = "rgba(255,255,255," + (0.07 + b * 0.8) + ")";
    ctx.fillRect(x, y, s, s);
  }
  // brighter core ridge — the eye should find the middle of the band
  for (let i = 0; i < scaled(90000, 900); i++) {
    const x = (R() * 2 - 1) * reach;
    const y = ((R() + R() + R()) / 1.5 - 1) * sigma * 0.6;
    if (!inFrame(x, y)) continue;
    const b = Math.pow(R(), 1.8);
    ctx.fillStyle = "rgba(255,255,255," + (0.08 + b * 0.7) + ")";
    ctx.fillRect(x, y, b > 0.96 ? 1.8 : 1, b > 0.96 ? 1.8 : 1);
  }

  // dust lanes: dark, elongated, running along the band. These are what break
  // the band into structure instead of one continuous smear.
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 15; i++) {
    const x = (R() * 2 - 1) * reach * 0.9;
    const y = (R() - 0.5) * sigma * 1.6;
    const r = w * (0.06 + R() * 0.17);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((R() - 0.5) * 0.5);
    blob(ctx, 0, 0, r, "#000000", 0.2 + R() * 0.3, 0.15 + R() * 0.2);
    ctx.restore();
  }
  ctx.restore();

  // foreground field — sparse, uniform, mostly faint
  for (let i = 0; i < scaled(9000, 120); i++) {
    const x = R() * w;
    const y = R() * h;
    const t = R();
    const s = t > 0.995 ? 2 : t > 0.95 ? 1.3 : 1;
    ctx.fillStyle = "rgba(255,255,255," + (0.05 + R() * 0.7) + ")";
    ctx.fillRect(x, y, s, s);
  }

  // bright stars: soft halo + tight core + diffraction cross
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < scaled(26, 4); i++) {
    let sx = R() * w;
    let sy = R() * h;
    if (R() < 0.55) {
      // pull most bright stars onto the band so it has real highlights
      const dx = sx - cx;
      const dy = sy - cy;
      const lx = Math.cos(-ang) * dx - Math.sin(-ang) * dy;
      const ly = (Math.sin(-ang) * dx + Math.cos(-ang) * dy) * 0.35;
      sx = cx + cosA * lx - sinA * ly;
      sy = cy + sinA * lx + cosA * ly;
    }
    const r = w * (0.004 + R() * 0.011);
    const cr = R();
    const col = cr < 0.12 ? "#bfe6ff" : cr < 0.2 ? "#ffd9b0" : "#ffffff";
    blob(ctx, sx, sy, r * 5, col, 0.15, 1);
    blob(ctx, sx, sy, r * 1.6, col, 0.7, 1, true);
    const sp = r * (5 + R() * 6);
    const th = Math.max(0.7, r * 0.5);
    const hg = ctx.createLinearGradient(sx - sp, sy, sx + sp, sy);
    hg.addColorStop(0, "rgba(255,255,255,0)");
    hg.addColorStop(0.5, rgba(col, 0.5));
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(sx - sp, sy - th / 2, sp * 2, th);
    const vg = ctx.createLinearGradient(sx, sy - sp, sx, sy + sp);
    vg.addColorStop(0, "rgba(255,255,255,0)");
    vg.addColorStop(0.5, rgba(col, 0.5));
    vg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = vg;
    ctx.fillRect(sx - th / 2, sy - sp, th, sp * 2);
  }
  ctx.restore();
  vignette(ctx, w, h, 0.42);
}

function styleMatte(ctx, w, h, pal, R) {
  const g = ctx.createLinearGradient(0, 0, w * (0.3 + R() * 0.5), h);
  g.addColorStop(0, mix("#000000", pal[1], 0.6));
  g.addColorStop(0.45, mix("#000000", pal[0], 0.95));
  g.addColorStop(1, mix("#000000", pal[1], 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  blob(ctx, w * (0.2 + R() * 0.6), h * (0.16 + R() * 0.5), w * 0.9, pal[2], 0.06, 1.1);
  ctx.restore();
  vignette(ctx, w, h, 0.55);
}

function styleSilk(ctx, w, h, pal, R) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, mix("#000000", pal[0], 0.92));
  g.addColorStop(1, "#01010a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const bands = 18 + ((R() * 10) | 0);
  const f1 = 0.7 + R() * 1.3;
  const f2 = 2.2 + R() * 2.6;
  const ph1 = R() * 6.28;
  const ph2 = R() * 6.28;
  const amp1 = h * (0.03 + R() * 0.045);
  const amp2 = h * (0.008 + R() * 0.02);
  const yOf = (u, level) => {
    const t = level / bands;
    return (
      h * (-0.08 + 1.18 * t) +
      Math.sin(u * 6.2832 * f1 + ph1 + t * 1.6) * amp1 +
      Math.sin(u * 6.2832 * f2 + ph2 - t * 2.2) * amp2
    );
  };
  for (let k = bands; k >= 0; k--) {
    ctx.beginPath();
    ctx.moveTo(0, yOf(0, k));
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, yOf(x / w, k));
    for (let x = w; x >= 0; x -= 6) ctx.lineTo(x, yOf(x / w, k + 1));
    ctx.closePath();
    const t = k / bands;
    const col = mix(pal[0], pal[2], t);
    ctx.fillStyle = rgba(col, 0.22 + 0.36 * (1 - Math.abs(t - 0.5) * 1.35));
    ctx.fill();
    ctx.strokeStyle = rgba(pal[3], 0.06 + 0.12 * t);
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  blob(ctx, w * (0.3 + R() * 0.4), h * (0.3 + R() * 0.4), w * 0.95, pal[3], 0.08, 0.8);
  blob(ctx, w * R(), h * (0.2 + R() * 0.6), w * 0.35, pal[3], 0.10, 1, true);
  ctx.restore();
  vignette(ctx, w, h, 0.42);
}

function styleTopo(ctx, w, h, pal, R) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, mix("#000000", pal[1], 0.45));
  g.addColorStop(0.6, mix("#000000", pal[0], 1));
  g.addColorStop(1, mix("#000000", pal[1], 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const lines = 140;
  const f1 = 1.0 + R() * 1.5;
  const f2 = 3.0 + R() * 3.2;
  const f3 = 6.5 + R() * 6.0;
  const p1 = R() * 6.28;
  const p2 = R() * 6.28;
  const p3 = R() * 6.28;
  const skew = (R() - 0.5) * 0.45;
  const wave = (u, t) =>
    Math.sin(u * 6.2832 * f1 + p1 + t * 2.0) * 0.05 +
    Math.sin(u * 6.2832 * f2 + p2 - t * 3.0) * 0.02 +
    Math.sin(u * 6.2832 * f3 + p3 + t) * 0.007;
  ctx.lineJoin = "round";
  for (let k = 0; k < lines; k++) {
    const t = k / lines;
    const hue = Math.abs(Math.sin(t * 3.4 + 0.4));
    const col = mix(pal[1], pal[3], hue);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const u = x / w;
      const y = h * (t * 1.14 - 0.07) + wave(u, t) * h + u * h * skew;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(col, 0.12 + 0.46 * Math.pow(Math.sin(t * 3.14159), 0.55));
    ctx.lineWidth = 1.0 + 3.6 * Math.pow(t, 2.1);
    ctx.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  blob(ctx, w * (0.25 + R() * 0.5), h * (0.25 + R() * 0.5), w * 0.85, pal[2], 0.09, 0.9);
  ctx.restore();
  vignette(ctx, w, h, 0.44);
}

function styleBokeh(ctx, w, h, pal, R) {
  ctx.fillStyle = mix("#000000", pal[0], 0.8);
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < scaled(26, 5); i++) {
    blob(ctx, w * R(), h * R(), w * (0.2 + R() * 0.55), i % 3 ? pal[1] : pal[2], 0.05 + R() * 0.07, 0.8 + R() * 0.5);
  }
  for (let i = 0; i < scaled(120, 12); i++) {
    const r = w * (0.03 + R() * 0.14);
    const x = w * (R() * 1.12 - 0.06);
    const y = h * (R() * 1.06 - 0.03);
    const col = [pal[2], pal[3], pal[1]][(R() * 3) | 0];
    const a = 0.05 + R() * 0.14;
    blob(ctx, x, y, r, col, a, 1, R() < 0.25);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.74, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(col, a * 1.7);
    ctx.lineWidth = 1.4 + R() * 2.8;
    ctx.stroke();
  }
  ctx.restore();
  vignette(ctx, w, h, 0.42);
}

const STYLE_FN = {
  aurora: styleAurora,
  nebula: styleNebula,
  mesh: styleMesh,
  starry: styleStarry,
  matte: styleMatte,
  silk: styleSilk,
  topo: styleTopo,
  bokeh: styleBokeh,
};

/* ------------------------------------------------------------------ entry */

export function renderSpec(spec, w, h, opts) {
  const W = w || FULL_W;
  const H = h || FULL_H;
  const o = opts || {};
  AREA_K = (W * H) / (FULL_W * FULL_H);
  LIN_S = Math.sqrt(AREA_K);
  const c = new OffscreenCanvas(W, H);
  const ctx = c.getContext("2d");
  const R = mulberry(spec.seed);
  ctx.imageSmoothingQuality = "high";
  const fn = STYLE_FN[spec.style] || styleMesh;
  fn(ctx, W, H, spec.colors, R);
  // Grain is what gives these the size of real photographs instead of a few
  // hundred KB of smooth gradient. It stays *soft* (gaussian-ish, soft-light)
  // so it reads as film texture rather than as sensor noise.
  const sigma = Math.max(1.1, (o.grainSigma || 7) * LIN_S);
  grain(ctx, W, H, spec.seed, o.grain === undefined ? 0.28 : o.grain, sigma);
  if (o.vignette !== false) vignette(ctx, W, H, 0.28);
  return c;
}

export function thumbCanvas(fullCanvas, tw, th) {
  const W = tw || THUMB_W;
  const H = th || THUMB_H;
  const c = new OffscreenCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fullCanvas, 0, 0, W, H);
  return c;
}
