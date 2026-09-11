// Web-build wallpaper renderer.
//
// The built-in pack ships as JPEGs inside the APK, but the web build cannot ship
// ~90 MB, so it renders the same recipe at runtime instead. The generator lives in
// src/tools/ and is imported LAZILY: inside the APK the app root is web/, so a
// "../tools/..." path would 404 — but `import()` only fetches when it is actually
// called, and this module is only used when `native.available` is false.
//
// Rendering is expensive (the starfield is ~1.5 s at full size), so:
//   * grid thumbnails render small (they are ~110 px wide on screen),
//   * full-size renders are cached by id,
//   * a single-flight queue keeps two renders from fighting over the main thread.

import { wpSpec } from "./wallpapers.js";

let modPromise = null;

function loadMod() {
  if (!modPromise) modPromise = import("../tools/make-wallpapers.js");
  return modPromise;
}

const urlCache = new Map();     // id + "@" + w -> object URL
const pending = new Map();      // same key -> Promise
let chain = Promise.resolve();  // serialises renders

function enqueue(fn) {
  const next = chain.then(fn, fn);
  chain = next.catch(() => {});
  return next;
}

/**
 * Render a pack wallpaper at an arbitrary size and get a Blob back.
 * @returns {Promise<Blob>}
 */
export function renderPackBlob(wp, w, h, quality) {
  return enqueue(async () => {
    const m = await loadMod();
    const canvas = m.renderSpec(wpSpec(wp), w, h);
    if (typeof canvas.convertToBlob === "function") {
      return canvas.convertToBlob({ type: "image/jpeg", quality: quality || 0.88 });
    }
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode-failed"))), "image/jpeg", quality || 0.88)
    );
  });
}

/**
 * Object URL of a pack wallpaper rendered at `w`x`h` (cached, single-flight).
 * Returns "" if rendering failed.
 */
export function renderPackUrl(wp, w, h, quality) {
  const key = wp.id + "@" + w + "x" + h;
  const hit = urlCache.get(key);
  if (hit) return Promise.resolve(hit);
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;
  const p = renderPackBlob(wp, w, h, quality)
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      urlCache.set(key, url);
      pending.delete(key);
      return url;
    })
    .catch((e) => {
      pending.delete(key);
      console.warn("[AURA] pack render failed", wp.id, e && e.message);
      return "";
    });
  pending.set(key, p);
  return p;
}

/** Drop every cached object URL (called when the pack view is torn down). */
export function releasePackUrls() {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}
