import { THEMES, BACKGROUNDS } from "./config.js";

export function hexA(hex, a) {
  const h = (hex || "#000000").replace("#", "");
  const s = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const n = parseInt(s, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

export function getTheme(state) {
  const base = THEMES.find((t) => t.id === state.theme) || THEMES[0];
  const tune = state.tune || {};
  return {
    id: base.id,
    name: base.name,
    bg: base.bg,
    accent: tune.accent || base.accent,
    accent2: tune.accent2 || base.accent2,
    radius: tune.radius != null ? tune.radius : base.radius,
    blur: tune.blur != null ? tune.blur : base.blur,
    glass: tune.glass != null ? tune.glass : base.glass,
  };
}

export function getBackground(state) {
  return BACKGROUNDS.find((b) => b.id === state.background) || BACKGROUNDS[0];
}

export function applyTheme(state, screen) {
  const el = screen || document.getElementById("screen");
  const t = getTheme(state);
  const s = el.style;
  s.setProperty("--accent", t.accent);
  s.setProperty("--accent-2", t.accent2);
  s.setProperty("--radius", t.radius + "px");
  s.setProperty("--blur", t.blur + "px");
  s.setProperty("--glass", `rgba(11,13,20,${(t.glass / 100).toFixed(3)})`);
  s.setProperty("--glass-2", `rgba(9,11,17,${Math.min(0.92, t.glass / 100 + 0.2).toFixed(3)})`);
  return t;
}

export const ACCENTS = [
  "#7c9cff",
  "#b98cff",
  "#ff9ad5",
  "#ff8f6b",
  "#ffd06b",
  "#63d6a8",
  "#8ce0ff",
  "#cdd6ff",
  "#9aa3b8",
  "#ff6b8a",
];
