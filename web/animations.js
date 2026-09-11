import { ANIM_PRESETS } from "./config.js";
import { capabilities } from "./capabilities.js";

export function getAnim(state) {
  if (state.animation === "custom") {
    return Object.assign({ id: "custom", name: "Custom", desc: "Your keyframes" }, state.customAnim);
  }
  return ANIM_PRESETS.find((p) => p.id === state.animation) || ANIM_PRESETS[0];
}

export function toKeyframes(frames) {
  return (frames || []).map((f) => {
    const tx = f.tx || 0;
    const ty = f.ty || 0;
    const kf = {
      offset: Math.max(0, Math.min(1, (f.at || 0) / 100)),
      opacity: f.opacity == null ? 1 : f.opacity,
      transform: `translate3d(${tx}px,${ty}px,0) scale(${f.scale == null ? 1 : f.scale}) rotate(${f.rot || 0}deg)`,
    };
    if (f.blur) kf.filter = `blur(${f.blur}px)`;
    return kf;
  });
}

export function animateIn(els, anim, opts) {
  const nodes = els.filter(Boolean);
  if (!nodes.length) return;
  if (capabilities.reducedMotion || !anim || (anim.dur || 0) <= 0) return;
  const kf = toKeyframes(anim.frames);
  const stagger = (opts && opts.stagger != null ? opts.stagger : anim.stagger) || 0;
  nodes.forEach((el, i) => {
    try {
      el.animate(kf, {
        duration: anim.dur,
        delay: i * stagger,
        easing: anim.easing,
        fill: "both",
      });
    } catch (e) {}
  });
}

export function previewOn(el, anim) {
  if (!el) return;
  if (!anim || (anim.dur || 0) <= 0) {
    el.style.transform = "";
    el.style.opacity = "1";
    return;
  }
  const kf = toKeyframes(anim.frames);
  try {
    el.animate(kf, { duration: anim.dur, easing: anim.easing, fill: "both" });
  } catch (e) {}
}
