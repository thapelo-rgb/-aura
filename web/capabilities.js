export const capabilities = {
  webgl: false,
  canvas2d: false,
  deviceOrientation: false,
  deviceMotion: false,
  needsOrientationPermission: false,
  pointer: false,
  battery: false,
  vibrate: false,
  reducedMotion: false,
  secure: false,
  dpr: 1,
  orientationUsable: false,
  sensorLive: false,
  batteryLevel: null,
};

export function detect() {
  capabilities.secure = !!window.isSecureContext;
  capabilities.dpr = window.devicePixelRatio || 1;
  try {
    capabilities.canvas2d = !!document.createElement("canvas").getContext("2d");
    const gc = document.createElement("canvas");
    capabilities.webgl = !!(gc.getContext("webgl") || gc.getContext("experimental-webgl"));
  } catch (e) {
    capabilities.canvas2d = false;
    capabilities.webgl = false;
  }
  capabilities.deviceOrientation = "DeviceOrientationEvent" in window;
  capabilities.deviceMotion = "DeviceMotionEvent" in window;
  capabilities.needsOrientationPermission =
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";
  capabilities.pointer = "onpointermove" in window;
  capabilities.battery = "getBattery" in navigator;
  capabilities.vibrate = typeof navigator.vibrate === "function";
  try {
    capabilities.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    capabilities.reducedMotion = false;
  }
  capabilities.orientationUsable =
    capabilities.deviceOrientation && capabilities.secure && !capabilities.reducedMotion;
  return capabilities;
}

export function recommendMode(caps) {
  if (!caps.canvas2d && !caps.webgl) return "static";
  if (caps.reducedMotion) return "effects";
  if (caps.sensorLive) return "full";
  if (caps.deviceOrientation && caps.secure && !caps.needsOrientationPermission) return "full";
  if (caps.pointer) return "depth";
  return "effects";
}

export function modeLabel(id) {
  return (
    { auto: "AUTO", full: "FULL", depth: "DEPTH", effects: "FX", static: "STATIC" }[id] || "AUTO"
  );
}

export function describe(caps) {
  return [
    { name: "WebGL wallpaper", ok: caps.webgl, detail: caps.webgl ? "Shader-ready" : "Using canvas 2D" },
    { name: "Canvas 2D", ok: caps.canvas2d, detail: caps.canvas2d ? "Available" : "Missing" },
    { name: "Tilt sensors", ok: caps.sensorLive || (caps.deviceOrientation && !caps.needsOrientationPermission), detail: caps.needsOrientationPermission ? "Needs permission" : caps.deviceOrientation ? "Present" : "Not present" },
    { name: "Motion sensors", ok: caps.deviceMotion, detail: caps.deviceMotion ? "Present" : "Not present" },
    { name: "Pointer input", ok: caps.pointer, detail: caps.pointer ? "Available" : "Touch only" },
    { name: "Battery API", ok: caps.battery, detail: caps.battery ? "Live level" : "Estimated" },
    { name: "Vibration", ok: caps.vibrate, detail: caps.vibrate ? "Haptics on" : "None" },
    { name: "Secure context", ok: caps.secure, detail: caps.secure ? "Yes" : "No (sensors locked)" },
    { name: "Reduced motion", ok: !caps.reducedMotion, detail: caps.reducedMotion ? "System asked for calm" : "Full motion allowed" },
  ];
}

export async function requestOrientationPermission() {
  if (!capabilities.needsOrientationPermission) return true;
  try {
    const res = await DeviceOrientationEvent.requestPermission();
    return res === "granted";
  } catch (e) {
    return false;
  }
}

export async function watchBattery(onChange) {
  if (!capabilities.battery) return null;
  try {
    const b = await navigator.getBattery();
    const update = () => {
      capabilities.batteryLevel = b.level;
      if (onChange) onChange(b);
    };
    update();
    b.addEventListener("levelchange", update);
    b.addEventListener("chargingchange", update);
    return b;
  } catch (e) {
    return null;
  }
}
