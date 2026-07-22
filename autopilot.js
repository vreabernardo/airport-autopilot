(() => {
  if (window.__apInstalled) return;
  window.__apInstalled = true;
  window.__apStop = false;
  window.__apStats = { routes: 0, delays: 0, panics: 0, ticks: 0, dodges: 0, verifies: 0 };
  window.__apTrace = [];
  const trace = (m) => { const g = window.__game; window.__apTrace.push({ t: g ? +g.elapsed.toFixed(1) : 0, m }); if (window.__apTrace.length > 200) window.__apTrace.shift(); };

  const SPECS = {
    yellow: { speed: 7, radius: 2.4 },
    blue: { speed: 8, radius: 2.6 },
    red: { speed: 9, radius: 2.8 },
  };
  const DEP_SPEED = 10.5;
  const AIRBORNE_TP = 0.58;
  const SAFETY = 1.9;
  const PANIC = 1.15;
  const HORIZON = 32;
  const DT = 0.2;
  const MERGE_DIST = 12;
  const LOOP_R = 7;
  const ACT_T = 20;
  const COOLDOWN_MS = 1500;
  const WARN_CONE_R = 15;

  const cooldown = new Map();
  const now = () => (window.__simNow ? window.__simNow() : Date.now());
  const holds = new Map();
  const HOLD_RADII = [7, 18, 29];

  function holdCenter(rw) {
    const d = unit({ x: rw.end.x - rw.approach.x, y: rw.end.y - rw.approach.y });
    return { x: rw.approach.x - d.x * (MERGE_DIST + 12), y: rw.approach.y - d.y * (MERGE_DIST + 12) };
  }

  function freeHoldRadius(g, rwId, excludeId) {
    const used = new Set();
    for (const [id, h] of holds) {
      if (id !== excludeId && h.rwId === rwId && g.aircraft.some((a) => a.id === id)) used.add(h.r);
    }
    for (const r of HOLD_RADII) if (!used.has(r)) return r;
    return HOLD_RADII[HOLD_RADII.length - 1];
  }

  function orbitWps(ac, hold) {
    const c = hold.center;
    const r = hold.r;
    const startAng = Math.atan2(ac.pos.y - c.y, ac.pos.x - c.x);
    const wps = [];
    const N = 12;
    for (let i = 0; i <= N; i++) {
      const a = startAng - (i / N) * Math.PI * 2;
      wps.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
    }
    return wps;
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const unit = (v) => {
    const l = Math.hypot(v.x, v.y) || 1;
    return { x: v.x / l, y: v.y / l };
  };

  function runwayFor(g, ac) {
    const rws = (g.map && g.map.runways) || [];
    return rws.find((r) => ac.spec.allows.includes(r.color)) || null;
  }

  function runwayForKind(g, kind) {
    const rws = (g.map && g.map.runways) || [];
    return rws.find((r) => r.color === kind) || null;
  }

  function outOfBounds(p, b, m) {
    if (!b) return false;
    if (!b.corners) return p.x < b.minX - m || p.x > b.maxX + m || p.y < b.minY - m || p.y > b.maxY + m;
    let cx = 0, cy = 0;
    for (const c of b.corners) { cx += c.x / b.corners.length; cy += c.y / b.corners.length; }
    let mr = 0;
    for (const c of b.corners) mr = Math.max(mr, (c.x - cx) ** 2 + (c.y - cy) ** 2);
    return (p.x - cx) ** 2 + (p.y - cy) ** 2 > (Math.sqrt(mr) + m) ** 2;
  }

  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 <= 1e-9) return dist(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    return dist(p, { x: a.x + dx * t, y: a.y + dy * t });
  }

  function corridorSegs(g) {
    const out = [];
    for (const r of (g.map && g.map.runways) || []) {
      const dx = r.end.x - r.approach.x, dy = r.end.y - r.approach.y;
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l;
      const b = g.bounds || { minX: -174, maxX: 174, minY: -174, maxY: 174 };
      const sx = Math.abs(ux) < 1e-6 ? Infinity : ((ux > 0 ? b.maxX : b.minX) - r.end.x) / ux;
      const sy = Math.abs(uy) < 1e-6 ? Infinity : ((uy > 0 ? b.maxY : b.minY) - r.end.y) / uy;
      const ext = Math.max(0, Math.min(sx, sy)) + 28;
      const exit = { x: r.end.x + ux * ext, y: r.end.y + uy * ext };
      out.push({ color: r.color, a: r.approach, b: exit, end: r.end, ux, uy });
    }
    return out;
  }

  function corridorDist(g, p) {
    let m = Infinity;
    for (const r of (g.map && g.map.runways) || []) {
      const dx = r.end.x - r.approach.x, dy = r.end.y - r.approach.y;
      const l = Math.hypot(dx, dy) || 1;
      const ux = dx / l, uy = dy / l;
      const b = g.bounds || { minX: -174, maxX: 174, minY: -174, maxY: 174 };
      const sx = Math.abs(ux) < 1e-6 ? Infinity : ((ux > 0 ? b.maxX : b.minX) - r.end.x) / ux;
      const sy = Math.abs(uy) < 1e-6 ? Infinity : ((uy > 0 ? b.maxY : b.minY) - r.end.y) / uy;
      const ext = Math.max(0, Math.min(sx, sy)) + 28;
      const exit = { x: r.end.x + ux * ext, y: r.end.y + uy * ext };
      m = Math.min(m, segDist(p, r.approach, exit));
    }
    return m;
  }

  function orbitOkForCorridor(g, center, r) {
    return corridorDist(g, center) >= r + 8;
  }

  function mergePoint(runway) {
    const d = unit({ x: runway.end.x - runway.approach.x, y: runway.end.y - runway.approach.y });
    return { x: runway.approach.x - d.x * MERGE_DIST, y: runway.approach.y - d.y * MERGE_DIST };
  }

  function Be(e) {
    if (e.length <= 2) return e.map((p) => ({ x: p.x, y: p.y }));
    let t = [e[0]], n = e[0];
    for (let r = 1; r < e.length - 1; r++) {
      let i = e[r];
      if (dist(n, i) >= 4.2) { t.push(i); n = i; }
    }
    t.push(e[e.length - 1]);
    return t.map((p, idx) => {
      if (idx === 0 || idx === t.length - 1) return { x: p.x, y: p.y };
      let r = t[idx - 1], i = t[idx + 1];
      return { x: p.x * 0.5 + (r.x + i.x) * 0.25, y: p.y * 0.5 + (r.y + i.y) * 0.25 };
    });
  }

  function pt(e, t, n, r) {
    let i = t.map((p) => ({ x: p.x, y: p.y }));
    for (; i.length > 0 && dist(i[i.length - 1], n) <= 10;) i.pop();
    let a = Be(i), o = a[a.length - 1] ?? e, s = r.x - n.x, c = r.y - n.y, l = Math.hypot(s, c) || 1, u = s / l, d = c / l;
    let f = -((o.x - n.x) * u + (o.y - n.y) * d);
    if (f <= 0.5) return [...a, { x: n.x, y: n.y }, { x: r.x, y: r.y }];
    let p = dist(o, n), m = (n.x - o.x) / (p || 1), h = (n.y - o.y) / (p || 1), g = p * 0.35, _ = Math.min(p * 0.3, f * 0.5);
    let v = { x: o.x + m * g, y: o.y + h * g }, y = { x: n.x - u * _, y: n.y - d * _ }, b = [];
    for (let k = 1; k <= 6; k++) {
      let tt = k / 6, rr = 1 - tt;
      b.push({ x: rr * rr * rr * o.x + 3 * rr * rr * tt * v.x + 3 * rr * tt * tt * y.x + tt * tt * tt * n.x, y: rr * rr * rr * o.y + 3 * rr * rr * tt * v.y + 3 * rr * tt * tt * y.y + tt * tt * tt * n.y });
    }
    return [...a, ...b, { x: r.x, y: r.y }];
  }

  function simTransform(g, ac, waypoints) {
    const rw = runwayFor(g, ac);
    if (rw && waypoints.length && dist(waypoints[waypoints.length - 1], rw.approach) <= 10) {
      return { path: pt(ac.pos, waypoints, rw.approach, rw.end), rw };
    }
    return { path: Be(waypoints), rw: null };
  }

  function applyPathT(g, ac, wps, why) {
    const ok = applyPath(g, ac, wps);
    if (ok) trace('apply ' + why + ' ' + ac.kind + '#' + ac.id + ' n=' + wps.length + ' res=' + (ac.target ? ac.target.color : 'null') + ' pos=' + Math.round(ac.pos.x) + ',' + Math.round(ac.pos.y));
    return ok;
  }

  function applyPath(g, ac, waypoints) {
    if (g.phase !== 'playing' || g.drawing) return false;
    if (ac.state !== 'flying') return false;
    if (!g.grab({ x: ac.pos.x, y: ac.pos.y })) return false;
    let last = { x: ac.pos.x, y: ac.pos.y };
    for (const wp of waypoints) {
      if (dist(wp, last) >= 1.5) {
        g.drag({ x: wp.x, y: wp.y });
        last = wp;
      }
    }
    const res = g.release();
    return res === 'landing' || res === 'path';
  }

  function traj(ac, t0 = 0, rw = null, loop = false) {
    const speed = ac.state === 'departing' ? DEP_SPEED : SPECS[ac.kind].speed;
    const wp = (ac.path || []).map((p) => ({ x: p.x, y: p.y }));
    const start = { x: ac.pos.x, y: ac.pos.y };
    let pos = { x: ac.pos.x, y: ac.pos.y };
    let heading = ac.heading;
    let wi = 0;
    const out = [];
    const steps = Math.ceil((HORIZON + t0) / DT);
    for (let k = 1; k <= steps; k++) {
      const t = k * DT;
      if (t < t0) {
        out.push({ t, x: start.x, y: start.y, h: heading, last: wp.length <= 1 });
        continue;
      }
      let step = speed * DT;
      while (step > 1e-9) {
        if (loop && wi >= wp.length && wp.length > 1) wi = 0;
        if (wi >= wp.length) {
          pos = { x: pos.x + Math.cos(heading) * step, y: pos.y + Math.sin(heading) * step };
          step = 0;
          break;
        }
        const tgt = wp[wi];
        const d = dist(pos, tgt);
        heading = Math.atan2(tgt.y - pos.y, tgt.x - pos.x);
        if (d <= step) {
          pos = { x: tgt.x, y: tgt.y };
          wi++;
          step -= d;
        } else {
          pos = { x: pos.x + Math.cos(heading) * step, y: pos.y + Math.sin(heading) * step };
          step = 0;
        }
      }
      out.push({ t, x: pos.x, y: pos.y, h: heading, last: wi >= wp.length - 1 });
    }
    return out;
  }

  function airborneMask(g, ac, tr) {
    const mask = new Array(tr.length).fill(false);
    if (ac.state === 'flying') {
      const rw = ac.target;
      let landed = false;
      for (let i = 0; i < tr.length; i++) {
        if (!landed && rw && tr[i].last && dist(tr[i], rw.approach) < 0.9) landed = true;
        mask[i] = !landed;
      }
    } else if (ac.state === 'departing' && ac.target) {
      const r = ac.target;
      const dx = r.end.x - r.approach.x;
      const dy = r.end.y - r.approach.y;
      const len2 = dx * dx + dy * dy || 1;
      for (let i = 0; i < tr.length; i++) {
        const tp = Math.max(0, Math.min(1, ((tr[i].x - r.approach.x) * dx + (tr[i].y - r.approach.y) * dy) / len2));
        mask[i] = tp >= AIRBORNE_TP && !outOfBounds(tr[i], g.bounds, 12);
      }
    }
    return mask;
  }

  function onFinal(ac) {
    if (!ac.target || ac.state !== 'flying') return false;
    const r = ac.target;
    const d = unit({ x: r.end.x - r.approach.x, y: r.end.y - r.approach.y });
    const lat = (p) => Math.abs((p.x - r.approach.x) * -d.y + (p.y - r.approach.y) * d.x);
    if (lat(ac.pos) > 2.5) return false;
    for (const p of ac.path || []) if (lat(p) > 2.5) return false;
    return true;
  }

  function buildScene(g) {
    const acs = g.aircraft.filter((a) => a.state === 'flying' || a.state === 'departing');
    const items = acs.map((a) => {
      const tr = traj(a, 0, null, holds.has(a.id));
      return { ac: a, tr, mask: airborneMask(g, a, tr), r: SPECS[a.kind].radius };
    });
    const pending = g.aircraft
      .filter((a) => (a.state === 'holding' || a.state === 'taxiing-out') && a.scheduledDepartureAt !== null && a.target)
      .map((a) => {
        const r = a.target;
        const d = unit({ x: r.end.x - r.approach.x, y: r.end.y - r.approach.y });
        const exit = { x: r.end.x + d.x * 250, y: r.end.y + d.y * 250 };
        const t0 = Math.max(0, a.scheduledDepartureAt - g.elapsed);
        const syn = { pos: r.approach, heading: Math.atan2(d.y, d.x), path: [r.end, exit], kind: a.kind, state: 'departing', target: r };
        const tr = traj(syn, t0);
        return { ac: a, tr, mask: airborneMask(g, syn, tr), r: SPECS[a.kind].radius };
      });
    const warns = (g.spawnWarnings || []).map((w) => {
      const tr = traj({ pos: w.pos, heading: w.heading, path: [], kind: w.kind, state: 'flying' }, w.warningRemaining);
      const mask = tr.map((p) => p.t >= w.warningRemaining);
      return { warn: w, tr, mask, r: SPECS[w.kind].radius };
    });
    return { items, pending, warns };
  }

  function pairHit(A, B, thr) {
    const n = Math.min(A.tr.length, B.tr.length);
    for (let k = 0; k < n; k++) {
      if (A.mask && !A.mask[k]) continue;
      if (B.mask && !B.mask[k]) continue;
      const d = dist(A.tr[k], B.tr[k]);
      if (d < thr) return { t: A.tr[k].t, d };
    }
    return null;
  }

  function findConflict(g, scene) {
    const { items, pending, warns } = scene;
    let best = null;
    const consider = (hit, a, b) => {
      if (hit && (!best || hit.t < best.t)) best = { t: hit.t, d: hit.d, a, b };
    };
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i];
        const B = items[j];
        consider(pairHit(A, B, (A.r + B.r) * SAFETY), A.ac, B.ac);
      }
      const A = items[i];
      for (const P of pending) consider(pairHit(A, P, (A.r + P.r) * SAFETY), A.ac, P.ac);
      for (const W of warns) {
        const hit = pairHit(A, W, (A.r + W.r) * SAFETY);
        if (hit) consider(hit, A.ac, null);
      }
    }
    return best;
  }

  function orbitHereWps(ac, sideSign = 1) {
    const h = { x: Math.cos(ac.heading), y: Math.sin(ac.heading) };
    const side = { x: -h.y * sideSign, y: h.x * sideSign };
    const c = { x: ac.pos.x + side.x * LOOP_R, y: ac.pos.y + side.y * LOOP_R };
    const startAng = Math.atan2(ac.pos.y - c.y, ac.pos.x - c.x);
    const wps = [];
    const N = 10;
    for (let i = 1; i <= N; i++) {
      const a = startAng + (i / N) * Math.PI * 2;
      wps.push({ x: c.x + Math.cos(a) * LOOP_R, y: c.y + Math.sin(a) * LOOP_R });
    }
    return wps;
  }

  function warnConeHit(g, tr) {
    for (const w of g.spawnWarnings || []) {
      for (let k = 0; k < tr.length; k++) {
        const t = tr[k].t;
        if (t < w.warningRemaining || t > w.warningRemaining + 4) continue;
        if (dist(tr[k], w.pos) < WARN_CONE_R) return true;
      }
    }
    return false;
  }

  function verifyPath(g, ac, waypoints, scene, loop = false) {
    const tf = simTransform(g, ac, waypoints);
    const syn = { pos: ac.pos, heading: ac.heading, path: tf.path, kind: ac.kind, state: 'flying', target: tf.rw };
    const tr = traj(syn, 0, null, loop);
    const mask = airborneMask(g, syn, tr);
    const A = { tr, mask, r: SPECS[ac.kind].radius };
    if (warnConeHit(g, tr)) return { ok: false, hit: { t: 0, d: -1, cone: true } };
    let worst = Infinity;
    for (const B of scene.items) {
      if (B.ac === ac) continue;
      const hit = pairHit(A, B, (A.r + B.r) * SAFETY);
      if (hit) { hit.who = B.ac.kind + '#' + B.ac.id + ':' + B.ac.state; return { ok: false, hit }; }
      const n = Math.min(A.tr.length, B.tr.length);
      for (let k = 0; k < n; k++) {
        if (A.mask && !A.mask[k]) continue;
        if (B.mask && !B.mask[k]) continue;
        const d = dist(A.tr[k], B.tr[k]) - (A.r + B.r);
        if (d < worst) worst = d;
      }
    }
    for (const P of scene.pending) {
      const hit = pairHit(A, P, (A.r + P.r) * SAFETY);
      if (hit) { hit.who = 'pending ' + P.ac.kind + '#' + P.ac.id; return { ok: false, hit }; }
    }
    for (const W of scene.warns) {
      const hit = pairHit(A, W, (A.r + W.r) * SAFETY);
      if (hit) { hit.who = 'warn'; return { ok: false, hit }; }
    }
    return { ok: true, clearance: worst };
  }

  function parallelExposure(g, a, b, ownColor) {
    let pen = 0;
    for (const c of corridorSegs(g)) {
      if (c.color === ownColor) continue;
      const segLen = dist(a, b) || 1e-9;
      const dot = Math.abs(((b.x - a.x) / segLen) * c.ux + ((b.y - a.y) / segLen) * c.uy);
      if (dot < 0.87) continue;
      const steps = Math.ceil(segLen / 2);
      let inside = 0;
      for (let i = 0; i <= steps; i++) {
        const p = { x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps };
        if (segDist(p, c.a, c.b) < 11) inside += segLen / steps;
      }
      pen += inside;
    }
    return pen;
  }

  function routeWps(g, ac) {
    const rw = runwayFor(g, ac);
    if (!rw) return null;
    const dir = unit({ x: rw.end.x - rw.approach.x, y: rw.end.y - rw.approach.y });
    const merge = { x: rw.approach.x - dir.x * MERGE_DIST, y: rw.approach.y - dir.y * MERGE_DIST };
    const goal = [merge, { x: rw.approach.x, y: rw.approach.y }];
    const LANES_V = [0, 60];
    const LANES_H = [-60, 45];
    const vias = [[]];
    for (const lx of LANES_V) vias.push([{ x: lx, y: ac.pos.y }, { x: lx, y: merge.y }]);
    for (const ly of LANES_H) vias.push([{ x: ac.pos.x, y: ly }, { x: merge.x, y: ly }]);
    vias.push([{ x: 0, y: ac.pos.y }, { x: 0, y: 45 }, { x: merge.x, y: 45 }]);
    vias.push([{ x: 60, y: ac.pos.y }, { x: 60, y: 45 }, { x: merge.x, y: 45 }]);
    vias.push([{ x: ac.pos.x, y: -60 }, { x: merge.x, y: -60 }]);
    let best = null;
    for (const v of vias) {
      const pts = [ac.pos, ...v, merge];
      let len = 0, pen = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        len += dist(pts[i], pts[i + 1]);
        pen += parallelExposure(g, pts[i], pts[i + 1], ac.kind);
      }
      const score = len + pen * 8;
      if (!best || score < best.score) best = { score, wps: [...v, ...goal] };
    }
    return best ? best.wps : null;
  }

  function directWps(g, ac) {
    const rw = runwayFor(g, ac);
    if (!rw) return null;
    const m = mergePoint(rw);
    return [m, { x: rw.approach.x, y: rw.approach.y }];
  }

  function spawnSepWps(g, ac) {
    let nearest = null;
    let nd = 22;
    for (const o of g.aircraft) {
      if (o === ac || o.state !== 'flying') continue;
      const d = dist(ac.pos, o.pos);
      if (d < nd) { nd = d; nearest = o; }
    }
    if (!nearest) return null;
    const away = unit({ x: ac.pos.x - nearest.pos.x, y: ac.pos.y - nearest.pos.y });
    return [{ x: ac.pos.x + away.x * 20, y: ac.pos.y + away.y * 20 }];
  }

  function sideVec(ac, flip, awayFrom) {
    const h = { x: Math.cos(ac.heading), y: Math.sin(ac.heading) };
    let side = { x: -h.y, y: h.x };
    if (awayFrom) {
      const toOther = { x: awayFrom.x - ac.pos.x, y: awayFrom.y - ac.pos.y };
      if (side.x * toOther.x + side.y * toOther.y > 0) side = { x: -side.x, y: -side.y };
    }
    if (flip) side = { x: -side.x, y: -side.y };
    return side;
  }

  function dodgeWps(g, ac, awayFrom, flip) {
    const rw = runwayFor(g, ac);
    if (!rw) return null;
    const side = sideVec(ac, flip, awayFrom);
    const p1 = { x: ac.pos.x + side.x * 15, y: ac.pos.y + side.y * 15 };
    const p2 = { x: p1.x + side.x * 15, y: p1.y + side.y * 15 };
    const m = mergePoint(rw);
    return [p1, p2, m, { x: rw.approach.x, y: rw.approach.y }];
  }

  function loopWps(g, ac, awayFrom, flip) {
    const rw = runwayFor(g, ac);
    if (!rw) return null;
    const side = sideVec(ac, flip, awayFrom);
    const c = { x: ac.pos.x + side.x * LOOP_R, y: ac.pos.y + side.y * LOOP_R };
    const startAng = Math.atan2(ac.pos.y - c.y, ac.pos.x - c.x);
    const h = { x: Math.cos(ac.heading), y: Math.sin(ac.heading) };
    const sgn = h.x * side.y - h.y * side.x > 0 ? 1 : -1;
    const wps = [];
    const N = 10;
    for (let i = 1; i <= N; i++) {
      const a = startAng + sgn * (i / N) * Math.PI * 2;
      wps.push({ x: c.x + Math.cos(a) * LOOP_R, y: c.y + Math.sin(a) * LOOP_R });
    }
    const m = mergePoint(rw);
    wps.push(m, { x: rw.approach.x, y: rw.approach.y });
    return wps;
  }

  function maneuver(g, ac, awayFromPos, scene) {
    const hh = { x: Math.cos(ac.heading), y: Math.sin(ac.heading) };
    const c1 = { x: ac.pos.x + -hh.y * LOOP_R, y: ac.pos.y + hh.x * LOOP_R };
    const orbitSide = orbitOkForCorridor(g, c1, LOOP_R) ? 1 : -1;
    const orbit = orbitHereWps(ac, orbitSide);
    const orbitCenter = { x: ac.pos.x + -hh.y * LOOP_R * orbitSide, y: ac.pos.y + hh.x * LOOP_R * orbitSide };
    const candidates = [
      { kind: 'direct', wps: directWps(g, ac) },
      { kind: 'dodge', wps: dodgeWps(g, ac, awayFromPos, false) },
      { kind: 'dodge', wps: dodgeWps(g, ac, awayFromPos, true) },
      { kind: 'loop', wps: loopWps(g, ac, awayFromPos, false) },
      { kind: 'loop', wps: loopWps(g, ac, awayFromPos, true) },
      { kind: 'orbit', wps: orbit.concat(directWps(g, ac) || []) },
      { kind: 'orbit-hold', wps: orbit, loop: true },
    ].filter((c) => c.wps && c.wps.length);
    let bestFail = null;
    for (const c of candidates) {
      const v = verifyPath(g, ac, c.wps, scene, !!c.loop);
      if (v.ok) {
        if (applyPathT(g, ac, c.wps, 'maneuver-' + c.kind)) {
          trace('maneuver ' + c.kind + ' ok for ' + ac.kind + '#' + ac.id);
          if (c.kind === 'orbit' || c.kind === 'orbit-hold') {
            const rw = runwayFor(g, ac);
            holds.set(ac.id, { rwId: rw ? rw.id : '?', center: orbitCenter, r: LOOP_R, self: true });
          }
          window.__apStats.verifies++;
          if (c.kind === 'loop') window.__apStats.delays++;
          if (c.kind === 'dodge') window.__apStats.dodges++;
          return true;
        }
      } else {
        const cl = v.clearance === Infinity ? -1 : v.clearance;
        trace('  cand ' + c.kind + ' fail: ' + (v.hit ? 'hit t=' + v.hit.t.toFixed(1) + ' d=' + v.hit.d.toFixed(1) + ' vs ' + (v.hit.who || '?') + (v.hit.cone ? ' CONE' : '') : 'cl=' + (cl < 0 ? 'inf' : cl.toFixed(1))));
        if (!bestFail || cl > bestFail.cl) bestFail = { cl, c };
      }
    }
    trace('maneuver ALL-FAIL for ' + ac.kind + '#' + ac.id + ' state=' + ac.state + ' pos=' + Math.round(ac.pos.x) + ',' + Math.round(ac.pos.y));
    return false;
  }

  function panicCheck(g, scene) {
    const acs = g.aircraft.filter((a) => a.state === 'flying' || (a.state === 'departing' && a.takeoffProgress >= AIRBORNE_TP));
    for (let i = 0; i < acs.length; i++) {
      for (let j = i + 1; j < acs.length; j++) {
        const A = acs[i];
        const B = acs[j];
        const thr = (SPECS[A.kind].radius + SPECS[B.kind].radius) * PANIC;
        if (dist(A.pos, B.pos) < thr) {
          const victim = A.state === 'flying' ? A : B.state === 'flying' ? B : null;
          if (victim) {
            const other = victim === A ? B : A;
            window.__apStats.panics++;
            for (const flip of [false, true]) {
              const wps = dodgeWps(g, victim, other.pos, flip);
              if (wps && verifyPath(g, victim, wps, scene).ok && applyPath(g, victim, wps)) return true;
            }
            const orbit = orbitHereWps(victim);
            applyPath(g, victim, orbit);
            return true;
          }
        }
      }
    }
    return false;
  }

  function remainingDist(ac) {
    let d = 0;
    let p = ac.pos;
    for (const w of ac.path || []) { d += dist(p, w); p = w; }
    return d;
  }

  function pickVictim(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.state !== 'flying' && b.state !== 'flying') return null;
    if (a.state !== 'flying') return b;
    if (b.state !== 'flying') return a;
    if (holds.has(a.id) && !holds.has(b.id)) return b;
    if (holds.has(b.id) && !holds.has(a.id)) return a;
    const ra = a.target ? dist(a.pos, a.target.approach) : remainingDist(a);
    const rb = b.target ? dist(b.pos, b.target.approach) : remainingDist(b);
    if (ra < 10 && rb >= 10) return b;
    if (rb < 10 && ra >= 10) return a;
    return ra >= rb ? a : b;
  }


  function cpaMin(A, B) {
    const n = Math.min(A.tr.length, B.tr.length);
    let best = Infinity, bt = 0;
    for (let k = 0; k < n; k++) {
      if (A.mask && !A.mask[k]) continue;
      if (B.mask && !B.mask[k]) continue;
      const d = dist(A.tr[k], B.tr[k]);
      if (d < best) { best = d; bt = A.tr[k].t; }
    }
    return { d: best, t: bt };
  }

  function landTime(tr, mask) {
    for (let k = 0; k < tr.length; k++) if (mask && !mask[k]) return tr[k].t;
    return HORIZON;
  }

  function mkCand(g, ac, kind, wps, loop, delay, center, hr) {
    if (!wps || !wps.length) return null;
    const tf = simTransform(g, ac, wps);
    const syn = { pos: ac.pos, heading: ac.heading, path: tf.path, kind: ac.kind, state: 'flying', target: tf.rw };
    const tr = traj(syn, 0, null, loop);
    const mask = airborneMask(g, syn, tr);
    return { kind, wps, loop, tr, mask, r: SPECS[ac.kind].radius, lt: landTime(tr, mask), delay, center, hr };
  }

  function candidatesFor(g, ac, scene, isHolder) {
    const out = [];
    const rw = runwayFor(g, ac);
    const mk = (kind, wps, loop, delay, center, hr) => {
      if (!wps || !wps.length) return;
      if ((kind === 'orbit' || kind === 'hold' || kind === 'flee') && center && corridorDist(g, center) < (hr || LOOP_R) + 11) return;
      const tf = simTransform(g, ac, wps);
      const syn = { pos: ac.pos, heading: ac.heading, path: tf.path, kind: ac.kind, state: 'flying', target: tf.rw };
      const tr = traj(syn, 0, null, loop);
      const mask = airborneMask(g, syn, tr);
      out.push({ kind, wps, loop, tr, mask, r: SPECS[ac.kind].radius, lt: landTime(tr, mask), delay, center, hr });
    };
    const hereCenter = (sideSign) => {
      const h = { x: Math.cos(ac.heading), y: Math.sin(ac.heading) };
      return { x: ac.pos.x + -h.y * LOOP_R * sideSign, y: ac.pos.y + h.x * LOOP_R * sideSign };
    };
    const base = routeWps(g, ac);
    const sep = spawnSepWps(g, ac);
    if (isHolder) {
      const hold = holds.get(ac.id);
      if (hold) mk('hold', orbitWps(ac, hold), true, 10, hold.center, hold.r);
      if (base) mk('release', sep ? [...sep, ...base] : base, false, 0);
      for (const sideSign of [1, -1]) mk('orbit', orbitHereWps(ac, sideSign), true, 10, hereCenter(sideSign), LOOP_R);
      let nw = null, nwd = Infinity;
      for (const w of g.spawnWarnings || []) {
        const d = dist(ac.pos, w.pos);
        if (d < nwd) { nwd = d; nw = w; }
      }
      if (nw && nwd < 25) {
        const aw = { x: ac.pos.x - nw.pos.x, y: ac.pos.y - nw.pos.y };
        const al = Math.hypot(aw.x, aw.y) || 1;
        for (const rot of [0, 0.9, -0.9]) {
          const cs = Math.cos(rot), sn = Math.sin(rot);
          const dx = (aw.x * cs - aw.y * sn) / al, dy = (aw.x * sn + aw.y * cs) / al;
          const center = { x: ac.pos.x + dx * 13, y: ac.pos.y + dy * 13 };
          mk('flee', orbitWps(ac, { center, r: LOOP_R }), true, 12, center, LOOP_R);
        }
      }
    } else {
      if (base) mk('route', sep ? [...sep, ...base] : base, false, 0);
      for (const sideSign of [1, -1]) mk('orbit', orbitHereWps(ac, sideSign), true, 10, hereCenter(sideSign), LOOP_R);
      if (base) {
        mk('dodgeL', [...dodgeWps(g, ac, null, false), ...base], false, 4);
        mk('dodgeR', [...dodgeWps(g, ac, null, true), ...base], false, 4);
        mk('loopL', [...loopWps(g, ac, null, false), ...base], false, 6);
        mk('loopR', [...loopWps(g, ac, null, true), ...base], false, 6);
      }
      for (const lx of [0, 60]) {
        if (Math.abs(ac.pos.x - lx) > 8) mk('lane', [{ x: lx, y: ac.pos.y }], false, 5);
        if (base) {
          const dir0 = unit({ x: runwayFor(g, ac).end.x - runwayFor(g, ac).approach.x, y: runwayFor(g, ac).end.y - runwayFor(g, ac).approach.y });
          const rw = runwayFor(g, ac);
          const merge = { x: rw.approach.x - dir0.x * MERGE_DIST, y: rw.approach.y - dir0.y * MERGE_DIST };
          mk('lane', [{ x: lx, y: ac.pos.y }, { x: lx, y: merge.y }, merge, { x: rw.approach.x, y: rw.approach.y }], false, 7);
        }
      }
    }
    return out;
  }

  function planActions(g) {
    const scene = buildScene(g);
    const flying = g.aircraft.filter((a) => a.state === 'flying');
    const finalLocked = (a) => a.target && (a.path || []).length <= 2;
    const staticsBase = [...scene.pending, ...scene.warns];

    const evalTr = (cand, others) => {
      let clr = Infinity;
      for (const B of others) {
        const c = cpaMin(cand, B);
        if (c.d < (cand.r + B.r) * SAFETY) { cand.failWho = B.ac ? B.ac.kind + '#' + B.ac.id + ':' + B.ac.state : (B.warn ? 'warn' : 'pending'); cand.failT = c.t; return null; }
        const m = c.d - (cand.r + B.r);
        if (m < clr) clr = m;
      }
      if (warnConeHit(g, cand.tr)) { cand.failWho = 'cone'; return null; }
      return clr === Infinity ? 30 : clr;
    };

    const active = [];
    const preActions = [];
    for (const a of flying) {
      if (finalLocked(a)) continue;
      const holder = holds.has(a.id);
      const others = [...scene.items.filter((it) => it.ac !== a), ...staticsBase];
      const curTr = traj(a, 0, null, holder);
      const cur = { tr: curTr, mask: airborneMask(g, a, curTr), r: SPECS[a.kind].radius };
      const v = evalTr(cur, others);
      if (v === null) trace('gate-fail ' + a.kind + '#' + a.id + ' vs ' + cur.failWho + ' t=' + (cur.failT || 0).toFixed(1) + ' pl=' + (a.path || []).length + ' tgt=' + (a.target ? a.target.color : 'null'));
      if (v !== null) {
        if (holder) {
          const base = routeWps(g, a);
          if (base) {
            const sep = spawnSepWps(g, a);
            const c = mkCand(g, a, 'release', sep ? [...sep, ...base] : base, false, 0);
            if (c && evalTr(c, others) !== null) { preActions.push({ ac: a, cand: c }); }
          }
        } else if (!a.target) {
          const base = routeWps(g, a);
          if (base) {
            const sep = spawnSepWps(g, a);
            const c = mkCand(g, a, 'route', sep ? [...sep, ...base] : base, false, 0);
            if (c && evalTr(c, others) !== null) { preActions.push({ ac: a, cand: c }); continue; }
          }
          active.push({ ac: a, urg: 15 });
        }
        continue;
      }
      active.push({ ac: a, urg: 0 });
    }

    let beamActions = [];
    if (active.length) {
      const order = active.sort((x, y) => x.urg - y.urg).slice(0, 5).map((e) => e.ac);
      const orderIds = new Set(order.map((a) => a.id));
      const byId2 = new Map();
      for (const it of scene.items) byId2.set(it.ac.id, it);
      const statics = [
        ...scene.items.filter((it) => !orderIds.has(it.ac.id)),
        ...staticsBase,
      ];
      let beam = [{ assign: new Map(), bottleneck: -1, cost: 0 }];
      const WIDTH = 8;
      for (let oi = 0; oi < order.length; oi++) {
        const ac = order[oi];
        const later = order.slice(oi + 1).map((a) => byId2.get(a.id)).filter(Boolean);
        const evalCand = (cand, assigned) => {
          let clr = Infinity;
          const check = (B) => {
            const c = cpaMin(cand, B);
            const thr = (cand.r + B.r) * SAFETY;
            if (c.d < thr) return false;
            const margin = c.d - (cand.r + B.r);
            if (margin < clr) clr = margin;
            return true;
          };
          for (const B of statics) if (!check(B)) return null;
          for (const B of later) if (!check(B)) return null;
          for (const [id, c2] of assigned) if (!check(c2)) return null;
          if (warnConeHit(g, cand.tr)) return null;
          return { clr };
        };
        const cands = candidatesFor(g, ac, scene, holds.has(ac.id));
        const next = [];
        for (const node of beam) {
          for (const cand of cands) {
            const ev = evalCand(cand, node.assign);
            if (!ev) continue;
            const assign = new Map(node.assign);
            assign.set(ac.id, { ac, cand, tr: cand.tr, mask: cand.mask, r: cand.r });
            const margin = ev.clr === Infinity ? 6 : Math.min(6, ev.clr);
            const bottleneck = node.bottleneck < 0 ? margin : Math.min(node.bottleneck, margin);
            next.push({ assign, bottleneck, cost: node.cost + cand.delay + cand.lt * 0.05 });
          }
        }
        if (!next.length) break;
        next.sort((x, y) => (Math.floor(y.bottleneck * 2) - Math.floor(x.bottleneck * 2)) || (x.cost - y.cost));
        beam = next.slice(0, WIDTH);
      }
      if (beam.length && beam[0].assign.size) {
        for (const [id, e] of beam[0].assign) {
          if (e.cand.kind !== 'keep') beamActions.push({ ac: e.ac, cand: e.cand });
        }
      } else {
        return null;
      }
    }
    return [...preActions, ...beamActions];
  }

  function tick() {
    if (window.__apStop) return;
    const g = window.__game;
    if (!g || g.phase !== 'playing' || !g.map) return;
    window.__apStats.ticks++;

    panicCheck(g, buildScene(g));

    const actions = planActions(g);
    const planned = new Set();
    if (actions) {
      for (const { ac, cand } of actions) {
        if (g.drawing) break;
        if (ac.state !== 'flying') continue;
        const scene2 = buildScene(g);
        let stale = false;
        for (const B of [...scene2.items.filter((it) => it.ac !== ac), ...scene2.pending, ...scene2.warns]) {
          const c = cpaMin(cand, B);
          if (c.d < (cand.r + B.r) * SAFETY) { stale = true; break; }
        }
        if (stale || warnConeHit(g, cand.tr)) { trace('skip-stale ' + ac.kind + '#' + ac.id); continue; }
        if (cand.kind === 'hold' || cand.kind === 'orbit') {
          const rw = runwayFor(g, ac);
          const had = holds.has(ac.id) && (ac.path || []).length > 4 && cand.kind === 'hold';
          holds.set(ac.id, { rwId: rw ? rw.id : '?', center: cand.center, r: cand.hr || LOOP_R, self: true });
          if (had) { planned.add(ac.id); continue; }
          if (applyPathT(g, ac, cand.wps, 'plan-' + cand.kind)) {
            planned.add(ac.id);
            window.__apStats.holds = (window.__apStats.holds || 0) + 1;
          }
        } else {
          holds.delete(ac.id);
          if (applyPathT(g, ac, cand.wps, 'plan-' + cand.kind)) {
            planned.add(ac.id);
            window.__apStats.routes++;
          }
        }
      }
    } else {
      const scene = buildScene(g);
      const conf = findConflict(g, scene);
      if (conf && conf.t < ACT_T) {
        const victim = pickVictim(conf.a, conf.b);
        if (victim && victim.state === 'flying' && !g.drawing) {
          const other = victim === conf.a ? conf.b : conf.a;
          maneuver(g, victim, other ? other.pos : null, scene);
        }
      }
    }

    for (const [id, hold] of [...holds]) {
      const ac = g.aircraft.find((a) => a.id === id);
      if (!ac || ac.state !== 'flying' || ac.target) { holds.delete(id); continue; }
      if (planned.has(id) || g.drawing) continue;
      if ((ac.path || []).length <= 4) {
        if (applyPathT(g, ac, orbitWps(ac, hold), 'orbit-refresh')) {
          window.__apStats.orbits = (window.__apStats.orbits || 0) + 1;
        }
      }
    }
  }

  window.__apStatus = () => {
    const g = window.__game;
    if (!g) return { ok: false };
    return {
      ok: true,
      phase: g.phase,
      elapsed: g.elapsed,
      landings: g.score.landings,
      departures: g.score.departures,
      airborne: g.aircraft.filter((a) => a.state === 'flying').length,
      total: g.aircraft.length,
      warnings: (g.spawnWarnings || []).length,
      stats: window.__apStats,
      stop: window.__apStop,
    };
  };

  setInterval(tick, 100);
})();
