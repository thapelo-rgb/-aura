import { capabilities } from "./capabilities.js";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const effects = {
  canvas: null,
  ctx: null,
  dpr: 1,
  w: 0,
  h: 0,
  running: false,
  raf: 0,
  cfg: {},
  fx: { intensity: 1, depth: 1, widgetDepth: 1 },
  enabled: true,
  accent: "#7c9cff",
  accent2: "#b98cff",
  motes: [],
  ripples: [],
  sparks: [],
  pointer: { x: 0, y: 0, has: false, last: 0 },
  glow: { x: 0, y: 0, a: 0 },
  ambientAcc: 0,

  init() {
    this.canvas = document.getElementById("fxCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
    const screen = document.getElementById("screen");
    this._bind(screen);
  },

  _bind(el) {
    el.addEventListener(
      "pointermove",
      (e) => {
        const r = el.getBoundingClientRect();
        this.onMove(e.clientX - r.left, e.clientY - r.top);
      },
      { passive: true }
    );
    el.addEventListener(
      "pointerdown",
      (e) => {
        if (e.target.closest && e.target.closest("#sheet,#sheetBackdrop")) return;
        const r = el.getBoundingClientRect();
        this.onDown(e.clientX - r.left, e.clientY - r.top);
      },
      { passive: true }
    );
    el.addEventListener(
      "touchmove",
      (e) => {
        if (!e.touches[0]) return;
        const r = el.getBoundingClientRect();
        this.onMove(e.touches[0].clientX - r.left, e.touches[0].clientY - r.top);
      },
      { passive: true }
    );
  },

  configure({ cfg, fx, enabled, accent, accent2 }) {
    if (cfg) this.cfg = cfg;
    if (fx) this.fx = fx;
    if (accent) this.accent = accent;
    if (accent2) this.accent2 = accent2;
    if (enabled != null) this.enabled = enabled;
  },

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width || this.canvas.clientWidth || 360);
    this.h = Math.max(1, r.height || this.canvas.clientHeight || 640);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  },

  spawnMote(x, y, o) {
    const speed = o && o.speed != null ? o.speed : 1;
    this.motes.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.5 * speed,
      vy: (Math.random() - 0.5) * 0.5 * speed - 0.12 * speed,
      r: (o && o.r) || 1 + Math.random() * 2.2,
      life: 1,
      decay: (o && o.decay) || 0.006 + Math.random() * 0.01,
      c: Math.random() < 0.35 ? this.accent2 : this.accent,
      tw: Math.random() * Math.PI * 2,
    });
  },

  burst(x, y, n, spread) {
    const count = n || 12;
    const sp = spread || 2.7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const v = sp * (0.4 + Math.random() * 0.9);
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        c: Math.random() < 0.4 ? this.accent2 : this.accent,
      });
    }
  },

  onMove(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.has = true;
    this.pointer.last = performance.now();
    if (!this.enabled || !this.cfg.trail) return;
    const now = performance.now();
    if (this._lastTrail && now - this._lastTrail < 16) return;
    this._lastTrail = now;
    this.spawnMote(x, y, { r: 1 + Math.random() * 2.4, decay: 0.016, speed: 0.6 });
  },

  onDown(x, y) {
    if (!this.enabled) return;
    if (this.cfg.ripple) {
      this.ripples.push({ x, y, r: 4, max: 74 + Math.random() * 30, life: 1, w: 1.6 });
    }
    if (this.cfg.sparkle) this.burst(x, y, 8, 2.2);
  },

  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      this.render();
    };
    this.raf = requestAnimationFrame(tick);
  },

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  },

  clear() {
    this.motes.length = 0;
    this.ripples.length = 0;
    this.sparks.length = 0;
    this.ctx.clearRect(0, 0, this.w, this.h);
  },

  render() {
    const c = this.ctx;
    if (!c) return;
    c.clearRect(0, 0, this.w, this.h);
    const inten = clamp(this.fx.intensity != null ? this.fx.intensity : 1, 0, 2);
    if (!this.enabled || inten <= 0) return;
    const calm = capabilities.reducedMotion ? 0.35 : 1;

    if (this.cfg.ambient) {
      this.ambientAcc += 0.14 * inten * calm;
      while (this.ambientAcc > 1) {
        this.ambientAcc -= 1;
        this.spawnMote(Math.random() * this.w, this.h + 12, {
          r: 0.8 + Math.random() * 2,
          decay: 0.0035 + Math.random() * 0.005,
          speed: 0.5,
        });
      }
    }

    if (this.cfg.glow && this.pointer.has && performance.now() - this.pointer.last < 1600) {
      this.glow.x += (this.pointer.x - this.glow.x) * 0.14;
      this.glow.y += (this.pointer.y - this.glow.y) * 0.14;
      this.glow.a += (1 - this.glow.a) * 0.08;
      const gr = c.createRadialGradient(this.glow.x, this.glow.y, 0, this.glow.x, this.glow.y, 150);
      gr.addColorStop(0, hexA(this.accent, 0.30 * inten * this.glow.a));
      gr.addColorStop(0.5, hexA(this.accent2, 0.10 * inten * this.glow.a));
      gr.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = gr;
      c.fillRect(0, 0, this.w, this.h);
    } else {
      this.glow.a += (0 - this.glow.a) * 0.1;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const p = this.ripples[i];
      p.life -= 0.018;
      p.r += (p.max - p.r) * 0.09;
      if (p.life <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }
      c.beginPath();
      c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      c.lineWidth = p.w * p.life * inten;
      c.strokeStyle = hexA(this.accent, 0.5 * p.life * p.life);
      c.stroke();
      c.beginPath();
      c.arc(p.x, p.y, p.r * 0.62, 0, Math.PI * 2);
      c.lineWidth = 1 * p.life;
      c.strokeStyle = hexA(this.accent2, 0.28 * p.life);
      c.stroke();
    }

    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.life -= m.decay * (2 - inten) * 0.9;
      if (m.life <= 0) {
        this.motes.splice(i, 1);
        continue;
      }
      m.x += m.vx * calm;
      m.y += m.vy * calm;
      m.vy += 0.004;
      m.tw += 0.08;
      c.beginPath();
      c.arc(m.x, m.y, m.r * (0.5 + m.life * 0.5), 0, Math.PI * 2);
      c.fillStyle = hexA(m.c, 0.78 * m.life * inten);
      c.fill();
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= s.decay;
      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx * calm;
      s.y += s.vy * calm;
      s.vx *= 0.95;
      s.vy *= 0.95;
      c.beginPath();
      c.arc(s.x, s.y, 1.6 * s.life, 0, Math.PI * 2);
      c.fillStyle = hexA(s.c, 0.9 * s.life * inten);
      c.fill();
    }
  },
};

export function hexA(hex, a) {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(s, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
