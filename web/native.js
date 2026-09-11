// Bridge to the Android shell (MainActivity.kt).
//
// The whole app is web code, but a few things can only be done natively: listing
// and launching installed apps, setting the *system* wallpaper, opening the photo
// picker, asking to become the home screen, and reading real window insets. Those
// go through a single Java entry point, `window.AuraNative.invoke(json)`, which
// answers asynchronously through `window.__auraNativeResult(id, json)`.
//
// In a browser `native.available` is false and every call rejects with "unsupported",
// so callers can feature-detect instead of branching on user-agent strings.

const bridge = typeof window !== "undefined" ? window.AuraNative : null;

// `@JavascriptInterface` can only expose methods, so platform/version arrive as
// functions on some shells and as plain values on others — read either shape.
function bridgeValue(name, fallback) {
  try {
    const v = bridge && bridge[name];
    if (typeof v === "function") return v.call(bridge);
    if (v != null) return v;
  } catch (e) {}
  return fallback;
}

export const native = {
  available: !!(bridge && typeof bridge.invoke === "function"),
  platform: String(bridgeValue("platform", "web")),
  version: String(bridgeValue("version", "")),
  _seq: 0,
  _pending: new Map(),
  _defaultTimeout: 30000,

  get isAndroid() {
    return this.platform === "android";
  },

  /**
   * Call a native method. Resolves with the method's value, rejects with an Error.
   * `opts.timeout` overrides the 30s default (the photo picker needs longer, since
   * it waits for a human).
   */
  call(method, args, opts) {
    const self = this;
    if (!this.available) return Promise.reject(new Error("unsupported"));
    const id = ++this._seq;
    const timeout = (opts && opts.timeout) || this._defaultTimeout;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        self._pending.delete(id);
        reject(new Error("timeout"));
      }, timeout);
      self._pending.set(id, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      try {
        bridge.invoke(JSON.stringify({ id: id, method: method, args: args || {} }));
      } catch (e) {
        clearTimeout(timer);
        self._pending.delete(id);
        reject(e);
      }
    });
  },

  /* --------------- convenience wrappers --------------- */

  info() {
    return this.call("info");
  },
  apps() {
    return this.call("apps", {}, { timeout: 20000 });
  },
  icon(pkg) {
    return this.call("icon", { pkg: pkg }, { timeout: 20000 });
  },
  launch(pkg, cls) {
    return this.call("launch", { pkg: pkg, cls: cls || null });
  },
  openAppInfo(pkg) {
    return this.call("openAppInfo", { pkg: pkg });
  },
  vibrate(ms) {
    return this.call("vibrate", { ms: ms || 12 }).catch(() => null);
  },
  isDefaultHome() {
    return this.call("isDefaultHome");
  },
  openHomeSettings() {
    return this.call("openHomeSettings");
  },
  /**
   * Open the system photo picker.
   * @returns {Promise<Array<{name:string,url:string}>>} URLs are same-origin
   *   (`https://appassets.androidplatform.net/cache/...`), so the app can fetch
   *   and store them without dragging megabytes of base64 through the bridge.
   */
  pickImage(max) {
    return this.call("pickImage", { max: max || 6 }, { timeout: 180000 });
  },
  /**
   * Download an image natively (no CORS). Unlike pickImage's human delay this is
   * just a network round-trip, so the timeout is generous but finite.
   * @returns {Promise<{name:string,url:string,type:string}>} same-origin /cache/ URL.
   */
  fetchImage(url) {
    return this.call("fetchImage", { url: url }, { timeout: 60000 });
  },
  /**
   * @param {string} dataUrl  `data:image/jpeg;base64,...`
   * @param {"home"|"lock"|"both"} target
   */
  setWallpaper(dataUrl, target) {
    return this.call("setWallpaper", { dataUrl: dataUrl, target: target || "home" }, { timeout: 90000 });
  },
  setInsets(top, bottom, left, right) {
    return this.call("setInsets", { top: top, bottom: bottom, left: left, right: right });
  },
};

// Native -> JS results. Registered at module load so nothing is lost if the
// native side answers before the app finished booting.
if (typeof window !== "undefined") {
  window.__auraNativeResult = function (id, json) {
    const entry = native._pending.get(Number(id));
    if (!entry) return;
    native._pending.delete(Number(id));
    let msg = null;
    try {
      msg = typeof json === "string" ? JSON.parse(json) : json;
    } catch (e) {
      entry.reject(new Error("bad native response"));
      return;
    }
    if (msg && msg.ok) entry.resolve(msg.value === undefined ? null : msg.value);
    else entry.reject(new Error((msg && msg.error) || "native error"));
  };

  // Fire-and-forget events the shell can push (e.g. home pressed while in an app).
  window.__auraNativeEvent = function (name, json) {
    let detail = null;
    try {
      detail = typeof json === "string" ? JSON.parse(json) : json;
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent("aura:native", { detail: { name: String(name), data: detail } }));
    } catch (e) {}
  };
}
