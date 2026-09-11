// Local image library — the user's own wallpapers (from the gallery, the photo
// picker, or a pasted link).
//
// Everything lives in IndexedDB on the device: full-size JPEG plus a small
// thumbnail, so the wallpaper grid can render hundreds of entries without
// decoding full-size bitmaps. Nothing is uploaded anywhere (except when the user
// explicitly sets the *system* wallpaper, which is a copy to Android itself).

const DB_NAME = "aura.images.v1";
const STORE = "images";
const VERSION = 1;

export const MAX_FULL = 2560;      // longest edge of the stored image
export const FULL_QUALITY = 0.92;
export const THUMB_W = 320;        // grid thumbnail width (height follows aspect)

let dbPromise = null;
const urlCache = new Map();       // id -> { full: string, thumb: string }

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no-indexeddb"));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: "id" });
        os.createIndex("ts", "ts");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("db-open-failed"));
  });
  return dbPromise;
}

function tx(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const os = t.objectStore(STORE);
        let out;
        try {
          out = fn(os);
        } catch (e) {
          reject(e);
          return;
        }
        t.oncomplete = () => resolve(out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      })
  );
}

function reqResult(r) {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

/* ------------------------------ decoding ------------------------------ */

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function canvasToBlob(canvas, type, quality) {
  if (typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type: type, quality: quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode-failed"))), type, quality);
  });
}

async function decode(blob) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch (e) {}
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode-failed"));
    };
    img.src = url;
  });
}

/**
 * Re-encode an image so a 12 MP camera photo doesn't eat the storage quota.
 * Returns { full, thumb, w, h }.
 */
export async function prepare(blob) {
  const src = await decode(blob);
  const sw = src.width;
  const sh = src.height;
  const scale = Math.min(1, MAX_FULL / Math.max(sw, sh));
  const fw = Math.max(1, Math.round(sw * scale));
  const fh = Math.max(1, Math.round(sh * scale));

  const fullCanvas = makeCanvas(fw, fh);
  const fc = fullCanvas.getContext("2d");
  fc.imageSmoothingQuality = "high";
  fc.drawImage(src, 0, 0, fw, fh);

  const tw = Math.max(1, Math.round((fw / fh) * THUMB_W));
  const th = Math.max(1, Math.round(THUMB_W));
  const thumbCanvas = makeCanvas(tw, th);
  const tc = thumbCanvas.getContext("2d");
  tc.imageSmoothingQuality = "high";
  tc.drawImage(fullCanvas, 0, 0, tw, th);

  const full = await canvasToBlob(fullCanvas, "image/jpeg", FULL_QUALITY);
  const thumb = await canvasToBlob(thumbCanvas, "image/jpeg", 0.82);
  if (src.close) src.close();
  return { full: full, thumb: thumb, w: fw, h: fh };
}

/* ------------------------------ API ------------------------------ */

function newId() {
  return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Import raw Blobs (from a file input or the native picker) as one batch.
 * @returns {Promise<Array>} the stored records (metadata only)
 */
export async function addBlobs(blobs, opts) {
  const src = (opts && opts.src) || "gallery";
  const onProgress = opts && opts.onProgress;
  const added = [];
  for (let i = 0; i < blobs.length; i++) {
    const b = blobs[i];
    const name = (opts && opts.names && opts.names[i]) || b.name || ("Image " + (i + 1));
    try {
      const prep = await prepare(b);
      const rec = {
        id: newId(),
        name: String(name).replace(/\.[a-z0-9]+$/i, "").slice(0, 60),
        w: prep.w,
        h: prep.h,
        ts: Date.now() + i,
        src: src,
        bytes: (prep.full.size || 0) + (prep.thumb.size || 0),
        full: prep.full,
        thumb: prep.thumb,
      };
      await tx("readwrite", (os) => os.put(rec));
      added.push(strip(rec));
    } catch (e) {
      // A single unreadable file (HEIC on an old WebView, a truncated download)
      // must not abort the whole batch.
      console.warn("[AURA] image skipped:", name, e && e.message);
    }
    if (onProgress) onProgress(i + 1, blobs.length);
  }
  return added;
}

export async function addDataUrl(dataUrl, opts) {
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) throw new Error("bad-data-url");
  const res = await addBlobs([blob], Object.assign({ src: "pick" }, opts || {}, { names: [(opts && opts.name) || "Picked image"] }));
  if (!res.length) throw new Error("decode-failed");
  return res[0];
}

/** The fetch to use for remote images: superFetch (CORS-free) when available. */
export function remoteFetch() {
  const r = typeof globalThis !== "undefined" ? globalThis.root : null;
  if (r && typeof r.superFetch === "function") {
    return (u) => r.superFetch(u);
  }
  return (u) => fetch(u, { mode: "cors", credentials: "omit" });
}

/** Try to pull a remote image (Pinterest, a URL) into local storage. */
export async function addUrl(url, opts) {
  let blob = null;
  const fetcher = (opts && opts.fetch) || remoteFetch();
  try {
    const res = await fetcher(url);
    if (res && res.ok) blob = await res.blob();
  } catch (e) {}
  if (!blob || !/^image\//.test(blob.type || "")) {
    // The host refused to hand over the bytes. Fall back to hotlinking: display
    // does not need CORS, only pixel readback does, so the caller can still show
    // the image, it just won't be available offline.
    throw new Error("cors");
  }
  const name = (opts && opts.name) || decodeURIComponent((url.split("/").pop() || "Linked image").split("?")[0]);
  const res = await addBlobs([blob], Object.assign({}, opts, { src: "link", names: [name] }));
  if (!res.length) throw new Error("decode-failed");
  return res[0];
}

function strip(rec) {
  return { id: rec.id, name: rec.name, w: rec.w, h: rec.h, ts: rec.ts, src: rec.src, bytes: rec.bytes };
}

export async function list() {
  const all = await tx("readonly", (os) => reqResult(os.getAll()));
  const arr = (all || []).map(strip);
  arr.sort((a, b) => b.ts - a.ts);
  return arr;
}

export async function get(id) {
  return tx("readonly", (os) => reqResult(os.get(id)));
}

export async function remove(id) {
  releaseUrls(id);
  return tx("readwrite", (os) => os.delete(id));
}

export async function clear() {
  for (const id of Array.from(urlCache.keys())) releaseUrls(id);
  return tx("readwrite", (os) => os.clear());
}

export async function totalBytes() {
  const all = await tx("readonly", (os) => reqResult(os.getAll()));
  return (all || []).reduce((a, r) => a + (r.bytes || 0), 0);
}

/* --------------------------- object URLs --------------------------- */

export function releaseUrls(id) {
  const e = urlCache.get(id);
  if (!e) return;
  if (e.full) URL.revokeObjectURL(e.full);
  if (e.thumb) URL.revokeObjectURL(e.thumb);
  urlCache.delete(id);
}

/**
 * Object URL for a stored image. Cached, so the grid can re-render freely.
 * @param {"thumb"|"full"} which
 */
export async function url(id, which) {
  const key = which === "full" ? "full" : "thumb";
  let e = urlCache.get(id);
  if (!e) {
    e = { full: null, thumb: null };
    urlCache.set(id, e);
  }
  if (e[key]) return e[key];
  const rec = await get(id);
  if (!rec || !rec[key]) return "";
  e[key] = URL.createObjectURL(rec[key]);
  return e[key];
}

/* ----------------------------- helpers ----------------------------- */

export function dataUrlToBlob(dataUrl) {
  try {
    const m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(dataUrl);
    if (!m) return null;
    const mime = m[1] || "application/octet-stream";
    const isB64 = !!m[2];
    const raw = isB64 ? atob(m[3]) : decodeURIComponent(m[3]);
    const len = raw.length;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) buf[i] = raw.charCodeAt(i);
    return new Blob([buf], { type: mime });
  } catch (e) {
    return null;
  }
}

export async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

/** Full-size data URL for a stored image — used to hand it to Android's wallpaper manager. */
export async function toDataUrl(id) {
  const rec = await get(id);
  if (!rec || !rec.full) return "";
  return blobToDataUrl(rec.full);
}
