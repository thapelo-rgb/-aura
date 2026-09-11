import { makeDefaultState } from "./config.js";

const KEY = "aura.state.v1";

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

function load(appConfig) {
  const fallback = makeDefaultState(appConfig);
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {}
  if (!raw) return fallback;
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return fallback;
  const merged = Object.assign({}, fallback, parsed);
  merged.fx = Object.assign({}, fallback.fx, parsed.fx || {});
  merged.effects = Object.assign({}, fallback.effects, parsed.effects || {});
  merged.weather = Object.assign({}, fallback.weather, parsed.weather || {});
  merged.customAnim = Object.assign({}, fallback.customAnim, parsed.customAnim || {});
  merged.wallpaper = Object.assign({}, fallback.wallpaper, parsed.wallpaper || {});
  if (!Array.isArray(merged.widgets)) merged.widgets = fallback.widgets;
  return merged;
}

export const store = {
  state: null,
  listeners: new Set(),
  appConfig: {},

  init(appConfig) {
    this.appConfig = appConfig || {};
    this.state = load(this.appConfig);
    return this.state;
  },

  get() {
    return this.state;
  },

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  emit() {
    for (const fn of this.listeners) {
      try {
        fn(this.state);
      } catch (e) {
        console.error(e);
      }
    }
  },

  set(patch, opts) {
    Object.assign(this.state, patch);
    this.save();
    if (!opts || opts.emit !== false) this.emit();
  },

  update(fn, opts) {
    fn(this.state);
    this.save();
    if (!opts || opts.emit !== false) this.emit();
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch (e) {}
  },

  reset() {
    this.state = makeDefaultState(this.appConfig);
    this.save();
    this.emit();
  },

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(text) {
    const parsed = safeParse(text);
    if (!parsed || typeof parsed !== "object") return false;
    const base = makeDefaultState(this.appConfig);
    const merged = Object.assign({}, base, parsed);
    merged.fx = Object.assign({}, this.state.fx, parsed.fx || {});
    merged.effects = Object.assign({}, this.state.effects, parsed.effects || {});
    merged.wallpaper = Object.assign({}, base.wallpaper, parsed.wallpaper || {});
    this.state = merged;
    this.save();
    this.emit();
    return true;
  },
};
