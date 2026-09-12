# AURA — phone customization studio

A Good-Lock-like customizer that runs on **any** Android phone: floating glass
widgets, animated wallpapers, tap/pointer effects, a custom keyframe motion studio,
an app drawer, and support for wallpapers you add yourself from the gallery or a link.
It is a **real launcher / home screen** — you can set it as your phone's Home app.

Ships two ways from **one source of truth**:

1. **As a web page** (this Perchance generator) — the live preview you are looking at.
2. **As a real Android APK** — a tiny WebView shell that packs the exact same
   `src/web/` files into the APK's assets and serves them over
   `https://appassets.androidplatform.net/` (so sensors, geolocation, vibration,
   IndexedDB and WebGL all count as a secure context).

Version `0.3.1`. Targets **Android 13–15** (minSdk 24, compileSdk/targetSdk 35).

## Layout

```
src/web/            ← THE APP. Edit here; both targets update.
  index.html          standalone document for the APK shell (assets/index.html)
  markup.js           the whole DOM tree as a string — app.js injects it into <body>
  aura.css            all styling (glass vars, device frame, widgets, sheets, native mode…)
  config.js           APP, ICONS, BACKGROUNDS, THEMES, WIDGETS, EFFECTS, ANIM_PRESETS, MODES, makeDefaultState()
  store.js            localStorage state: get/set/update/subscribe/save/reset/export/import
  capabilities.js     feature detection (webgl, canvas2d, sensors, battery, pointer…), recommendMode(), describe()
  engine.js           WebGL wallpaper shader + canvas-2D fallback, parallax, uniforms
  effects.js          canvas-2D particles: motes, ripples, sparks, pointer trail, aura glow
  widgets.js          widget build/place/add/remove/clear/render, drag, resize, weather, ticks
  animations.js       presets → WAAPI keyframes, animateIn(), previewOn()
  theme.js            theme/background application (CSS vars live on #screen), accents
  wallpapers.js       the 112-wallpaper manifest (palettes + 8 styles + specs) — NO imports
  pack-render.js      lazily renders a pack wallpaper via ../tools/make-wallpapers.js, caches object URLs
  images.js           IndexedDB store (aura.images.v1) for user photos: add/list/get/remove/toDataUrl/url(id,"thumb"|"full")
  native.js           the Android bridge wrapper (native.info/apps/icon/launch/setWallpaper/pickImage/fetchImage/setInsets…)
  app.js              boot, view switching, renderers, export/import/share/hash, window.AURA
  manifest.webmanifest, sw.js, icon.svg, icon-192.png, icon-512.png
  wallpapers/         ← the shipped JPEG pack (112 full + 112 thumb). NOT in git;
                        downloaded by the build. See ../android/WALLPAPERS.md.
src/android/        ← READY-TO-BUILD Gradle project
  settings.gradle, build.gradle, gradle.properties, gradlew, gradlew.bat
  gradle/wrapper/{gradle-wrapper.jar,gradle-wrapper.properties}   (Gradle 8.9)
  app/build.gradle                 AGP 8.7.3, Kotlin 1.9.24, minSdk 24, compileSdk/targetSdk 35
  app/src/main/AndroidManifest.xml  HOME + LAUNCHER intent filters, <queries>, SET_WALLPAPER…
  app/src/main/java/dev/aura/app/MainActivity.kt   WebViewAssetLoader shell + AuraNative bridge
  app/src/main/java/dev/aura/app/AuraApp.kt        uncaught-exception recorder (feeds the crash screen)
  app/src/main/res/{values,mipmap-*}/…             theme, strings, launcher icons
  WALLPAPERS.md                    the pack: zip URLs + rebuild recipe
  BUILD-ONLINE.md                  build the APK with GitHub Actions only (no Android Studio)
  github-workflow-build-apk.yml    copy to .github/workflows/build-apk.yml in the repo
src/tools/make-wallpapers.js       the wallpaper generator (source of the pack)
```

The generator root `index.html` is a 6-line stub that loads `src/web/aura.css`
and `src/web/app.js`; the real markup lives in `markup.js` so the Perchance page
and the APK render identically. `main.pjs` holds `$meta` plus `getAppConfig()`
(name, tagline, version, accent, defaults, quote list).

## Build the APK

### Route A — GitHub Actions (recommended; no Android Studio, works from a phone)
The project builds itself in GitHub's cloud. See **`src/android/BUILD-ONLINE.md`**
for click-by-click steps and `src/android/github-workflow-build-apk.yml` for the
workflow. In short: unzip `aura-apk-project.zip` into a new GitHub repo, copy the
workflow to `.github/workflows/build-apk.yml`, push, then download the
`aura-debug-apk` artifact. The workflow fetches the 112 wallpapers (~91 MB) itself,
so they never live in git.

### Route B — Android Studio / Gradle locally
```bash
cd src/android
./gradlew assembleDebug           # first run downloads Gradle 8.9 + AGP 8.7.3
# → app/build/outputs/apk/debug/app-debug.apk
```
Then `adb install -r app/build/outputs/apk/debug/app-debug.apk`, or copy the APK to
the phone and tap it (enable "Install unknown apps" for the file manager).

Android Studio route: *Open* → pick `src/android/` → let it sync → Run ▶. The project
is inside the generator tree, so copy the folder out if the IDE complains about path
length.

**APK size: ~100 MB.** This is deliberate — the user asked for a download around
100 MB, so the APK ships the 112-wallpaper JPEG pack (224 files, ~91 MB; see
`src/android/WALLPAPERS.md`). Everything else is code (WebGL shaders + SVG + CSS), so
without the pack it would be ~2–3 MB. To grow/shrink it, add/remove files under
`src/web/wallpapers/` and update `wallpapers.js`.

**Debug vs release.** The workflow builds a debug APK (debug-signed). That is fine for
personal installs. For a store build, add a `signingConfigs` block and run
`assembleRelease`.

## What the app does

- **Home screen / launcher.** Two intent filters (LAUNCHER and HOME), so Android offers
  AURA as a Home app; an in-app button opens the system role chooser
  (`RoleManager.ROLE_HOME` on Android 10+, `Settings.ACTION_HOME_SETTINGS` below).
  Status/nav bars are drawn edge-to-edge and their insets are pushed to CSS as
  `--native-*` so the UI clears the clock and gesture bar. Back gesture first asks the
  page (`AURA.handleBack()` closes a sheet) and only then exits / returns home.
- **App drawer.** Lists installed apps via `queryIntentActivities`, loads icons lazily
  (quantised queue), and launches them; search filters as you type.
- **Widgets (7).** clock, battery, weather, quote, notes, motion, insight. Placed as
  percentages of the widget layer, drag to move, long-press to arrange, add/remove/clear.
- **Wallpapers — three sources** (`#view-wallpaper`):
  1. **Built-in** — 8 procedural styles (aurora, nebula, mesh, starry, matte, silk,
     topo, bokeh) across 10 palettes = 112 looks, live-rendered as WebGL shaders and
     also shipped as the JPEG pack for cheap static use / lock-screen push.
  2. **My photos** — pick from the **gallery** (native multi-photo picker → downscaled
     JPEGs parked under `/cache/`, immune to CORS) or upload files in the web build.
  3. **Link** — paste a Pinterest/any image URL. The web build downloads it through
     super-fetch; the APK downloads it through its own native HTTP client (Java's HTTP
     stack isn't subject to CORS), so the bytes are stored in IndexedDB and work
     offline. If a host defeats both, the image is shown by hotlink as a last resort.
  Plus per-wallpaper dim/live/blur/lock controls and a "set as Android wallpaper"
  action (`WallpaperManager`).
- **Effects & motion.** 6 effects (motes, ripples, sparks, pointer trail, aura glow,
  grain) and 6 motion presets + a custom keyframe studio (at%/opacity/y/scale/rotate).
- **Themes.** 6 presets; accent + radius are CSS vars on `#screen`.
- **Persistence.** State in localStorage; user photos in IndexedDB; `#aura=<base64url>`
  share links; export/import JSON.

## How graceful fallback works

`capabilities.detect()` probes WebGL, Canvas2D, DeviceOrientation/Motion,
pointer support, battery, vibration, reduced-motion, secure context, DPR.
`recommendMode()` then picks one of five modes, and `applyMode()` applies it:

| mode | requires | behaviour |
|---|---|---|
| `full` | live sensors (or tilt permission already granted) | tilt parallax + depth + all effects |
| `depth` | pointer input only | pointer-driven parallax/depth, no tilt |
| `effects` | reduced-motion, or no pointer | ambient motion only, no depth |
| `static` | nothing | no animation at all |
| `auto` | — | resolves to one of the above at runtime |

So "animations not compatible" always degrades to depth → effects → static
rather than breaking. The Settings sheet shows a 9-row capability grid and lets
the user pin any mode. `--wdepth` (widget depth in px) is the CSS hook the modes
flip; at 0 the depth transform is a no-op.

## Tests performed

All run in the live preview (`page_eval`) and via file/zip integrity checks
(`execute_js`):

1. **Capability + mode fallback** — modes resolve correctly (`effects`→chip FX,
   `--wdepth:0`; `static`→chip STATIC, sparkle off; `full`/`depth`→`--wdepth:12`),
   capability grid 9 rows, mode rows 5, mode rows clickable.
2. **Widgets** — 7-item catalogue; add/remove/clear; placement never overlaps
   (4 widgets → 0 overlaps, measured on transform-independent `offset*`);
   drag moves + persists; long-press enters arrange mode; tap bursts sparks and
   rerolls the quote; "home is full" toast when geometry genuinely cannot fit.
3. **Theme / motion / persistence** — theme presets set `--accent`/`--radius` on
   `#screen`; background styles switch the wallpaper; 6 presets + custom; adding
   keyframes grows the row list (5 labelled inputs: at%/OP/Y/SC/ROT); duration
   slider; export → reset → import round-trips; `#aura=<base64url>` share links
   import on load/hashchange.
4. **Wallpapers (v0.3)** — the Built-in/My photos/Link panes; 18/18 pack thumbnails
   render for a style; selecting `aura-01-aurora` renders the full-size render and
   turns `#bgImage.is-on` (scrim 0.30); `kind:"style"` gives scrim 0 + canvas
   opacity 1; IndexedDB `images.addBlobs` + custom-photo apply; the Link pane
   downloaded and stored a remote image (CORS-cleared through super-fetch).
5. **Native mode CSS (v0.3)** — toggling `.is-native` hides the in-page status bar,
   shows `#topMode`, goes full-bleed and makes `--safe-top` resolve through
   `setInsets`.
6. **Packaging integrity** — asset references, manifest JSON + icons, every `sw.js`
   cached asset on disk, unique markup ids, every id `app.js` queries exists, Android
   manifest/style/string/colour/mipmap refs resolve, `assets.srcDirs = ["../../web"]`,
   `WebViewAssetLoader` + `appassets.androidplatform.net` wiring, gradle wrapper jar is
   a real ZIP.
7. **Visual** — rendered snapshots of the home screen, widget catalogue, motion
   presets, custom keyframe studio and the wallpaper view.

## Gotchas for the next agent

- Widget positions are **percentages** of `#widgetLayer`; geometry must be
  measured with `offsetLeft/offsetTop/offsetWidth/offsetHeight` (transform
  independent), never `getBoundingClientRect()` — the entrance animation
  (`widgetPop`, scale .86) contaminates rects.
- Screenshot helper: `(await import("https://ai-agent.perchance.org/files/snapshot.js")).capture()`.
  In the editor's preview iframe the page can report `visibilityState:"hidden"`, in
  which case **rAF and WAAPI animations freeze at t=0** (widgets sit at `opacity:0`)
  and `capture()` can hang. Work around it with
  `document.getAnimations().forEach(a=>{try{a.finish()}catch(e){}})` and reading DOM
  geometry; the page is fine in a real browser.
- `window.AURA` exposes `store, engine, effects, widgets, capabilities, mode,
  refreshAll, applyMode, toast, native, images, wallpaper, switchView, closeSheet,
  handleBack, setInsets`. `applyMode()` takes **no arguments** — set `store.mode` first.
- User photos live in IndexedDB `aura.images.v1` and are only ever base64'd when
  pushing to `WallpaperManager`; everything else is an object URL. Call
  `images.releaseUrls()` if you need to reclaim them.
- `pack-render.js` lazily imports `../tools/make-wallpapers.js`; that file must stay
  reachable at that relative path from `src/web/` or thumbnails fall back to flat
  colour swatches.
- `clear()` removes widget nodes synchronously on purpose; do not add while a
  previous bulk clear is still animating.
