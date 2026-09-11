# AURA wallpaper pack

The APK ships with **112 built-in wallpapers** (each with a thumbnail), which is what
brings the download up to ~100 MB. They are *not* stored in this repository — the
source images are pure procedurally-generated gradients, so the shipped JPEGs are the
build artefact, and they live on the Perchance file host as four zips.

| Zip | Contents | Files | Size |
|-----|----------|-------|------|
| part 01 | aurora + nebula **full** | 28 | 27.6 MB |
| part 02 | mesh + starry **full** | 28 | 25.4 MB |
| part 03 | matte + silk + topo **full** | 42 | 20.8 MB |
| part 04 | bokeh **full** + **all 112 thumbnails** | 126 | 17.1 MB |

```
https://user.uploads.dev/file/fca8cbb8db7a277a094194aad3e3657e.zip   # part 01
https://user.uploads.dev/file/8889be41f5f51d8615fa0dc8f75cf64e.zip   # part 02
https://user.uploads.dev/file/8404381b0c43e9311117aaf01464cced.zip   # part 03
https://user.uploads.dev/file/c363c819ffde3464818a9212b99da41c.zip   # part 04
```

Each zip contains paths rooted at `wallpapers/`:

```
wallpapers/full/<id>.jpg     e.g. wallpapers/full/aura-01-aurora.jpg     1620x3510  q0.94
wallpapers/thumb/<id>.jpg    e.g. wallpapers/thumb/aura-01-aurora.jpg     ~x360
```

So **unzip them straight into `web/`** and you end up with `web/wallpapers/full/...`
and `web/wallpapers/thumb/...`. That is exactly where `src/web/wallpapers.js` looks
(`WP_FULL_DIR = "wallpapers/full"`, `WP_THUMB_DIR = "wallpapers/thumb"`), and where the
Gradle asset merge picks them up for the APK.

All four parts together are ~91 MB on disk; the APK compresses them only a little
because JPEGs are already compressed, hence the ~100 MB app size.

## Rebuild recipe

The pack is generated from one file, [`../tools/make-wallpapers.js`](../tools/make-wallpapers.js).

```js
// in a browser page (or a module Worker) with the workspace mounted:
const pack = await import("../tools/make-wallpapers.js");
const specs = pack.buildSpecs();          // 112 {id,name,tag,style,palette,seed}
for (const spec of specs) {
  const full  = pack.renderSpec(spec);    // 1620x3510 OffscreenCanvas
  const thumb = pack.thumbCanvas(full);   // ~x360
  // encode each to JPEG (full q0.94, thumb q0.9) and write to
  //   wallpapers/full/<id>.jpg  and  wallpapers/thumb/<id>.jpg
}
```

The palettes are single-sourced from [`../web/wallpapers.js`](../web/wallpapers.js)
(`WP_PALETTES`), so the built-in in-app "Styles" tab and the shipped JPEG pack never
drift apart. `WP_STYLES` (aurora, nebula, mesh, starry, matte, silk, topo, bokeh) and the
palettes together produce the 112 combinations.

Counting check: 112 full + 112 thumb = 224 JPEGs.
