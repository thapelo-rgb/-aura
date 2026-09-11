// AURA built-in wallpaper pack — GENERATED FILE, do not hand-edit the manifest.
//
// 112 procedurally generated wallpapers: 8 styles x 14 palette variants.
// The JPEGs are NOT stored in this repo. Rebuild recipe + hosted download URLs:
//   src/android/WALLPAPERS.md      (how to rebuild the pack)
//   src/tools/make-wallpapers.js   (the generator that produced every image)
//
// Two renderers, one recipe:
//   * APK build — WALLPAPERS.md's zips are unpacked into web/wallpapers/ at build
//                 time, so the app loads the shipped JPEGs straight from assets.
//   * Web build — the JPEGs are not shipped (they are ~90 MB; far too big to pull
//                 through the generator page). Each entry is re-rendered on demand
//                 from {style, palette, seed} by src/web/pack-render.js, using the
//                 very same generator code. The pixels match.
//
// This file must stay import-free: inside the APK the app root is web/, so a
// relative "../tools/..." import would not resolve there. The generator is loaded
// lazily by pack-render.js instead, and only in the web build.

// Palette table. This is the single source: src/tools/make-wallpapers.js imports
// WP_PALETTES from here, so the baked JPEGs and the runtime renderer cannot drift.
export const WP_PALETTES = [
  { id: "midnight", name: "Midnight", colors: ["#04060f", "#14265f", "#4f6fff", "#c8ddff"] },
  { id: "ember", name: "Ember", colors: ["#100404", "#5c1608", "#ff6a2a", "#ffd6a0"] },
  { id: "blossom", name: "Blossom", colors: ["#150511", "#63164c", "#ff77bd", "#ffe3c4"] },
  { id: "forest", name: "Forest", colors: ["#020c08", "#0d4630", "#3fd39a", "#dcffef"] },
  { id: "sand", name: "Dune", colors: ["#150f06", "#6f5222", "#e2b86f", "#fff6e4"] },
  { id: "ice", name: "Glacier", colors: ["#030b12", "#17506a", "#67d6ef", "#eaffff"] },
  { id: "violet", name: "Ultraviolet", colors: ["#0a0516", "#3a1a6b", "#a779ff", "#f2e4ff"] },
  { id: "mono", name: "Graphite", colors: ["#07080b", "#232833", "#8a94a8", "#ffffff"] },
  { id: "ocean", name: "Abyss", colors: ["#01080d", "#0a3b52", "#22a3b8", "#caf6ff"] },
  { id: "dusk", name: "Rosewood", colors: ["#100512", "#401a45", "#c05a8f", "#ffd7c2"] },
];

export const WP_STYLES = [
  { id: "aurora", name: "Aurora" },
  { id: "nebula", name: "Nebula" },
  { id: "mesh", name: "Mesh" },
  { id: "starry", name: "Starfield" },
  { id: "matte", name: "Matte" },
  { id: "silk", name: "Silk" },
  { id: "topo", name: "Topograph" },
  { id: "bokeh", name: "Bokeh" },
];

export const WP_FULL_W = 1620;
export const WP_FULL_H = 3510;

export const WALLPAPERS = [
  { id: "aura-01-aurora", name: "Midnight Aurora", tag: "aurora", style: "aurora", palette: "midnight", seed: 7919 },
  { id: "aura-02-aurora", name: "Glacier Aurora", tag: "aurora", style: "aurora", palette: "ice", seed: 15855 },
  { id: "aura-03-aurora", name: "Midnight Aurora", tag: "aurora", style: "aurora", palette: "midnight", seed: 23791 },
  { id: "aura-04-aurora", name: "Glacier Aurora", tag: "aurora", style: "aurora", palette: "ice", seed: 31727 },
  { id: "aura-05-aurora", name: "Midnight Aurora", tag: "aurora", style: "aurora", palette: "midnight", seed: 39663 },
  { id: "aura-06-aurora", name: "Glacier Aurora", tag: "aurora", style: "aurora", palette: "ice", seed: 47599 },
  { id: "aura-07-aurora", name: "Midnight Aurora", tag: "aurora", style: "aurora", palette: "midnight", seed: 55535 },
  { id: "aura-08-aurora", name: "Glacier Aurora", tag: "aurora", style: "aurora", palette: "ice", seed: 63471 },
  { id: "aura-09-aurora", name: "Midnight Aurora", tag: "aurora", style: "aurora", palette: "midnight", seed: 71407 },
  { id: "aura-10-aurora", name: "Glacier Aurora", tag: "aurora", style: "aurora", palette: "ice", seed: 79343 },
  { id: "aura-11-aurora", name: "Midnight Aurora", tag: "aurora", style: "aurora", palette: "midnight", seed: 87279 },
  { id: "aura-12-aurora", name: "Glacier Aurora", tag: "aurora", style: "aurora", palette: "ice", seed: 95215 },
  { id: "aura-13-aurora", name: "Midnight Aurora", tag: "aurora", style: "aurora", palette: "midnight", seed: 103151 },
  { id: "aura-14-aurora", name: "Glacier Aurora", tag: "aurora", style: "aurora", palette: "ice", seed: 111087 },
  { id: "aura-15-nebula", name: "Forest Nebula", tag: "nebula", style: "nebula", palette: "forest", seed: 118916 },
  { id: "aura-16-nebula", name: "Abyss Nebula", tag: "nebula", style: "nebula", palette: "ocean", seed: 126852 },
  { id: "aura-17-nebula", name: "Forest Nebula", tag: "nebula", style: "nebula", palette: "forest", seed: 134788 },
  { id: "aura-18-nebula", name: "Abyss Nebula", tag: "nebula", style: "nebula", palette: "ocean", seed: 142724 },
  { id: "aura-19-nebula", name: "Forest Nebula", tag: "nebula", style: "nebula", palette: "forest", seed: 150660 },
  { id: "aura-20-nebula", name: "Abyss Nebula", tag: "nebula", style: "nebula", palette: "ocean", seed: 158596 },
  { id: "aura-21-nebula", name: "Forest Nebula", tag: "nebula", style: "nebula", palette: "forest", seed: 166532 },
  { id: "aura-22-nebula", name: "Abyss Nebula", tag: "nebula", style: "nebula", palette: "ocean", seed: 174468 },
  { id: "aura-23-nebula", name: "Forest Nebula", tag: "nebula", style: "nebula", palette: "forest", seed: 182404 },
  { id: "aura-24-nebula", name: "Abyss Nebula", tag: "nebula", style: "nebula", palette: "ocean", seed: 190340 },
  { id: "aura-25-nebula", name: "Forest Nebula", tag: "nebula", style: "nebula", palette: "forest", seed: 198276 },
  { id: "aura-26-nebula", name: "Abyss Nebula", tag: "nebula", style: "nebula", palette: "ocean", seed: 206212 },
  { id: "aura-27-nebula", name: "Forest Nebula", tag: "nebula", style: "nebula", palette: "forest", seed: 214148 },
  { id: "aura-28-nebula", name: "Abyss Nebula", tag: "nebula", style: "nebula", palette: "ocean", seed: 222084 },
  { id: "aura-29-mesh", name: "Ultraviolet Mesh", tag: "mesh", style: "mesh", palette: "violet", seed: 229913 },
  { id: "aura-30-mesh", name: "Ember Mesh", tag: "mesh", style: "mesh", palette: "ember", seed: 237849 },
  { id: "aura-31-mesh", name: "Ultraviolet Mesh", tag: "mesh", style: "mesh", palette: "violet", seed: 245785 },
  { id: "aura-32-mesh", name: "Ember Mesh", tag: "mesh", style: "mesh", palette: "ember", seed: 253721 },
  { id: "aura-33-mesh", name: "Ultraviolet Mesh", tag: "mesh", style: "mesh", palette: "violet", seed: 261657 },
  { id: "aura-34-mesh", name: "Ember Mesh", tag: "mesh", style: "mesh", palette: "ember", seed: 269593 },
  { id: "aura-35-mesh", name: "Ultraviolet Mesh", tag: "mesh", style: "mesh", palette: "violet", seed: 277529 },
  { id: "aura-36-mesh", name: "Ember Mesh", tag: "mesh", style: "mesh", palette: "ember", seed: 285465 },
  { id: "aura-37-mesh", name: "Ultraviolet Mesh", tag: "mesh", style: "mesh", palette: "violet", seed: 293401 },
  { id: "aura-38-mesh", name: "Ember Mesh", tag: "mesh", style: "mesh", palette: "ember", seed: 301337 },
  { id: "aura-39-mesh", name: "Ultraviolet Mesh", tag: "mesh", style: "mesh", palette: "violet", seed: 309273 },
  { id: "aura-40-mesh", name: "Ember Mesh", tag: "mesh", style: "mesh", palette: "ember", seed: 317209 },
  { id: "aura-41-mesh", name: "Ultraviolet Mesh", tag: "mesh", style: "mesh", palette: "violet", seed: 325145 },
  { id: "aura-42-mesh", name: "Ember Mesh", tag: "mesh", style: "mesh", palette: "ember", seed: 333081 },
  { id: "aura-43-starry", name: "Rosewood Starfield", tag: "starry", style: "starry", palette: "dusk", seed: 340910 },
  { id: "aura-44-starry", name: "Dune Starfield", tag: "starry", style: "starry", palette: "sand", seed: 348846 },
  { id: "aura-45-starry", name: "Rosewood Starfield", tag: "starry", style: "starry", palette: "dusk", seed: 356782 },
  { id: "aura-46-starry", name: "Dune Starfield", tag: "starry", style: "starry", palette: "sand", seed: 364718 },
  { id: "aura-47-starry", name: "Rosewood Starfield", tag: "starry", style: "starry", palette: "dusk", seed: 372654 },
  { id: "aura-48-starry", name: "Dune Starfield", tag: "starry", style: "starry", palette: "sand", seed: 380590 },
  { id: "aura-49-starry", name: "Rosewood Starfield", tag: "starry", style: "starry", palette: "dusk", seed: 388526 },
  { id: "aura-50-starry", name: "Dune Starfield", tag: "starry", style: "starry", palette: "sand", seed: 396462 },
  { id: "aura-51-starry", name: "Rosewood Starfield", tag: "starry", style: "starry", palette: "dusk", seed: 404398 },
  { id: "aura-52-starry", name: "Dune Starfield", tag: "starry", style: "starry", palette: "sand", seed: 412334 },
  { id: "aura-53-starry", name: "Rosewood Starfield", tag: "starry", style: "starry", palette: "dusk", seed: 420270 },
  { id: "aura-54-starry", name: "Dune Starfield", tag: "starry", style: "starry", palette: "sand", seed: 428206 },
  { id: "aura-55-starry", name: "Rosewood Starfield", tag: "starry", style: "starry", palette: "dusk", seed: 436142 },
  { id: "aura-56-starry", name: "Dune Starfield", tag: "starry", style: "starry", palette: "sand", seed: 444078 },
  { id: "aura-57-matte", name: "Blossom Matte", tag: "matte", style: "matte", palette: "blossom", seed: 451907 },
  { id: "aura-58-matte", name: "Graphite Matte", tag: "matte", style: "matte", palette: "mono", seed: 459843 },
  { id: "aura-59-matte", name: "Blossom Matte", tag: "matte", style: "matte", palette: "blossom", seed: 467779 },
  { id: "aura-60-matte", name: "Graphite Matte", tag: "matte", style: "matte", palette: "mono", seed: 475715 },
  { id: "aura-61-matte", name: "Blossom Matte", tag: "matte", style: "matte", palette: "blossom", seed: 483651 },
  { id: "aura-62-matte", name: "Graphite Matte", tag: "matte", style: "matte", palette: "mono", seed: 491587 },
  { id: "aura-63-matte", name: "Blossom Matte", tag: "matte", style: "matte", palette: "blossom", seed: 499523 },
  { id: "aura-64-matte", name: "Graphite Matte", tag: "matte", style: "matte", palette: "mono", seed: 507459 },
  { id: "aura-65-matte", name: "Blossom Matte", tag: "matte", style: "matte", palette: "blossom", seed: 515395 },
  { id: "aura-66-matte", name: "Graphite Matte", tag: "matte", style: "matte", palette: "mono", seed: 523331 },
  { id: "aura-67-matte", name: "Blossom Matte", tag: "matte", style: "matte", palette: "blossom", seed: 531267 },
  { id: "aura-68-matte", name: "Graphite Matte", tag: "matte", style: "matte", palette: "mono", seed: 539203 },
  { id: "aura-69-matte", name: "Blossom Matte", tag: "matte", style: "matte", palette: "blossom", seed: 547139 },
  { id: "aura-70-matte", name: "Graphite Matte", tag: "matte", style: "matte", palette: "mono", seed: 555075 },
  { id: "aura-71-silk", name: "Glacier Silk", tag: "silk", style: "silk", palette: "ice", seed: 562904 },
  { id: "aura-72-silk", name: "Midnight Silk", tag: "silk", style: "silk", palette: "midnight", seed: 570840 },
  { id: "aura-73-silk", name: "Glacier Silk", tag: "silk", style: "silk", palette: "ice", seed: 578776 },
  { id: "aura-74-silk", name: "Midnight Silk", tag: "silk", style: "silk", palette: "midnight", seed: 586712 },
  { id: "aura-75-silk", name: "Glacier Silk", tag: "silk", style: "silk", palette: "ice", seed: 594648 },
  { id: "aura-76-silk", name: "Midnight Silk", tag: "silk", style: "silk", palette: "midnight", seed: 602584 },
  { id: "aura-77-silk", name: "Glacier Silk", tag: "silk", style: "silk", palette: "ice", seed: 610520 },
  { id: "aura-78-silk", name: "Midnight Silk", tag: "silk", style: "silk", palette: "midnight", seed: 618456 },
  { id: "aura-79-silk", name: "Glacier Silk", tag: "silk", style: "silk", palette: "ice", seed: 626392 },
  { id: "aura-80-silk", name: "Midnight Silk", tag: "silk", style: "silk", palette: "midnight", seed: 634328 },
  { id: "aura-81-silk", name: "Glacier Silk", tag: "silk", style: "silk", palette: "ice", seed: 642264 },
  { id: "aura-82-silk", name: "Midnight Silk", tag: "silk", style: "silk", palette: "midnight", seed: 650200 },
  { id: "aura-83-silk", name: "Glacier Silk", tag: "silk", style: "silk", palette: "ice", seed: 658136 },
  { id: "aura-84-silk", name: "Midnight Silk", tag: "silk", style: "silk", palette: "midnight", seed: 666072 },
  { id: "aura-85-topo", name: "Abyss Topograph", tag: "topo", style: "topo", palette: "ocean", seed: 673901 },
  { id: "aura-86-topo", name: "Forest Topograph", tag: "topo", style: "topo", palette: "forest", seed: 681837 },
  { id: "aura-87-topo", name: "Abyss Topograph", tag: "topo", style: "topo", palette: "ocean", seed: 689773 },
  { id: "aura-88-topo", name: "Forest Topograph", tag: "topo", style: "topo", palette: "forest", seed: 697709 },
  { id: "aura-89-topo", name: "Abyss Topograph", tag: "topo", style: "topo", palette: "ocean", seed: 705645 },
  { id: "aura-90-topo", name: "Forest Topograph", tag: "topo", style: "topo", palette: "forest", seed: 713581 },
  { id: "aura-91-topo", name: "Abyss Topograph", tag: "topo", style: "topo", palette: "ocean", seed: 721517 },
  { id: "aura-92-topo", name: "Forest Topograph", tag: "topo", style: "topo", palette: "forest", seed: 729453 },
  { id: "aura-93-topo", name: "Abyss Topograph", tag: "topo", style: "topo", palette: "ocean", seed: 737389 },
  { id: "aura-94-topo", name: "Forest Topograph", tag: "topo", style: "topo", palette: "forest", seed: 745325 },
  { id: "aura-95-topo", name: "Abyss Topograph", tag: "topo", style: "topo", palette: "ocean", seed: 753261 },
  { id: "aura-96-topo", name: "Forest Topograph", tag: "topo", style: "topo", palette: "forest", seed: 761197 },
  { id: "aura-97-topo", name: "Abyss Topograph", tag: "topo", style: "topo", palette: "ocean", seed: 769133 },
  { id: "aura-98-topo", name: "Forest Topograph", tag: "topo", style: "topo", palette: "forest", seed: 777069 },
  { id: "aura-99-bokeh", name: "Ember Bokeh", tag: "bokeh", style: "bokeh", palette: "ember", seed: 784898 },
  { id: "aura-100-bokeh", name: "Ultraviolet Bokeh", tag: "bokeh", style: "bokeh", palette: "violet", seed: 792834 },
  { id: "aura-101-bokeh", name: "Ember Bokeh", tag: "bokeh", style: "bokeh", palette: "ember", seed: 800770 },
  { id: "aura-102-bokeh", name: "Ultraviolet Bokeh", tag: "bokeh", style: "bokeh", palette: "violet", seed: 808706 },
  { id: "aura-103-bokeh", name: "Ember Bokeh", tag: "bokeh", style: "bokeh", palette: "ember", seed: 816642 },
  { id: "aura-104-bokeh", name: "Ultraviolet Bokeh", tag: "bokeh", style: "bokeh", palette: "violet", seed: 824578 },
  { id: "aura-105-bokeh", name: "Ember Bokeh", tag: "bokeh", style: "bokeh", palette: "ember", seed: 832514 },
  { id: "aura-106-bokeh", name: "Ultraviolet Bokeh", tag: "bokeh", style: "bokeh", palette: "violet", seed: 840450 },
  { id: "aura-107-bokeh", name: "Ember Bokeh", tag: "bokeh", style: "bokeh", palette: "ember", seed: 848386 },
  { id: "aura-108-bokeh", name: "Ultraviolet Bokeh", tag: "bokeh", style: "bokeh", palette: "violet", seed: 856322 },
  { id: "aura-109-bokeh", name: "Ember Bokeh", tag: "bokeh", style: "bokeh", palette: "ember", seed: 864258 },
  { id: "aura-110-bokeh", name: "Ultraviolet Bokeh", tag: "bokeh", style: "bokeh", palette: "violet", seed: 872194 },
  { id: "aura-111-bokeh", name: "Ember Bokeh", tag: "bokeh", style: "bokeh", palette: "ember", seed: 880130 },
  { id: "aura-112-bokeh", name: "Ultraviolet Bokeh", tag: "bokeh", style: "bokeh", palette: "violet", seed: 888066 },
];

export const WP_FULL_DIR = "wallpapers/full/";
export const WP_THUMB_DIR = "wallpapers/thumb/";

export function wpFullPath(wp) { return WP_FULL_DIR + wp.id + ".jpg"; }
export function wpThumbPath(wp) { return WP_THUMB_DIR + wp.id + ".jpg"; }
export function wpById(id) { return WALLPAPERS.find((w) => w.id === id) || null; }

export function wpColors(wp) {
  const p = WP_PALETTES.find((x) => x.id === wp.palette);
  return p ? p.colors : WP_PALETTES[0].colors;
}

export function wpStyleName(id) {
  const s = WP_STYLES.find((x) => x.id === id);
  return s ? s.name : id;
}

/** The {seed, style, colors} triple the generator needs to reproduce a wallpaper. */
export function wpSpec(wp) {
  return { seed: wp.seed, style: wp.style, colors: wpColors(wp) };
}
