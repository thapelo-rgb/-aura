import { store } from "./store.js";
import { ICONS, WIDGETS } from "./config.js";
import { effects } from "./effects.js";
import { engine } from "./engine.js";
import { animateIn, getAnim } from "./animations.js";

const WMO = {
  0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Snow showers",
  95: "Thunderstorm", 96: "Thunder + hail", 99: "Thunder + hail",
};

const WX_SVG = {
  sun: '<circle cx="12" cy="12" r="4.1"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/>',
  cloud: '<path d="M7.6 18.2h8.9a3.9 3.9 0 0 0 .3-7.8 5.3 5.3 0 0 0-10.1 1.3 3.3 3.3 0 0 0 .9 6.5z"/>',
  partly: '<circle cx="8.3" cy="8.3" r="3.1"/><path d="M8.3 2.5v1.5M2.5 8.3h1.5M4.2 4.2l1 1M12.4 4.2l-1 1"/><path d="M10.2 19.2h7.2a3.3 3.3 0 0 0 .2-6.6 4.5 4.5 0 0 0-8.5 1.1 2.8 2.8 0 0 0 1.1 5.5z"/>',
  fog: '<path d="M4 9.2h16M4 13h16M4 16.8h11"/>',
  rain: '<path d="M7.6 15.2h8.9a3.9 3.9 0 0 0 .3-7.8 5.3 5.3 0 0 0-10.1 1.3 3.3 3.3 0 0 0 .9 6.5z"/><path d="M9 18.3l-.9 2.1M13 18.3l-.9 2.1M16.6 18.3l-.9 2.1"/>',
  snow: '<path d="M7.6 15.2h8.9a3.9 3.9 0 0 0 .3-7.8 5.3 5.3 0 0 0-10.1 1.3 3.3 3.3 0 0 0 .9 6.5z"/><path d="M9.3 18.8h.01M13 19.8h.01M16 18.8h.01" stroke-width="2.6"/>',
  storm: '<path d="M7.6 15.2h8.9a3.9 3.9 0 0 0 .3-7.8 5.3 5.3 0 0 0-10.1 1.3 3.3 3.3 0 0 0 .9 6.5z"/><path d="M12.6 16.6l-2.2 3.3h2.4l-1.3 2.3"/>',
};

function wxKey(code) {
  if (code == null) return "partly";
  if (code <= 1) return "sun";
  if (code === 2) return "partly";
  if (code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) return "rain";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "partly";
}

function wxIcon(code) {
  const body = WX_SVG[wxKey(code)] || WX_SVG.partly;
  return `<svg class="wx-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

let layerEl = null;
let deps = null;
let editMode = false;
let pressTimer = 0;
const refs = new Map();
const PLACEMENTS = [
  [6, 4], [46, 4], [6, 30], [50, 30], [6, 56], [46, 56], [6, 78], [50, 78],
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function place(el, w) {
  el.style.left = w.x + "%";
  el.style.top = w.y + "%";
  if (w.w) el.style.width = w.w + "px";
  if (w.h) el.style.height = w.h + "px";
}

function randomQuote() {
  const qs = (deps && deps.quotes) || [];
  return qs.length ? qs[Math.floor(Math.random() * qs.length)] : "Stay curious.";
}

function innerHTMLFor(w) {
  switch (w.type) {
    case "clock": {
      if (w.config && w.config.face === "analog") {
        return `<div class="w-label">Analog</div>
          <svg class="w-clockface" viewBox="0 0 100 100" width="66" height="66">
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2"></circle>
            <line data-ref="hh" x1="50" y1="50" x2="50" y2="28" stroke-width="4.5" stroke-linecap="round"></line>
            <line data-ref="mh" x1="50" y1="50" x2="50" y2="18" stroke-width="3" stroke-linecap="round"></line>
            <line data-ref="sh" x1="50" y1="50" x2="50" y2="13" stroke-width="1.6" stroke-linecap="round" class="h-sec"></line>
          </svg>`;
      }
      return `<div class="w-label">Clock</div>
        <div class="w-value w-big" data-ref="time">--:--</div>
        <div class="w-sub" data-ref="date">date</div>`;
    }
    case "battery":
      return `<div class="w-label">Battery</div>
        <div class="w-value" data-ref="bat">--%</div>
        <div class="w-bar"><i data-ref="bar" style="width:0%"></i></div>`;
    case "weather":
      return `<div class="w-label">Weather</div>
        <div class="w-row"><span class="w-icon" data-ref="wicon">${wxIcon(null)}</span><div class="w-value" data-ref="temp">--&deg;</div></div>
        <div class="w-sub" data-ref="wsub">tap to load</div>`;
    case "quote":
      return `<div class="w-label">Quote</div>
        <div class="w-quote" data-ref="q">${randomQuote()}</div>`;
    case "notes":
      return `<div class="w-label">Notes</div>
        <textarea class="w-note" data-ref="note" placeholder="Write something..."></textarea>`;
    case "motion":
      return `<div class="w-label">Motion</div>
        <div class="w-gyro">
          <div><b data-ref="gx">--</b><span>TILT</span></div>
          <div><b data-ref="gy">--</b><span>ROLL</span></div>
          <div><b data-ref="gz">--</b><span>YAW</span></div>
        </div>`;
    case "insight":
      return `<div class="w-label">Insight</div>
        <div class="w-quote" data-ref="ins">...</div>`;
    default:
      return `<div class="w-label">${w.type}</div>`;
  }
}

function buildEl(w) {
  const el = document.createElement("div");
  el.className = "widget widget-pop";
  el.dataset.id = w.id;
  el.dataset.type = w.type;
  el.innerHTML = `<div class="widget-inner">${innerHTMLFor(w)}</div><div class="w-resize"></div>`;
  const r = {};
  el.querySelectorAll("[data-ref]").forEach((n) => (r[n.dataset.ref] = n));
  refs.set(w.id, r);
  place(el, w);
  return el;
}

function toastStackNote() {
  if (deps && deps.onOverflow) deps.onOverflow();
}

// Finds a position (as layer percentages) where a new widget fits without
// overlapping an existing one, without covering the status bar, and without
// sliding under the dock. Measured from real geometry so it can never disagree
// with how CSS resolves the percentages.
function findSpot(el, def) {
  const layerRect = layerEl.getBoundingClientRect();
  if (!layerRect.width || !layerRect.height) return null;
  const bw = el.offsetWidth || def.w;
  const bh = el.offsetHeight || def.h;
  if (bw > layerRect.width || bh > layerRect.height) return null;

  const navEl = document.getElementById("nav");
  const statusEl = document.getElementById("statusbar");
  const safeBottom = navEl
    ? Math.min(layerRect.height, navEl.getBoundingClientRect().top - layerRect.top)
    : layerRect.height;
  const safeTop = statusEl
    ? Math.max(0, statusEl.getBoundingClientRect().bottom - layerRect.top)
    : 0;

  const others = [...layerEl.querySelectorAll(".widget")]
    .filter((n) => n !== el)
    // offset* is transform-independent, so a widget mid-entrance-animation is
    // still measured at the position/size it will settle into.
    .map((n) => ({ x: n.offsetLeft, y: n.offsetTop, w: n.offsetWidth, h: n.offsetHeight }));

  const pad = 10;
  const W = layerRect.width;
  const H = layerRect.height;

  const inBounds = (x, y) =>
    x >= 0 && y >= safeTop && x + bw <= W + 0.5 && y + bh <= safeBottom - 4;

  // Sum of padded intersection areas with every existing widget. Zero means a
  // clean fit; anything above zero is the amount of visual collision.
  const overlapArea = (x, y) => {
    let sum = 0;
    for (const o of others) {
      const ox = Math.min(x + bw + pad, o.x + o.w + pad) - Math.max(x, o.x);
      const oy = Math.min(y + bh + pad, o.y + o.h + pad) - Math.max(y, o.y);
      if (ox > 0 && oy > 0) sum += ox * oy;
    }
    return sum;
  };

  const at = (x, y) => [(x / W) * 100, (y / H) * 100];

  let best = null;
  let bestArea = Infinity;
  const consider = (x, y) => {
    if (!inBounds(x, y)) return false;
    const area = overlapArea(x, y);
    if (area === 0) return true;
    if (area < bestArea) {
      bestArea = area;
      best = at(x, y);
    }
    return false;
  };

  const maxX = Math.max(0, W - bw);
  const maxY = Math.max(safeTop, Math.min(safeBottom - 4, H) - bh);
  const step = 4;

  for (const [px, py] of PLACEMENTS) {
    const x = (W * px) / 100;
    const y = Math.max(safeTop, (H * py) / 100);
    if (consider(x, y)) return at(x, y);
    for (let dy = -step; dy <= step; dy += step) {
      for (let dx = -step; dx <= step; dx += step) {
        if (consider(x + dx, y + dy)) return at(x + dx, y + dy);
      }
    }
  }

  for (let y = safeTop; y <= maxY; y += step) {
    for (let x = 0; x <= maxX; x += step) {
      if (consider(x, y)) return at(x, y);
    }
  }

  const stepFar = 12;
  for (let y = safeTop; y <= maxY; y += stepFar) {
    for (let x = 0; x <= maxX; x += stepFar) {
      if (consider(x, y)) return at(x, y);
    }
  }

  if (best) return best;
  return null;
}

export const widgets = {
  mount(layer, dependencies) {
    layerEl = layer;
    deps = dependencies || {};
    layerEl.addEventListener("pointerdown", onDown);
    setInterval(tick, 1000);
    this.render(true);
  },

  get editMode() {
    return editMode;
  },

  setEdit(on) {
    editMode = !!on;
    layerEl.classList.toggle("widget-edit", editMode);
    if (editMode) {
      clearTimeout(pressTimer);
      pressTimer = setTimeout(() => {
        editMode = false;
        layerEl.classList.remove("widget-edit");
      }, 6000);
    }
  },

  add(type) {
    const def = WIDGETS.find((w) => w.id === type);
    if (!def) return;
    const s = store.get();
    const w = {
      id: "w-" + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36),
      type,
      x: 0,
      y: 0,
      w: def.w,
      h: def.h,
      config: Object.assign({}, def.def),
    };
    const el = buildEl(w);
    layerEl.appendChild(el);
    const spot = findSpot(el, def);
    if (spot) {
      w.x = spot[0];
      w.y = spot[1];
    } else {
      w.x = 4 + (s.widgets.length % 4) * 7;
      w.y = 4 + (s.widgets.length % 5) * 6;
      toastStackNote();
    }
    place(el, w);
    store.update((st) => st.widgets.push(w));
    animateIn([el], getAnim(store.get()), { stagger: 0 });
    if (def.id === "weather") loadWeather(w);
    return w;
  },

  remove(id) {
    const el = layerEl.querySelector(`.widget[data-id="${id}"]`);
    if (el) {
      try {
        el.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.9)" }], {
          duration: 220, easing: "ease-in", fill: "forwards",
        });
      } catch (e) {}
      setTimeout(() => el.remove(), 210);
    }
    refs.delete(id);
    store.update((st) => {
      st.widgets = st.widgets.filter((w) => w.id !== id);
    });
  },

  clear() {
    if (layerEl) {
      layerEl.querySelectorAll(".widget").forEach((n) => {
        refs.delete(n.dataset.id);
        n.remove();
      });
    }
    store.update((st) => {
      st.widgets = [];
    });
  },

  render(animate) {
    if (!layerEl) return;
    layerEl.querySelectorAll(".widget").forEach((n) => n.remove());
    refs.clear();
    const list = store.get().widgets;
    const nodes = list.map((w) => {
      const el = buildEl(w);
      layerEl.appendChild(el);
      return el;
    });
    tick();
    if (animate) animateIn(nodes, getAnim(store.get()));
  },

  refresh() {
    this.render(false);
  },
};

function onDown(e) {
  const resize = e.target.closest(".w-resize");
  if (resize && editMode) {
    startResize(e, resize.closest(".widget"));
    return;
  }
  const el = e.target.closest(".widget");
  if (!el) return;
  startDrag(e, el);
}

function startDrag(e, el) {
  const w = store.get().widgets.find((x) => x.id === el.dataset.id);
  if (!w) return;
  e.preventDefault();
  const layerRect = layerEl.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const offX = e.clientX - rect.left;
  const offY = e.clientY - rect.top;
  const startX = e.clientX;
  const startY = e.clientY;
  let dragging = false;
  let longPressed = false;

  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    longPressed = true;
    widgets.setEdit(true);
    if (navigator.vibrate) navigator.vibrate(12);
  }, 460);

  const move = (ev) => {
    if (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5) {
      if (!dragging) clearTimeout(pressTimer);
      dragging = true;
    }
    if (!dragging) return;
    const maxX = 100 - (w.w / layerRect.width) * 100;
    const maxY = 100 - (w.h / layerRect.height) * 100;
    w.x = clamp(((ev.clientX - layerRect.left - offX) / layerRect.width) * 100, 0, Math.max(0, maxX));
    w.y = clamp(((ev.clientY - layerRect.top - offY) / layerRect.height) * 100, 0, Math.max(0, maxY));
    place(el, w);
  };

  const up = () => {
    clearTimeout(pressTimer);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
    if (dragging) {
      store.save();
    } else if (!longPressed) {
      handleTap(w, el);
    }
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
}

function startResize(e, el) {
  const w = store.get().widgets.find((x) => x.id === el.dataset.id);
  if (!w) return;
  e.preventDefault();
  e.stopPropagation();
  const rect = el.getBoundingClientRect();
  const startX = e.clientX;
  const startY = e.clientY;
  const startW = rect.width;
  const startH = rect.height;

  const move = (ev) => {
    w.w = Math.max(112, Math.round(startW + (ev.clientX - startX)));
    w.h = Math.max(64, Math.round(startH + (ev.clientY - startY)));
    el.style.width = w.w + "px";
    el.style.height = w.h + "px";
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    store.save();
    if (deps && deps.onActiveChange) deps.onActiveChange();
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

function handleTap(w, el) {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2 - document.getElementById("screen").getBoundingClientRect().left;
  const cy = rect.top + rect.height / 2 - document.getElementById("screen").getBoundingClientRect().top;
  if (effects) effects.burst(cx, cy, 12, 2.6);
  if (navigator.vibrate) navigator.vibrate(8);
  if (w.type === "clock") {
    store.update((st) => {
      const t = st.widgets.find((x) => x.id === w.id);
      t.config = Object.assign({}, t.config, { face: t.config.face === "analog" ? "digital" : "analog" });
    });
    const fresh = buildEl(store.get().widgets.find((x) => x.id === w.id));
    el.replaceWith(fresh);
    tick();
    return;
  }
  if (w.type === "quote") {
    const r = refs.get(w.id);
    if (r && r.q) {
      const qs = (deps && deps.quotes) || [];
      r.q.textContent = qs.length ? qs[Math.floor(Math.random() * qs.length)] : "Stay curious.";
    }
    return;
  }
  if (w.type === "insight") {
    const r = refs.get(w.id);
    if (r && r.ins) r.ins.textContent = insightLine();
    return;
  }
  if (w.type === "weather") {
    loadWeather(w);
    return;
  }
  if (w.type === "notes") {
    const r = refs.get(w.id);
    if (r && r.note) r.note.focus();
  }
}

function insightLine() {
  const qs = (deps && deps.quotes) || [];
  if (!qs.length) return "Stay curious.";
  const d = new Date();
  const idx = (d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % qs.length;
  return qs[idx];
}

let weatherLoadedAt = 0;

async function loadWeather(w) {
  const r = refs.get(w.id);
  if (r && r.wsub) r.wsub.textContent = "loading...";
  const s = store.get();
  let lat = s.weather.lat;
  let lon = s.weather.lon;
  if (lat == null || lon == null) {
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 9000, maximumAge: 600000 })
      );
      lat = pos.coords.latitude;
      lon = pos.coords.longitude;
      store.update((st) => {
        st.weather.lat = lat;
        st.weather.lon = lon;
      });
    } catch (e) {
      if (r && r.wsub) r.wsub.textContent = "location unavailable";
      return;
    }
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
    const j = await fetch(url).then((x) => x.json());
    const c = j.current || {};
    weatherLoadedAt = Date.now();
    const rr = refs.get(w.id);
    if (rr && rr.wicon) rr.wicon.innerHTML = wxIcon(c.weather_code);
    if (rr && rr.temp) rr.temp.innerHTML = `${Math.round(c.temperature_2m)}&deg;`;
    if (rr && rr.wsub) rr.wsub.textContent = `${WMO[c.weather_code] || "Weather"} - ${Math.round(c.wind_speed_10m || 0)} km/h`;
  } catch (e) {
    const rr = refs.get(w.id);
    if (rr && rr.wsub) rr.wsub.textContent = "offline";
  }
}

function tick() {
  const s = store.get();
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = now.getSeconds();
  const dateStr = now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  for (const w of s.widgets) {
    const r = refs.get(w.id);
    if (!r) continue;
    if (w.type === "clock") {
      if (r.time) r.time.textContent = `${hh}:${mm}`;
      if (r.date) r.date.textContent = dateStr;
      if (r.hh) {
        const hd = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
        const md = (now.getMinutes() + ss / 60) * 6;
        const sd = ss * 6;
        r.hh.setAttribute("transform", `rotate(${hd} 50 50)`);
        r.mh.setAttribute("transform", `rotate(${md} 50 50)`);
        r.sh.setAttribute("transform", `rotate(${sd} 50 50)`);
      }
    } else if (w.type === "battery") {
      const lvl = deps && deps.getBattery ? deps.getBattery() : null;
      const pct = lvl == null ? null : Math.round(lvl * 100);
      if (r.bat) r.bat.textContent = pct == null ? "--%" : pct + "%";
      if (r.bar) r.bar.style.width = (pct == null ? 42 : pct) + "%";
    } else if (w.type === "motion") {
      const src = engine.activeSource();
      if (src === "sensor") {
        if (r.gx) r.gx.textContent = Math.round(engine.sensor.beta) + "d";
        if (r.gy) r.gy.textContent = Math.round(engine.sensor.gamma) + "d";
        if (r.gz) r.gz.textContent = Math.round((engine.par.x + 0.5) * 180 - 90) + "d";
      } else {
        if (r.gx) r.gx.textContent = "--";
        if (r.gy) r.gy.textContent = "--";
        if (r.gz) r.gz.textContent = src === "pointer" ? "ptr" : "off";
      }
    } else if (w.type === "notes") {
      if (r.note && document.activeElement !== r.note && r.note.value !== s.notes) r.note.value = s.notes || "";
    }
  }
}

export function bindWidgetEvents() {
  layerEl.addEventListener("input", (e) => {
    if (e.target.classList && e.target.classList.contains("w-note")) {
      store.get().notes = e.target.value;
      clearTimeout(bindWidgetEvents._t);
      bindWidgetEvents._t = setTimeout(() => store.save(), 400);
    }
  });
  layerEl.addEventListener("focusout", (e) => {
    if (e.target.classList && e.target.classList.contains("w-note")) store.save();
  });
}
