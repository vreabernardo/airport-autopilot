import { t as e } from "../chunks/DK3Fl9T5.js";
import {
  $ as t,
  A as n,
  B as r,
  C as i,
  G as a,
  H as o,
  I as s,
  L as c,
  O as l,
  S as u,
  T as d,
  U as f,
  V as p,
  W as m,
  X as h,
  Z as g,
  a as _,
  b as v,
  c as y,
  d as b,
  et as x,
  f as S,
  h as C,
  j as w,
  k as T,
  m as E,
  p as D,
  q as O,
  r as ee,
  s as k,
  u as A,
  w as te,
  x as j,
  y as ne,
} from "../chunks/Ca73-qnQ.js";
import "../chunks/xihTtKlq.js";
import {
  _ as re,
  a as ie,
  b as ae,
  c as M,
  d as N,
  g as P,
  h as F,
  i as I,
  l as L,
  m as R,
  n as oe,
  o as z,
  r as B,
  s as V,
  t as se,
  u as H,
  v as U,
  x as W,
  y as ce,
} from "../chunks/CurhFkDx.js";
var le = e({ prerender: () => !0, ssr: () => !1 }),
  G = {
    chime: {
      masterGain: 0.5,
      layers: [
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 1046.5,
          attack: 0.006,
          decay: 0.22,
          peak: 0.09,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 1568,
          offset: 0.09,
          attack: 0.006,
          decay: 0.26,
          peak: 0.08,
        },
      ],
      shimmer: { delay: 0.12, feedback: 0.25, wet: 0.18, lowpass: 4e3 },
    },
    sparkle: {
      masterGain: 0.5,
      layers: [
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 1760,
          offset: 0,
          attack: 0.003,
          decay: 0.09,
          peak: 0.045,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 2217,
          offset: 0.045,
          attack: 0.003,
          decay: 0.09,
          peak: 0.04,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 2637,
          offset: 0.09,
          attack: 0.003,
          decay: 0.1,
          peak: 0.038,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 3520,
          offset: 0.135,
          attack: 0.003,
          decay: 0.12,
          peak: 0.032,
        },
      ],
      shimmer: { delay: 0.07, feedback: 0.35, wet: 0.22, lowpass: 6e3 },
    },
    droplet: {
      masterGain: 0.55,
      layers: [
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 1200,
          glideTo: 550,
          glideTime: 0.14,
          attack: 0.004,
          decay: 0.2,
          peak: 0.075,
        },
      ],
      shimmer: { delay: 0.09, feedback: 0.2, wet: 0.15, lowpass: 3e3 },
    },
    bloom: {
      masterGain: 0.5,
      layers: [
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 528,
          attack: 0.06,
          decay: 0.32,
          peak: 0.06,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 528,
          detune: 12,
          attack: 0.06,
          decay: 0.34,
          peak: 0.05,
        },
      ],
      shimmer: { delay: 0.15, feedback: 0.2, wet: 0.12, lowpass: 2500 },
    },
    whisper: {
      masterGain: 0.5,
      layers: [
        {
          kind: `noise`,
          filterType: `lowpass`,
          filterFrequency: 1200,
          filterQ: 0.7,
          attack: 0.04,
          decay: 0.16,
          peak: 0.05,
        },
      ],
    },
    tick: {
      masterGain: 0.4,
      layers: [
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 5400,
          filterQ: 1.8,
          attack: 0.001,
          decay: 0.018,
          peak: 0.14,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 2600,
          attack: 0.001,
          decay: 0.012,
          peak: 0.018,
        },
      ],
    },
    press: {
      masterGain: 0.4,
      layers: [
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 1700,
          filterQ: 1.4,
          attack: 0.001,
          decay: 0.02,
          peak: 0.13,
        },
      ],
    },
    release: {
      masterGain: 0.4,
      layers: [
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 4600,
          filterQ: 1.8,
          attack: 0.001,
          decay: 0.016,
          peak: 0.12,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 3200,
          offset: 0.006,
          attack: 0.001,
          decay: 0.05,
          peak: 0.02,
        },
      ],
    },
    toggle: {
      masterGain: 0.4,
      layers: [
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 2200,
          filterQ: 1.6,
          attack: 0.001,
          decay: 0.016,
          peak: 0.12,
        },
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 3800,
          filterQ: 1.6,
          offset: 0.024,
          attack: 0.001,
          decay: 0.02,
          peak: 0.1,
        },
      ],
    },
    success: {
      masterGain: 0.5,
      layers: [
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 880,
          attack: 0.004,
          decay: 0.09,
          peak: 0.06,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 1108.73,
          offset: 0.06,
          attack: 0.004,
          decay: 0.1,
          peak: 0.06,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 1318.51,
          offset: 0.12,
          attack: 0.004,
          decay: 0.18,
          peak: 0.07,
        },
      ],
      shimmer: { delay: 0.1, feedback: 0.22, wet: 0.16, lowpass: 4500 },
    },
    error: {
      masterGain: 0.42,
      layers: [
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 850,
          filterQ: 1.1,
          attack: 0.001,
          decay: 0.035,
          peak: 0.13,
        },
        {
          kind: `tone`,
          waveform: `triangle`,
          frequency: 440,
          offset: 0.025,
          attack: 0.004,
          decay: 0.09,
          peak: 0.045,
        },
        {
          kind: `tone`,
          waveform: `triangle`,
          frequency: 349.23,
          offset: 0.1,
          attack: 0.004,
          decay: 0.14,
          peak: 0.04,
        },
      ],
    },
    page: {
      masterGain: 0.38,
      layers: [
        {
          kind: `noise`,
          filterType: `lowpass`,
          filterFrequency: 1800,
          filterQ: 0.7,
          attack: 0.006,
          decay: 0.08,
          peak: 0.11,
        },
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 4200,
          filterQ: 1.2,
          offset: 0.04,
          attack: 0.004,
          decay: 0.065,
          peak: 0.08,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 2400,
          offset: 0.075,
          attack: 0.002,
          decay: 0.045,
          peak: 0.02,
        },
      ],
    },
    loading: {
      masterGain: 0.42,
      layers: [
        {
          kind: `noise`,
          filterType: `lowpass`,
          filterFrequency: 1400,
          filterQ: 0.6,
          attack: 0.035,
          decay: 0.14,
          peak: 0.035,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 420,
          glideTo: 630,
          glideTime: 0.18,
          attack: 0.025,
          decay: 0.18,
          peak: 0.05,
        },
      ],
      shimmer: { delay: 0.11, feedback: 0.18, wet: 0.12, lowpass: 2800 },
    },
    ready: {
      masterGain: 0.45,
      layers: [
        {
          kind: `noise`,
          filterType: `bandpass`,
          filterFrequency: 3200,
          filterQ: 1.7,
          attack: 0.001,
          decay: 0.018,
          peak: 0.1,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 659.25,
          offset: 0.025,
          attack: 0.012,
          decay: 0.2,
          peak: 0.05,
        },
        {
          kind: `tone`,
          waveform: `sine`,
          frequency: 987.77,
          offset: 0.025,
          attack: 0.012,
          decay: 0.22,
          peak: 0.035,
        },
      ],
      shimmer: { delay: 0.13, feedback: 0.2, wet: 0.13, lowpass: 3600 },
    },
  };
function K(e) {
  return typeof e == `string` && Object.prototype.hasOwnProperty.call(G, e);
}
Object.keys(G);
var q = 0.05,
  ue = 0.05,
  de = 0.001;
function J(e, t, n, r) {
  let i = e.createOscillator();
  if (
    ((i.type = n.waveform),
    i.frequency.setValueAtTime(n.frequency, r),
    n.detune && (i.detune.value = n.detune),
    n.glideTo !== void 0)
  ) {
    let e = n.glideTime ?? n.attack + n.decay;
    i.frequency.exponentialRampToValueAtTime(n.glideTo, r + e);
  }
  let a = e.createGain();
  (a.gain.setValueAtTime(1e-4, r),
    a.gain.exponentialRampToValueAtTime(n.peak, r + n.attack),
    a.gain.exponentialRampToValueAtTime(1e-4, r + n.attack + n.decay),
    i.connect(a).connect(t),
    i.start(r),
    i.stop(r + n.attack + n.decay + q));
}
function Y(e, t, n, r) {
  let i = n.attack + n.decay + q,
    a = Math.max(1, Math.floor(i * e.sampleRate)),
    o = e.createBuffer(1, a, e.sampleRate),
    s = o.getChannelData(0);
  for (let e = 0; e < a; e++) s[e] = 2 * Math.random() - 1;
  let c = e.createBufferSource();
  c.buffer = o;
  let l = e.createBiquadFilter();
  ((l.type = n.filterType),
    (l.frequency.value = n.filterFrequency),
    n.filterQ !== void 0 && (l.Q.value = n.filterQ));
  let u = e.createGain();
  (u.gain.setValueAtTime(1e-4, r),
    u.gain.exponentialRampToValueAtTime(n.peak, r + n.attack),
    u.gain.exponentialRampToValueAtTime(1e-4, r + n.attack + n.decay),
    c.connect(l).connect(u).connect(t),
    c.start(r),
    c.stop(r + i));
}
function fe(e, t, n, r) {
  let i = e.createDelay(1);
  i.delayTime.value = r.delay;
  let a = e.createBiquadFilter();
  ((a.type = `lowpass`), (a.frequency.value = r.lowpass));
  let o = e.createGain();
  o.gain.value = r.feedback;
  let s = e.createGain();
  return (
    (s.gain.value = r.wet),
    t.connect(i),
    i.connect(a),
    a.connect(o),
    o.connect(i),
    a.connect(s),
    s.connect(n),
    [i, a, o, s]
  );
}
function X(e) {
  return Math.max(
    ...e.layers.map((e) => (e.offset ?? 0) + e.attack + e.decay + q),
  );
}
function pe(e) {
  return !e || e.feedback <= 0
    ? 0
    : e.feedback >= 1
      ? e.delay
      : e.delay * (1 + Math.ceil(Math.log(de) / Math.log(e.feedback)));
}
function me(e, t) {
  let n = e.currentTime,
    r = e.createGain();
  ((r.gain.value = t.masterGain), r.connect(e.destination));
  let i = t.shimmer ? fe(e, r, e.destination, t.shimmer) : [];
  for (let i of t.layers) {
    let t = n + (i.offset ?? 0);
    i.kind === `tone` ? J(e, r, i, t) : Y(e, r, i, t);
  }
  let a = (X(t) + pe(t.shimmer) + ue) * 1e3;
  setTimeout(() => {
    r.disconnect();
    for (let e of i) e.disconnect();
  }, a);
}
var he = null,
  ge = !0;
function _e(e) {
  typeof e == `boolean` && (ge = e);
}
function ve() {
  if (he) return he;
  if (typeof window > `u`) return null;
  let e = window.AudioContext ?? window.webkitAudioContext;
  if (!e) return null;
  try {
    he = new e();
  } catch {
    return null;
  }
  return he;
}
function ye(e = `chime`) {
  if (
    !ge ||
    !K(e) ||
    (typeof navigator < `u` && navigator.userActivation?.hasBeenActive === !1)
  )
    return;
  let t = ve();
  if (!t) return;
  let n = G[e];
  if (t.state === `running`) me(t, n);
  else
    try {
      t.resume().then(
        () => {
          ge && t.state === `running` && me(t, n);
        },
        () => {},
      );
    } catch {}
}
var be = 150,
  xe = new WeakSet(),
  Se = new WeakSet(),
  Ce = -1 / 0;
function we(e, t, n) {
  let r = e.getAttribute(t);
  return K(r) ? r : n;
}
function Te(e) {
  return (
    e.pointerType === `mouse` &&
    window.matchMedia(`(hover: hover) and (pointer: fine)`).matches
  );
}
function Ee(e, t, n) {
  if (!(t.target instanceof Element)) return null;
  let r = t.target.closest(`[${n}]`);
  return r && e.contains(r) ? r : null;
}
function De(e, t, n, r, i = !1) {
  e.addEventListener(
    t,
    (a) => {
      let o = Ee(e, a, n);
      if (!(!o || Se.has(a)) && !(i && !Te(a))) {
        if (t === `pointerenter`) {
          let e = a.relatedTarget;
          if (e instanceof Node && o.contains(e)) return;
          let t = performance.now();
          if (t - Ce < be) return;
          Ce = t;
        }
        (Se.add(a), ye(we(o, n, r)));
      }
    },
    !0,
  );
}
function Oe(e) {
  if (typeof document > `u`) return;
  let t = e ?? document;
  xe.has(t) ||
    (xe.add(t),
    De(t, `pointerenter`, `data-cuelume-hover`, `chime`, !0),
    De(t, `pointerdown`, `data-cuelume-press`, `press`),
    De(t, `pointerup`, `data-cuelume-release`, `release`),
    De(t, `click`, `data-cuelume-toggle`, `toggle`));
}
var ke = (e, t) => {
    let n = e.x - t.x,
      r = e.y - t.y;
    return n * n + r * r;
  },
  Z = (e, t) => Math.sqrt(ke(e, t)),
  Ae = (e, t) => Math.atan2(t.y - e.y, t.x - e.x),
  Q = (e) => ({ x: e.x, y: e.y }),
  je = 1;
function Me(e, t, n) {
  return {
    id: je++,
    kind: e,
    pos: Q(t),
    heading: n,
    spec: I[e],
    path: [],
    state: `flying`,
    target: null,
    landProgress: 0,
    takeoffProgress: 0,
    departureReadyAt: null,
    scheduledDepartureAt: null,
    departureQueueOrder: null,
    age: 0,
  };
}
function Ne(e, t, n) {
  let r = null,
    i = 10;
  for (let a of n) {
    if (!e.spec.allows.includes(a.color)) continue;
    let n = Z(t, a.approach);
    n <= i && ((r = a), (i = n));
  }
  return r;
}
function Pe(e, t, n) {
  let r = Ne(e, t, n);
  if (r) return { status: `eligible`, runway: r };
  let i = null,
    a = 10;
  for (let e of n) {
    let n = Z(t, e.end);
    n <= a && ((i = e), (a = n));
  }
  if (i) return { status: `direction`, runway: i };
  let o = null,
    s = 10;
  for (let r of n) {
    if (e.spec.allows.includes(r.color)) continue;
    let n = Z(t, r.approach);
    n <= s && ((o = r), (s = n));
  }
  return o ? { status: `color`, runway: o } : null;
}
function Fe(e) {
  if (!e.target) return 0;
  let t = Z(e.target.approach, e.target.end);
  return t < 1e-6 ? 1 : Math.min(1, Z(e.target.approach, e.pos) / t);
}
var Ie = (e) =>
  e.state === `flying` ||
  (e.state === `departing` && e.takeoffProgress >= 0.58);
function Le(e, t) {
  let n = e.filter((e) => Ie(e) && e.age >= t);
  for (let e = 0; e < n.length; e++)
    for (let t = e + 1; t < n.length; t++) {
      let r = n[e],
        i = n[t],
        a = r.spec.radius + i.spec.radius;
      if (ke(r.pos, i.pos) <= a * a) return [r, i];
    }
  return null;
}
function $(e, t, n) {
  let r = e.filter((e) => Ie(e) && e.age >= t),
    i = new Set();
  for (let e = 0; e < r.length; e++)
    for (let t = e + 1; t < r.length; t++) {
      let a = r[e],
        o = r[t];
      if (a.state === `departing` && o.state === `departing`) continue;
      let s = a.spec.radius + o.spec.radius,
        c = s * n,
        l = ke(a.pos, o.pos);
      l > s * s && l <= c * c && (i.add(a.id), i.add(o.id));
    }
  return i;
}
var Re = 1e-6;
function ze(e, t, n = e.spec.speed) {
  let r = n * t;
  for (; r > Re; ) {
    if (e.path.length === 0) {
      ((e.pos.x += Math.cos(e.heading) * r),
        (e.pos.y += Math.sin(e.heading) * r));
      break;
    }
    let t = e.path[0],
      n = Z(e.pos, t);
    if (((e.heading = Ae(e.pos, t)), n <= Re)) {
      e.path.shift();
      continue;
    }
    if (n <= r) ((e.pos.x = t.x), (e.pos.y = t.y), e.path.shift(), (r -= n));
    else {
      ((e.pos.x += Math.cos(e.heading) * r),
        (e.pos.y += Math.sin(e.heading) * r));
      break;
    }
  }
  return e.path.length === 0;
}
function Be(e) {
  if (e.length <= 2) return e.map((e) => ({ x: e.x, y: e.y }));
  let t = [e[0]],
    n = e[0];
  for (let r = 1; r < e.length - 1; r++) {
    let i = e[r];
    Z(n, i) >= 4.2 && (t.push(i), (n = i));
  }
  return (
    t.push(e[e.length - 1]),
    t.map((e, n) => {
      if (n === 0 || n === t.length - 1) return { x: e.x, y: e.y };
      let r = t[n - 1],
        i = t[n + 1];
      return {
        x: e.x * 0.5 + (r.x + i.x) * 0.25,
        y: e.y * 0.5 + (r.y + i.y) * 0.25,
      };
    })
  );
}
function Ve() {
  return { landings: 0, departures: 0 };
}
function He(e) {
  return ((e.departures += 1), e.departures);
}
function Ue(e) {
  return ((e.landings += 1), e.landings);
}
function We(e, t) {
  return t > 0 ? ((e.landings + e.departures) * 60) / t : 0;
}
var Ge = (e, t, n) => e + (t - e) * n,
  Ke = 10,
  qe = 1.35,
  Je = 5;
function Ye(e) {
  let t = Math.min(1, e / 300);
  return {
    interval: Ge(L.spawnIntervalStart, L.spawnIntervalEnd, t),
    maxConcurrent: Math.round(Ge(L.maxConcurrentStart, L.maxConcurrentEnd, t)),
  };
}
function Xe() {
  let e = H.reduce((e, t) => e + I[t].weight, 0),
    t = Math.random() * e;
  for (let e of H) if (((t -= I[e].weight), t <= 0)) return e;
  return `blue`;
}
function Ze(e, t, n, r = null) {
  let i = e.maxX - e.minX,
    a = e.maxY - e.minY,
    o = e.corners ?? [
      { x: e.minX, y: e.maxY },
      { x: e.maxX, y: e.maxY },
      { x: e.maxX, y: e.minY },
      { x: e.minX, y: e.minY },
    ],
    s = Math.floor(Math.random() * (r === null ? 4 : 3));
  r !== null && s >= r && s++;
  let c = o[s],
    l = o[(s + 1) % o.length],
    u = Math.random(),
    d = { x: Ge(c.x, l.x, u), y: Ge(c.y, l.y, u) },
    f = o.reduce((e, t) => ({ x: e.x + t.x / 4, y: e.y + t.y / 4 }), {
      x: 0,
      y: 0,
    }),
    p = l.x - c.x,
    m = l.y - c.y,
    h = Math.hypot(p, m) || 1,
    g = -m / h,
    _ = p / h;
  g * (d.x - f.x) + _ * (d.y - f.y) < 0 && ((g *= -1), (_ *= -1));
  let v = { x: d.x + g * 24, y: d.y + _ * 24 },
    y = Ae(v, { x: f.x + rt(-i / 6, i / 6), y: f.y + rt(-a / 6, a / 6) });
  return {
    id: n,
    kind: Xe(),
    edge: s,
    pos: v,
    entry: d,
    heading: y,
    warningRemaining: t,
    warningTotal: t,
  };
}
function Qe(e, t, n, r, i, a) {
  let o = Ze(e, t, n, a),
    s = $e(o, r, i);
  if (s >= 0) return o;
  for (let c = 1; c < Je; c++) {
    let c = Ze(e, t, n, a),
      l = $e(c, r, i);
    if (l >= 0) return c;
    l > s && ((o = c), (s = l));
  }
  return o;
}
function $e(e, t, n) {
  let r = 1 / 0,
    i = I[e.kind],
    a = tt(e.heading, i.speed);
  for (let o = 0; o <= Ke; o += 0.5) {
    let s = nt(e.pos, a, o),
      c = e.warningRemaining + o;
    for (let e of t) {
      if (e.state !== `flying` && e.state !== `departing`) continue;
      let t = e.state === `departing` ? M : e.spec.speed,
        n = nt(e.pos, tt(e.heading, t), c);
      r = Math.min(
        r,
        Math.hypot(s.x - n.x, s.y - n.y) - (i.radius + e.spec.radius) * qe,
      );
    }
    for (let e of n) {
      if (c < e.warningRemaining) continue;
      let t = I[e.kind],
        n = nt(e.pos, tt(e.heading, t.speed), c - e.warningRemaining);
      r = Math.min(
        r,
        Math.hypot(s.x - n.x, s.y - n.y) - (i.radius + t.radius) * qe,
      );
    }
  }
  return r;
}
function et(e) {
  return Me(e.kind, e.pos, e.heading);
}
var tt = (e, t) => ({ x: Math.cos(e) * t, y: Math.sin(e) * t }),
  nt = (e, t, n) => ({ x: e.x + t.x * n, y: e.y + t.y * n }),
  rt = (e, t) => e + Math.random() * (t - e),
  it = 1 / 60,
  at = 0.25,
  ot = class {
    phase = `menu`;
    map = null;
    bounds = { minX: -50, maxX: 50, minY: -50, maxY: 50 };
    aircraft = [];
    score = Ve();
    elapsed = 0;
    drawing = null;
    crashPair = null;
    warningIds = new Set();
    hoveredId = null;
    hoveredRunwayId = null;
    spawnWarnings = [];
    spawningEnabled = !0;
    events = [];
    acc = 0;
    spawnTimer = 0.25;
    nextSpawnWarningId = 1;
    nextDepartureQueueOrder = 1;
    lastSpawnEdge = null;
    traffic = new Map();
    lastTakeoffAt = new Map();
    reset(e, t) {
      ((this.map = e),
        (this.bounds = t),
        (this.aircraft = []),
        (this.score = Ve()),
        (this.elapsed = 0),
        (this.acc = 0),
        (this.spawnTimer = 0.25),
        (this.nextSpawnWarningId = 1),
        (this.nextDepartureQueueOrder = 1),
        (this.lastSpawnEdge = null),
        (this.drawing = null),
        (this.crashPair = null),
        (this.warningIds = new Set()),
        (this.hoveredId = null),
        (this.hoveredRunwayId = null),
        (this.spawnWarnings = []),
        (this.events = []),
        (this.traffic = new Map([
          [`yellow`, { occupied: 0 }],
          [`blue`, { occupied: 0 }],
          [`red`, { occupied: 0 }],
        ])),
        (this.lastTakeoffAt = new Map()),
        (this.phase = `playing`));
    }
    setBounds(e) {
      this.bounds = e;
    }
    setSpawningEnabled(e) {
      (e &&
        !this.spawningEnabled &&
        (this.spawnTimer = Math.min(this.spawnTimer, 0.25)),
        (this.spawningEnabled = e),
        e || (this.spawnWarnings = []));
    }
    pause() {
      this.phase === `playing` && (this.phase = `paused`);
    }
    resume() {
      this.phase === `paused` && (this.phase = `playing`);
    }
    togglePause() {
      this.phase === `playing`
        ? (this.phase = `paused`)
        : this.phase === `paused` && (this.phase = `playing`);
    }
    forceGameOver(e = { x: 0, y: 0 }) {
      this.phase !== `gameover` &&
        (this.events.push({ type: `crash`, pos: Q(e), immediate: !0 }),
        (this.phase = `gameover`));
    }
    update(e) {
      if (this.phase === `playing`)
        for (
          this.acc += Math.min(e / 1e3, at);
          this.acc >= it &&
          (this.step(it), (this.acc -= it), this.phase === `playing`);

        );
    }
    step(e) {
      window.airportController?.(this);
      if (!this.map) return;
      this.elapsed += e;
      let t = Ye(this.elapsed);
      if (this.spawningEnabled) {
        for (let t of this.spawnWarnings) t.warningRemaining -= e;
        let t = this.spawnWarnings.filter((e) => e.warningRemaining <= 0),
          n = this.spawnWarnings.filter((e) => e.warningRemaining > 0);
        for (let e of t) {
          let t = { ...e, warningRemaining: 0 };
          if ($e(t, this.aircraft, n) < 0) {
            let t = Qe(
              this.bounds,
              F,
              e.id,
              this.aircraft,
              n,
              this.lastSpawnEdge,
            );
            (n.push(t), (this.lastSpawnEdge = t.edge));
            continue;
          }
          let r = et(t);
          (this.aircraft.push(r),
            this.events.push({ type: `spawn`, pos: Q(r.pos), color: r.kind }));
        }
        this.spawnWarnings = n;
      }
      let n =
        this.aircraft.filter(
          (e) => e.state === `flying` || e.state === `landing`,
        ).length + this.spawnWarnings.length;
      if (
        (this.spawningEnabled && (this.spawnTimer -= e),
        this.spawningEnabled && this.spawnTimer <= 0 && n < t.maxConcurrent)
      ) {
        let e = Qe(
          this.bounds,
          F,
          this.nextSpawnWarningId++,
          this.aircraft,
          this.spawnWarnings,
          this.lastSpawnEdge,
        );
        (this.spawnWarnings.push(e),
          (this.lastSpawnEdge = e.edge),
          (this.spawnTimer = t.interval * (0.85 + Math.random() * 0.3)));
      }
      for (let t of this.aircraft)
        if (t.state !== `parked`) {
          if (((t.age += e), t.state === `taxiing-in`)) {
            (ze(t, e, ce), t.path.length === 0 && this.queueDeparture(t));
            continue;
          }
          if (t.state === `taxiing-out`) {
            (ze(t, e, U),
              t.path.length === 0 && (t.state = `holding`),
              t.state === `holding` &&
                this.departureIsDue(t) &&
                this.tryLaunchDeparture(t));
            continue;
          }
          if (t.state === `holding`) {
            this.departureIsDue(t) && this.tryLaunchDeparture(t);
            continue;
          }
          if (t.state === `departing`) {
            (ze(t, e, M),
              t.target && (t.takeoffProgress = lt(t.pos, t.target)));
            continue;
          }
          if ((ze(t, e, t.spec.speed), t.target)) {
            if (
              t.state === `flying` &&
              t.path.length <= 1 &&
              Z(t.pos, t.target.approach) <= 0.5
            ) {
              t.state = `landing`;
              let e = this.traffic.get(t.target.color);
              e && e.occupied++;
              let n = Ue(this.score);
              this.events.push({
                type: `land`,
                pos: Q(t.pos),
                total: n,
                color: t.target.color,
              });
            }
            if (((t.landProgress = Fe(t)), t.path.length === 0)) {
              let e = this.map.groundRoutes?.[t.target.id]?.arrival;
              e?.length
                ? ((t.state = `taxiing-in`), (t.path = e.map(Q)))
                : this.queueDeparture(t);
            }
          }
        }
      ((this.aircraft = this.aircraft.filter((e) => {
        let t = ut(e.pos, this.bounds, 12);
        return e.state === `departing` && t
          ? !1
          : e.target || e.age < 2
            ? !0
            : !t;
      })),
        (this.warningIds = $(this.aircraft, R, ie)));
      let r = this._disableCollisions ? null : Le(this.aircraft, R);
      r &&
        ((this.crashPair = r),
        this.events.push({
          type: `crash`,
          pos: {
            x: (r[0].pos.x + r[1].pos.x) / 2,
            y: (r[0].pos.y + r[1].pos.y) / 2,
          },
        }),
        (this.phase = `gameover`));
    }
    findAircraftAt(e, t = 6) {
      if (this.phase !== `playing`) return null;
      let n = null,
        r = t;
      for (let t of this.aircraft) {
        if (t.state !== `flying`) continue;
        let i = Z(e, t.pos);
        i <= r && ((n = t), (r = i));
      }
      return n;
    }
    findPathAt(e, t = N) {
      if (this.phase !== `playing`) return null;
      let n = null,
        r = t;
      for (let t of this.aircraft) {
        if (t.state !== `flying` || t.path.length === 0) continue;
        let i = [t.pos, ...t.path];
        for (let a = 0; a < i.length - 1; a++) {
          let o = ft(e, i[a], i[a + 1]);
          o <= r && ((n = t), (r = o));
        }
      }
      return n;
    }
    hover(e, t = {}) {
      let n = this.findAircraftAt(e, t.aircraft) ?? this.findPathAt(e, t.path);
      return (
        (this.hoveredId = n?.id ?? null),
        (this.hoveredRunwayId = null),
        this.hoveredId
      );
    }
    grab(e, t = {}) {
      if (this.phase !== `playing`) return !1;
      let n = this.findAircraftAt(e, t.aircraft) ?? this.findPathAt(e, t.path);
      return n
        ? ((n.target = null),
          (n.path = []),
          (this.hoveredId = n.id),
          (this.hoveredRunwayId = null),
          (this.drawing = { ac: n, points: [Q(n.pos)] }),
          !0)
        : !1;
    }
    drag(e) {
      if (!this.drawing) return !1;
      let t = this.drawing.points,
        n = t[t.length - 1];
      return Z(e, n) >= 1.4
        ? (t.push(Q(e)), this.drawing.ac.path.push(Q(e)), !0)
        : !1;
    }
    release() {
      if (!this.drawing || !this.map) return ((this.drawing = null), null);
      let { ac: e, points: t } = this.drawing,
        n = t[t.length - 1],
        r = this.landingIntentFor(e, n);
      if (r?.status === `eligible`)
        return (
          (e.target = r.runway),
          (e.path = pt(e.pos, e.path, r.runway.approach, r.runway.end)),
          (this.drawing = null),
          `landing`
        );
      if (((e.path = Be(e.path)), r)) {
        let e = r.status === `direction` ? r.runway.end : r.runway.approach;
        this.events.push({ type: `reject`, pos: Q(e), reason: r.status });
      }
      return ((this.drawing = null), r ? `rejected` : `path`);
    }
    getLandingIntent() {
      if (!this.drawing || !this.map) return null;
      let e = this.drawing.points;
      return this.landingIntentFor(this.drawing.ac, e[e.length - 1]);
    }
    getRunwayStatuses() {
      return this.map
        ? this.map.runways.map((e) => {
            let t = this.departureQueueFor(e.id),
              n = t[0]?.scheduledDepartureAt ?? null;
            return {
              runwayId: e.id,
              color: e.color,
              nextDepartureIn:
                n === null ? null : Math.max(0, n - this.elapsed),
              departureQueue: t.length,
            };
          })
        : [];
    }
    getAirportTrafficStatus() {
      return {
        occupied: this.totalOccupied(),
        reserved: this.totalReservations(),
      };
    }
    dispatchInterval() {
      return 8;
    }
    totalReservations() {
      return this.aircraft.filter((e) => e.target && e.state === `flying`)
        .length;
    }
    totalOccupied() {
      let e = 0;
      for (let t of this.traffic.values()) e += t.occupied;
      return e;
    }
    departureQueueFor(e) {
      return this.aircraft
        .filter(
          (t) =>
            t.target?.id === e &&
            (t.state === `taxiing-out` || t.state === `holding`),
        )
        .sort(
          (e, t) =>
            (e.departureQueueOrder ?? 1 / 0) - (t.departureQueueOrder ?? 1 / 0),
        );
    }
    queueDeparture(e) {
      let t = e.target;
      if (!t) return;
      let n = this.map?.groundRoutes?.[t.id]?.departure,
        r = n?.length ? n.map(Q) : [Q(t.approach)];
      (Z(r[r.length - 1], t.approach) > 0.01 && r.push(Q(t.approach)),
        (e.state = `taxiing-out`),
        (e.path = r),
        (e.departureQueueOrder = this.nextDepartureQueueOrder++));
      let i = st(e.pos, r) / U;
      ((e.departureReadyAt = this.elapsed + Math.max(re, i)),
        this.rescheduleRunway(t.id));
    }
    rescheduleRunway(e) {
      let t = this.lastTakeoffAt.get(e) ?? -1 / 0,
        n = this.dispatchInterval();
      for (let r of this.departureQueueFor(e)) {
        let e = r.departureReadyAt ?? this.elapsed;
        ((r.scheduledDepartureAt = Math.max(e, t + n, this.elapsed)),
          (t = r.scheduledDepartureAt));
      }
    }
    departureIsDue(e) {
      return (
        e.scheduledDepartureAt !== null &&
        this.elapsed >= e.scheduledDepartureAt
      );
    }
    tryLaunchDeparture(e) {
      let t = e.target;
      if (t) {
        if (!this.hasDepartureConflict(e)) {
          this.launchDeparture(e);
          return;
        }
        ((e.departureReadyAt = this.elapsed + V), this.rescheduleRunway(t.id));
      }
    }
    hasDepartureConflict(e) {
      return e.target
        ? this.aircraft.some(
            (t) =>
              t !== e &&
              t.state === `departing` &&
              t.target !== null &&
              ct(e, t, this.bounds),
          )
        : !1;
    }
    launchDeparture(e) {
      let t = e.target;
      if (!t) return;
      ((e.state = `departing`),
        (e.pos = Q(t.approach)),
        (e.heading = Math.atan2(
          t.end.y - t.approach.y,
          t.end.x - t.approach.x,
        )),
        (e.path = [Q(t.end), dt(t, this.bounds)]),
        (e.takeoffProgress = 0),
        (e.departureReadyAt = null),
        (e.scheduledDepartureAt = null),
        (e.departureQueueOrder = null));
      let n = this.traffic.get(t.color);
      n && (n.occupied = Math.max(0, n.occupied - 1));
      let r = this.totalOccupied(),
        i = He(this.score);
      (this.lastTakeoffAt.set(t.id, this.elapsed),
        this.events.push({
          type: `takeoff`,
          pos: Q(t.approach),
          color: t.color,
          total: i,
          remaining: r,
        }),
        this.rescheduleRunway(t.id));
    }
    landingIntentFor(e, t) {
      return this.map ? Pe(e, t, this.map.runways) : null;
    }
    drainEvents() {
      let e = this.events;
      return ((this.events = []), e);
    }
  };
function st(e, t) {
  let n = 0,
    r = e;
  for (let e of t) ((n += Z(r, e)), (r = e));
  return n;
}
function ct(e, t, n) {
  let r = e.target,
    i = t.target;
  if (!r || !i) return !1;
  let a = Z(r.approach, r.end),
    o = Z(i.approach, i.end);
  if (a < 1e-6 || o < 1e-6) return !1;
  let s = {
      x: ((r.end.x - r.approach.x) / a) * M,
      y: ((r.end.y - r.approach.y) / a) * M,
    },
    c = {
      x: ((i.end.x - i.approach.x) / o) * M,
      y: ((i.end.y - i.approach.y) / o) * M,
    },
    l = [r.end, dt(r, n)],
    u = st(r.approach, l) / M,
    d = st(t.pos, t.path) / M,
    f = Math.max((a * P) / M, (Math.max(0, P - t.takeoffProgress) * o) / M),
    p = Math.min(u, d);
  if (f >= p) return !1;
  let m = { x: r.approach.x - t.pos.x, y: r.approach.y - t.pos.y },
    h = { x: s.x - c.x, y: s.y - c.y },
    g = h.x ** 2 + h.y ** 2,
    _ = g < 1e-6 ? f : Math.max(f, Math.min(p, -(m.x * h.x + m.y * h.y) / g)),
    v = m.x + h.x * _,
    y = m.y + h.y * _,
    b = (e.spec.radius + t.spec.radius) * z;
  return v * v + y * y <= b * b;
}
function lt(e, t) {
  let n = t.end.x - t.approach.x,
    r = t.end.y - t.approach.y,
    i = n * n + r * r || 1;
  return Math.max(
    0,
    Math.min(1, ((e.x - t.approach.x) * n + (e.y - t.approach.y) * r) / i),
  );
}
function ut(e, t, n) {
  if (!t.corners)
    return (
      e.x < t.minX - n ||
      e.x > t.maxX + n ||
      e.y < t.minY - n ||
      e.y > t.maxY + n
    );
  let r = 0,
    i = 0;
  for (let e of t.corners)
    ((r += e.x / t.corners.length), (i += e.y / t.corners.length));
  let a = 0;
  for (let e of t.corners) {
    let t = e.x - r,
      n = e.y - i;
    a = Math.max(a, t * t + n * n);
  }
  let o = e.x - r,
    s = e.y - i,
    c = Math.sqrt(a) + n;
  return o * o + s * s > c * c;
}
function dt(e, t) {
  let n = e.end.x - e.approach.x,
    r = e.end.y - e.approach.y,
    i = Math.hypot(n, r) || 1,
    a = n / i,
    o = r / i,
    s = Math.abs(a) < 1e-6 ? 1 / 0 : ((a > 0 ? t.maxX : t.minX) - e.end.x) / a,
    c = Math.abs(o) < 1e-6 ? 1 / 0 : ((o > 0 ? t.maxY : t.minY) - e.end.y) / o,
    l = Math.max(0, Math.min(s, c)) + 28;
  return { x: e.end.x + a * l, y: e.end.y + o * l };
}
function ft(e, t, n) {
  let r = ke(t, n);
  if (r <= 1e-6) return Z(e, t);
  let i = Math.max(
    0,
    Math.min(1, ((e.x - t.x) * (n.x - t.x) + (e.y - t.y) * (n.y - t.y)) / r),
  );
  return Z(e, { x: t.x + (n.x - t.x) * i, y: t.y + (n.y - t.y) * i });
}
function pt(e, t, n, r) {
  let i = t.map(Q);
  for (; i.length > 0 && Z(i[i.length - 1], n) <= 10; ) i.pop();
  let a = Be(i),
    o = a[a.length - 1] ?? e,
    s = r.x - n.x,
    c = r.y - n.y,
    l = Math.hypot(s, c) || 1,
    u = s / l,
    d = c / l,
    f = -((o.x - n.x) * u + (o.y - n.y) * d);
  if (f <= 0.5) return [...a, Q(n), Q(r)];
  let p = Z(o, n),
    m = (n.x - o.x) / (p || 1),
    h = (n.y - o.y) / (p || 1),
    g = p * 0.35,
    _ = Math.min(p * 0.3, f * 0.5),
    v = { x: o.x + m * g, y: o.y + h * g },
    y = { x: n.x - u * _, y: n.y - d * _ },
    b = [];
  for (let e = 1; e <= 6; e++) {
    let t = e / 6,
      r = 1 - t;
    b.push({
      x:
        r * r * r * o.x +
        3 * r * r * t * v.x +
        3 * r * t * t * y.x +
        t * t * t * n.x,
      y:
        r * r * r * o.y +
        3 * r * r * t * v.y +
        3 * r * t * t * y.y +
        t * t * t * n.y,
    });
  }
  return [...a, ...b, Q(r)];
}
function mt(e, t, n, r = {}) {
  let i = !1,
    a = {},
    o = (e) =>
      e.pointerType === `touch` || e.pointerType === `pen`
        ? {
            aircraft: t.worldUnitsForPixels(22),
            path: t.worldUnitsForPixels(10),
          }
        : {},
    s = (n) => {
      let r = e.getBoundingClientRect();
      return t.screenToWorld(n.clientX - r.left, n.clientY - r.top);
    },
    c = (t) => {
      if (
        !(t.button !== void 0 && t.button !== 0) &&
        ((a = o(t)), n.grab(s(t), a))
      ) {
        (r.onGrab?.(),
          (i = !0),
          (e.style.cursor = `grabbing`),
          e.setPointerCapture(t.pointerId),
          t.preventDefault());
        return;
      }
    },
    l = (t) => {
      let a = s(t);
      if (!i) {
        let r = n.hover(a, o(t));
        e.style.cursor =
          r === null && n.hoveredRunwayId === null ? `default` : `pointer`;
        return;
      }
      (n.drag(a) && r.onPathPoint?.(), t.preventDefault());
    },
    u = (t) => {
      if (!i) return;
      i = !1;
      let o = n.release();
      (r.onRelease?.(o),
        n.hover(s(t), a),
        (e.style.cursor =
          n.hoveredId === null && n.hoveredRunwayId === null
            ? `default`
            : `pointer`));
      try {
        e.releasePointerCapture(t.pointerId);
      } catch {}
      t.preventDefault();
    },
    d = () => {
      i ||
        ((n.hoveredId = null),
        (n.hoveredRunwayId = null),
        (e.style.cursor = `default`));
    };
  return (
    e.addEventListener(`pointerdown`, c),
    e.addEventListener(`pointermove`, l),
    e.addEventListener(`pointerup`, u),
    e.addEventListener(`pointercancel`, u),
    e.addEventListener(`pointerleave`, d),
    (e.style.touchAction = `none`),
    () => {
      (e.removeEventListener(`pointerdown`, c),
        e.removeEventListener(`pointermove`, l),
        e.removeEventListener(`pointerup`, u),
        e.removeEventListener(`pointercancel`, u),
        e.removeEventListener(`pointerleave`, d));
    }
  );
}
var ht = d(`<span class="t-digit"> </span>`),
  gt = d(
    `<span> <span class="t-digit-group" aria-hidden="true"></span> </span>`,
  );
function _t(e, t) {
  g(t, !0);
  let n = _(t, `prefix`, 3, ``),
    a = _(t, `suffix`, 3, ``),
    l = _(t, `className`, 3, ``),
    d,
    f = O(() => String(t.value)),
    p = O(() => [...w(f)]);
  c(() => {
    (w(f),
      d &&
        (d.classList.remove(`is-animating`),
        d.offsetHeight,
        d.classList.add(`is-animating`)));
  });
  var m = gt(),
    y = r(m, !0),
    S = o(y);
  (ne(
    S,
    21,
    () => w(p),
    v,
    (e, t, n) => {
      var a = ht(),
        o = r(a, !0);
      (x(a),
        s(() => {
          (b(
            a,
            `data-stagger`,
            n === w(p).length - 2 ? `1` : n === w(p).length - 1 ? `2` : void 0,
          ),
            u(o, w(t)));
        }),
        i(e, a));
    },
  ),
    x(S),
    k(
      S,
      (e) => (d = e),
      () => d,
    ));
  var C = o(S, 1, !0);
  (x(m),
    s(() => {
      (D(m, 1, E(l())),
        b(m, `aria-label`, `${n()}${w(f)}${a()}`),
        u(y, n()),
        u(C, a()));
    }),
    i(e, m),
    h());
}
var vt = d(
    `<span class="cdg-value col-start-4 row-start-1 justify-self-end whitespace-nowrap text-xl leading-[0.82] font-bold tabular-nums sm:text-2xl max-[520px]:col-start-3"> </span>`,
  ),
  yt = d(
    `<div><span><!></span> <span><!></span> <span class="cdg-copy flex min-w-0 flex-col"><span class="cdg-title text-base leading-none font-bold sm:text-lg"> </span> <span class="cdg-sub text-sm leading-none font-medium opacity-70 max-[520px]:hidden"> </span></span> <!></div>`,
  ),
  bt = d(
    `<div class="pointer-events-none absolute inset-0 z-10 flex items-start justify-start gap-2 p-3 [padding-top:max(0.75rem,env(safe-area-inset-top))] [padding-left:max(0.75rem,env(safe-area-inset-left))] sm:p-4 sm:[padding-top:max(1rem,env(safe-area-inset-top))] sm:[padding-left:max(1rem,env(safe-area-inset-left))]"><section id="flight-status" class="cdg-board t-panel-slide pointer-events-auto grid w-[min(21rem,calc(100vw-5.4rem))] border border-[rgb(242_246_249/0.18)] bg-[#121c2a] text-[#f3f6f8] [--panel-translate-y:-12px] [filter:drop-shadow(0_0.16rem_0_rgb(0_0_0/0.22))] max-[520px]:w-[min(17.5rem,calc(100vw-4.9rem))]" aria-label="Flight status"><!> <a href="https://x.com/lapunen" target="_blank" rel="noreferrer" aria-label="@lapunen on X" data-cuelume-hover="chime" data-cuelume-press="" data-cuelume-release="page"><span><!></span> <span><!></span> <span class="cdg-copy flex min-w-0 flex-col"><span class="cdg-sub whitespace-nowrap text-sm leading-none font-medium"><span class="opacity-70">Made by</span> <span class="font-semibold">@lapunen</span></span></span></a></section> <div class="control-sign pointer-events-auto order-[-1] grid border border-[rgb(242_246_249/0.18)] bg-[#121c2a] text-[#f3f6f8] [filter:drop-shadow(0_0.16rem_0_rgb(0_0_0/0.22))]" role="group" aria-label="Game controls"><button type="button" data-cuelume-hover="tick" data-cuelume-toggle=""><span><span class="t-icon" data-icon="a"><!></span> <span class="t-icon" data-icon="b"><!></span></span></button> <button type="button" data-cuelume-hover="tick"><span><span class="t-icon" data-icon="a"><!></span> <span class="t-icon" data-icon="b"><!></span></span></button> <button type="button" aria-label="Rotate view 10 degrees left" data-cuelume-hover="tick" data-camera-rotate="left"><span><!></span></button> <button type="button" aria-label="Rotate view 10 degrees right" data-cuelume-hover="tick" data-camera-rotate="right"><span><!></span></button> <button type="button" aria-controls="flight-status" data-cuelume-hover="tick" data-cuelume-toggle=""><span><span class="t-icon" data-icon="a"><!></span> <span class="t-icon" data-icon="b"><!></span></span> <span class="t-badge" aria-hidden="true"><span class="t-badge-dot"></span></span></button></div> <!></div>`,
  );
function xt(e, n) {
  g(n, !0);
  let c = a(!0),
    l = a(!1),
    d;
  ee(() => {
    if (matchMedia(`(max-width: 520px)`).matches)
      return (
        (d = window.setTimeout(() => {
          (m(c, !1), m(l, !0), (d = void 0));
        }, 3e3)),
        () => {
          d !== void 0 && window.clearTimeout(d);
        }
      );
  });
  function f() {
    (d !== void 0 && (window.clearTimeout(d), (d = void 0)),
      m(l, !1),
      m(c, !w(c)));
  }
  let p = (e) =>
      `${Math.floor(e / 60)}:${Math.floor(e % 60)
        .toString()
        .padStart(2, `0`)}`,
    _ = O(() => [
      {
        title: `Landings`,
        subtitle: `Laskeutumiset`,
        value: n.landings.toLocaleString(),
        suffix: ``,
        animated: !0,
        icon: `fa7-solid:plane-arrival`,
        arrow: `heroicons:arrow-down-16-solid`,
      },
      {
        title: `Departures`,
        subtitle: `Lähtevät`,
        value: n.departures.toLocaleString(),
        suffix: ``,
        animated: !0,
        icon: `fa7-solid:plane-departure`,
        arrow: `heroicons:arrow-up-16-solid`,
      },
      {
        title: `Pace`,
        subtitle: `Lentoa/min`,
        value: n.efficiency.toFixed(1),
        suffix: `/min`,
        animated: !0,
        icon: `heroicons:bolt-solid`,
        arrow: `heroicons:arrow-down-16-solid`,
      },
      {
        title: `Duration`,
        subtitle: `Lentoaika`,
        value: p(n.elapsed),
        suffix: ``,
        animated: !1,
        icon: `heroicons:clock-solid`,
        arrow: `heroicons:arrow-down-16-solid`,
      },
    ]),
    y = `cdg-row grid min-h-12 grid-cols-[2.15rem_2.25rem_minmax(4.2rem,1fr)_auto] items-center gap-x-[0.52rem] px-[0.62rem] py-[0.34rem] pl-[0.42rem] shadow-[inset_0_-1px_0_rgb(242_246_249/0.28)] max-[520px]:min-h-10 max-[520px]:grid-cols-[2rem_minmax(3.2rem,1fr)_auto] max-[520px]:gap-x-[0.4rem] max-[520px]:px-[0.46rem] max-[520px]:py-[0.28rem] max-[520px]:pl-[0.38rem]`,
    S = `cdg-arrow grid size-[2.05rem] place-items-center text-[#f3f6f8] max-[520px]:hidden`,
    C = `cdg-icon grid size-[2.08rem] place-items-center rounded-[0.16rem] bg-[#f3f6f8] text-[#121c2a] max-[520px]:size-[1.82rem]`,
    k = `control-sign__button grid size-12 place-items-center text-[#f3f6f8] shadow-[inset_0_-1px_0_rgb(242_246_249/0.28)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] last:shadow-none hover:bg-[rgb(242_246_249/0.08)] active:scale-[0.97] focus-visible:relative focus-visible:z-[1] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[rgb(247_201_72/0.55)] max-[520px]:size-10`,
    A = `control-sign__icon grid size-[2.05rem] place-items-center rounded-[0.16rem] bg-[#f3f6f8] text-[#121c2a] max-[520px]:size-[1.9rem]`;
  var te = bt(),
    re = r(te),
    ie = r(re);
  ne(
    ie,
    17,
    () => w(_),
    v,
    (e, t) => {
      var n = yt();
      D(n, 1, E(y));
      var a = r(n);
      (D(a, 1, E(S)),
        W(r(a), {
          get icon() {
            return w(t).arrow;
          },
          width: `22`,
          height: `22`,
        }),
        x(a));
      var c = o(a, 2);
      (D(c, 1, E(C)),
        W(r(c), {
          get icon() {
            return w(t).icon;
          },
          width: `20`,
          height: `20`,
        }),
        x(c));
      var l = o(c, 2),
        d = r(l),
        f = r(d, !0);
      x(d);
      var p = o(d, 2),
        m = r(p, !0);
      (x(p), x(l));
      var h = o(l, 2),
        g = (e) => {
          _t(e, {
            get value() {
              return w(t).value;
            },
            get suffix() {
              return w(t).suffix;
            },
            className: `cdg-value col-start-4 row-start-1 justify-self-end whitespace-nowrap text-xl leading-[0.82] font-bold tabular-nums sm:text-2xl max-[520px]:col-start-3`,
          });
        },
        _ = (e) => {
          var n = vt(),
            a = r(n);
          (x(n),
            s(() => u(a, `${w(t).value ?? ``}${w(t).suffix ?? ``}`)),
            i(e, n));
        };
      (j(h, (e) => {
        w(t).animated ? e(g) : e(_, -1);
      }),
        x(n),
        s(() => {
          (u(f, w(t).title), u(m, w(t).subtitle));
        }),
        i(e, n));
    },
  );
  var ae = o(ie, 2);
  D(
    ae,
    1,
    `${y} cdg-row--link text-inherit no-underline transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[rgb(242_246_249/0.08)] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[rgb(59_130_246/0.58)]`,
  );
  var M = r(ae);
  (D(M, 1, E(S)),
    W(r(M), {
      icon: `heroicons:arrow-up-right-16-solid`,
      width: `22`,
      height: `22`,
    }),
    x(M));
  var N = o(M, 2);
  (D(N, 1, `${C} !bg-[#3b82f6] !text-[#f3f6f8]`),
    W(r(N), { icon: `mdi:walk`, width: `20`, height: `20` }),
    x(N));
  var P = o(N, 2),
    F = r(P),
    I = o(r(F), 1, !0);
  ((I.nodeValue = ` `), t(), x(F), x(P), x(ae), x(re));
  var L = o(re, 2),
    R = r(L);
  D(R, 1, `${k} pause-sign`);
  var oe = r(R);
  D(oe, 1, `${A} t-icon-swap`);
  var z = r(oe);
  (W(r(z), { icon: `heroicons:pause-solid`, width: `21`, height: `21` }), x(z));
  var B = o(z, 2);
  (W(r(B), { icon: `heroicons:play-solid`, width: `21`, height: `21` }),
    x(B),
    x(oe),
    x(R));
  var V = o(R, 2);
  D(V, 1, E(k));
  var se = r(V),
    H = r(se);
  (W(r(H), {
    icon: `heroicons:speaker-x-mark-solid`,
    width: `21`,
    height: `21`,
  }),
    x(H));
  var U = o(H, 2);
  (W(r(U), { icon: `heroicons:speaker-wave-solid`, width: `21`, height: `21` }),
    x(U),
    x(se),
    x(V));
  var ce = o(V, 2);
  D(ce, 1, E(k));
  var le = r(ce);
  (D(le, 1, E(A)),
    W(r(le), { icon: `lucide:rotate-cw`, width: `21`, height: `21` }),
    x(le),
    x(ce));
  var G = o(ce, 2);
  D(G, 1, E(k));
  var K = r(G);
  (D(K, 1, E(A)),
    W(r(K), { icon: `lucide:rotate-ccw`, width: `21`, height: `21` }),
    x(K),
    x(G));
  var q = o(G, 2);
  D(q, 1, `${k} scoreboard-toggle relative`);
  var ue = r(q);
  D(ue, 1, `${A} t-icon-swap`);
  var de = r(ue);
  (W(r(de), { icon: `heroicons:eye-solid`, width: `21`, height: `21` }), x(de));
  var J = o(de, 2);
  (W(r(J), { icon: `heroicons:eye-slash-solid`, width: `21`, height: `21` }),
    x(J),
    x(ue));
  var Y = o(ue, 2);
  (x(q),
    x(L),
    j(o(L, 2), (e) => {}),
    x(te),
    s(() => {
      (b(re, `data-open`, w(c)),
        b(R, `aria-label`, n.paused ? `Resume` : `Pause`),
        b(R, `aria-pressed`, n.paused),
        b(oe, `data-state`, n.paused ? `b` : `a`),
        b(
          V,
          `aria-label`,
          n.soundEnabled ? `Mute game sounds` : `Enable game sounds`,
        ),
        b(V, `aria-pressed`, n.soundEnabled),
        D(se, 1, `${A} t-icon-swap ${n.soundEnabled ? `!bg-[#f7c948]` : ``}`),
        b(se, `data-state`, n.soundEnabled ? `b` : `a`),
        b(q, `aria-label`, w(c) ? `Hide scoreboard` : `Show scoreboard`),
        b(q, `aria-expanded`, w(c)),
        b(ue, `data-state`, w(c) ? `a` : `b`),
        b(Y, `data-open`, w(l)));
    }),
    T(`click`, R, function (...e) {
      n.onPause?.apply(this, e);
    }),
    T(`click`, V, function (...e) {
      n.onToggleSound?.apply(this, e);
    }),
    T(`click`, ce, function (...e) {
      n.onRotateLeft?.apply(this, e);
    }),
    T(`click`, G, function (...e) {
      n.onRotateRight?.apply(this, e);
    }),
    T(`click`, q, f),
    i(e, te),
    h());
}
l([`click`]);
var St = d(`<span> </span>`);
function Ct(e, t) {
  g(t, !0);
  let n = _(t, `className`, 3, ``),
    o,
    l = a(``),
    d = !0;
  c(() => {
    let e = t.value;
    if (!o) return;
    if (d) {
      ((d = !1), m(l, e, !0));
      return;
    }
    if (e === w(l)) return;
    o.classList.add(`is-exit`);
    let n =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            `--text-swap-dur`,
          ),
        ) || 150,
      r = window.setTimeout(() => {
        (m(l, e, !0),
          o.classList.remove(`is-exit`),
          o.classList.add(`is-enter-start`),
          o.offsetHeight,
          o.classList.remove(`is-enter-start`));
      }, n);
    return () => window.clearTimeout(r);
  });
  var f = St(),
    p = r(f, !0);
  (x(f),
    k(
      f,
      (e) => (o = e),
      () => o,
    ),
    s(() => {
      (D(f, 1, `t-text-swap ${n()}`), u(p, w(l)));
    }),
    i(e, f),
    h());
}
var wt = d(
    `<tr><td class="svelte-23173r"> </td><td class="svelte-23173r"><span class="leaderboard__identity svelte-23173r"><strong class="svelte-23173r"> </strong> <span class="svelte-23173r"> </span></span></td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td></tr>`,
  ),
  Tt = d(
    `<tr class="leaderboard__empty svelte-23173r"><td colspan="7" class="svelte-23173r"> </td></tr>`,
  ),
  Et = d(
    `<tr class="leaderboard__current leaderboard__outside svelte-23173r"><td class="svelte-23173r"> </td><td class="svelte-23173r"><span class="leaderboard__identity svelte-23173r"><strong class="svelte-23173r"> </strong> <span class="svelte-23173r"> </span></span></td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td><td class="svelte-23173r"> </td></tr>`,
  ),
  Dt = d(
    `<form aria-label="Add a player name"><label class="svelte-23173r"><input aria-label="Your name" minlength="2" required="" autocomplete="nickname" placeholder="Your name"/></label> <div class="leaderboard__profile-actions svelte-23173r"><span class="t-error-msg svelte-23173r" role="alert"> </span> <button type="button" class="leaderboard__profile-skip svelte-23173r">No thanks</button> <button type="submit" class="svelte-23173r"><!></button></div></form>`,
  ),
  Ot = d(
    `<button type="button" aria-label="Retry leaderboard" class="svelte-23173r"><!> Retry</button>`,
  ),
  kt = d(`<footer><span></span> <!> <!></footer>`),
  At = d(
    `<section class="leaderboard svelte-23173r" aria-label="Global high scores"><header class="leaderboard__header svelte-23173r"><span class="leaderboard__title svelte-23173r"><!> <span class="svelte-23173r">Global high scores</span></span></header> <div class="leaderboard__table-wrap svelte-23173r"><table class="svelte-23173r"><thead class="svelte-23173r"><tr><th aria-label="Rank" class="svelte-23173r">#</th><th class="svelte-23173r">Player</th><th class="svelte-23173r">Landings</th><th class="svelte-23173r">Departures</th><th aria-label="Pace" class="svelte-23173r">Pace</th><th aria-label="Duration" class="svelte-23173r">Duration</th><th aria-label="Game start date" class="svelte-23173r">Date</th></tr></thead><tbody><!><!></tbody></table></div> <!> <!></section>`,
  );
function jt(e, l) {
  g(l, !0);
  let d = a(``),
    f = a(!1),
    p = a(!1),
    _ = !1,
    v,
    S = null,
    C = O(() => !!l.board?.submittedId),
    E = new Intl.DateTimeFormat(`en-GB`, {
      day: `2-digit`,
      month: `short`,
      year: `numeric`,
    });
  function ee(e) {
    let t = Math.max(0, Math.round(e)),
      n = Math.floor(t / 3600),
      r = Math.floor((t % 3600) / 60),
      i = t % 60;
    return n > 0
      ? `${n}:${String(r).padStart(2, `0`)}:${String(i).padStart(2, `0`)}`
      : `${r}:${String(i).padStart(2, `0`)}`;
  }
  function te(e) {
    let t = new Date(e);
    return Number.isNaN(t.getTime()) ? `—` : E.format(t);
  }
  function re() {
    return l.status === `loading`
      ? l.landings >= 1
        ? `Posting flight record…`
        : `Loading departures…`
      : l.status === `cooldown`
        ? `Score not saved, 30-second cooldown`
        : l.status === `excluded`
          ? `Flight record received, not ranked`
          : l.status === `error`
            ? l.errorMessage || `Board temporarily unavailable`
            : (l.status, ``);
  }
  let ie = O(re),
    ae = O(
      () =>
        w(C) &&
        (l.profileStatus === `idle` ||
          l.profileStatus === `saving` ||
          l.profileStatus === `error`),
    );
  (c(() => {
    let e = w(ae),
      t = 0;
    return (
      e && !_
        ? (m(f, !1), (t = requestAnimationFrame(() => m(f, !0))))
        : e || m(f, !1),
      (_ = e),
      () => cancelAnimationFrame(t)
    );
  }),
    c(() => {
      if (l.profileStatus !== `error`) {
        m(p, !1);
        return;
      }
      m(p, !1);
      let e = requestAnimationFrame(() => m(p, !0));
      return () => cancelAnimationFrame(e);
    }),
    c(() => {
      let e = l.board?.submittedId,
        t = l.board?.submittedRank;
      if (!e || !t || t <= 10 || e === S) return;
      let n = requestAnimationFrame(() => {
        let t = v?.querySelector(`[data-entry-id="${CSS.escape(e)}"]`);
        if (t) {
          if (t.classList.contains(`leaderboard__outside`))
            v.scrollTop = v.scrollHeight;
          else {
            let e = v.getBoundingClientRect(),
              n = t.getBoundingClientRect(),
              r = n.top - e.top + v.scrollTop - (v.clientHeight - n.height) / 2;
            v.scrollTo({ top: r, behavior: `auto` });
          }
          S = e;
        }
      });
      return () => cancelAnimationFrame(n);
    }));
  function M(e) {
    (e.preventDefault(), l.onSaveProfile(w(d)));
  }
  var N = At(),
    P = r(N),
    F = r(P);
  (W(r(F), { icon: `heroicons:trophy-solid`, width: `17`, height: `17` }),
    t(2),
    x(F),
    x(P));
  var I = o(P, 2),
    L = r(I),
    R = o(r(L)),
    oe = r(R);
  ne(
    oe,
    19,
    () => l.board?.entries ?? [],
    (e) => e.id,
    (e, t, n) => {
      var a = wt();
      let c;
      var d = r(a),
        f = r(d, !0);
      x(d);
      var p = o(d),
        m = r(p),
        h = r(m),
        g = r(h, !0);
      x(h);
      var _ = o(h, 2),
        v = r(_, !0);
      (x(_), x(m), x(p));
      var y = o(p),
        S = r(y, !0);
      x(y);
      var C = o(y),
        T = r(C, !0);
      x(C);
      var E = o(C),
        O = r(E, !0);
      x(E);
      var k = o(E),
        A = r(k, !0);
      x(k);
      var j = o(k),
        ne = r(j, !0);
      (x(j),
        x(a),
        s(
          (e, r, i) => {
            (b(a, `data-entry-id`, w(t).id),
              (c = D(a, 1, `svelte-23173r`, null, c, {
                leaderboard__current: w(t).id === l.board?.submittedId,
              })),
              u(f, w(n) + 1),
              u(g, w(t).playerName || `Anonymous`),
              u(v, w(t).airportCode),
              u(S, w(t).landings),
              u(T, w(t).departures),
              u(O, e),
              u(A, r),
              u(ne, i));
          },
          [
            () => w(t).pace.toFixed(1),
            () => ee(w(t).durationSeconds),
            () => te(w(t).startedAt),
          ],
        ),
        i(e, a));
    },
    (e) => {
      var t = Tt(),
        n = r(t),
        a = r(n, !0);
      (x(n),
        x(t),
        s(() =>
          u(
            a,
            l.status === `loading`
              ? `Checking the board…`
              : `No departures posted yet`,
          ),
        ),
        i(e, t));
    },
  );
  var z = o(oe),
    B = (e) => {
      var t = Et(),
        n = r(t),
        a = r(n, !0);
      x(n);
      var c = o(n),
        d = r(c),
        f = r(d),
        p = r(f, !0);
      x(f);
      var m = o(f, 2),
        h = r(m, !0);
      (x(m), x(d), x(c));
      var g = o(c),
        _ = r(g, !0);
      x(g);
      var v = o(g),
        y = r(v, !0);
      x(v);
      var S = o(v),
        C = r(S, !0);
      x(S);
      var w = o(S),
        T = r(w, !0);
      x(w);
      var E = o(w),
        D = r(E, !0);
      (x(E),
        x(t),
        s(
          (e, n, r) => {
            (b(t, `data-entry-id`, l.board.submittedEntry.id),
              u(a, l.board.submittedRank),
              u(p, l.board.submittedEntry.playerName || `Anonymous`),
              u(h, l.board.submittedEntry.airportCode),
              u(_, l.board.submittedEntry.landings),
              u(y, l.board.submittedEntry.departures),
              u(C, e),
              u(T, n),
              u(D, r));
          },
          [
            () => l.board.submittedEntry.pace.toFixed(1),
            () => ee(l.board.submittedEntry.durationSeconds),
            () => te(l.board.submittedEntry.startedAt),
          ],
        ),
        i(e, t));
    },
    V = O(
      () =>
        l.board?.submittedEntry &&
        l.board.submittedRank &&
        !l.board.entries.some((e) => e.id === l.board?.submittedId),
    );
  (j(z, (e) => {
    w(V) && e(B);
  }),
    x(R),
    x(L),
    x(I),
    k(
      I,
      (e) => (v = e),
      () => v,
    ));
  var se = o(I, 2),
    H = (e) => {
      var t = Dt();
      let a;
      var c = r(t),
        h = r(c);
      A(h);
      let g;
      x(c);
      var _ = o(c, 2),
        v = r(_),
        S = r(v, !0);
      x(v);
      var C = o(v, 2),
        E = o(C, 2),
        ee = r(E);
      {
        let e = O(() =>
          l.profileStatus === `saving` ? `Saving…` : `Save name`,
        );
        Ct(ee, {
          get value() {
            return w(e);
          },
        });
      }
      (x(E),
        x(_),
        x(t),
        s(
          (e) => {
            ((a = D(
              t,
              1,
              `leaderboard__profile t-panel-slide t-input-wrap [--panel-translate-y:12px] svelte-23173r`,
              null,
              a,
              { "is-error": l.profileStatus === `error` },
            )),
              b(t, `data-open`, w(f)),
              (g = D(h, 1, `t-input svelte-23173r`, null, g, {
                "is-error": l.profileStatus === `error`,
                "is-shaking": w(p),
              })),
              b(h, `maxlength`, 18),
              (h.disabled = l.profileStatus === `saving`),
              u(S, l.profileError || `Could not save your name.`),
              (C.disabled = l.profileStatus === `saving`),
              (E.disabled = e));
          },
          [() => l.profileStatus === `saving` || w(d).trim().length < 2],
        ),
        n(`submit`, t, M),
        y(
          h,
          () => w(d),
          (e) => m(d, e),
        ),
        T(`click`, C, function (...e) {
          l.onDismissProfile?.apply(this, e);
        }),
        i(e, t));
    };
  j(se, (e) => {
    w(ae) && e(H);
  });
  var U = o(se, 2),
    ce = (e) => {
      var n = kt();
      let a;
      var c = r(n);
      let u;
      var d = o(c, 2);
      Ct(d, {
        get value() {
          return w(ie);
        },
      });
      var f = o(d, 2),
        p = (e) => {
          var n = Ot();
          (W(r(n), {
            icon: `heroicons:arrow-path-solid`,
            width: `15`,
            height: `15`,
          }),
            t(),
            x(n),
            T(`click`, n, function (...e) {
              l.onRetry?.apply(this, e);
            }),
            i(e, n));
        };
      (j(f, (e) => {
        (l.status === `error` || l.status === `cooldown`) && e(p);
      }),
        x(n),
        s(() => {
          ((a = D(n, 1, `leaderboard__status svelte-23173r`, null, a, {
            "leaderboard__status--error":
              l.status === `error` || l.status === `cooldown`,
          })),
            (u = D(c, 1, `svelte-23173r`, null, u, {
              leaderboard__pulse: l.status === `loading`,
            })));
        }),
        i(e, n));
    };
  (j(U, (e) => {
    w(ie) && e(ce);
  }),
    x(N),
    i(e, N),
    h());
}
l([`click`]);
var Mt = d(
    `<header class="cdg-row cdg-row--hero svelte-148ev8c"><span class="cdg-arrow svelte-148ev8c"><!></span> <span class="cdg-icon svelte-148ev8c"><!></span> <span class="cdg-copy svelte-148ev8c"><span class="text-xl font-bold leading-none sm:text-2xl">Paused</span> <small class="text-sm font-medium leading-none svelte-148ev8c">Tauolla</small></span></header>`,
  ),
  Nt = d(
    `<div class="cdg-row cdg-row--result cdg-row--landings t-stagger-line t-stagger-line--1 svelte-148ev8c"><span class="cdg-arrow svelte-148ev8c"><!></span> <span class="cdg-icon svelte-148ev8c"><!></span> <span class="cdg-copy svelte-148ev8c"><strong class="text-xl font-bold leading-none sm:text-2xl">Landings</strong> <small class="text-sm font-medium leading-none svelte-148ev8c">Laskeutumiset</small></span> <span class="cdg-value text-2xl font-bold tabular-nums sm:text-3xl svelte-148ev8c"> </span></div> <div class="cdg-row cdg-row--result cdg-row--departures t-stagger-line t-stagger-line--2 svelte-148ev8c"><span class="cdg-arrow svelte-148ev8c"><!></span> <span class="cdg-icon svelte-148ev8c"><!></span> <span class="cdg-copy svelte-148ev8c"><strong class="text-xl font-bold leading-none sm:text-2xl">Departures</strong> <small class="text-sm font-medium leading-none svelte-148ev8c">Lähtevät</small></span> <span class="cdg-value text-2xl font-bold tabular-nums sm:text-3xl svelte-148ev8c"> </span></div> <div class="cdg-row cdg-row--result cdg-row--efficiency t-stagger-line t-stagger-line--3 svelte-148ev8c"><span class="cdg-arrow svelte-148ev8c"><!></span> <span class="cdg-icon svelte-148ev8c"><!></span> <span class="cdg-copy svelte-148ev8c"><strong class="text-xl font-bold leading-none sm:text-2xl">Pace</strong> <small class="text-sm font-medium leading-none svelte-148ev8c">Lentoa/min</small></span> <span class="cdg-value text-2xl font-bold tabular-nums sm:text-3xl svelte-148ev8c"> </span></div> <div class="cdg-row cdg-row--result cdg-row--duration t-stagger-line t-stagger-line--4 svelte-148ev8c"><span class="cdg-arrow svelte-148ev8c"><!></span> <span class="cdg-icon svelte-148ev8c"><!></span> <span class="cdg-copy svelte-148ev8c"><strong class="text-xl font-bold leading-none sm:text-2xl">Duration</strong> <small class="text-sm font-medium leading-none svelte-148ev8c">Lentoaika</small></span> <span class="cdg-value text-2xl font-bold tabular-nums sm:text-3xl svelte-148ev8c"> </span></div> <div class="t-stagger-line t-stagger-line--5"><!></div>`,
    1,
  ),
  Pt = d(
    `<div class="sign-scrim absolute inset-0 z-20 grid place-items-center p-5 svelte-148ev8c"><section><!> <!> <div><button data-cuelume-hover="tick" data-cuelume-press="" class="svelte-148ev8c"><span class="cdg-arrow svelte-148ev8c"><!></span> <span class="cdg-icon cdg-icon--accent svelte-148ev8c"><!></span> <span class="cdg-copy svelte-148ev8c"><strong class="text-xl font-bold leading-none sm:text-2xl"> </strong> <small class="text-sm font-medium leading-none svelte-148ev8c"> </small></span></button></div></section></div>`,
  );
function Ft(e, n) {
  g(n, !0);
  let l = a(!1);
  c(() => {
    let e = requestAnimationFrame(() => m(l, !0));
    return () => cancelAnimationFrame(e);
  });
  function d(e) {
    let t = Math.max(0, Math.round(e)),
      n = Math.floor(t / 3600),
      r = Math.floor((t % 3600) / 60),
      i = t % 60;
    return n > 0
      ? `${n}:${String(r).padStart(2, `0`)}:${String(i).padStart(2, `0`)}`
      : `${r}:${String(i).padStart(2, `0`)}`;
  }
  var f = Pt(),
    _ = r(f);
  let v;
  var y = r(_),
    S = (e) => {
      var n = Mt(),
        a = r(n);
      (W(r(a), {
        icon: `heroicons:arrow-down-16-solid`,
        width: `22`,
        height: `22`,
      }),
        x(a));
      var s = o(a, 2);
      (W(r(s), { icon: `heroicons:pause-solid`, width: `20`, height: `20` }),
        x(s),
        t(2),
        x(n),
        i(e, n));
    };
  j(y, (e) => {
    n.phase === `paused` && e(S);
  });
  var C = o(y, 2),
    E = (e) => {
      var t = Nt(),
        a = p(t),
        c = r(a);
      (W(r(c), {
        icon: `heroicons:arrow-down-16-solid`,
        width: `22`,
        height: `22`,
      }),
        x(c));
      var l = o(c, 2);
      (W(r(l), { icon: `fa7-solid:plane-arrival`, width: `20`, height: `20` }),
        x(l));
      var f = o(l, 4),
        m = r(f, !0);
      (x(f), x(a));
      var h = o(a, 2),
        g = r(h);
      (W(r(g), {
        icon: `heroicons:arrow-up-16-solid`,
        width: `22`,
        height: `22`,
      }),
        x(g));
      var _ = o(g, 2);
      (W(r(_), {
        icon: `fa7-solid:plane-departure`,
        width: `20`,
        height: `20`,
      }),
        x(_));
      var v = o(_, 4),
        y = r(v, !0);
      (x(v), x(h));
      var b = o(h, 2),
        S = r(b);
      (W(r(S), {
        icon: `heroicons:arrow-down-16-solid`,
        width: `22`,
        height: `22`,
      }),
        x(S));
      var C = o(S, 2);
      (W(r(C), { icon: `heroicons:bolt-solid`, width: `20`, height: `20` }),
        x(C));
      var w = o(C, 4),
        T = r(w);
      (x(w), x(b));
      var E = o(b, 2),
        D = r(E);
      (W(r(D), {
        icon: `heroicons:arrow-down-16-solid`,
        width: `22`,
        height: `22`,
      }),
        x(D));
      var O = o(D, 2);
      (W(r(O), { icon: `heroicons:clock-solid`, width: `20`, height: `20` }),
        x(O));
      var ee = o(O, 4),
        k = r(ee, !0);
      (x(ee), x(E));
      var A = o(E, 2);
      (jt(r(A), {
        get board() {
          return n.leaderboard;
        },
        get status() {
          return n.leaderboardStatus;
        },
        get landings() {
          return n.landings;
        },
        get errorMessage() {
          return n.leaderboardError;
        },
        get profileStatus() {
          return n.leaderboardProfileStatus;
        },
        get profileError() {
          return n.leaderboardProfileError;
        },
        get onRetry() {
          return n.onRetryLeaderboard;
        },
        get onSaveProfile() {
          return n.onSaveLeaderboardProfile;
        },
        get onDismissProfile() {
          return n.onDismissLeaderboardProfile;
        },
      }),
        x(A),
        s(
          (e, t) => {
            (u(m, n.landings),
              u(y, n.departures),
              u(T, `${e ?? ``}/min`),
              u(k, t));
          },
          [() => n.efficiency.toFixed(1), () => d(n.elapsed)],
        ),
        i(e, t));
    };
  j(C, (e) => {
    n.phase === `gameover` && e(E);
  });
  var ee = o(C, 2);
  let k;
  var A = r(ee),
    te = r(A);
  (W(r(te), {
    icon: `heroicons:arrow-right-16-solid`,
    width: `22`,
    height: `22`,
  }),
    x(te));
  var ne = o(te, 2),
    re = r(ne);
  {
    let e = O(() =>
      n.phase === `paused`
        ? `heroicons:play-solid`
        : `heroicons:arrow-path-solid`,
    );
    W(re, {
      get icon() {
        return w(e);
      },
      width: `20`,
      height: `20`,
    });
  }
  x(ne);
  var ie = o(ne, 2),
    ae = r(ie),
    M = r(ae, !0);
  x(ae);
  var N = o(ae, 2),
    P = r(N, !0);
  (x(N),
    x(ie),
    x(A),
    x(ee),
    x(_),
    x(f),
    s(() => {
      (b(f, `data-phase`, n.phase),
        (v = D(_, 1, `cdg-sign t-modal svelte-148ev8c`, null, v, {
          "is-open": w(l),
          "t-stagger": n.phase === `gameover`,
          "is-shown": n.phase === `gameover` && w(l),
        })),
        b(_, `aria-label`, n.phase === `paused` ? `Paused` : `Game over`),
        (k = D(ee, 1, `cdg-action svelte-148ev8c`, null, k, {
          "t-stagger-line": n.phase === `gameover`,
          "t-stagger-line--6": n.phase === `gameover`,
        })),
        b(
          A,
          `aria-label`,
          n.phase === `paused` ? `Resume flights` : `Play again`,
        ),
        b(A, `data-cuelume-release`, n.phase === `paused` ? `release` : `page`),
        u(M, n.phase === `paused` ? `Resume flights` : `Play again`),
        u(P, n.phase === `paused` ? `Jatka lentoja` : `Uusi lento`));
    }),
    T(`click`, A, function (...e) {
      (n.phase === `paused` ? n.onResume : n.onRestart)?.apply(this, e);
    }),
    i(e, f),
    h());
}
l([`click`]);
var It = d(
    `<meta name="theme-color" class="svelte-1uha8ag"/> <meta name="theme-color" media="(prefers-color-scheme: light)" class="svelte-1uha8ag"/> <meta name="theme-color" media="(prefers-color-scheme: dark)" class="svelte-1uha8ag"/>`,
    1,
  ),
  Lt = d(`<span> </span>`),
  Rt = d(`<div><!> <span class="svelte-1uha8ag"> </span></div>`),
  zt = d(
    `<div class="landing-assist is-eligible pointer-events-none absolute z-[7] grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] bg-[rgb(248_252_244/0.34)] text-base font-bold shadow-[0_0_0_2px_rgb(18_28_42/0.38)] svelte-1uha8ag" aria-hidden="true"></div>`,
  ),
  Bt = d(
    `<span class="spawn-arrow pointer-events-none absolute z-[6] grid size-[2.6rem] place-items-center rounded-full bg-[#121c2a] shadow-[inset_0_0_0_1px_rgb(242_246_249/0.3),0_0_0_0.18rem_rgb(18_28_42/0.18)] transition-[opacity,transform] duration-180 ease-[var(--ease-smooth-out)] [will-change:transform,opacity] motion-reduce:transition-none svelte-1uha8ag"><span class="spawn-arrow__ring absolute inset-[-0.22rem] rounded-[inherit] border-[0.12rem] border-current opacity-[0.34] motion-reduce:animate-none svelte-1uha8ag"></span> <!></span>`,
  ),
  Vt = d(
    `<div class="runway-countdown pointer-events-none absolute z-[6] inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-[0.22rem] rounded-[0.16rem] border border-[rgb(242_246_249/0.2)] bg-[#121c2a] px-[0.32rem] pt-[0.2rem] pb-[0.17rem] text-[0.72rem] leading-none font-bold text-[#f3f6f8] shadow-[0_0.14rem_0_rgb(0_0_0/0.2)] svelte-1uha8ag"><!> <span class="tabular-nums svelte-1uha8ag"> </span> <!></div>`,
  ),
  Ht = d(
    `<div class="relative h-screen w-screen touch-none overflow-hidden overscroll-none bg-[#78b67a] svelte-1uha8ag"><div class="safari-theme-sample pointer-events-none fixed top-1 left-1/2 z-[999] block h-[11px] w-[89%] -translate-x-1/2 [mask-image:linear-gradient(to_right,transparent,transparent)] svelte-1uha8ag" aria-hidden="true"></div> <div class="safari-theme-sample pointer-events-none fixed bottom-[3px] left-1/2 z-[999] block h-[11px] w-[89%] -translate-x-1/2 [mask-image:linear-gradient(to_right,transparent,transparent)] svelte-1uha8ag" aria-hidden="true"></div> <canvas class="block h-full w-full touch-none select-none [image-rendering:pixelated] svelte-1uha8ag"></canvas> <!> <!> <!> <!> <div class="airport-traffic absolute z-[7] inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-[0.16rem] border border-[rgb(242_246_249/0.22)] bg-[#121c2a] px-[0.36rem] pt-1 pb-[0.21rem] text-[0.76rem] leading-none font-bold text-[#f3f6f8] shadow-[inset_0_0_0_1px_rgb(5_10_18/0.16),0_0.2rem_0_rgb(0_0_0/0.22)] svelte-1uha8ag"><!> <!> <!></div> <!> <!> <!> <audio class="hidden svelte-1uha8ag" src="/cabin_chime.mp3" preload="none"></audio> <audio class="hidden svelte-1uha8ag" src="/laser.mp3" preload="none"></audio> <audio class="hidden svelte-1uha8ag" data-ambient="" src="/airplane_white_noise.mp3?v=20260721" preload="none" loop=""></audio></div>`,
  );
function Ut(e, t) {
  g(t, !0);
  let n = ae;
  function c(e, t) {
    let n = t.submittedEntry,
      r = t.submittedRank;
    if (!n || !r || r > 200) return e;
    let i = e.filter((e) => e.id !== n.id);
    return (i.splice(Math.min(r - 1, i.length), 0, n), i.slice(0, 200));
  }
  let l,
    d,
    _ = a(0),
    v = a(0),
    y = a(0),
    T = a(0),
    E = a(`playing`),
    A = a(!1),
    re = a(!0),
    ie = a(!0),
    M = a(!1),
    N = a(null),
    P = a(`idle`),
    F = a(``),
    I = a(`idle`),
    L = a(``),
    R = a(void 0),
    z = a(void 0),
    V = a(void 0),
    H = a(f([])),
    U = a(`select`),
    ce = null,
    le = null,
    G = a(null),
    K = a(null),
    q = a(f([])),
    ue = a(f([])),
    de = a(f({ x: 0, y: 0 })),
    J = a(f({ occupied: 0, reserved: 0 })),
    Y,
    fe,
    X,
    pe,
    me = 0,
    he = 0,
    ge = 0,
    ve = 0,
    be = 0,
    xe = 0,
    Se = !1,
    Ce = 0,
    we = ``,
    Te = ``,
    Ee = null,
    De = null,
    ke = null,
    Z = 0,
    Ae = 0.65;
  function Q(e, t = !1) {
    if (!w(V)) return;
    cancelAnimationFrame(be);
    let n = w(V);
    e > 0 && n.paused && ((n.volume = 0), n.play().catch(() => void 0));
    let r = n.volume,
      i = performance.now(),
      a = (o) => {
        let s = Math.max(0, Math.min(1, (o - i) / 240)),
          c = s * s * (3 - 2 * s);
        ((n.volume = r + (e - r) * c),
          s < 1 ? (be = requestAnimationFrame(a)) : t && n.pause());
      };
    be = requestAnimationFrame(a);
  }
  function je() {
    w(M) && (X.phase === `playing` ? Q(Ae) : X.phase === `paused` && Q(0, !0));
  }
  function Me() {
    let e = l.getBoundingClientRect();
    return { w: e.width, h: e.height };
  }
  function Ne() {
    let { w: e, h: t } = Me();
    (Y.resize(e, t), (Z = e < 900 ? 44 : 0), X.setBounds(Y.gameplayBounds(Z)));
  }
  function Pe() {
    (ke?.abort(), Y.resetFocus());
    let { w: e, h: t } = Me();
    Y.resize(e, t);
    let r = Y.gameplayBounds(e < 900 ? 44 : 0);
    (X.reset(n, r),
      (we = crypto.randomUUID()),
      (Te = new Date().toISOString()),
      (Ee = null),
      (De = null),
      m(N, null),
      m(P, `idle`),
      m(F, ``),
      m(I, `idle`),
      m(L, ``),
      fe.buildRunways(n),
      fe.clearCrash(),
      m(H, [], !0),
      m(q, [], !0),
      m(ue, [], !0),
      (xe = 0),
      (Se = !1),
      (Ce = 0),
      m(E, `playing`),
      w(U) !== `hidden` && m(U, `select`),
      w(M) && Q(Ae));
  }
  async function Fe(e) {
    let t = Ee;
    if (!t || !w(N)?.submittedId) return;
    ke?.abort();
    let n = new AbortController();
    ((ke = n), m(I, `saving`), m(L, ``));
    try {
      let r = await fetch(`/api/leaderboard`, {
          method: `PATCH`,
          headers: { "content-type": `application/json` },
          body: JSON.stringify({ runId: t.runId, playerName: e }),
          signal: n.signal,
        }),
        i = await r.json().catch(() => null);
      if (!r.ok) {
        (m(I, `error`), m(L, i?.message ?? `Could not save your name.`, !0));
        return;
      }
      if (
        !i?.submittedEntry ||
        i.outcome !== `updated` ||
        ![`development`, `production`].includes(i.environment)
      )
        throw Error(`Invalid leaderboard response.`);
      let a = i.submittedEntry;
      (m(
        N,
        {
          ...w(N),
          environment: i.environment,
          entries: w(N).entries.map((e) => (e.id === a.id ? a : e)),
          submittedId: i.submittedId,
          submittedEntry: a,
          submittedRank: i.submittedRank,
          outcome: i.outcome,
        },
        !0,
      ),
        m(I, `saved`));
    } catch (e) {
      if (e instanceof DOMException && e.name === `AbortError`) return;
      (m(I, `error`), m(L, `Could not save your name.`));
    }
  }
  async function Ie(e = !1) {
    let t = Ee;
    if (!t || (!e && De === t.runId)) return;
    ((De = t.runId), ke?.abort());
    let n = new AbortController();
    ((ke = n), m(P, `loading`), m(F, ``));
    let r = t.landings >= 1;
    try {
      let e = null,
        i = null;
      if (r) {
        let r = await fetch(`/api/leaderboard`, {
            method: `POST`,
            headers: { "content-type": `application/json` },
            body: JSON.stringify(t),
            signal: n.signal,
          }),
          a = await r.json().catch(() => null);
        if (!r.ok)
          i = {
            status: r.status,
            message: a?.message ?? `Board temporarily unavailable`,
          };
        else if (
          !a ||
          ![`saved`, `duplicate`, `excluded`].includes(a.outcome) ||
          ![`development`, `production`].includes(a.environment)
        )
          throw Error(`Invalid leaderboard mutation response.`);
        else e = a;
      }
      let a = await fetch(`/api/leaderboard`, { signal: n.signal }),
        o = await a.json().catch(() => null);
      if (!a.ok) throw Error(o?.message ?? `Board temporarily unavailable`);
      if (
        !o ||
        o.outcome !== `listed` ||
        !Array.isArray(o.entries) ||
        ![`development`, `production`].includes(o.environment)
      )
        throw Error(`Invalid leaderboard response.`);
      (m(
        N,
        e
          ? {
              ...o,
              entries: c(o.entries, e),
              submittedId: e.submittedId,
              submittedEntry: e.submittedEntry,
              submittedRank: e.submittedRank,
              outcome: e.outcome,
            }
          : o,
        !0,
      ),
        i
          ? (m(P, i.status === 429 ? `cooldown` : `error`, !0),
            m(F, i.message, !0))
          : m(
              P,
              e?.outcome === `excluded` ? `excluded` : r ? `saved` : `ready`,
              !0,
            ));
    } catch (e) {
      if (e instanceof DOMException && e.name === `AbortError`) return;
      (m(P, `error`), m(F, `Board temporarily unavailable`));
    }
  }
  function Le(e) {
    return e === `yellow` ? B.yellow : e === `blue` ? B.blue : B.red;
  }
  function $(e) {
    w(M) && ye(e);
  }
  function Re(e) {
    (w(H).push({ ...e, open: !1 }),
      requestAnimationFrame(() => {
        let t = w(H).find((t) => t.id === e.id);
        t && (t.open = !0);
      }));
  }
  function ze(e) {
    return e === `yellow` ? B.yellowToast : Le(e);
  }
  function Be(e) {
    return e === `yellow` ? `#fde047` : e === `blue` ? `#7ca9ff` : `#d93643`;
  }
  function Ve() {
    let { w: e, h: t } = Me();
    m(
      q,
      X.spawnWarnings.map((n) => {
        let r = Y.worldToScreen(n.entry),
          i = Y.worldToScreen({
            x: n.entry.x + Math.cos(n.heading) * 8,
            y: n.entry.y + Math.sin(n.heading) * 8,
          });
        return {
          id: n.id,
          kind: n.kind,
          color: Le(n.kind),
          arrowColor: Be(n.kind),
          x: Math.max(22, Math.min(e - 22, r.x)),
          y: Math.max(22, Math.min(t - 22, r.y)),
          angle: Math.atan2(i.y - r.y, i.x - r.x),
          progress: 1 - n.warningRemaining / n.warningTotal,
        };
      }),
      !0,
    );
  }
  function He() {
    let { w: e, h: t } = Me(),
      r = new Map(X.getRunwayStatuses().map((e) => [e.runwayId, e]));
    m(
      ue,
      n.runways.map((n) => {
        let i = r.get(n.id),
          a = n.end.x - n.approach.x,
          o = n.end.y - n.approach.y,
          s = Math.hypot(a, o) || 1,
          c = Y.worldToScreen({
            x: n.approach.x + a * 0.12 - (o / s) * 5.4,
            y: n.approach.y + o * 0.12 + (a / s) * 5.4,
          });
        return {
          ...i,
          x: Math.max(32, Math.min(e - 32, c.x)),
          y: Math.max(84, Math.min(t - 22, c.y)),
        };
      }),
      !0,
    );
    let i = Y.worldToScreen({ x: -35, y: -26 });
    (m(
      de,
      {
        x: Math.max(110, Math.min(e - 110, i.x)),
        y: Math.max(96, Math.min(t - 90, i.y)),
      },
      !0,
    ),
      m(J, X.getAirportTrafficStatus(), !0));
  }
  function Ue() {
    let { w: e, h: t } = Me(),
      r = X.getLandingIntent();
    if (r?.status === `eligible`) {
      let n = Y.worldToScreen(r.runway.approach);
      m(
        K,
        {
          x: Math.max(34, Math.min(e - 34, n.x)),
          y: Math.max(70, Math.min(t - 34, n.y)),
        },
        !0,
      );
    } else m(K, null);
    if (w(U) === `hidden` || w(U) === `awaiting-landing`) {
      m(G, null);
      return;
    }
    if (w(U) === `select`) {
      let n = X.aircraft.find((e) => e.id === ce && e.state === `flying`);
      if (
        (n ||
          ((n = X.aircraft.find((e) => e.state === `flying`)),
          (ce = n?.id ?? null)),
        !n)
      ) {
        m(G, null);
        return;
      }
      let r = Y.worldToScreen(n.pos);
      m(
        G,
        r.x >= 0 && r.x <= e && r.y >= 0 && r.y <= t
          ? {
              x: Math.max(92, Math.min(e - 92, r.x)),
              y: Math.max(44, r.y - 56),
              text: `Drag this plane`,
              kind: n.kind,
              target: `aircraft`,
            }
          : null,
        !0,
      );
      return;
    }
    let i = n.runways.find((e) => e.color === le);
    if (!i || !le) {
      m(G, null);
      return;
    }
    let a = Y.worldToScreen(i.approach);
    m(
      G,
      {
        x: Math.max(92, Math.min(e - 92, a.x)),
        y: Math.max(70, Math.min(t - 44, a.y - 42)),
        text: `Match here`,
        kind: le,
        target: `runway`,
      },
      !0,
    );
  }
  function Ge(e) {
    let t = he ? e - he : 16;
    ((he = e), Se && e >= Ce && Pe(), X.update(t * (window.airportSpeed || 1)));
    for (let t of X.drainEvents())
      if (t.type === `spawn`) $(`ready`);
      else if (t.type === `land`) {
        (w(U) !== `hidden` && (m(U, `hidden`), m(G, null)), $(`success`));
        let n = Y.worldToScreen(t.pos),
          { w: r, h: i } = Me();
        (Re({
          id: ge++,
          text: `landing`,
          color: ze(t.color),
          x: Math.max(110, Math.min(r - 110, n.x)),
          y: Math.max(48, Math.min(i - 48, n.y)),
          born: e,
        }),
          w(M) &&
            w(R) &&
            ((w(R).currentTime = 0),
            (w(R).volume = 0.65),
            w(R)
              .play()
              .catch(() => void 0)));
      } else if (t.type === `takeoff`) {
        $(`success`);
        let n = Y.worldToScreen(t.pos);
        Re({
          id: ge++,
          text: `departure`,
          color: ze(t.color),
          x: n.x,
          y: n.y,
          born: e,
        });
      } else if (t.type === `reject`) {
        $(`error`);
        let n = Y.worldToScreen(t.pos);
        Re({
          id: ge++,
          text: t.reason === `direction` ? `wrong direction` : `wrong color`,
          color: B.warning,
          x: n.x,
          y: n.y,
          born: e,
        });
      } else
        t.type === `crash` &&
          ($(`error`),
          w(M) &&
            w(z) &&
            ((w(z).currentTime = 0),
            (w(z).volume = 0.22),
            w(z)
              .play()
              .catch(() => void 0)),
          cancelAnimationFrame(be),
          w(V)?.pause(),
          fe.showCrash(t.pos),
          Y.focusCrash(t.pos),
          (xe = e + (t.immediate ? 0 : 2400)),
          (Ee = {
            runId: we,
            landings: X.score.landings,
            departures: X.score.departures,
            durationSeconds: X.elapsed,
            startedAt: Te,
          }),
          Ie());
    if (w(H).length) {
      for (let t of w(H)) e - t.born >= 1300 && (t.open = !1);
      m(
        H,
        w(H).filter((t) => e - t.born < 1650),
        !0,
      );
    }
    let n = X.drawing?.ac.id ?? null;
    (fe.syncAircraft(X.aircraft, n, X.warningIds, X.phase !== `playing`),
      fe.syncPaths(X.aircraft, X.drawing, X.hoveredId, X.getLandingIntent()),
      Y.render(),
      X.setBounds(Y.gameplayBounds(Z)),
      Ve(),
      He(),
      Ue(),
      m(_, We(X.score, X.elapsed), !0),
      m(v, X.elapsed, !0),
      m(y, X.score.landings, !0),
      m(T, X.score.departures, !0),
      m(E, Se || (X.phase === `gameover` && e < xe) ? `playing` : X.phase, !0),
      (me = requestAnimationFrame(Ge)));
  }
  let Ke = () => {
      (X.togglePause(), je());
    },
    qe = () => {
      (X.resume(), je());
    },
    Je = () => {
      Se ||
        ((Se = !0), m(E, `playing`), (Ce = performance.now() + Y.returnHome()));
    },
    Ye = () => {},
    Xe = () => {},
    Ze = () => {},
    Qe = () => {},
    $e = () => {},
    et = () => {
      w(M)
        ? (ye(`toggle`),
          _e(!1),
          m(M, !1),
          cancelAnimationFrame(be),
          w(R)?.pause(),
          w(z)?.pause(),
          w(V)?.pause())
        : (m(M, !0),
          _e(!0),
          ye(`toggle`),
          w(R)?.load(),
          w(z)?.load(),
          X.phase === `playing` && Q(Ae));
    },
    tt = (e) => {
      (Y.rotateBy(e), $(`tick`));
    },
    nt = () => {};
  function rt(e) {
    return (
      e instanceof Element &&
      !!e.closest(
        `input, textarea, select, [contenteditable]:not([contenteditable="false"])`,
      )
    );
  }
  function it(e) {
    e.isComposing ||
      e.defaultPrevented ||
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      rt(e.target) ||
      (e.key === ` ` &&
        (X.phase === `playing` || X.phase === `paused`) &&
        (e.preventDefault(), $(`toggle`), Ke()));
  }
  ee(() => {
    let e = !1,
      t;
    return (
      (Y = new se(d)),
      (fe = new oe(Y)),
      (X = new ot()),
      (window.airportSim = X),
      _e(!1),
      Oe(),
      (async () => {
        if ((await fe.loadAssets(), e)) {
          fe.dispose();
          return;
        }
        ((pe = mt(d, Y, X, {
          onGrab: () => {
            (w(U) !== `hidden` &&
              ((le = X.drawing?.ac.kind ?? null), m(U, `match`)),
              $(`press`));
          },
          onPathPoint: () => {
            let e = performance.now();
            e - ve < 90 || ((ve = e), $(`tick`));
          },
          onRelease: (e) => {
            (e === `landing` ? $(`success`) : e === `path` && $(`release`),
              w(U) !== `hidden` &&
                (m(U, e === `landing` ? `awaiting-landing` : `select`, !0),
                (le = null)));
          },
        })),
          Pe(),
          (t = new ResizeObserver(() => Ne())),
          t.observe(l),
          window.addEventListener(`keydown`, it),
          (me = requestAnimationFrame(Ge)));
      })().catch((e) => console.error(`Failed to load game assets`, e)),
      () => {
        ((e = !0),
          cancelAnimationFrame(me),
          cancelAnimationFrame(be),
          pe?.(),
          t?.disconnect(),
          window.removeEventListener(`keydown`, it),
          w(R)?.pause(),
          w(z)?.pause(),
          w(V)?.pause(),
          _e(!1),
          fe?.dispose(),
          Y?.dispose());
      }
    );
  });
  var at = Ht();
  C(`1uha8ag`, (e) => {
    var t = It(),
      n = p(t),
      r = o(n, 2),
      a = o(r, 2);
    (s(() => {
      (b(n, `content`, B.bg), b(r, `content`, B.bg), b(a, `content`, B.bg));
    }),
      i(e, t));
  });
  var st = r(at);
  let ct;
  var lt = o(st, 2);
  let ut;
  var dt = o(lt, 2);
  k(
    dt,
    (e) => (d = e),
    () => d,
  );
  var ft = o(dt, 2);
  ne(
    ft,
    17,
    () => w(H),
    (e) => e.id,
    (e, t) => {
      var n = Lt();
      let a;
      var o = r(n, !0);
      (x(n),
        s(() => {
          ((a = D(
            n,
            1,
            `popup t-toast pointer-events-none absolute z-[6] -translate-x-1/2 -translate-y-1/2 rounded-[0.35rem] bg-[rgb(248_252_244/0.82)] px-[0.42rem] py-[0.18rem] text-sm font-bold whitespace-nowrap shadow-[inset_0_0_0_1px_rgb(22_34_55/0.12)] [text-shadow:0_1px_0_rgb(255_255_255/0.75)] [backdrop-filter:blur(10px)] tabular-nums svelte-1uha8ag`,
            null,
            a,
            { "is-open": w(t).open },
          )),
            S(
              n,
              `left: ${w(t).x ?? ``}px; top: ${w(t).y ?? ``}px; color: ${w(t).color ?? ``}`,
            ),
            u(o, w(t).text));
        }),
        i(e, n));
    },
  );
  var pt = o(ft, 2),
    ht = (e) => {
      var t = Rt();
      let n, a;
      var c = r(t);
      {
        let e = O(() =>
          w(G).target === `aircraft`
            ? `heroicons:cursor-arrow-rays-solid`
            : `fa7-solid:plane-arrival`,
        );
        W(c, {
          get icon() {
            return w(e);
          },
          width: `18`,
          height: `18`,
        });
      }
      var l = o(c, 2),
        d = r(l, !0);
      (x(l),
        x(t),
        s(() => {
          ((n = D(
            t,
            1,
            `onboarding-hint pointer-events-none absolute z-[8] flex -translate-x-1/2 -translate-y-full items-center gap-[0.34rem] rounded-[0.24rem] bg-[#121c2a] px-[0.58rem] py-[0.38rem] text-sm leading-none font-bold whitespace-nowrap text-[#f3f6f8] shadow-[inset_0_0_0_1px_rgb(242_246_249/0.24)] after:absolute after:top-full after:left-1/2 after:size-0 after:-translate-x-1/2 after:border-[0.34rem] after:border-transparent after:border-t-[#121c2a] after:content-[''] svelte-1uha8ag`,
            null,
            n,
            { "is-runway": w(G).target === `runway` },
          )),
            (a = S(t, ``, a, { left: `${w(G).x}px`, top: `${w(G).y}px` })),
            u(d, w(G).text));
        }),
        i(e, t));
    };
  j(pt, (e) => {
    w(G) && e(ht);
  });
  var gt = o(pt, 2),
    vt = (e) => {
      var t = zt();
      let n;
      (s(() => (n = S(t, ``, n, { left: `${w(K).x}px`, top: `${w(K).y}px` }))),
        i(e, t));
    };
  j(gt, (e) => {
    w(K) && e(vt);
  });
  var yt = o(gt, 2);
  ne(
    yt,
    17,
    () => w(q),
    (e) => e.id,
    (e, t) => {
      var n = Bt();
      let a;
      (W(o(r(n), 2), {
        icon: `heroicons:arrow-right-16-solid`,
        width: `32`,
        height: `32`,
      }),
        x(n),
        s(
          () =>
            (a = S(n, ``, a, {
              color: w(t).color,
              "--arrow-accent": w(t).arrowColor,
              left: `${w(t).x}px`,
              top: `${w(t).y}px`,
              opacity: 0.54 + w(t).progress * 0.42,
              transform: `translate(-50%, -50%) rotate(${w(t).angle}rad)`,
            })),
        ),
        i(e, n));
    },
  );
  var bt = o(yt, 2);
  let St;
  var Ct = r(bt);
  W(Ct, {
    icon: `material-symbols:connecting-airports`,
    width: `14`,
    height: `14`,
  });
  var wt = o(Ct, 2);
  _t(wt, {
    get value() {
      return w(J).occupied;
    },
    className: `tabular-nums`,
  });
  var Tt = o(wt, 2),
    Et = (e) => {
      _t(e, {
        get value() {
          return w(J).reserved;
        },
        prefix: `+`,
        className: `text-[0.65rem] font-bold opacity-80 tabular-nums`,
      });
    };
  (j(Tt, (e) => {
    w(J).reserved > 0 && e(Et);
  }),
    x(bt));
  var Dt = o(bt, 2);
  ne(
    Dt,
    17,
    () => w(ue),
    (e) => e.runwayId,
    (e, t) => {
      var n = te(),
        a = p(n),
        c = (e) => {
          var n = Vt();
          let a;
          var c = r(n);
          W(c, {
            icon: `fa7-solid:plane-departure`,
            width: `12`,
            height: `12`,
          });
          var l = o(c, 2),
            d = r(l);
          x(l);
          var f = o(l, 2),
            p = (e) => {
              {
                let n = O(() => w(t).departureQueue - 1);
                _t(e, {
                  get value() {
                    return w(n);
                  },
                  prefix: `+`,
                  className: `text-[0.65rem] font-bold opacity-80 tabular-nums`,
                });
              }
            };
          (j(f, (e) => {
            w(t).departureQueue > 1 && e(p);
          }),
            x(n),
            s(
              (e, r) => {
                (b(n, `aria-label`, e),
                  (a = S(n, ``, a, {
                    left: `${w(t).x}px`,
                    top: `${w(t).y}px`,
                  })),
                  u(d, `${r ?? ``}s`));
              },
              [
                () =>
                  `${w(t).color} departure in ${w(t).nextDepartureIn.toFixed(1)} seconds`,
                () => w(t).nextDepartureIn.toFixed(1),
              ],
            ),
            i(e, n));
        };
      (j(a, (e) => {
        w(t).nextDepartureIn !== null && e(c);
      }),
        i(e, n));
    },
  );
  var Ot = o(Dt, 2);
  {
    let e = O(() => w(E) === `paused`);
    xt(Ot, {
      get landings() {
        return w(y);
      },
      get departures() {
        return w(T);
      },
      get efficiency() {
        return w(_);
      },
      get elapsed() {
        return w(v);
      },
      get paused() {
        return w(e);
      },
      get soundEnabled() {
        return w(M);
      },
      get fastForward() {
        return w(A);
      },
      get spawningEnabled() {
        return w(re);
      },
      get leaderboardProtectionsEnabled() {
        return w(ie);
      },
      onPause: Ke,
      onToggleSound: et,
      onRotateLeft: () => tt(-10),
      onRotateRight: () => tt(10),
      onToggleFastForward: Ye,
      onToggleSpawning: Xe,
      onAddLandings: Ze,
      onAddDepartures: Qe,
      onToggleLeaderboardProtections: $e,
      onForceGameOver: nt,
    });
  }
  var kt = o(Ot, 2),
    At = (e) => {
      {
        let t = O(() => (w(E) === `gameover` ? `gameover` : `paused`));
        Ft(e, {
          get phase() {
            return w(t);
          },
          get landings() {
            return w(y);
          },
          get departures() {
            return w(T);
          },
          get efficiency() {
            return w(_);
          },
          get elapsed() {
            return w(v);
          },
          get leaderboard() {
            return w(N);
          },
          get leaderboardStatus() {
            return w(P);
          },
          get leaderboardError() {
            return w(F);
          },
          get leaderboardProfileStatus() {
            return w(I);
          },
          get leaderboardProfileError() {
            return w(L);
          },
          onResume: qe,
          onRestart: Je,
          onRetryLeaderboard: () => void Ie(!0),
          onSaveLeaderboardProfile: (e) => void Fe(e),
          onDismissLeaderboardProfile: () => m(I, `dismissed`),
        });
      }
    };
  j(kt, (e) => {
    (w(E) === `paused` || w(E) === `gameover`) && e(At);
  });
  var jt = o(kt, 2);
  k(
    jt,
    (e) => m(R, e),
    () => w(R),
  );
  var Mt = o(jt, 2);
  (k(
    Mt,
    (e) => m(z, e),
    () => w(z),
  ),
    k(
      o(Mt, 2),
      (e) => m(V, e),
      () => w(V),
    ),
    x(at),
    k(
      at,
      (e) => (l = e),
      () => l,
    ),
    s(() => {
      ((ct = S(st, ``, ct, { background: B.bg })),
        (ut = S(lt, ``, ut, { background: B.bg })),
        b(
          bt,
          `aria-label`,
          `${w(J).occupied} planes at the airport${w(J).reserved > 0 ? `, plus ${w(J).reserved} incoming` : ``}`,
        ),
        (St = S(bt, ``, St, { left: `${w(de).x}px`, top: `${w(de).y}px` })));
    }),
    i(e, at),
    h());
}
export { Ut as component, le as universal, ot as Sim };
