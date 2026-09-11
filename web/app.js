import {
  WIDGETS, EFFECTS, ANIM_PRESETS, THEMES, BACKGROUNDS, MODES, ICONS, APP,
} from "./config.js";
import { MARKUP } from "./markup.js";
import { store } from "./store.js";
import {
  capabilities, detect, recommendMode, modeLabel, describe, requestOrientationPermission, watchBattery,
} from "./capabilities.js";
import { engine } from "./engine.js";
import { effects } from "./effects.js";
import { widgets, bindWidgetEvents } from "./widgets.js";
import { animateIn, previewOn, getAnim } from "./animations.js";
import { applyTheme, getTheme, getBackground, hexA, ACCENTS } from "./theme.js";
import { native } from "./native.js";
import * as images from "./images.js";
import * as pack from "./pack-render.js";
import {
  WALLPAPERS, WP_STYLES, wpById, wpFullPath, wpThumbPath, wpColors, wpStyleName,
} from "./wallpapers.js";

const FALLBACK_QUOTES = [
  "Perfection is achieved when there is nothing left to take away.",
  "Make it useful, then make it beautiful.",
  "Motion gives meaning to change.",
];
const EASINGS = [
  ["cubic-bezier(.2,.9,.3,1.2)", "Spring"],
  ["cubic-bezier(.16,1,.3,1)", "Smooth"],
  ["ease-out", "Ease out"],
  ["ease-in-out", "Ease in-out"],
  ["linear", "Linear"],
];

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

let screen;
let layer;
let appCfg = {};
let th = THEMES[0];
let activeMode = "auto";
let sensorGranted = false;

function appConfig() {
  try {
    const r = window.root;
    if (r && typeof r.getAppConfig === "function") {
      const c = r.getAppConfig();
      if (c && typeof c === "object") return c;
    }
  } catch (e) {}
  return APP;
}

function ensureMarkup() {
  if (document.getElementById("screen")) return;
  document.body.insertAdjacentHTML("beforeend", MARKUP);
}

function toast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 1900);
}

/* ---------------- visual + mode ---------------- */

function applyVisual() {
  const s = store.get();
  th = applyTheme(s);
  applyWallpaper();
}

function applyMode() {
  const s = store.get();
  let m = s.mode === "auto" ? recommendMode(capabilities) : s.mode;
  if (
    m === "full" &&
    !capabilities.sensorLive &&
    capabilities.needsOrientationPermission &&
    !sensorGranted
  ) {
    m = "depth";
  }
  if (!capabilities.canvas2d && !capabilities.webgl) m = "static";
  activeMode = m;
  if (screen) screen.dataset.mode = m;

  const cfg = Object.assign({}, s.effects);
  if (m === "static") Object.keys(cfg).forEach((k) => (cfg[k] = false));
  if (m === "effects") {
    cfg.trail = false;
    cfg.glow = false;
    cfg.widgetDepth = false;
  }
  if (m === "full" && !capabilities.sensorLive && !capabilities.pointer) cfg.widgetDepth = false;

  const fx = Object.assign({}, s.fx);
  const inten = m === "static" ? 0 : fx.intensity;
  effects.configure({ cfg, fx: Object.assign({}, fx, { intensity: inten }), enabled: m !== "static", accent: th.accent, accent2: th.accent2 });
  engine.setIntensity(1);
  engine.setSpeed(m === "static" ? 0 : fx.speed);
  if (screen) screen.style.setProperty("--wdepth", cfg.widgetDepth ? String((fx.widgetDepth == null ? 1 : fx.widgetDepth) * 12) : "0");

  if (m === "static") {
    engine.render();
    engine.stop();
    effects.clear();
    effects.stop();
  } else {
    engine.start();
    effects.start();
  }
  const label = modeLabel(m);
  const chip = $("#sbMode");
  if (chip) chip.textContent = label;
  const top = $("#topMode");
  if (top) top.textContent = label;
  updateModeRows();
}

/* ---------------- catalogs ---------------- */

function renderWidgetCatalog() {
  const c = $("#widgetCatalog");
  c.innerHTML = "";
  WIDGETS.forEach((w) => {
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = `<span class="card-badge"></span><span class="card-ico">${ICONS[w.icon] || ""}</span><span class="card-name">${w.name}</span><span class="card-desc">${w.desc}</span>`;
    b.addEventListener("click", () => {
      widgets.add(w.id);
      renderWidgetActive();
      toast(w.name + " added to home");
    });
    c.appendChild(b);
  });
}

function renderWidgetActive() {
  const box = $("#widgetActive");
  const s = store.get();
  const count = $("#widgetCount");
  if (count) count.textContent = String(s.widgets.length);
  box.innerHTML = "";
  if (!s.widgets.length) {
    box.innerHTML = '<p class="lede">Nothing on your home yet. Tap a widget above to add one.</p>';
    return;
  }
  s.widgets.forEach((w) => {
    const def = WIDGETS.find((x) => x.id === w.type) || { name: w.type, icon: "spark" };
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<span class="card-ico">${ICONS[def.icon] || ""}</span><div class="row-main"><div class="row-name">${def.name}</div><div class="row-desc">${Math.round(w.w)} x ${Math.round(w.h)}</div></div><button class="row-remove">&times;</button>`;
    row.querySelector(".row-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      widgets.remove(w.id);
      renderWidgetActive();
    });
    box.appendChild(row);
  });
}

function makeSlider(o) {
  const wrap = document.createElement("div");
  wrap.className = "control";
  const b = document.createElement("b");
  b.textContent = o.format(o.value);
  const head = document.createElement("div");
  head.className = "control-head";
  head.innerHTML = `<span>${o.label}</span>`;
  head.appendChild(b);
  const input = document.createElement("input");
  input.type = "range";
  input.min = o.min;
  input.max = o.max;
  input.step = o.step;
  input.value = o.value;
  input.addEventListener("input", () => {
    const v = parseFloat(input.value);
    b.textContent = o.format(v);
    o.onInput(v);
  });
  wrap.appendChild(head);
  wrap.appendChild(input);
  return wrap;
}

function renderEffectRows() {
  const box = $("#effectRows");
  const s = store.get();
  box.innerHTML = "";
  EFFECTS.forEach((e) => {
    const row = document.createElement("div");
    row.className = "row" + (s.effects[e.id] ? " is-on" : "");
    row.innerHTML = `<div class="row-main"><div class="row-name">${e.name}</div><div class="row-desc">${e.desc}</div></div><div class="row-knob"></div>`;
    row.addEventListener("click", () => {
      const on = !store.get().effects[e.id];
      store.update((st) => (st.effects[e.id] = on));
      if (navigator.vibrate) navigator.vibrate(8);
      row.classList.toggle("is-on", on);
      applyMode();
      if (on && e.id === "ripple") effects.onDown(screen.clientWidth / 2, screen.clientHeight / 2);
    });
    box.appendChild(row);
  });
}

function renderEffectControls() {
  const box = $("#effectControls");
  const s = store.get();
  box.innerHTML = "";
  box.appendChild(
    makeSlider({
      label: "Effect intensity", min: 0.2, max: 2, step: 0.1, value: s.fx.intensity,
      format: (v) => Math.round(v * 100) + "%",
      onInput: (v) => store.update((st) => (st.fx.intensity = v), { emit: false }) || applyMode(),
    })
  );
  box.appendChild(
    makeSlider({
      label: "Depth strength", min: 0, max: 2, step: 0.1, value: s.fx.widgetDepth,
      format: (v) => Math.round(v * 100) + "%",
      onInput: (v) => store.update((st) => (st.fx.widgetDepth = v), { emit: false }) || applyMode(),
    })
  );
  box.appendChild(
    makeSlider({
      label: "Wallpaper speed", min: 0, max: 2, step: 0.1, value: s.fx.speed,
      format: (v) => Math.round(v * 100) + "%",
      onInput: (v) => store.update((st) => (st.fx.speed = v), { emit: false }) || engine.setSpeed(v),
    })
  );
}

function renderAnimPresets() {
  const box = $("#animPresets");
  const s = store.get();
  box.innerHTML = "";
  const all = ANIM_PRESETS.concat([{ id: "custom", name: "Custom", desc: "Your own keyframes" }]);
  all.forEach((p) => {
    const b = document.createElement("button");
    b.className = "card" + (s.animation === p.id ? " is-active" : "");
    b.innerHTML = `<span class="card-badge"></span><span class="card-ico">${ICONS.spark}</span><span class="card-name">${p.name}</span><span class="card-desc">${p.desc}</span>`;
    b.addEventListener("click", () => {
      store.update((st) => (st.animation = p.id));
      renderAnimPresets();
      playWidgetAnim();
      if (p.id === "custom") toast("Editing your custom keyframes");
    });
    box.appendChild(b);
  });
}

function playWidgetAnim() {
  const anim = getAnim(store.get());
  animateIn($$("#widgetLayer .widget"), anim, { stagger: anim.stagger });
}

function renderKeyframeStudio() {
  const box = $("#keyframeStudio");
  const s = store.get();
  const ca = s.customAnim;
  box.innerHTML = "";

  const preview = document.createElement("div");
  preview.className = "studio-preview";
  const demo = document.createElement("div");
  demo.className = "demo";
  preview.appendChild(demo);
  box.appendChild(preview);

  const list = document.createElement("div");
  list.className = "kf-list";
  box.appendChild(list);

  const draw = () => {
    list.innerHTML = "";
    ca.frames.forEach((f, i) => {
      const row = document.createElement("div");
      row.className = "kf";
      const inp = (k, val, step, min, max) =>
        `<label>${k === "opacity" ? "OP" : k === "ty" ? "Y" : k === "scale" ? "SC" : "ROT"}<input type="number" data-k="${k}" step="${step}" min="${min}" max="${max}" value="${val}"></label>`;
      row.innerHTML =
        `<label>at%<input type="number" class="kf-at" data-k="at" min="0" max="100" value="${f.at}"></label>` +
        inp("opacity", f.opacity == null ? 1 : f.opacity, 0.1, 0, 1) +
        inp("ty", f.ty || 0, 1, -100, 100) +
        inp("scale", f.scale == null ? 1 : f.scale, 0.01, 0.2, 2) +
        inp("rot", f.rot || 0, 1, -45, 45) +
        `<button class="kf-del">&times;</button>`;
      row.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
          const v = parseFloat(input.value);
          if (isNaN(v)) return;
          ca.frames[i][input.dataset.k] = v;
          store.update((st) => (st.animation = "custom"), { emit: false });
          store.save();
          renderAnimPresets();
          debouncedPreview(demo);
        });
      });
      row.querySelector(".kf-del").addEventListener("click", () => {
        if (ca.frames.length <= 2) return;
        ca.frames.splice(i, 1);
        store.save();
        store.update((st) => (st.animation = "custom"), { emit: false });
        renderAnimPresets();
        draw();
        debouncedPreview(demo);
      });
      list.appendChild(row);
    });
  };
  draw();

  const add = document.createElement("button");
  add.className = "ghost-btn";
  add.textContent = "+ add keyframe";
  add.addEventListener("click", () => {
    const last = ca.frames[ca.frames.length - 1];
    ca.frames.splice(ca.frames.length - 1, 0, { at: Math.round((ca.frames[ca.frames.length - 2].at + last.at) / 2), opacity: 1, ty: 0, tx: 0, scale: 1, rot: 0, blur: 0 });
    store.save();
    store.update((st) => (st.animation = "custom"), { emit: false });
    renderAnimPresets();
    draw();
  });
  box.appendChild(add);

  const controls = document.createElement("div");
  controls.className = "controls";
  controls.appendChild(
    makeSlider({
      label: "Duration", min: 0, max: 2000, step: 50, value: ca.dur,
      format: (v) => Math.round(v) + "ms",
      onInput: (v) => {
        store.update((st) => ((st.customAnim.dur = v), (st.animation = "custom")), { emit: false });
        store.save();
        renderAnimPresets();
        debouncedPreview(demo);
      },
    })
  );
  controls.appendChild(
    makeSlider({
      label: "Stagger", min: 0, max: 300, step: 10, value: ca.stagger,
      format: (v) => Math.round(v) + "ms",
      onInput: (v) => {
        store.update((st) => ((st.customAnim.stagger = v), (st.animation = "custom")), { emit: false });
        store.save();
      },
    })
  );

  const ec = document.createElement("div");
  ec.className = "control";
  ec.innerHTML = '<div class="control-head"><span>Easing</span></div>';
  const sel = document.createElement("select");
  sel.className = "kf-select";
  EASINGS.forEach(([val, label]) => {
    const o = document.createElement("option");
    o.value = val;
    o.textContent = label;
    if (ca.easing === val) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", () => {
    store.update((st) => ((st.customAnim.easing = sel.value), (st.animation = "custom")), { emit: false });
    store.save();
    renderAnimPresets();
    debouncedPreview(demo);
  });
  ec.appendChild(sel);
  controls.appendChild(ec);
  box.appendChild(controls);
}

let previewTimer = 0;
function debouncedPreview(demo) {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => previewOn(demo, getAnim(store.get())), 120);
}

function renderThemePresets() {
  const box = $("#themePresets");
  const s = store.get();
  box.innerHTML = "";
  THEMES.forEach((t) => {
    const b = document.createElement("button");
    b.className = "card" + (s.theme === t.id && !s.tune.accent ? " is-active" : "") + (s.theme === t.id ? " is-active" : "");
    b.innerHTML = `<span class="card-badge"></span><span class="swatch" style="background:linear-gradient(135deg,${t.accent},${t.accent2})"></span><span class="card-name">${t.name}</span>`;
    b.addEventListener("click", () => {
      store.update((st) => {
        st.theme = t.id;
        st.tune = {};
        st.background = t.bg;
      });
      applyVisual();
      applyMode();
      renderThemePresets();
      renderBgStyles();
      renderThemeControls();
      toast(t.name + " applied");
    });
    box.appendChild(b);
  });
}

function renderBgStyles() {
  const box = $("#bgStyles");
  const s = store.get();
  box.innerHTML = "";
  BACKGROUNDS.forEach((bg) => {
    const b = document.createElement("button");
    b.className = "card" + (s.background === bg.id ? " is-active" : "");
    b.innerHTML = `<span class="card-badge"></span><span class="swatch" style="background:linear-gradient(135deg,${bg.colors[0]},${bg.colors[1]},${bg.colors[2]})"></span><span class="card-name">${bg.name}</span><span class="card-desc">${bg.desc}</span>`;
    b.addEventListener("click", () => {
      store.update((st) => (st.background = bg.id));
      applyVisual();
      renderBgStyles();
    });
    box.appendChild(b);
  });
}

function renderThemeControls() {
  const box = $("#themeControls");
  const s = store.get();
  const t = getTheme(s);
  box.innerHTML = "";
  box.appendChild(
    makeSlider({
      label: "Corner radius", min: 6, max: 34, step: 1, value: t.radius,
      format: (v) => Math.round(v) + "px",
      onInput: (v) => {
        store.update((st) => (st.tune = Object.assign({}, st.tune, { radius: v })), { emit: false });
        applyVisual();
      },
    })
  );
  box.appendChild(
    makeSlider({
      label: "Blur", min: 0, max: 30, step: 1, value: t.blur,
      format: (v) => Math.round(v) + "px",
      onInput: (v) => {
        store.update((st) => (st.tune = Object.assign({}, st.tune, { blur: v })), { emit: false });
        applyVisual();
      },
    })
  );
  box.appendChild(
    makeSlider({
      label: "Glass opacity", min: 30, max: 88, step: 1, value: t.glass,
      format: (v) => Math.round(v) + "%",
      onInput: (v) => {
        store.update((st) => (st.tune = Object.assign({}, st.tune, { glass: v })), { emit: false });
        applyVisual();
      },
    })
  );
  const acc = document.createElement("div");
  acc.className = "control";
  acc.innerHTML = '<div class="control-head"><span>Accent</span></div>';
  const sw = document.createElement("div");
  sw.className = "swatches";
  ACCENTS.forEach((c) => {
    const p = document.createElement("button");
    p.className = "pick" + (t.accent.toLowerCase() === c.toLowerCase() ? " is-sel" : "");
    p.style.background = c;
    p.addEventListener("click", () => {
      store.update((st) => (st.tune = Object.assign({}, st.tune, { accent: c })));
      applyVisual();
      applyMode();
      renderThemeControls();
      $$(".pick", sw).forEach((n) => n.classList.remove("is-sel"));
      p.classList.add("is-sel");
    });
    sw.appendChild(p);
  });
  acc.appendChild(sw);
  box.appendChild(acc);
}

/* ---------------- wallpaper ---------------- */

const WALL_DEFAULTS = {
  kind: "style", id: null, imageKey: null, url: null,
  dim: 0.30, live: 0.0, blur: 0, lock: false, target: "home",
};

// Every async wallpaper load carries a job number; a newer load invalidates an
// older one mid-flight so a slow render can never clobber the current choice.
let wpJob = 0;

function wallState() {
  const w = store.get().wallpaper;
  return w ? Object.assign({}, WALL_DEFAULTS, w) : Object.assign({}, WALL_DEFAULTS);
}

function wpSet(patch, opts) {
  store.update((st) => Object.assign(st.wallpaper, patch), opts);
}

function currentWallpaper() {
  const w = wallState();
  if (w.kind === "builtin" && w.id) {
    const wp = wpById(w.id);
    if (wp) return { kind: "builtin", wp: wp };
  }
  if (w.kind === "custom" && w.imageKey) return { kind: "custom", id: w.imageKey };
  if (w.kind === "remote" && w.url) return { kind: "remote", url: w.url };
  return { kind: "style", style: store.get().background };
}

function scrimNow() {
  const s = $("#bgScrim");
  if (!s) return;
  const w = wallState();
  // The scrim keeps glass widgets readable over a *photo*; the animated shader is
  // already dark, so it gets no scrim.
  s.style.opacity = w.kind === "style" || !w.kind ? "0" : String(w.dim == null ? 0.3 : w.dim);
}

function setLive(v, overImage) {
  const c = $("#bgCanvas");
  if (!c) return;
  c.style.opacity = String(v);
  // Only stack the shader *over* the photo when it is actually contributing;
  // at 0 opacity it would otherwise sit above the image as a dead layer.
  c.style.zIndex = overImage && v > 0 ? "2" : "0";
}

function showShaderStyle() {
  const bg = getBackground(store.get());
  engine.setStyle(bg.id);
  engine.setColors(bg.colors);
  document.body.style.background = bg.colors[0];
  setLive(1, false);
  const img = $("#bgImage");
  if (img) img.classList.remove("is-on");
  const inner = $("#bgImageInner");
  if (inner) { inner.style.backgroundImage = ""; inner.style.filter = ""; }
  scrimNow();
}

/**
 * Paint whatever the current wallpaper choice is. Called from applyVisual(), so
 * every theme/state change flows through here. Never throws: a failed image load
 * falls back to the animated style rather than leaving a black screen.
 */
async function applyWallpaper() {
  const job = ++wpJob;
  const w = wallState();
  const img = $("#bgImage");
  const inner = $("#bgImageInner");
  const scrim = $("#bgScrim");
  const canvas = $("#bgCanvas");
  if (!img || !canvas) return;

  if (w.kind === "style" || !w.kind) {
    showShaderStyle();
    return;
  }

  let src = "";
  if (w.kind === "custom" && w.imageKey) {
    try { src = await images.url(w.imageKey, "full"); } catch (e) { src = ""; }
  } else if (w.kind === "remote" && w.url) {
    src = w.url;
  } else if (w.kind === "builtin" && w.id) {
    const wp = wpById(w.id);
    if (wp) {
      const cols = wpColors(wp);
      engine.setStyle(/star/i.test(wp.style) ? "stars" : "aurora");
      engine.setColors([cols[0], cols[1], cols[2]]);
      document.body.style.background = cols[0];
      if (native.available) {
        src = wpFullPath(wp);
      } else {
        try { src = await pack.renderPackUrl(wp, 1080, 2340, 0.86); } catch (e) { src = ""; }
      }
    }
  }
  if (job !== wpJob) return;

  if (!src) { showShaderStyle(); return; }

  if (inner) {
    inner.style.backgroundImage = `url("${String(src).replace(/"/g, "%22")}")`;
    inner.style.filter = w.blur ? `blur(${w.blur}px)` : "";
  }
  img.classList.add("is-on");
  setLive(w.live || 0, true);
  scrimNow();
}

function wpLabel(cur) {
  const bg = getBackground(store.get());
  if (cur.kind === "builtin") return { name: cur.wp.name, sub: wpStyleName(cur.wp.style) + " \u00b7 " + cur.wp.palette };
  if (cur.kind === "custom") return { name: "My photo", sub: "From your gallery \u00b7 stored on this phone" };
  if (cur.kind === "remote") return { name: "Linked image", sub: "Loaded from its link" };
  return { name: "Animated " + bg.name, sub: "Live shader wallpaper \u2014 always moving" };
}

async function renderWpCurrent() {
  const box = $("#wpCurrent");
  if (!box) return;
  const cur = currentWallpaper();
  const bg = getBackground(store.get());
  const info = wpLabel(cur);
  box.innerHTML =
    `<div class="wp-thumb" id="wpCurThumb" style="background:linear-gradient(160deg,${bg.colors[0]},${bg.colors[1]},${bg.colors[2]})"></div>` +
    `<div class="wp-meta"><div class="wp-name">${esc(info.name)}</div><div class="wp-sub">${esc(info.sub)}</div>` +
    `<div class="wp-acts" id="wpCurActs"></div></div>`;
  const acts = $("#wpCurActs");
  if (native.available && acts) {
    const b = document.createElement("button");
    b.className = "ghost-btn";
    b.textContent = "set as Android wallpaper";
    b.addEventListener("click", systemWallpaper);
    acts.appendChild(b);
  }
  if (cur.kind === "custom" && acts) {
    const b = document.createElement("button");
    b.className = "ghost-btn";
    b.textContent = "remove";
    b.addEventListener("click", async () => {
      await images.remove(cur.id);
      if (wallState().imageKey === cur.id) wpSet({ kind: "style", imageKey: null });
      applyWallpaper();
      renderWallpaperView();
      toast("Photo removed");
    });
    acts.appendChild(b);
  }
  fillWpCurrentThumb(cur);
}

async function fillWpCurrentThumb(cur) {
  const el = $("#wpCurThumb");
  if (!el) return;
  let src = "";
  try {
    if (cur.kind === "custom") src = await images.url(cur.id, "thumb");
    else if (cur.kind === "remote") src = cur.url;
    else if (cur.kind === "builtin") {
      src = native.available ? wpThumbPath(cur.wp) : await pack.renderPackUrl(cur.wp, 130, 230, 0.8);
    }
  } catch (e) {}
  if (src && el.isConnected) el.style.backgroundImage = `url("${String(src).replace(/"/g, "%22")}")`;
}

function renderWpStyles() {
  const box = $("#wpStyles");
  if (!box) return;
  const s = store.get();
  const cur = wallState();
  box.innerHTML = "";
  BACKGROUNDS.forEach((bg) => {
    const active = (cur.kind === "style" || !cur.kind) && s.background === bg.id;
    const b = document.createElement("button");
    b.className = "card" + (active ? " is-active" : "");
    b.innerHTML = `<span class="card-badge"></span><span class="swatch" style="background:linear-gradient(135deg,${bg.colors[0]},${bg.colors[1]},${bg.colors[2]})"></span><span class="card-name">${bg.name}</span><span class="card-desc">${bg.desc}</span>`;
    b.addEventListener("click", () => {
      store.update((st) => {
        st.background = bg.id;
        st.wallpaper.kind = "style";
        st.wallpaper.id = null;
        st.wallpaper.imageKey = null;
      });
      applyWallpaper();
      renderWpStyles();
      renderWpCurrent();
      renderBgStyles();
      toast(bg.name + " applied");
    });
    box.appendChild(b);
  });
}

let packTab = "all";
let packShown = 18;
const PACK_PAGE = 18;

function packList() {
  if (packTab === "all") return WALLPAPERS;
  return WALLPAPERS.filter((w) => w.style === packTab || w.tag === packTab);
}

function renderWpFilter() {
  const box = $("#wpFilter");
  if (!box || box.dataset.built) return;
  box.dataset.built = "1";
  const tabs = [{ id: "all", name: "All" }].concat(WP_STYLES);
  box.innerHTML = tabs
    .map((t) => `<button class="chip${t.id === packTab ? " is-active" : ""}" data-tab="${esc(t.id)}">${esc(t.name)}</button>`)
    .join("");
  $$(".chip", box).forEach((b) =>
    b.addEventListener("click", () => {
      packTab = b.dataset.tab;
      packShown = PACK_PAGE;
      $$(".chip", box).forEach((x) => x.classList.toggle("is-active", x === b));
      renderWpPack();
    })
  );
}

function renderWpPack() {
  const box = $("#wpPack");
  if (!box) return;
  const list = packList();
  const shown = list.slice(0, packShown);
  const cur = wallState();
  const count = $("#wpPackCount");
  if (count) count.textContent = list.length + (list.length === 1 ? " design" : " designs");
  box.innerHTML = shown
    .map((wp) => {
      const active = cur.kind === "builtin" && cur.id === wp.id;
      return `<button class="wp-tile${active ? " is-active" : ""}" data-id="${esc(wp.id)}">` +
        `<span class="wp-tile-bg"></span><span class="wp-skel"></span>` +
        `<span class="wp-cap">${esc(wp.name)}</span></button>`;
    })
    .join("");
  $$(".wp-tile", box).forEach((t) =>
    t.addEventListener("click", () => {
      const wp = wpById(t.dataset.id);
      if (!wp) return;
      wpSet({ kind: "builtin", id: wp.id, imageKey: null, url: null });
      applyWallpaper();
      renderWpCurrent();
      $$(".wp-tile", box).forEach((x) => x.classList.toggle("is-active", x === t));
      toast(wp.name + " set");
    })
  );
  const more = $("#wpMoreBtn");
  if (more) more.hidden = packShown >= list.length;
  fillPackThumbs(box);
}

/**
 * Fill in pack thumbnails. In the APK the JPEGs are real assets, so this is just a
 * src swap. In the browser build they are re-rendered (see pack-render.js) three at
 * a time so the tile tap handlers stay responsive while the grid fills in.
 */
function fillPackThumbs(box) {
  const tiles = $$(".wp-tile[data-id]", box).filter((t) => !!$(".wp-skel", t));
  if (!tiles.length) return;
  const paint = (tile, url) => {
    const bg = $(".wp-tile-bg", tile);
    if (bg && url) bg.style.backgroundImage = `url("${String(url).replace(/"/g, "%22")}")`;
    const skel = $(".wp-skel", tile);
    if (skel) skel.remove();
  };
  if (native.available) {
    tiles.forEach((t) => {
      const wp = wpById(t.dataset.id);
      if (wp) paint(t, wpThumbPath(wp));
    });
    return;
  }
  const queue = tiles.slice();
  const runners = Math.min(3, queue.length);
  for (let i = 0; i < runners; i++) {
    (async () => {
      while (queue.length) {
        const tile = queue.shift();
        const wp = wpById(tile.dataset.id);
        if (!wp || !tile.isConnected) { const s = $(".wp-skel", tile); if (s) s.remove(); continue; }
        const url = await pack.renderPackUrl(wp, 300, 650, 0.82);
        paint(tile, url);
      }
    })();
  }
}

let mineFileInput = null;

function ensureFileInput() {
  if (mineFileInput) return mineFileInput;
  mineFileInput = document.createElement("input");
  mineFileInput.type = "file";
  mineFileInput.accept = "image/*";
  mineFileInput.multiple = true;
  mineFileInput.style.display = "none";
  mineFileInput.addEventListener("change", () => {
    const files = Array.from(mineFileInput.files || []);
    mineFileInput.value = "";
    importBlobs(files);
  });
  document.body.appendChild(mineFileInput);
  return mineFileInput;
}

async function importBlobs(files) {
  if (!files || !files.length) return;
  toast("Adding " + files.length + (files.length > 1 ? " photos\u2026" : " photo\u2026"));
  const added = await images.addBlobs(files, { src: "gallery" });
  if (added.length) {
    wpSet({ kind: "custom", imageKey: added[0].id, id: null, url: null });
    applyWallpaper();
  }
  renderWpMine();
  renderWpCurrent();
  toast(added.length ? "Added " + added.length : "Couldn't read that image");
}

async function addFromGallery() {
  if (!native.available) {
    ensureFileInput().click();
    return;
  }
  let picks = [];
  try {
    picks = await native.pickImage(6);
  } catch (e) {
    toast("Picker closed");
    return;
  }
  const arr = Array.isArray(picks) ? picks : [];
  if (!arr.length) return;
  toast("Adding " + arr.length + (arr.length > 1 ? " photos\u2026" : " photo\u2026"));
  const added = [];
  for (const p of arr) {
    try { added.push(await images.addUrl(p.url, { name: p.name, src: "gallery" })); } catch (e) {}
  }
  if (added.length) {
    wpSet({ kind: "custom", imageKey: added[0].id, id: null, url: null });
    applyWallpaper();
  }
  renderWpMine();
  renderWpCurrent();
  toast(added.length ? "Added " + added.length : "Couldn't read those photos");
}

function renderWpMine() {
  const grid = $("#wpMineGrid");
  const empty = $("#wpMineEmpty");
  const addBtn = $("#wpAddBtn");
  const fileBtn = $("#wpFileBtn");
  if (!grid) return;
  if (addBtn) addBtn.hidden = !native.available;
  if (fileBtn) fileBtn.hidden = !!native.available;
  images.list().then((items) => {
    if (!grid.isConnected) return;
    grid.innerHTML = "";
    if (empty) empty.hidden = items.length > 0;
    if (addBtn) addBtn.textContent = items.length ? "add more" : "add from gallery";
    const cur = wallState();
    items.forEach((it) => {
      const t = document.createElement("button");
      t.className = "wp-tile" + (cur.kind === "custom" && cur.imageKey === it.id ? " is-active" : "");
      t.innerHTML = `<span class="wp-tile-bg"></span><span class="wp-cap">${esc(it.name)}</span><span class="wp-del" role="button" aria-label="Delete">&times;</span>`;
      t.addEventListener("click", () => {
        wpSet({ kind: "custom", imageKey: it.id, id: null, url: null });
        applyWallpaper();
        $$(".wp-tile", grid).forEach((x) => x.classList.toggle("is-active", x === t));
        renderWpCurrent();
        toast("Wallpaper set");
      });
      t.querySelector(".wp-del").addEventListener("click", async (e) => {
        e.stopPropagation();
        await images.remove(it.id);
        if (wallState().imageKey === it.id) {
          wpSet({ kind: "style", imageKey: null });
          applyWallpaper();
        }
        renderWpMine();
        renderWpCurrent();
        toast("Photo removed");
      });
      grid.appendChild(t);
      images.url(it.id, "thumb").then((u) => {
        const b = t.querySelector(".wp-tile-bg");
        if (b && u) b.style.backgroundImage = `url("${String(u).replace(/"/g, "%22")}")`;
      });
    });
  });
}

async function addFromLink() {
  const input = $("#wpUrlInput");
  const note = $("#wpUrlNote");
  const url = input ? input.value.trim() : "";
  if (!/^https?:\/\//i.test(url)) {
    if (note) note.textContent = "Paste a full image link that starts with http.";
    return;
  }
  if (note) note.textContent = "Fetching\u2026";
  try {
    let rec;
    if (native.available) {
      // The APK has no CORS proxy, but Java's HTTP stack isn't subject to CORS:
      // download natively, then read the bytes back from the same-origin /cache/ URL.
      const got = await native.fetchImage(url);
      rec = await images.addUrl(got.url, { src: "link", name: got.name });
    } else {
      rec = await images.addUrl(url, { src: "link" });
    }
    if (note) note.textContent = "";
    if (input) input.value = "";
    wpSet({ kind: "custom", imageKey: rec.id, id: null, url: null });
    applyWallpaper();
    renderWpMine();
    renderWpCurrent();
    toast("Linked image saved");
  } catch (e) {
    if (e && e.message === "cors") {
      // Most hosts (Pinterest included) block pixel readback but will still let
      // the image *display*. Use it directly; it just won't work offline.
      wpSet({ kind: "remote", url: url, id: null, imageKey: null });
      applyWallpaper();
      renderWpCurrent();
      if (note) note.textContent = "Showing the link directly. It won't be available offline, and some hosts block hotlinking.";
      toast("Using the link directly");
    } else if (note) {
      note.textContent = "Couldn't read that image.";
    }
  }
}

function renderWpControls() {
  const box = $("#wpControls");
  if (!box) return;
  const w = wallState();
  const imageKind = w.kind !== "style";
  box.innerHTML = "";
  box.appendChild(
    makeSlider({
      label: "Dim", min: 0, max: 0.75, step: 0.05, value: w.dim,
      format: (v) => Math.round(v * 100) + "%",
      onInput: (v) => { wpSet({ dim: v }, { emit: false }); scrimNow(); },
    })
  );
  box.appendChild(
    makeSlider({
      label: "Live motion over image", min: 0, max: 1, step: 0.05, value: w.live,
      format: (v) => Math.round(v * 100) + "%",
      onInput: (v) => {
        wpSet({ live: v }, { emit: false });
        setLive(v, true);
      },
    })
  );
  box.appendChild(
    makeSlider({
      label: "Blur", min: 0, max: 24, step: 1, value: w.blur,
      format: (v) => Math.round(v) + "px",
      onInput: (v) => {
        wpSet({ blur: v }, { emit: false });
        const i = $("#bgImageInner");
        if (i) i.style.filter = v ? `blur(${v}px)` : "";
      },
    })
  );

  const t = document.createElement("div");
  t.className = "control";
  t.innerHTML = '<div class="control-head"><span>Set as Android wallpaper</span></div>';
  const chips = document.createElement("div");
  chips.className = "chips";
  [["home", "Home"], ["lock", "Lock"], ["both", "Both"]].forEach((pair) => {
    const b = document.createElement("button");
    b.className = "chip" + (w.target === pair[0] ? " is-active" : "");
    b.textContent = pair[1];
    b.addEventListener("click", () => {
      wpSet({ target: pair[0] });
      $$(".chip", chips).forEach((x) => x.classList.toggle("is-active", x === b));
    });
    chips.appendChild(b);
  });
  t.appendChild(chips);
  box.appendChild(t);

  if (!imageKind) {
    const note = document.createElement("div");
    note.className = "wp-note";
    note.textContent = "These controls apply to a photo wallpaper. Pick a built-in design or one of your own photos to use them.";
    box.appendChild(note);
  } else {
    const r = document.createElement("button");
    r.className = "ghost-btn";
    r.textContent = "reset look";
    r.style.marginTop = "10px";
    r.addEventListener("click", () => {
      wpSet({ dim: 0.30, live: 0.0, blur: 0 });
      applyWallpaper();
      renderWpControls();
    });
    box.appendChild(r);
  }
}

async function renderHomeCard(rowEl) {
  if (!rowEl) return;
  rowEl.innerHTML = "";
  let isDefault = false;
  try { isDefault = await native.isDefaultHome(); } catch (e) {}
  const r = document.createElement("div");
  r.className = "row" + (isDefault ? " is-on" : "");
  r.innerHTML = `<div class="row-main"><div class="row-name">Use AURA as home</div>` +
    `<div class="row-desc">${isDefault ? "AURA is your home screen" : "Opens Android's home-app picker"}</div></div>`;
  if (isDefault) {
    r.innerHTML += '<div class="row-knob"></div>';
  } else {
    const b = document.createElement("button");
    b.className = "ghost-btn";
    b.textContent = "set";
    b.addEventListener("click", () => {
      native.openHomeSettings().catch(() => {});
      toast("Choose AURA");
    });
    r.appendChild(b);
  }
  rowEl.appendChild(r);
}

function renderWpHome() {
  const head = $("#wpHomeHead");
  const row = $("#wpHomeRow");
  if (!head || !row) return;
  head.hidden = !native.available;
  row.hidden = !native.available;
  if (native.available) renderHomeCard(row);
}

async function renderSheetHome() {
  const block = $("#sheetHomeBlock");
  const row = $("#sheetHomeRow");
  if (!block || !row) return;
  block.hidden = !native.available;
  if (native.available) await renderHomeCard(row);
}

/** Hand the current wallpaper to Android's own wallpaper manager. */
async function systemWallpaper() {
  if (!native.available) return;
  const cur = currentWallpaper();
  toast("Preparing\u2026");
  let dataUrl = "";
  try {
    if (cur.kind === "custom") {
      dataUrl = await images.toDataUrl(cur.id);
    } else if (cur.kind === "builtin") {
      if (native.available) {
        const blob = await fetch(wpFullPath(cur.wp)).then((r) => r.blob());
        dataUrl = await images.blobToDataUrl(blob);
      } else {
        const blob = await pack.renderPackBlob(cur.wp, 1440, 3120, 0.9);
        dataUrl = await images.blobToDataUrl(blob);
      }
    } else if (cur.kind === "remote") {
      // Pasted links are often on hosts that block CORS (Pinterest), which is
      // exactly why they were stored as a link in the first place — go through
      // the native downloader (APK) or super-fetch (web) so the pixels are readable.
      let srcUrl = cur.url;
      if (native.available) {
        const got = await native.fetchImage(cur.url);
        srcUrl = got.url;
      }
      const fetcher = images.remoteFetch();
      const blob = await fetcher(srcUrl).then((r) => r.blob());
      dataUrl = await images.blobToDataUrl(blob);
    } else {
      const c = $("#bgCanvas");
      if (c && c.toDataURL) dataUrl = c.toDataURL("image/jpeg", 0.92);
    }
  } catch (e) {
    dataUrl = "";
  }
  if (!dataUrl) {
    toast("Couldn't prepare that image");
    return;
  }
  toast("Setting wallpaper\u2026");
  try {
    await native.setWallpaper(dataUrl, wallState().target || "home");
    toast("Android wallpaper set");
  } catch (e) {
    toast("Android wouldn't accept it");
  }
}

function renderWallpaperView() {
  renderWpCurrent();
  renderWpStyles();
  renderWpFilter();
  renderWpPack();
  renderWpMine();
  renderWpControls();
  renderWpHome();
}

/* ---------------- app drawer ---------------- */

let appList = null;
let appLoading = false;
let appFilter = "";
const appIcons = new Map();

function renderAppsView() {
  const grid = $("#appGrid");
  const empty = $("#appEmpty");
  const count = $("#appCount");
  if (!grid) return;
  if (!native.available) {
    grid.innerHTML = "";
    if (count) count.textContent = "";
    if (empty) {
      empty.hidden = false;
      empty.textContent = "The app drawer is part of the Android build. In the browser this is a preview of the home screen.";
    }
    return;
  }
  if (appList) { drawApps(); return; }
  if (appLoading) return;
  appLoading = true;
  grid.innerHTML = '<p class="lede">Reading your apps\u2026</p>';
  native.apps()
    .then((list) => {
      appList = (Array.isArray(list) ? list : []).slice().sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || "")));
      appLoading = false;
      drawApps();
    })
    .catch(() => {
      appLoading = false;
      grid.innerHTML = "";
      if (empty) { empty.hidden = false; empty.textContent = "Couldn't read the app list."; }
    });
}

function drawApps() {
  const grid = $("#appGrid");
  const empty = $("#appEmpty");
  const count = $("#appCount");
  if (!grid || !appList) return;
  const q = appFilter.trim().toLowerCase();
  const items = q
    ? appList.filter((a) => String(a.label || "").toLowerCase().includes(q) || String(a.pkg || "").toLowerCase().includes(q))
    : appList;
  if (count) count.textContent = items.length + (q ? " of " + appList.length : "");
  grid.innerHTML = "";
  if (empty) {
    empty.hidden = items.length > 0;
    empty.textContent = appList.length ? "No apps match that." : "No apps found.";
  }
  const frag = document.createDocumentFragment();
  items.forEach((a) => {
    const t = document.createElement("button");
    t.className = "app-tile";
    t.innerHTML = `<span class="app-ico" data-pkg="${esc(a.pkg)}">${ICONS.spark}</span><span class="app-name">${esc(a.label)}</span>`;
    t.addEventListener("click", () => {
      native.launch(a.pkg, a.cls).catch(() => toast("Couldn't open " + a.label));
      if (navigator.vibrate) navigator.vibrate(8);
    });
    t.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      native.openAppInfo(a.pkg).catch(() => {});
    });
    frag.appendChild(t);
  });
  grid.appendChild(frag);
  lazyAppIcons(grid);
}

let iconTimer = 0;
let iconQueue = [];
let iconRunning = false;

function lazyAppIcons(grid) {
  if (!grid) return;
  const box = grid.getBoundingClientRect();
  const pending = $$(".app-ico[data-pkg]:not(.is-loaded)", grid);
  const visible = pending.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > box.top - 400 && r.top < box.bottom + 400;
  });
  // Scrolling near an icon loads it — no IntersectionObserver (which can stall
  // inside some WebViews), just a cheap bounding-box test on scroll.
  const scroller = $("#view-apps .scroll");
  if (scroller && !scroller.dataset.iconBound) {
    scroller.dataset.iconBound = "1";
    scroller.addEventListener("scroll", () => {
      clearTimeout(iconTimer);
      iconTimer = setTimeout(() => lazyAppIcons($("#appGrid") || grid), 70);
    }, { passive: true });
  }
  if (visible.length) {
    visible.forEach((el) => { if (iconQueue.indexOf(el) < 0) iconQueue.push(el); });
    if (!iconRunning) runIconQueue();
  }
}

function runIconQueue() {
  iconRunning = true;
  (async () => {
    while (iconQueue.length) {
      const el = iconQueue.shift();
      if (!el || !el.isConnected) continue;
      const pkg = el.dataset.pkg;
      let url = appIcons.get(pkg);
      if (url === undefined) {
        try { url = await native.icon(pkg); } catch (e) { url = ""; }
        appIcons.set(pkg, url || "");
      }
      if (url && el.isConnected) {
        el.innerHTML = `<img alt="" src="${url}">`;
        el.classList.add("is-loaded");
      } else {
        el.classList.add("is-loaded");
      }
    }
    iconRunning = false;
  })();
}

/* ---------------- settings ---------------- */

function renderCompat() {
  const box = $("#compatPanel");
  const rows = describe(capabilities);
  box.innerHTML = '<div class="compat-grid">' + rows
    .map((r) => `<div class="compat ${r.ok ? "" : "no"}"><span class="cdot"></span><div><div>${r.name}</div><div class="row-desc">${r.detail}</div></div></div>`)
    .join("") + "</div>";
  if (capabilities.needsOrientationPermission && !sensorGranted) {
    const b = document.createElement("button");
    b.className = "ghost-btn";
    b.style.marginTop = "10px";
    b.textContent = "Enable tilt sensors";
    b.addEventListener("click", async () => {
      const ok = await requestOrientationPermission();
      sensorGranted = ok;
      if (ok) {
        engine.startSensors();
        capabilities.sensorLive = true;
      }
      renderCompat();
      applyMode();
      toast(ok ? "Tilt sensors enabled" : "Permission denied - using depth mode");
    });
    box.appendChild(b);
  }
}

function renderModeRows() {
  const box = $("#modeRows");
  box.innerHTML = "";
  MODES.forEach((m) => {
    const row = document.createElement("div");
    row.className = "row" + (store.get().mode === m.id ? " is-on" : "");
    row.dataset.mode = m.id;
    row.innerHTML = `<div class="row-main"><div class="row-name">${m.name}</div><div class="row-desc">${m.desc}</div></div><div class="row-knob"></div>`;
    row.addEventListener("click", () => {
      store.update((st) => (st.mode = m.id));
      applyMode();
      renderModeRows();
    });
    box.appendChild(row);
  });
}

function updateModeRows() {
  $$("#modeRows .row").forEach((r) => {
    const on = store.get().mode === r.dataset.mode;
    r.classList.toggle("is-on", on);
  });
}

function renderAbout() {
  const box = $("#aboutPanel");
  box.innerHTML = `<b>${appCfg.name || "AURA"}</b> ${appCfg.version || "0.1.0"}<br>
  A customization studio: animated wallpapers, floating widgets, micro-effects and motion design.<br><br>
  Mode in use: <b>${modeLabel(activeMode)}</b>${activeMode !== store.get().mode ? ` (auto-selected)` : ""}.<br>
  Everything is stored on this device only. No account, no cloud.<br><br>
  To install as an app: see the build notes in the source (src/README.md). This page works offline once loaded and can be wrapped into an APK.`;
}

/* ---------------- nav + sheet ---------------- */

function switchView(name) {
  $$("#nav .nav-btn").forEach((b) => b.classList.toggle("is-active", b.dataset.view === name));
  $$(".view").forEach((v) => v.classList.toggle("is-active", v.dataset.view === name));
  const view = $(`#view-${name}`);
  if (view) {
    const anim = getAnim(store.get());
    const kids = $$(".topbar, .scroll > *", view).slice(0, 14);
    if (name !== "home") animateIn(kids, anim, { stagger: Math.min(anim.stagger || 60, 60) });
  }
  if (name === "widgets") renderWidgetActive();
  if (name === "wallpaper") renderWallpaperView();
  if (name === "apps") renderAppsView();
  if (name === "theme") {
    renderThemePresets();
    renderBgStyles();
    renderThemeControls();
  }
}

function openSheet() {
  $("#sheet").hidden = false;
  $("#sheetBackdrop").hidden = false;
  renderCompat();
  renderModeRows();
  renderSheetHome();
  renderAbout();
}
function closeSheet() {
  $("#sheet").hidden = true;
  $("#sheetBackdrop").hidden = true;
}

/* ---------------- export / import ---------------- */

function snapshot() {
  const s = store.get();
  return {
    theme: s.theme, background: s.background, tune: s.tune, effects: s.effects, fx: s.fx,
    widgets: s.widgets, animation: s.animation, customAnim: s.customAnim, wallpaper: s.wallpaper,
  };
}

function doExport() {
  const blob = new Blob([store.exportJSON()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "aura-theme.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast("Theme exported");
}

function doImport() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (store.importJSON(String(reader.result))) {
        refreshAll();
        toast("Theme imported");
      } else {
        toast("Could not read that file");
      }
    };
    reader.readAsText(f);
  });
  input.click();
}

function b64encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16))))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64decode(str) {
  const s = str.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(Array.prototype.map.call(atob(s + "===".slice((s.length + 3) % 4)), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
}

async function doShare() {
  const url = `https://perchance.org/${window.generatorName || ""}#aura=${b64encode(JSON.stringify(snapshot()))}`;
  try {
    await navigator.clipboard.writeText(url);
    toast("Share link copied");
  } catch (e) {
    toast("Copy failed - link logged");
    console.log(url);
  }
}

function importFromHash() {
  const m = location.hash.match(/aura=([A-Za-z0-9_-]+)/);
  if (!m) return false;
  try {
    if (store.importJSON(b64decode(m[1]))) {
      refreshAll();
      toast("Theme loaded from link");
      return true;
    }
  } catch (e) {}
  return false;
}

/* ---------------- status bar ---------------- */

function tickStatus() {
  const el = $("#sbTime");
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function updateBattery() {
  const el = $("#sbBattery");
  if (!el) return;
  el.textContent = capabilities.batteryLevel == null ? "--%" : Math.round(capabilities.batteryLevel * 100) + "%";
}

/* ---------------- boot ---------------- */

function refreshAll() {
  applyVisual();
  applyMode();
  widgets.refresh();
  renderWidgetCatalog();
  renderWidgetActive();
  renderEffectRows();
  renderEffectControls();
  renderAnimPresets();
  renderKeyframeStudio();
  renderThemePresets();
  renderBgStyles();
  renderThemeControls();
  renderCompat();
  renderModeRows();
  renderAbout();
}

function probeSensors() {
  let got = false;
  const handler = () => {
    got = true;
    capabilities.sensorLive = true;
    engine.sensor.active = true;
    engine.sensor.last = performance.now();
  };
  window.addEventListener("deviceorientation", handler, true);
  setTimeout(() => {
    window.removeEventListener("deviceorientation", handler, true);
    if (!got) capabilities.sensorLive = capabilities.sensorLive || false;
    applyMode();
    renderCompat();
    renderAbout();
    if (store.get().mode === "auto") {
      const m = activeMode;
      if (m === "depth") toast("No tilt sensors - Depth mode active");
      else if (m === "effects") toast("Effects mode active");
    }
  }, 1600);
}

function boot() {
  ensureMarkup();
  document.documentElement.classList.toggle("is-native", native.available);
  screen = $("#screen");
  layer = $("#widgetLayer");
  appCfg = appConfig();

  detect();
  store.init(appCfg);
  applyVisual();

  engine.init($("#bgCanvas"));
  engine.startSensors();
  engine.startPointer(screen);
  engine.setStyle(store.get().background);
  engine.setColors(getBackground(store.get()).colors);
  engine.start();

  effects.init();
  effects.start();

  widgets.mount(layer, {
    quotes: appCfg.quotes || FALLBACK_QUOTES,
    getBattery: () => capabilities.batteryLevel,
    onActiveChange: renderWidgetActive,
    onOverflow: () => toast("Home is full - drag widgets apart"),
  });
  bindWidgetEvents();

  $$("#nav .nav-btn").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
  $$("#dock .dock-btn").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.dock)));
  $("#settingsBtn").addEventListener("click", openSheet);
  $("#sheetClose").addEventListener("click", closeSheet);
  $("#sheetBackdrop").addEventListener("click", closeSheet);
  $("#clearWidgetsBtn").addEventListener("click", () => {
    widgets.clear();
    renderWidgetActive();
    toast("Home cleared");
  });
  $("#animPlayBtn").addEventListener("click", () => {
    previewOn($("#keyframeStudio .demo"), getAnim(store.get()));
    playWidgetAnim();
  });
  $("#exportBtn").addEventListener("click", doExport);
  $("#importBtn").addEventListener("click", doImport);
  $("#shareLinkBtn").addEventListener("click", doShare);
  $("#resetBtn").addEventListener("click", () => {
    store.reset();
    closeSheet();
    refreshAll();
    toast("Reset to defaults");
  });

  /* ----- wallpaper view ----- */
  const themeWpBtn = $("#themeWallpaperBtn");
  if (themeWpBtn) themeWpBtn.addEventListener("click", () => switchView("wallpaper"));

  const seg = $("#wpSeg");
  if (seg) {
    const panes = { builtin: "wpPaneBuiltin", mine: "wpPaneMine", link: "wpPaneLink" };
    $$(".seg-btn", seg).forEach((b) =>
      b.addEventListener("click", () => {
        $$(".seg-btn", seg).forEach((x) => x.classList.toggle("is-active", x === b));
        const want = b.dataset.src;
        Object.keys(panes).forEach((k) => {
          const p = $("#" + panes[k]);
          if (p) p.hidden = k !== want;
        });
        if (want === "builtin") { renderWpStyles(); renderWpPack(); }
        if (want === "mine") renderWpMine();
      })
    );
  }

  const wpAddBtn = $("#wpAddBtn");
  if (wpAddBtn) wpAddBtn.addEventListener("click", addFromGallery);
  const wpFileBtn = $("#wpFileBtn");
  if (wpFileBtn) wpFileBtn.addEventListener("click", () => ensureFileInput().click());
  const wpMoreBtn = $("#wpMoreBtn");
  if (wpMoreBtn) wpMoreBtn.addEventListener("click", () => { packShown += PACK_PAGE; renderWpPack(); });
  const wpUrlBtn = $("#wpUrlBtn");
  if (wpUrlBtn) wpUrlBtn.addEventListener("click", addFromLink);
  const wpUrlInput = $("#wpUrlInput");
  if (wpUrlInput) wpUrlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addFromLink(); });

  /* ----- app drawer ----- */
  const appSearch = $("#appSearch");
  if (appSearch) appSearch.addEventListener("input", () => {
    appFilter = appSearch.value;
    if (appList) drawApps();
  });

  /* ----- native shell events ----- */
  window.addEventListener("aura:native", (e) => {
    const d = (e && e.detail) || {};
    if (d.name === "home") {
      closeSheet();
      switchView("home");
    }
    if (d.name === "resume") {
      if (appList) { appList = null; appIcons.clear(); if ($(".view.is-active") && $(".view.is-active").dataset.view === "apps") renderAppsView(); }
      renderWpHome();
    }
  });
  if (native.available) {
    native.info().then((i) => console.log("[AURA] native shell", i)).catch(() => {});
  }

  /* ----- swipe up from the bottom of Home to open apps ----- */
  const homeView = $("#view-home");
  if (homeView) {
    let sx = 0, sy = 0, st = 0, tracking = false;
    homeView.addEventListener("touchstart", (e) => {
      const t = e.touches && e.touches[0];
      tracking = false;
      if (!t) return;
      if (e.target && e.target.closest && e.target.closest(".widget")) return;
      const r = homeView.getBoundingClientRect();
      if (t.clientY < r.bottom - 160) return;
      tracking = true;
      sx = t.clientX; sy = t.clientY; st = Date.now();
    }, { passive: true });
    homeView.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      const dy = sy - t.clientY;
      if (Date.now() - st < 700 && dy > 60 && Math.abs(t.clientX - sx) < 90) switchView("apps");
    }, { passive: true });
  }

  if (!importFromHash()) {
    const s = store.get();
    if (!s.seenIntro) {
      store.update((st) => (st.seenIntro = true), { emit: false });
      setTimeout(() => toast("Long-press the screen to arrange widgets"), 1400);
    }
  }

  refreshAll();
  renderWidgetCatalog();
  watchBattery(updateBattery);
  tickStatus();
  setInterval(tickStatus, 20000);
  updateBattery();
  probeSensors();

  const hint = $("#homeHint");
  setTimeout(() => hint && hint.classList.add("hint-hidden"), 4200);

  window.addEventListener("hashchange", importFromHash);
  console.log("[AURA] ready", { webgl: capabilities.webgl, mode: activeMode });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

window.AURA = {
  store, engine, effects, widgets, capabilities, native, images,
  get mode() { return activeMode; },
  refreshAll, applyMode, applyVisual, toast, switchView, closeSheet,
  wallpaper: { apply: applyWallpaper, current: currentWallpaper, state: wallState, set: wpSet },
  /** Called by the Android shell's back gesture. Returns true if AURA used it. */
  handleBack() {
    const sheet = $("#sheet");
    if (sheet && !sheet.hidden) { closeSheet(); return true; }
    const active = $(".view.is-active");
    if (active && active.dataset.view !== "home") { switchView("home"); return true; }
    return false;
  },
  /** Native window insets, in CSS px (the shell pushes these; env() in a WebView isn't reliable). */
  setInsets(ins) {
    if (!ins) return;
    const r = document.documentElement.style;
    if (ins.top != null) r.setProperty("--native-top", ins.top + "px");
    if (ins.bottom != null) r.setProperty("--native-bottom", ins.bottom + "px");
    if (ins.left != null) r.setProperty("--native-left", ins.left + "px");
    if (ins.right != null) r.setProperty("--native-right", ins.right + "px");
  },
};

// Registering a service worker is what lets the standalone PWA install work
// offline. It is deliberately NOT done inside the APK: the assets are already
// local, and a persistent cache would keep serving the old build after an app
// update. On the Perchance page it's skipped too (no writable SW scope).
if ("serviceWorker" in navigator && !window.root && !native.available) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
