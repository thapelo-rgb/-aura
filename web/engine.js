import { BACKGROUNDS } from "./config.js";
import { capabilities } from "./capabilities.js";

const STYLE_INDEX = {};
BACKGROUNDS.forEach((b, i) => (STYLE_INDEX[b.id] = i));

const VS = "attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }";

const FS = [
  "precision highp float;",
  "uniform vec2 uRes; uniform float uTime; uniform float uStyle; uniform vec2 uPar;",
  "uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uIntensity; uniform float uSpeed;",
  "float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }",
  "float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);",
  "  float a=h21(i), b=h21(i+vec2(1.0,0.0)), c=h21(i+vec2(0.0,1.0)), d=h21(i+vec2(1.0,1.0));",
  "  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }",
  "float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v += a*vn(p); p = p*2.03 + 11.7; a *= 0.5; } return v; }",
  "void main(){",
  "  vec2 uv = (gl_FragCoord.xy - 0.5*uRes)/uRes.y;",
  "  float t = uTime*uSpeed;",
  "  vec3 col = vec3(0.0);",
  "  if(uStyle < 0.5){",
  "    vec2 p = uv + uPar*0.18;",
  "    float n = fbm(vec2(p.x*1.15 + t*0.05, p.y*1.7 - t*0.02));",
  "    float n2 = fbm(vec2(p.x*2.1 - t*0.04 + 4.0, p.y*1.05 + 2.0));",
  "    float curtain = 0.40 + 0.60*fbm(vec2(p.x*3.2 + t*0.05, p.y*0.55));",
  "    float fil = vn(vec2(p.x*30.0 + n*3.5, p.y*0.5 + t*0.05));",
  "    float stri = 0.35 + 0.65*(1.0 - abs(2.0*fil - 1.0));",
  "    float c1 = -0.05 + (n - 0.5)*0.95;",
  "    float c2 = 0.22 + (n2 - 0.5)*0.75;",
  "    float d1 = abs(p.y - c1);",
  "    float d2 = abs(p.y - c2);",
  "    col = uA * (0.35 + 0.65*fbm(p*3.0 + vec2(0.0, t*0.015)));",
  "    col += uB * exp(-d1*d1*16.0) * curtain * stri * 1.0;",
  "    col += uC * exp(-d2*d2*24.0) * (0.5 + 0.5*curtain) * stri * 0.85;",
  "    col += uC * exp(-d1*d1*3.0) * 0.10;",
  "    col += uB * exp(-d2*d2*3.0) * 0.07;",
  "  } else if(uStyle < 1.5){",
  "    vec2 p = uv*1.15 + uPar*0.22;",
  "    float f = fbm(p*1.4 + t*0.02);",
  "    float f2 = fbm(p*2.9 - t*0.017 + 3.0);",
  "    col = mix(uA*0.45, uB, pow(f,1.3)*0.85);",
  "    col = mix(col, uC, pow(f2,1.6)*0.40);",
  "    col += (f2 - 0.5)*0.05;",
  "  } else if(uStyle < 2.5){",
  "    vec2 p = uv + uPar*0.12;",
  "    vec2 a = vec2(sin(t*0.13)*0.55, cos(t*0.11)*0.40);",
  "    vec2 b = vec2(cos(t*0.09 + 1.0)*0.66, sin(t*0.15)*0.46);",
  "    vec2 c = vec2(sin(t*0.07 + 2.2)*0.70, cos(t*0.12 + 1.3)*0.32);",
  "    col = uA*0.55;",
  "    col += uB*(1.0/(0.35 + pow(length(p-a),2.0)*2.4))*0.38;",
  "    col += uC*(1.0/(0.35 + pow(length(p-b),2.0)*2.4))*0.38;",
  "    col += mix(uB,uC,0.5)*(1.0/(0.35 + pow(length(p-c),2.0)*2.4))*0.38;",
  "  } else if(uStyle < 3.5){",
  "    vec2 p = uv + uPar*0.5;",
  "    col = uA*0.75;",
  "    for(int i=0;i<3;i++){",
  "      float fi = float(i);",
  "      float sc = 7.0 + fi*9.0;",
  "      vec2 sp = p*sc + vec2(fi*17.3, fi*9.1) + uPar*(fi+1.0)*0.9;",
  "      vec2 cell = floor(sp); vec2 f = fract(sp) - 0.5;",
  "      float on = step(0.86, h21(cell*1.31 + fi*7.0));",
  "      float star = smoothstep(0.10 + fi*0.03, 0.0, length(f));",
  "      float tw = 0.55 + 0.45*sin(t*(1.4 + h21(cell)*2.5) + h21(cell)*30.0);",
  "      col += mix(uC, vec3(1.0), 0.3)*star*on*tw*(0.35 + fi*0.33);",
  "    }",
  "  } else {",
  "    float n = fbm(uv*1.6 + vec2(t*0.02, 0.0));",
  "    col = mix(uA*0.8, uB, n*0.65);",
  "    col = mix(col, uC, smoothstep(0.2,1.0, uv.y + 0.5)*0.18);",
  "  }",
  "  col += (h21(gl_FragCoord.xy*0.9 + fract(t)) - 0.5) * 0.026 + (h21(gl_FragCoord.xy*3.1 + fract(t*7.0)) - 0.5) * 0.009;",
  "  float v = smoothstep(1.35, 0.25, length(uv*vec2(1.0,1.15)));",
  "  col *= 0.35 + 0.65*v;",
  "  gl_FragColor = vec4(col*uIntensity, 1.0);",
  "}",
].join("\n");

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const s = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(s, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export const engine = {
  canvas: null,
  gl: null,
  ctx2d: null,
  prog: null,
  uniforms: {},
  startTime: 0,
  raf: 0,
  style: 0,
  colors: BACKGROUNDS[0].colors,
  intensity: 1,
  speed: 1,
  par: { x: 0, y: 0 },
  parTarget: { x: 0, y: 0 },
  parSource: "none",
  sensor: { beta: 0, gamma: 0, active: false, last: 0 },
  w: 1,
  h: 1,
  running: false,

  init(canvas) {
    this.canvas = canvas;
    this.resize();
    if (capabilities.webgl) {
      try {
        this.gl = canvas.getContext("webgl", {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        });
      } catch (e) {
        this.gl = null;
      }
    }
    if (this.gl) {
      this._buildGL();
    } else {
      this.ctx2d = canvas.getContext("2d");
    }
    this.startTime = performance.now();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this.resize(), 250));
  },

  _compile(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("shader compile failed:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  },

  _buildGL() {
    const gl = this.gl;
    const vs = this._compile(gl.VERTEX_SHADER, VS);
    const fs = this._compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) {
      this.gl = null;
      this.ctx2d = this.canvas.getContext("2d");
      return;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("program link failed");
      this.gl = null;
      this.ctx2d = this.canvas.getContext("2d");
      return;
    }
    this.prog = prog;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ["uRes", "uTime", "uStyle", "uPar", "uA", "uB", "uC", "uIntensity", "uSpeed"].forEach((n) => {
      this.uniforms[n] = gl.getUniformLocation(prog, n);
    });
  },

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round((r.width || this.canvas.clientWidth || 360) * dpr));
    const h = Math.max(1, Math.round((r.height || this.canvas.clientHeight || 640) * dpr));
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.gl) this.gl.viewport(0, 0, w, h);
  },

  setStyle(id) {
    this.style = STYLE_INDEX[id] != null ? STYLE_INDEX[id] : 0;
  },

  setColors(colors) {
    if (Array.isArray(colors) && colors.length >= 3) this.colors = colors;
  },

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(2, v));
  },

  setSpeed(v) {
    this.speed = Math.max(0, Math.min(3, v));
  },

  startSensors() {
    if (capabilities.reducedMotion) return;
    const onOrient = (e) => {
      if (e.beta == null && e.gamma == null) return;
      this.sensor.beta = e.beta || 0;
      this.sensor.gamma = e.gamma || 0;
      this.sensor.active = true;
      this.sensor.last = performance.now();
      this.parSource = "sensor";
    };
    window.addEventListener("deviceorientation", onOrient, true);
    window.addEventListener("deviceorientationabsolute", onOrient, true);
  },

  startPointer(el) {
    const target = el || window;
    const apply = (e) => {
      if (this.parSource === "sensor" && this.sensor.active && performance.now() - this.sensor.last < 1500) return;
      this.parSource = "pointer";
      const r = (el || document.documentElement).getBoundingClientRect();
      const x = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
      const y = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
      this.parTarget.x = x;
      this.parTarget.y = y;
    };
    target.addEventListener("pointermove", apply, { passive: true });
    target.addEventListener("touchmove", (e) => { if (e.touches[0]) apply(e.touches[0]); }, { passive: true });
  },

  activeSource() {
    if (this.sensor.active && performance.now() - this.sensor.last < 1500) return "sensor";
    return this.parSource === "pointer" ? "pointer" : "none";
  },

  start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(tick);
      this.render();
    };
    this.raf = requestAnimationFrame(tick);
  },

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  },

  currentPar() {
    if (this.sensor.active && performance.now() - this.sensor.last < 1500) {
      return { x: Math.max(-0.5, Math.min(0.5, this.sensor.gamma / 90)), y: Math.max(-0.5, Math.min(0.5, this.sensor.beta / 90)) };
    }
    return this.parTarget;
  },

  render() {
    const now = performance.now();
    const t = (now - this.startTime) / 1000;
    const p = this.currentPar();
    this.par.x += (p.x - this.par.x) * 0.06;
    this.par.y += (p.y - this.par.y) * 0.06;

    const sr = document.getElementById("screen");
    if (sr) {
      sr.style.setProperty("--par-x", this.par.x.toFixed(4));
      sr.style.setProperty("--par-y", this.par.y.toFixed(4));
    }

    if (this.gl) {
      const gl = this.gl;
      const u = this.uniforms;
      gl.useProgram(this.prog);
      gl.uniform2f(u.uRes, this.w, this.h);
      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uStyle, this.style);
      gl.uniform2f(u.uPar, this.par.x, this.par.y);
      gl.uniform3fv(u.uA, hexToRgb(this.colors[0]));
      gl.uniform3fv(u.uB, hexToRgb(this.colors[1]));
      gl.uniform3fv(u.uC, hexToRgb(this.colors[2]));
      gl.uniform1f(u.uIntensity, this.intensity);
      gl.uniform1f(u.uSpeed, this.speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (this.ctx2d) {
      this._render2d(t);
    }
  },

  _render2d(t) {
    const c = this.ctx2d;
    const w = this.w;
    const h = this.h;
    const A = this.colors[0];
    const B = this.colors[1];
    const C = this.colors[2];
    c.globalAlpha = 1;
    c.fillStyle = A;
    c.fillRect(0, 0, w, h);
    const blobs = [
      { c: B, sx: 0.13, sy: 0.09, r: 0.95, px: 0.32, py: 0.3 },
      { c: C, sx: 0.09, sy: 0.15, r: 0.8, px: 0.68, py: 0.5 },
      { c: B, sx: 0.07, sy: 0.12, r: 0.7, px: 0.45, py: 0.78 },
    ];
    for (const b of blobs) {
      const x = (b.px + Math.sin(t * b.sx) * 0.22 + this.par.x * 0.25) * w;
      const y = (b.py + Math.cos(t * b.sy) * 0.2 + this.par.y * 0.25) * h;
      const r = Math.max(w, h) * b.r;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, b.c);
      g.addColorStop(1, "rgba(0,0,0,0)");
      c.globalAlpha = 0.55 * this.intensity;
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    c.globalAlpha = 1;
  },
};
