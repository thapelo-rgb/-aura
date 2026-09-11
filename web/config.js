// App-level config. On the Perchance page main.pjs `getAppConfig()` overrides this,
// but this copy keeps AURA identical (and self-contained) inside the APK shell.
export const APP = {
  name: "AURA",
  tagline: "make it yours",
  version: "0.3.0",
  accent: "#7c9cff",
  defaultTheme: "midnight",
  defaultBackground: "aurora",
  quotes: [
    "Perfection is achieved when there is nothing left to take away.",
    "Design is not just what it looks like. Design is how it works.",
    "Details make the design.",
    "Less, but better.",
    "Whitespace is a design element, not empty space.",
    "Motion gives meaning to change.",
    "Simplicity is the ultimate sophistication.",
    "Good design is as little design as possible.",
    "Make it useful, then make it beautiful.",
    "Have nothing you do not know to be useful or believe to be beautiful.",
    "Form follows feeling.",
    "Make it feel alive.",
  ],
};

export const ICONS = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5V12l3 2"></path></svg>',
  battery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="2.5" y="7" width="16" height="10" rx="3"></rect><path d="M21 10.5v3"></path><path d="M6 10.5v3M9.5 10.5v3"></path></svg>',
  weather: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8.5" cy="8.5" r="3.2"></circle><path d="M8.5 2.5v1.4M2.5 8.5h1.4M4.3 4.3l1 1M12.7 4.3l-1 1"></path><path d="M9 18.5h8.2a3.3 3.3 0 0 0 0-6.6 4.2 4.2 0 0 0-7.9 1.3A3 3 0 0 0 9 18.5z"></path></svg>',
  quote: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7.5 6.5C5 6.5 3.5 8.6 3.5 11.2c0 2.2 1.4 3.8 3.4 3.8.5 0 .9-.1 1.2-.2-.4 1.6-1.7 2.7-3.2 3v1.7c3.6-.5 6-3.3 6-7.6 0-3.2-1.3-5.4-3.4-5.4zm9 0c-2.5 0-4 2.1-4 4.7 0 2.2 1.4 3.8 3.4 3.8.5 0 .9-.1 1.2-.2-.4 1.6-1.7 2.7-3.2 3v1.7c3.6-.5 6-3.3 6-7.6 0-3.2-1.3-5.4-3.4-5.4z"></path></svg>',
  notes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="3"></rect><path d="M8 8h8M8 12h8M8 16h5"></path></svg>',
  motion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12c2 0 2.2-5 4.2-5s2.1 10 4.1 10 2.3-7 4.3-7 2.2 2 4.4 2"></path></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9z"></path></svg>',
};

export const BACKGROUNDS = [
  { id: "aurora", name: "Aurora", desc: "Flowing light ribbons", colors: ["#070c22", "#2f5fe0", "#67e6ff"] },
  { id: "nebula", name: "Nebula", desc: "Deep drifting clouds", colors: ["#0e0820", "#7a3ce0", "#ff86c8"] },
  { id: "mesh", name: "Mesh", desc: "Soft gradient blobs", colors: ["#140f2c", "#ff9ad5", "#7cf0d0"] },
  { id: "stars", name: "Parallax", desc: "Depth starfield", colors: ["#02030a", "#4b66ff", "#ffffff"] },
  { id: "minimal", name: "Minimal", desc: "Quiet matte gradient", colors: ["#08090f", "#232838", "#8aa2ff"] },
];

export const THEMES = [
  { id: "midnight", name: "Midnight", bg: "aurora", accent: "#7c9cff", accent2: "#b98cff", radius: 22, blur: 18, glass: 58 },
  { id: "porcelain", name: "Porcelain", bg: "minimal", accent: "#9aa3b8", accent2: "#cdd4e4", radius: 16, blur: 20, glass: 64 },
  { id: "blossom", name: "Blossom", bg: "mesh", accent: "#ff9ad5", accent2: "#ffca7a", radius: 28, blur: 24, glass: 54 },
  { id: "forest", name: "Forest", bg: "aurora", accent: "#5fd7a6", accent2: "#8ce0ff", radius: 20, blur: 16, glass: 56 },
  { id: "ember", name: "Ember", bg: "nebula", accent: "#ff8f6b", accent2: "#ffd06b", radius: 20, blur: 16, glass: 58 },
  { id: "oled", name: "OLED", bg: "minimal", accent: "#cdd6ff", accent2: "#7c9cff", radius: 14, blur: 6, glass: 80 },
];

export const WIDGETS = [
  { id: "clock", name: "Clock", desc: "Live time, analog or digital", icon: "clock", w: 176, h: 106, def: { face: "digital" } },
  { id: "battery", name: "Battery", desc: "Charge level + drain feel", icon: "battery", w: 176, h: 104, def: {} },
  { id: "weather", name: "Weather", desc: "Open-Meteo forecast", icon: "weather", w: 200, h: 116, def: {} },
  { id: "quote", name: "Quote", desc: "A line to live by", icon: "quote", w: 232, h: 126, def: {} },
  { id: "notes", name: "Notes", desc: "Editable memo, saved locally", icon: "notes", w: 232, h: 138, def: {} },
  { id: "motion", name: "Motion", desc: "Live gyroscope readout", icon: "motion", w: 208, h: 104, def: {} },
  { id: "insight", name: "Insight", desc: "Rotating daily thought", icon: "spark", w: 208, h: 104, def: {} },
];

export const EFFECTS = [
  { id: "ripple", name: "Tap ripples", desc: "Soft rings bloom where you touch", def: true },
  { id: "trail", name: "Pointer trail", desc: "Glowing motes drift off your finger", def: true },
  { id: "ambient", name: "Ambient floaters", desc: "Slow motes drifting on their own", def: true },
  { id: "sparkle", name: "Widget sparkle", desc: "Spark burst when you tap a widget", def: true },
  { id: "widgetDepth", name: "Widget depth", desc: "Widgets shift with tilt or pointer", def: true },
  { id: "glow", name: "Aura glow", desc: "A soft light follows your touch", def: false },
];

export const ANIM_PRESETS = [
  {
    id: "rise", name: "Rise", desc: "Fade up on a spring",
    easing: "cubic-bezier(.2,.9,.3,1.2)", dur: 680, stagger: 80,
    frames: [
      { at: 0, opacity: 0, ty: 22, scale: 0.95, rot: 0, blur: 8 },
      { at: 60, opacity: 1, ty: -4, scale: 1.01, rot: 0, blur: 0 },
      { at: 100, opacity: 1, ty: 0, scale: 1, rot: 0, blur: 0 },
    ],
  },
  {
    id: "bloom", name: "Bloom", desc: "Grow in from nothing",
    easing: "cubic-bezier(.2,.9,.25,1.3)", dur: 620, stagger: 70,
    frames: [
      { at: 0, opacity: 0, ty: 0, scale: 0.6, rot: 0, blur: 10 },
      { at: 100, opacity: 1, ty: 0, scale: 1, rot: 0, blur: 0 },
    ],
  },
  {
    id: "drift", name: "Drift", desc: "Slide in from the side",
    easing: "cubic-bezier(.16,1,.3,1)", dur: 760, stagger: 90,
    frames: [
      { at: 0, opacity: 0, ty: 0, tx: -40, scale: 1, rot: 0, blur: 6 },
      { at: 100, opacity: 1, ty: 0, tx: 0, scale: 1, rot: 0, blur: 0 },
    ],
  },
  {
    id: "tilt", name: "Tilt", desc: "Curl in with a twist",
    easing: "cubic-bezier(.2,.9,.3,1.15)", dur: 720, stagger: 85,
    frames: [
      { at: 0, opacity: 0, ty: 14, scale: 0.9, rot: -7, blur: 6 },
      { at: 100, opacity: 1, ty: 0, scale: 1, rot: 0, blur: 0 },
    ],
  },
  {
    id: "fade", name: "Fade", desc: "Simple, quiet",
    easing: "ease-out", dur: 520, stagger: 60,
    frames: [
      { at: 0, opacity: 0, ty: 0, scale: 1, rot: 0, blur: 0 },
      { at: 100, opacity: 1, ty: 0, scale: 1, rot: 0, blur: 0 },
    ],
  },
  {
    id: "none", name: "None", desc: "Instant, no motion",
    easing: "linear", dur: 0, stagger: 0,
    frames: [
      { at: 0, opacity: 1, ty: 0, scale: 1, rot: 0, blur: 0 },
      { at: 100, opacity: 1, ty: 0, scale: 1, rot: 0, blur: 0 },
    ],
  },
];

export const MODES = [
  { id: "auto", name: "Auto", desc: "Pick the best mode for this device" },
  { id: "full", name: "Full", desc: "Tilt parallax + every effect" },
  { id: "depth", name: "Depth", desc: "No sensors? Pointer-driven parallax" },
  { id: "effects", name: "Effects", desc: "Ambient motion only, no input needed" },
  { id: "static", name: "Static", desc: "No animation at all" },
];

export function makeDefaultState(appConfig) {
  const effects = {};
  EFFECTS.forEach((e) => (effects[e.id] = e.def));
  return {
    version: 1,
    theme: (appConfig && appConfig.defaultTheme) || "midnight",
    background: (appConfig && appConfig.defaultBackground) || "aurora",
    mode: "auto",
    tune: {},
    effects,
    fx: { intensity: 1, speed: 1, depth: 1, widgetDepth: 1 },
    widgets: [
      { id: "w-clock", type: "clock", x: 7, y: 5, w: 176, h: 106, config: { face: "digital" } },
      { id: "w-quote", type: "quote", x: 20, y: 30, w: 232, h: 126, config: {} },
    ],
    animation: "rise",
    customAnim: {
      easing: "cubic-bezier(.2,.9,.3,1.2)",
      dur: 700,
      stagger: 80,
      frames: [
        { at: 0, opacity: 0, ty: 24, tx: 0, scale: 0.94, rot: -3, blur: 8 },
        { at: 62, opacity: 1, ty: -5, tx: 0, scale: 1.01, rot: 0, blur: 0 },
        { at: 100, opacity: 1, ty: 0, tx: 0, scale: 1, rot: 0, blur: 0 },
      ],
    },
    notes: "",
    weather: { lat: null, lon: null, place: "" },
    // What is actually painted behind the widgets.
    //   kind "style"   -> one of BACKGROUNDS (the live WebGL shader)
    //   kind "builtin" -> a wallpaper from the built-in pack (id)
    //   kind "custom"  -> one of the user's own photos (imageKey, see images.js)
    //   kind "remote"  -> an image the user pasted a link to (url)
    wallpaper: {
      kind: "style",
      id: null,
      imageKey: null,
      url: null,
      dim: 0.30,     // black scrim over a photo, so glass widgets stay readable
      live: 0.0,     // 0..1 opacity of the animated shader *over* a photo
      blur: 0,       // px blur applied to a photo
      lock: false,   // remember this wallpaper as the one to re-apply on launch
      target: "home", // where "set as system wallpaper" writes: home | lock | both
    },
    seenIntro: false,
  };
}
