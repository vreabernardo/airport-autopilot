import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const execute = promisify(execFile);
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(projectDir, 'docs');
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-explainers-'));
const solverSource = fs.readFileSync(path.join(projectDir, 'autopilot.js'), 'utf8');
const fps = 15;
const frameCount = 180;

const instrumentedSolver = solverSource
  .replace(
    'for (const ac of flying) {\n      ac.target ||= runways[ac.kind];',
    'for (const ac of flying) {\n      if (window.__captureExplain) { ac._capturePasses = []; ac._captureCandidates = []; ac._captureFields = []; }\n      ac.target ||= runways[ac.kind];',
  )
  .replace(
    'let best = null;\n        const reverse',
    'let best = null;\n        const captureCandidates = [];\n        const captureField = Object.fromEntries([...chosen].map(([id, velocity]) => [id, { ...velocity }]));\n        const reverse',
  )
  .replace(
    'if (!best || score > best.score) best = { score, angle, velocity, offset, clearance };',
    'if (window.__captureExplain) captureCandidates.push({ score, angle, velocity: { ...velocity }, offset, clearance });\n          if (!best || score > best.score) best = { score, angle, velocity, offset, clearance };',
  )
  .replace(
    'chosen.set(ac.id, best.velocity);\n        ac._solution = best;',
    'chosen.set(ac.id, best.velocity);\n        ac._solution = best;\n        if (window.__captureExplain) { ac._capturePasses[iteration] = { ...best, velocity: { ...best.velocity } }; ac._captureCandidates[iteration] = captureCandidates; ac._captureFields[iteration] = captureField; }',
  )
  .replace(
    'const dt = 1 / 60;\n    for (let pass = 0; pass < shieldPasses; pass++) {',
    'const dt = 1 / 60;\n    const captureShieldBefore = Object.fromEntries([...chosen].map(([id, velocity]) => [id, { ...velocity }]));\n    for (let pass = 0; pass < shieldPasses; pass++) {',
  )
  .replace(
    'chosen.set(ac.id, safest.velocity);\n        ac.path =',
    `if (window.__captureExplain) {
          let threat = null;
          for (const other of airborne) {
            if (other === ac) continue;
            const ov = chosen.get(other.id);
            const clearance = Math.hypot(ac.pos.x + velocity.x * dt - other.pos.x - ov.x * dt, ac.pos.y + velocity.y * dt - other.pos.y - ov.y * dt) - ac.spec.radius - other.spec.radius;
            if (!threat || clearance < threat.clearance) threat = { aircraft: other, velocity: { ...ov }, clearance };
          }
          window.__captureShieldEvents ||= [];
          window.__captureShieldEvents.push({ pass, aircraft: ac, before: { ...velocity }, after: { ...safest.velocity }, clearanceBefore: nextClearance, threat });
        }
        chosen.set(ac.id, safest.velocity);
        ac.path =`,
  )
  .replace(
    '\n  }\n\n  function install() {',
    '\n    if (window.__captureExplain) window.__captureShieldFinal = { before: captureShieldBefore, after: Object.fromEntries([...chosen].map(([id, velocity]) => [id, { ...velocity }])), events: [...(window.__captureShieldEvents || [])] };\n  }\n\n  function install() {',
  );

fs.mkdirSync(outputDir, { recursive: true });

async function encode(name) {
  await execute(process.env.FFMPEG || 'ffmpeg', [
    '-y', '-framerate', String(fps), '-i', path.join(temporaryDir, name, 'frame-%03d.png'),
    '-vf', 'fps=15,scale=1200:-1:flags=neighbor,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
    '-loop', '0', path.join(outputDir, `${name}.gif`),
  ]);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });
  await page.route('**/_app/immutable/nodes/2.*.js', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const exposed = source
      .replace('X=new ot,', 'X=window.__game=new ot,')
      .replace(/Y\s*=\s*new se\(d\)/, 'Y=window.__airportViewport=new se(d)')
      .replace('function Ue(){', 'function Ue(){m(G,null);return;');
    if (exposed === source) throw new Error('Game instrumentation points were not found.');
    await route.fulfill({ response, body: exposed });
  });
  await page.addInitScript(() => { window.__captureExplain = true; });
  await page.addInitScript(instrumentedSolver);
  await page.goto('https://airport.apunen.com/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(
    () => window.__game?.phase === 'playing' && window.__airportViewport && window.__airportControlDirect,
    undefined,
    { timeout: 90_000 },
  );

  const audit = await page.evaluate(() => {
    const sim = window.__game;
    const allRunways = sim.map.runways.map(runway => ({
      ...runway,
      approach: { ...runway.approach },
      end: { ...runway.end },
    }));
    const samples = {};
    for (let batch = 0; batch < 120 && Object.keys(samples).length < 3; batch++) {
      const limit = sim.elapsed + 2;
      while (sim.phase === 'playing' && sim.elapsed < limit) {
        for (const aircraft of sim.aircraft) {
          if (aircraft.state === 'flying' && !samples[aircraft.kind]) {
            samples[aircraft.kind] = { ...aircraft, pos: { ...aircraft.pos }, path: [], target: null };
          }
        }
        sim.step(1 / 60);
      }
    }
    const kinds = ['yellow', 'blue', 'red'].filter(kind => samples[kind]);
    if (kinds.length < 3) throw new Error(`Only collected game assets for: ${kinds.join(', ')}`);

    sim.spawningEnabled = false;
    sim.spawnWarnings.length = 0;
    sim.drawing = null;
    sim.hoveredId = null;
    sim.hoveredRunwayId = null;
    sim.step = () => {};
    sim.update = () => {};
    sim.map.groundRoutes = {};
    sim.map.scenery.grassPatches = [];
    sim.map.scenery.dirtFields = [];
    sim.map.scenery.stream = null;
    sim.map.scenery.trees = [];
    sim.map.scenery.buildings = [];
    const sceneryLayer = window.__airportViewport.scene.getObjectByName('airport-scenery');
    if (sceneryLayer) sceneryLayer.visible = false;
    const viewport = window.__airportViewport;
    const originalRender = viewport.render.bind(viewport);
    viewport.render = function renderDiagram(...args) {
      const simplify = object => {
        if (object.type === 'Sprite') {
          object.visible = false;
          if (object.material) object.material.opacity = 0;
        }
        if (object.name === 'aircraft-airborne-halo') {
          object.visible = false;
          object.material.opacity = 0;
        }
        if (object.geometry?.type === 'PlaneGeometry' && object.material?.color?.getHexString() === '78b67a') {
          object.material.color.setHex(0x102126);
        }
      };
      this.scene.traverse(simplify);
      const result = originalRender(...args);
      this.scene.traverse(simplify);
      return result;
    };

    const gameCanvas = document.querySelector('canvas');
    const ancestors = new Set();
    for (let element = gameCanvas; element; element = element.parentElement) ancestors.add(element);
    document.querySelectorAll('body *').forEach(element => {
      if (!ancestors.has(element)) element.style.visibility = 'hidden';
    });
    const hideGameChrome = () => {
      document.querySelectorAll('.landing-assist, body *').forEach(element => {
        const transientResult = /^(landing|departure|drag this plane|match here)$/i.test(element.textContent?.trim() || '');
        if (!ancestors.has(element) && transientResult) element.style.visibility = 'hidden';
        if (element.classList?.contains('landing-assist')) element.style.visibility = 'hidden';
      });
    };
    hideGameChrome();
    new MutationObserver(hideGameChrome).observe(document.body, { childList: true, subtree: true });

    const overlay = document.createElement('canvas');
    overlay.width = innerWidth;
    overlay.height = innerHeight;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100%;height:100%;pointer-events:none;image-rendering:pixelated';
    document.body.append(overlay);
    const context = overlay.getContext('2d');
    context.imageSmoothingEnabled = false;

    const palette = {
      ink: '#f5edcf', dim: '#8da0a8', panel: '#071217', edge: '#6d7f85',
      yellow: '#facc15', blue: '#57a2ff', red: '#f05252', safe: '#43d7e5', danger: '#ff4f91', proposed: '#f2ae49', black: '#071014',
    };
    const colorFor = kind => palette[kind] || palette.ink;
    const runwayFor = kind => allRunways.find(runway => runway.color === kind);
    const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
    const velocityTo = (aircraft, point) => {
      const angle = angleTo(aircraft.pos, point);
      return { x: Math.cos(angle) * aircraft.spec.speed, y: Math.sin(angle) * aircraft.spec.speed };
    };
    const screen = point => window.__airportViewport.worldToScreen(point);
    const world = point => {
      const viewport = window.__airportViewport;
      const origin = viewport.worldToScreen({ x: 0, y: 0 });
      const xBasis = viewport.worldToScreen({ x: 1, y: 0 });
      const yBasis = viewport.worldToScreen({ x: 0, y: 1 });
      const a = xBasis.x - origin.x, b = yBasis.x - origin.x;
      const d = xBasis.y - origin.y, e = yBasis.y - origin.y;
      const det = a * e - b * d;
      const sx = point.x - origin.x, sy = point.y - origin.y;
      return { x: (sx * e - b * sy) / det, y: (a * sy - d * sx) / det };
    };
    const clonePlane = (kind, id) => ({
      ...samples[kind], id, kind, spec: samples[kind].spec, pos: { ...samples[kind].pos },
      path: [], target: null, state: 'flying', age: 30, landProgress: 0, takeoffProgress: 0,
    });
    const stage = (planes, stagedWarnings = []) => {
      for (const plane of planes) {
        plane.target = null;
        plane.state = 'flying';
        plane.path = [{ ...runwayFor(plane.kind).approach }];
        plane.heading = angleTo(plane.pos, plane.path[0]);
      }
      sim.aircraft.splice(0, sim.aircraft.length, ...planes);
      sim.spawnWarnings.splice(0, sim.spawnWarnings.length, ...stagedWarnings);
      window.__captureShieldEvents = [];
      window.__captureShieldFinal = null;
      window.__airportControlDirect(sim);
    };
    let seed = 0x51f15e;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const randomPoint = () => world({ x: 170 + random() * 860, y: 125 + random() * 420 });
    const screenDistance = (a, b) => {
      const sa = screen(a), sb = screen(b);
      return Math.hypot(sa.x - sb.x, sa.y - sb.y);
    };
    const clearOfOwnRunway = plane => screenDistance(plane.pos, runwayFor(plane.kind).approach) > 210;
    const pairwiseSeparated = planes => planes.every((plane, index) =>
      planes.slice(index + 1).every(other => screenDistance(plane.pos, other.pos) > 135));
    const snapshot = plane => ({
      kind: plane.kind, id: plane.id, age: plane.age, pos: { ...plane.pos }, spec: plane.spec,
      target: runwayFor(plane.kind), direct: velocityTo(plane, runwayFor(plane.kind).approach),
      passes: plane._capturePasses.map(pass => ({ ...pass, velocity: { ...pass.velocity } })),
      candidates: plane._captureCandidates.map(list => list.map(candidate => ({ ...candidate, velocity: { ...candidate.velocity } }))),
      fields: plane._captureFields.map(field => Object.fromEntries(Object.entries(field).map(([id, velocity]) => [id, { ...velocity }]))),
    });
    const closestPair = (planes, velocities, horizon = 8) => {
      let closest = null;
      for (let i = 0; i < planes.length; i++) {
        for (let j = i + 1; j < planes.length; j++) {
          const a = planes[i], b = planes[j];
          const av = velocities[a.id], bv = velocities[b.id];
          const px = b.pos.x - a.pos.x, py = b.pos.y - a.pos.y;
          const vx = bv.x - av.x, vy = bv.y - av.y;
          const vv = vx * vx + vy * vy;
          const time = vv < 1e-8 ? 0 : Math.max(0, Math.min(horizon, -(px * vx + py * vy) / vv));
          const clearance = Math.hypot(px + vx * time, py + vy * time) - a.spec.radius - b.spec.radius;
          if (!closest || clearance < closest.clearance) closest = { aId: a.id, bId: b.id, time, clearance };
        }
      }
      return closest;
    };
    const passField = (planes, pass) => Object.fromEntries(planes.map(plane => [plane.id, plane._capturePasses[pass].velocity]));
    const nextTickGap = (planes, velocities) => closestPair(planes.map(plane => ({
      ...plane,
      pos: { x: plane.pos.x + velocities[plane.id].x / 60, y: plane.pos.y + velocities[plane.id].y / 60 },
    })), Object.fromEntries(planes.map(plane => [plane.id, { x: 0, y: 0 }])), 0).clearance;

    let decision = null;
    for (let trial = 0; trial < 6000 && !decision; trial++) {
      const planes = [clonePlane('blue', 9101), clonePlane('red', 9102)];
      planes[0].pos = randomPoint();
      planes[1].pos = randomPoint();
      stage(planes);
      const candidates = planes[0]._captureCandidates[1];
      const direct = candidates.find(candidate => Math.abs(candidate.offset) < 1e-9);
      const selected = planes[0]._capturePasses[1];
      const exactField = { ...planes[0]._captureFields[1], [planes[0].id]: direct?.velocity };
      const replay = direct ? closestPair(planes, exactField) : null;
      const safeReplay = closestPair(planes, { ...planes[0]._captureFields[1], [planes[0].id]: selected.velocity });
      if (planes.every(clearOfOwnRunway) && screenDistance(planes[0].pos, planes[1].pos) > 180
          && direct?.clearance < 2 && selected.clearance >= 5 && Math.abs(selected.offset) > .12
          && Math.abs(replay.clearance - direct.clearance) < 1e-6
          && Math.abs(safeReplay.clearance - selected.clearance) < 1e-6 && replay.time > .5) {
        decision = { planes: planes.map(snapshot), focusId: planes[0].id, replay, safeReplay };
      }
    }
    if (!decision) throw new Error('Could not synthesize a valid direct-conflict decision scene.');

    let coordination = null;
    for (let trial = 0; trial < 50000 && !coordination; trial++) {
      const planes = [clonePlane('yellow', 9201), clonePlane('blue', 9202), clonePlane('red', 9203)];
      planes[0].age = 24;
      planes[1].age = 9;
      planes[2].age = 1;
      for (const plane of planes) plane.pos = randomPoint();
      stage(planes);
      const deltas = planes.map(plane => Math.abs(Math.atan2(
        Math.sin(plane._capturePasses[3].angle - plane._capturePasses[0].angle),
        Math.cos(plane._capturePasses[3].angle - plane._capturePasses[0].angle),
      )));
      const sweep0 = closestPair(planes, passField(planes, 0));
      const sweep3 = closestPair(planes, passField(planes, 3));
      const direct = closestPair(planes, Object.fromEntries(planes.map(plane => [plane.id, velocityTo(plane, runwayFor(plane.kind).approach)])));
      if (pairwiseSeparated(planes) && direct.clearance < 2 && sweep0.clearance >= 2 && sweep3.clearance >= 2
          && Math.max(...deltas) > .12 && direct.time > .5) {
        coordination = { planes: planes.map(snapshot), deltas, direct, sweep0, sweep3 };
      }
    }
    if (!coordination) throw new Error('Could not synthesize a valid sequential-coordination scene.');

    let shield = null;
    for (let trial = 0; trial < 4000 && !shield; trial++) {
      const planes = [clonePlane('yellow', 9301), clonePlane('red', 9302)];
      const center = randomPoint();
      if (sim.map.runways.some(runway => screenDistance(center, runway.approach) < 230)) continue;
      const direction = random() * Math.PI * 2;
      const separation = planes[0].spec.radius + planes[1].spec.radius + .05 + random() * .18;
      planes[0].pos = { x: center.x - Math.cos(direction) * separation / 2, y: center.y - Math.sin(direction) * separation / 2 };
      planes[1].pos = { x: center.x + Math.cos(direction) * separation / 2, y: center.y + Math.sin(direction) * separation / 2 };
      stage(planes);
      const final = window.__captureShieldFinal;
      const changed = final ? planes.filter(plane => {
        const before = final.before[plane.id], after = final.after[plane.id];
        return Math.hypot(before.x - after.x, before.y - after.y) > 1e-6;
      }) : [];
      const beforeGap = final ? nextTickGap(planes, final.before) : Infinity;
      const afterGap = final ? nextTickGap(planes, final.after) : -Infinity;
      if (changed.length === 1 && beforeGap <= .25 && afterGap > .25) {
        const controlled = changed[0];
        const threat = planes.find(plane => plane !== controlled);
        shield = {
          planes: planes.map(snapshot),
          event: {
            aircraftId: controlled.id,
            threatId: threat.id,
            before: { ...final.before[controlled.id] }, after: { ...final.after[controlled.id] },
            threatVelocity: { ...final.after[threat.id] }, clearanceBefore: beforeGap, clearanceAfter: afterGap,
            interventions: final.events.length,
          },
        };
      }
    }
    if (!shield) throw new Error('Could not synthesize a final one-aircraft safety-shield repair.');

    let spawnReservation = null;
    for (let trial = 0; trial < 4000 && !spawnReservation; trial++) {
      const plane = clonePlane('blue', 9401);
      plane.pos = randomPoint();
      if (!clearOfOwnRunway(plane)) continue;
      const direct = velocityTo(plane, runwayFor(plane.kind).approach);
      const warningRemaining = 2.8 + random() * 1.4;
      const lateral = (random() - .5) * 1.5;
      const length = Math.hypot(direct.x, direct.y);
      const warning = {
        id: 9901,
        kind: 'red',
        pos: {
          x: plane.pos.x + direct.x * warningRemaining - direct.y / length * lateral,
          y: plane.pos.y + direct.y * warningRemaining + direct.x / length * lateral,
        },
        heading: Math.atan2(direct.y, direct.x) + Math.PI,
        warningRemaining,
      };
      stage([plane], [warning]);
      const candidates = plane._captureCandidates[3];
      const directCandidate = candidates.find(candidate => Math.abs(candidate.offset) < 1e-9);
      const selected = plane._capturePasses[3];
      if (directCandidate?.clearance < 0 && selected.clearance >= 2
          && Math.abs(selected.offset) > .12
          && screenDistance(plane.pos, warning.pos) > 150) {
        spawnReservation = {
          plane: snapshot(plane),
          warning: {
            ...warning,
            pos: { ...warning.pos },
            spec: samples.red.spec,
            velocity: {
              x: Math.cos(warning.heading) * samples.red.spec.speed,
              y: Math.sin(warning.heading) * samples.red.spec.speed,
            },
          },
          direct: { ...directCandidate, velocity: { ...directCandidate.velocity } },
          selected: { ...selected, velocity: { ...selected.velocity } },
        };
      }
    }
    if (!spawnReservation) throw new Error('Could not synthesize a future-spawn reservation scene.');

    const thresholdRunway = runwayFor('blue');
    const runwayLength = Math.hypot(
      thresholdRunway.end.x - thresholdRunway.approach.x,
      thresholdRunway.end.y - thresholdRunway.approach.y,
    );
    const runwayDirection = {
      x: (thresholdRunway.end.x - thresholdRunway.approach.x) / runwayLength,
      y: (thresholdRunway.end.y - thresholdRunway.approach.y) / runwayLength,
    };
    const thresholdPlane = clonePlane('blue', 9501);
    thresholdPlane.pos = {
      x: thresholdRunway.approach.x - runwayDirection.x * 18,
      y: thresholdRunway.approach.y - runwayDirection.y * 18,
    };
    thresholdPlane.target = thresholdRunway;
    const queuedPlane = clonePlane('blue', 9502);
    queuedPlane.pos = {
      x: thresholdPlane.pos.x - runwayDirection.x * 17 - runwayDirection.y * 9,
      y: thresholdPlane.pos.y - runwayDirection.y * 17 + runwayDirection.x * 9,
    };
    queuedPlane.target = thresholdRunway;
    const thresholdRelease = {
      runway: thresholdRunway,
      active: {
        kind: 'blue', id: thresholdPlane.id, age: 30, pos: { ...thresholdPlane.pos },
        spec: thresholdPlane.spec, target: thresholdRunway,
      },
      queued: {
        kind: 'blue', id: queuedPlane.id, age: 0, pos: { ...queuedPlane.pos },
        spec: queuedPlane.spec, target: thresholdRunway,
      },
    };

    window.__scenarios = {
      decision,
      coordination,
      shield,
      spawnReservation,
      thresholdRelease,
    };

    const q = value => Math.round(value) + .5;
    const line = (from, to, color, width = 3, dash = []) => {
      context.beginPath();
      context.setLineDash(dash);
      context.moveTo(q(from.x), q(from.y));
      context.lineTo(q(to.x), q(to.y));
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineCap = 'butt';
      context.lineJoin = 'miter';
      context.stroke();
      context.setLineDash([]);
    };
    const arrow = (from, to, color, width = 4, dash = []) => {
      line(from, to, color, width, dash);
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const size = 9 + width;
      context.beginPath();
      context.moveTo(to.x, to.y);
      context.lineTo(to.x - Math.cos(angle - .48) * size, to.y - Math.sin(angle - .48) * size);
      context.lineTo(to.x - Math.cos(angle + .48) * size, to.y - Math.sin(angle + .48) * size);
      context.closePath();
      context.fillStyle = color;
      context.fill();
    };
    const box = (point, radius, color, width = 3) => {
      context.strokeStyle = color;
      context.lineWidth = width;
      context.strokeRect(Math.round(point.x - radius), Math.round(point.y - radius), Math.round(radius * 2), Math.round(radius * 2));
    };
    const label = (text, x, y, color = palette.ink, align = 'left', size = 13) => {
      context.fillStyle = color;
      context.font = `700 ${size}px Hind, ui-sans-serif, sans-serif`;
      context.textAlign = align;
      context.fillText(text, Math.round(x), Math.round(y));
      context.textAlign = 'left';
    };
    const panel = (title, phase, detail) => {
      context.fillStyle = palette.panel;
      context.fillRect(0, 0, innerWidth, 144);
      context.strokeStyle = palette.edge;
      context.lineWidth = 2;
      line({ x: 0, y: 143 }, { x: innerWidth, y: 143 }, palette.edge, 2);
      context.fillStyle = palette.edge;
      for (let x = 24; x < innerWidth - 24; x += 10) context.fillRect(x, 16, 4, 3);
      label(title, 30, 49, palette.ink, 'left', 22);
      label(phase, 30, 86, palette.safe, 'left', 25);
      label(detail, 30, 122, palette.dim, 'left', 18);
    };
    const stageStrip = active => {
      const stages = ['PLAN · 8–14 S', 'COORDINATE · 4 SWEEPS', 'CHECK · NEXT FRAME'];
      const x = 720, y = 24, width = 145;
      stages.forEach((stageName, index) => {
        context.fillStyle = index === active ? '#123e46' : palette.panel;
        context.fillRect(x + index * (width + 6), y, width, 32);
        context.strokeStyle = index === active ? palette.safe : palette.edge;
        context.lineWidth = 2;
        context.strokeRect(x + index * (width + 6), y, width, 32);
        label(stageName, x + index * (width + 6) + width / 2, y + 21, index === active ? palette.safe : palette.dim, 'center', 11);
      });
    };
    const targetMarker = plane => {
      const target = plane.solverTarget;
      const approach = screen(target.approach);
      const runwayEnd = screen(target.end);
      line(approach, runwayEnd, colorFor(plane.kind), 2, [6, 5]);
      box(approach, 8, colorFor(plane.kind), 3);
      label(`${plane.kind.toUpperCase()} APPROACH`, approach.x, approach.y - 18, colorFor(plane.kind), 'center', 13);
    };
    const endpoint = (plane, velocity, seconds = 2.6) => screen({
      x: plane.pos.x + velocity.x * seconds,
      y: plane.pos.y + velocity.y * seconds,
    });
    const usePlanes = sourcePlanes => {
      sim.events.length = 0;
      sim.spawnWarnings.length = 0;
      sim.drawing = null;
      const planes = sourcePlanes.map(source => ({
        ...samples[source.kind], ...source, spec: samples[source.kind].spec,
        pos: { ...source.pos }, path: [], target: null, solverTarget: source.target,
        state: 'flying', age: source.age ?? 30,
      }));
      sim.aircraft.splice(0, sim.aircraft.length, ...planes);
      return planes;
    };
    const frameScene = (planes, runwayKinds, zoom) => {
      sim.map.runways = allRunways.filter(runway => runwayKinds.includes(runway.color));
      const points = [
        ...planes.map(plane => plane.pos),
        ...sim.map.runways.flatMap(runway => [runway.approach, runway.end]),
      ];
      const minX = Math.min(...points.map(point => point.x));
      const maxX = Math.max(...points.map(point => point.x));
      const minY = Math.min(...points.map(point => point.y));
      const maxY = Math.max(...points.map(point => point.y));
      const viewport = window.__airportViewport;
      viewport.cameraState = 'diagram';
      viewport.cameraTarget.set((minX + maxX) / 2, (minY + maxY) / 2);
      viewport.camera.zoom = zoom;
      viewport.applyCamera();
      viewport.camera.updateProjectionMatrix();
    };
    const drawPlaneIdentity = plane => {
      const point = screen(plane.pos);
      label(`${plane.kind.toUpperCase()} AIRCRAFT`, point.x, point.y + 42, colorFor(plane.kind), 'center', 14);
      targetMarker(plane);
    };
    const setPath = (plane, velocity) => {
      plane.heading = Math.atan2(velocity.y, velocity.x);
      plane.path = [];
    };

    const clamp01 = value => Math.max(0, Math.min(1, value));
    const move = (plane, source, velocity, seconds) => {
      plane.pos = { x: source.pos.x + velocity.x * seconds, y: source.pos.y + velocity.y * seconds };
      setPath(plane, velocity);
    };
    const lerpPoint = (from, to, amount) => ({
      x: from.x + (to.x - from.x) * amount,
      y: from.y + (to.y - from.y) * amount,
    });
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };
    const placeOnLandingRoute = (plane, start, progress) => {
      const target = plane.solverTarget;
      const t = smooth(progress);
      const approachShare = .72;
      let from = start;
      let to = target.approach;
      let local = t / approachShare;
      if (t >= approachShare) {
        from = target.approach;
        to = target.end;
        local = (t - approachShare) / (1 - approachShare);
      }
      plane.pos = lerpPoint(from, to, clamp01(local));
      plane.heading = angleTo(from, to);
      plane.path = [];
    };
    const drawLandingRoute = (plane, start) => {
      arrow(screen(start), screen(plane.solverTarget.approach), colorFor(plane.kind), 3, [8, 7]);
      arrow(screen(plane.solverTarget.approach), screen(plane.solverTarget.end), colorFor(plane.kind), 3, [8, 7]);
    };
    const landedMark = plane => {
      const point = screen(plane.solverTarget.end);
      label(`${plane.kind.toUpperCase()} LANDED ✓`, point.x, point.y - 30, colorFor(plane.kind), 'center', 15);
    };
    const cross = point => {
      line({ x: point.x - 16, y: point.y - 16 }, { x: point.x + 16, y: point.y + 16 }, palette.danger, 6);
      line({ x: point.x + 16, y: point.y - 16 }, { x: point.x - 16, y: point.y + 16 }, palette.danger, 6);
    };
    const bracket = (a, b, color) => {
      line(a, b, color, 4);
      line({ x: a.x - 8, y: a.y - 8 }, { x: a.x + 8, y: a.y + 8 }, color, 3);
      line({ x: b.x - 8, y: b.y - 8 }, { x: b.x + 8, y: b.y + 8 }, color, 3);
    };
    const disc = (point, radius, color, width = 3) => {
      context.beginPath();
      context.arc(Math.round(point.x), Math.round(point.y), Math.max(2, radius), 0, Math.PI * 2);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.stroke();
      box(point, 3, color, 2);
    };
    const physicalDisc = (plane, position, color) => {
      const center = screen(position);
      const edge = screen({ x: position.x + plane.spec.radius, y: position.y });
      disc(center, Math.hypot(edge.x - center.x, edge.y - center.y), color, 3);
    };
    window.__renderScenario = (name, time) => {
      context.clearRect(0, 0, innerWidth, innerHeight);

      if (name === 'decision-field') {
        const scenario = window.__scenarios.decision;
        const planes = usePlanes(scenario.planes);
        frameScene(planes, ['blue', 'red'], 1.55);
        context.fillStyle = '#102126';
        context.fillRect(490, 170, 80, 45);
        context.fillRect(525, 440, 78, 45);
        context.fillRect(765, 144, 48, 25);
        const focus = planes.find(plane => plane.id === scenario.focusId);
        const threat = planes.find(plane => plane.id !== scenario.focusId);
        const focusSource = scenario.planes.find(plane => plane.id === scenario.focusId);
        const threatSource = scenario.planes.find(plane => plane.id !== scenario.focusId);
        const candidates = focusSource.candidates[1];
        const direct = candidates.find(candidate => Math.abs(candidate.offset) < 1e-9);
        const selected = focusSource.passes[1];
        const threatVelocity = focusSource.fields[1][threat.id];
        let progress = 0;
        let mode = 'direct';
        if (time < 1.5) progress = time / 1.5;
        else if (time < 2) progress = 1;
        else if (time < 2.5) progress = 1 - (time - 2) / .5;
        else if (time < 4.5) mode = 'search';
        else if (time < 6.5) { mode = 'detour'; progress = (time - 4.5) / 2; }
        else { mode = 'land'; progress = (time - 6.5) / 4.5; }
        const focusVelocity = mode === 'safe' ? selected.velocity : direct.velocity;
        const safeSeconds = Math.max(1.4, scenario.safeReplay.time);
        const focusClear = {
          x: focusSource.pos.x + selected.velocity.x * safeSeconds,
          y: focusSource.pos.y + selected.velocity.y * safeSeconds,
        };
        const threatClear = {
          x: threatSource.pos.x + threatVelocity.x * safeSeconds,
          y: threatSource.pos.y + threatVelocity.y * safeSeconds,
        };
        if (mode === 'direct') {
          move(focus, focusSource, focusVelocity, scenario.replay.time * progress);
          move(threat, threatSource, threatVelocity, scenario.replay.time * progress);
        } else if (mode === 'search') {
          move(focus, focusSource, direct.velocity, 0);
          move(threat, threatSource, threatVelocity, 0);
        } else if (mode === 'detour') {
          move(focus, focusSource, selected.velocity, safeSeconds * smooth(progress));
          move(threat, threatSource, threatVelocity, safeSeconds * smooth(progress));
        } else {
          placeOnLandingRoute(focus, focusClear, progress);
          placeOnLandingRoute(threat, threatClear, progress);
        }
        if (mode === 'land') planes.forEach(targetMarker);
        else {
          planes.forEach(drawPlaneIdentity);
          planes.forEach(plane => physicalDisc(plane, plane.pos, palette.edge));
        }
        const focusStart = screen(focusSource.pos), threatStart = screen(threatSource.pos);
        const focusNow = screen(focus.pos), threatNow = screen(threat.pos);
        if (mode === 'direct') {
          arrow(focusNow, endpoint(focus, direct.velocity, 1.25), palette.proposed, 5, [10, 7]);
          arrow(threatNow, endpoint(threat, threatVelocity, 1.25), palette.ink, 3);
          if (progress >= .98) {
            const middle = { x: (focusNow.x + threatNow.x) / 2, y: (focusNow.y + threatNow.y) / 2 };
            bracket(focusNow, threatNow, palette.danger);
            cross(middle);
            panel('1 · TEST THE DIRECT ROUTE', 'MARGIN FAILS', `PREDICTED GAP ${direct.clearance.toFixed(2)} < 2.00`);
          } else if (time >= 2) {
            panel('1 · TEST THE DIRECT ROUTE', 'REWIND', 'SAME START · SAME OPPONENT VELOCITY · CHANGE ONE CANDIDATE');
          } else {
            panel('1 · TEST THE DIRECT ROUTE', 'DIRECT CANDIDATE', 'AMBER DASH = PROPOSED · CREAM SOLID = CURRENT FIELD');
          }
        } else if (mode === 'search') {
          const index = Math.min(candidates.length - 1, Math.floor((time - 2.5) / 2 * candidates.length));
          const candidate = candidates[index];
          const selectedIndex = candidates.findIndex(item => Math.abs(item.offset - selected.offset) < 1e-9);
          for (let candidateIndex = 0; candidateIndex <= index; candidateIndex++) {
            const item = candidates[candidateIndex];
            const color = candidateIndex === selectedIndex
              ? palette.safe
              : (item.clearance >= 2 ? palette.edge : palette.danger);
            arrow(focusStart, endpoint(focus, item.velocity, 1.05), color, candidateIndex === index ? 4 : 2);
          }
          arrow(focusStart, endpoint(focus, candidate.velocity, 2.7), palette.proposed, 5, [10, 7]);
          const status = index === selectedIndex ? 'SELECTED' : (candidate.clearance >= 2 ? 'SAFE · LOWER SCORE' : 'REJECT · UNSAFE');
          label(`CANDIDATE ${String(index + 1).padStart(2, '0')} / 48 · ${status}`, focusStart.x, focusStart.y - 52, index === selectedIndex ? palette.safe : palette.proposed, 'center', 17);
          panel('1 · TEST THE DIRECT ROUTE', 'SEARCH 48 HEADINGS', 'RED = UNSAFE · GRAY = SAFE BUT LOWER SCORE · CYAN = SELECTED');
        } else if (mode === 'detour') {
          arrow(focusNow, endpoint(focus, selected.velocity, 1.25), palette.safe, 7);
          arrow(threatNow, endpoint(threat, threatVelocity, 1.25), palette.ink, 3);
          panel('1 · TEST THE DIRECT ROUTE', 'BLUE TAKES A TEMPORARY DETOUR', `CONFLICT CLEARS · PREDICTED GAP ${selected.clearance.toFixed(2)} ≥ 2.00`);
        } else {
          drawLandingRoute(focus, focusClear);
          drawLandingRoute(threat, threatClear);
          if (progress >= .96) planes.forEach(landedMark);
          panel('1 · TEST THE DIRECT ROUTE', progress >= .96 ? 'BOTH AIRCRAFT LANDED' : 'CONFLICT CLEARED · RETURN TO RUNWAYS', 'THE DETOUR LASTS ONE DECISION · BOTH KEEP THEIR ORIGINAL DESTINATION');
        }
      }

      if (name === 'coordination-passes') {
        const scenario = window.__scenarios.coordination;
        const planes = usePlanes(scenario.planes);
        frameScene(planes, ['yellow', 'blue', 'red'], 1.02);
        const ordered = [...planes].sort((a, b) => a.age - b.age || a.id - b.id);
        const orderLabel = plane => {
          const rank = ordered.findIndex(item => item.id === plane.id);
          return rank === 0 ? 'NEWEST' : rank === 1 ? 'NEXT' : 'OLDEST';
        };
        let mode = 'direct';
        let progress = 0;
        if (time < 1.4) progress = time / 1.4;
        else if (time < 1.9) progress = 1;
        else if (time < 2.2) progress = 1 - (time - 1.9) / .3;
        else if (time < 3.7) mode = 'sweep0';
        else if (time < 4.2) mode = 'hold0';
        else if (time < 6) mode = 'converge';
        else if (time < 7.5) { mode = 'clear'; progress = (time - 6) / 1.5; }
        else { mode = 'land'; progress = (time - 7.5) / 4; }
        const safeSeconds = Math.max(1.4, scenario.sweep3.time);
        planes.forEach(plane => {
          const source = scenario.planes.find(item => item.id === plane.id);
          const finalVelocity = source.passes[3].velocity;
          const clearPosition = {
            x: source.pos.x + finalVelocity.x * safeSeconds,
            y: source.pos.y + finalVelocity.y * safeSeconds,
          };
          if (mode === 'direct') move(plane, source, source.direct, scenario.direct.time * progress);
          else if (mode === 'clear') move(plane, source, finalVelocity, safeSeconds * smooth(progress));
          else if (mode === 'land') placeOnLandingRoute(plane, clearPosition, progress);
          else move(plane, source, finalVelocity, 0);
          if (mode !== 'land') {
            label(orderLabel(plane), screen(plane.pos).x, screen(plane.pos).y - 45,
              plane === ordered[0] ? palette.safe : palette.ink, 'center', 16);
          }
          if (mode === 'hold0') {
            const origin = screen(plane.pos);
            arrow(origin, endpoint(plane, source.direct), palette.proposed, 3, [10, 7]);
            arrow(origin, endpoint(plane, source.passes[0].velocity), palette.ink, 6);
          } else if (mode === 'sweep0' || mode === 'converge') {
            const origin = screen(plane.pos);
            const previous = mode === 'sweep0' ? source.direct : source.passes[0].velocity;
            const accepted = mode === 'sweep0' ? source.passes[0].velocity : source.passes[3].velocity;
            const start = mode === 'sweep0' ? 2.2 : 4.2;
            const duration = mode === 'sweep0' ? 1.5 : 1.8;
            arrow(origin, endpoint(plane, previous), palette.proposed, 4, [10, 7]);
            const active = Math.min(2, Math.floor((time - start) / duration * ordered.length));
            const rank = ordered.findIndex(item => item.id === plane.id);
            if (rank <= active) {
              arrow(origin, endpoint(plane, accepted),
                rank === active ? palette.safe : palette.ink, 6);
            }
          }
        });
        if (mode === 'land') planes.forEach(targetMarker);
        else planes.forEach(plane => physicalDisc(plane, plane.pos, palette.edge));
        if (mode === 'direct') {
          const a = planes.find(plane => plane.id === scenario.direct.aId);
          const b = planes.find(plane => plane.id === scenario.direct.bId);
          if (progress >= .98) {
            const middle = { x: (screen(a.pos).x + screen(b.pos).x) / 2, y: (screen(a.pos).y + screen(b.pos).y) / 2 };
            cross(middle);
            panel('2 · COORDINATE THE WHOLE FIELD', 'DIRECT ROUTES CONFLICT', `INDEPENDENT FIELD · MINIMUM GAP ${scenario.direct.clearance.toFixed(2)} < 2.00`);
          } else if (time >= 1.9) {
            panel('2 · COORDINATE THE WHOLE FIELD', 'REWIND', 'NOW UPDATE EACH AIRCRAFT AGAINST THE LATEST SHARED FIELD');
          } else {
            panel('2 · COORDINATE THE WHOLE FIELD', 'REPLAY INDEPENDENT ROUTES', 'ALL THREE CHOOSE ALONE · THEIR INDIVIDUAL ANSWERS CONFLICT');
          }
        } else if (mode === 'sweep0') {
          panel('2 · COORDINATE THE WHOLE FIELD', 'SWEEP 1 · NEWEST → NEXT → OLDEST', `ACCEPT EACH UPDATE IMMEDIATELY · FINAL GAP ${scenario.sweep0.clearance.toFixed(2)}`);
        } else if (mode === 'hold0') {
          panel('2 · COORDINATE THE WHOLE FIELD', 'FIRST SHARED FIELD COMPLETE', `THE NEW ARRIVAL CLAIMED SAFE SPACE FIRST · GAP ${scenario.sweep0.clearance.toFixed(2)}`);
        } else if (mode === 'converge') {
          panel('2 · COORDINATE THE WHOLE FIELD', 'SWEEPS 2–4 · REPEAT AND CONVERGE', 'EVERY AIRCRAFT RECHECKS AGAINST THE LATEST COMPLETE SHARED FIELD');
        } else if (mode === 'clear') {
          for (const plane of planes) {
            const source = scenario.planes.find(item => item.id === plane.id);
            arrow(screen(plane.pos), endpoint(plane, source.passes[3].velocity, 1.1), palette.safe, 5);
          }
          panel('2 · COORDINATE THE WHOLE FIELD', 'FOUR-SWEEP FIELD CLEARS THE CONFLICT', `ALL THREE MOVE TOGETHER · MINIMUM GAP ${scenario.sweep3.clearance.toFixed(2)} ≥ 2.00`);
        } else {
          for (const plane of planes) {
            const source = scenario.planes.find(item => item.id === plane.id);
            const velocity = source.passes[3].velocity;
            const clearPosition = { x: source.pos.x + velocity.x * safeSeconds, y: source.pos.y + velocity.y * safeSeconds };
            drawLandingRoute(plane, clearPosition);
          }
          if (progress >= .96) planes.forEach(landedMark);
          panel('2 · COORDINATE THE WHOLE FIELD', progress >= .96 ? 'ALL THREE AIRCRAFT LANDED' : 'CONFLICT CLEARED · RETURN TO RUNWAYS', 'YELLOW → YELLOW · BLUE → BLUE · RED → RED');
        }
      }

      if (name === 'safety-shield') {
        const scenario = window.__scenarios.shield;
        const planes = usePlanes(scenario.planes);
        const landing = time >= 6.4;
        frameScene(
          planes,
          landing ? [...new Set(planes.map(plane => plane.kind))] : [],
          landing ? .86 : 4.2,
        );
        const event = scenario.event;
        const controlled = planes.find(plane => plane.id === event.aircraftId);
        const threat = planes.find(plane => plane.id === event.threatId);
        const controlledSource = scenario.planes.find(plane => plane.id === event.aircraftId);
        const threatSource = scenario.planes.find(plane => plane.id === event.threatId);
        const repairSearch = time >= 3.2 && time < 4.6;
        const repaired = time >= 4.6;
        const afterTick = time >= 5.8;
        const controlledVelocity = repaired ? event.after : event.before;
        const controlledAfterTick = {
          x: controlledSource.pos.x + event.after.x / 60,
          y: controlledSource.pos.y + event.after.y / 60,
        };
        const threatAfterTick = {
          x: threatSource.pos.x + event.threatVelocity.x / 60,
          y: threatSource.pos.y + event.threatVelocity.y / 60,
        };
        if (landing) {
          const landingProgress = (time - 6.4) / 4.6;
          placeOnLandingRoute(controlled, controlledAfterTick, landingProgress);
          placeOnLandingRoute(threat, threatAfterTick, landingProgress);
        } else if (afterTick) {
          move(controlled, controlledSource, event.after, 1 / 60);
          move(threat, threatSource, event.threatVelocity, 1 / 60);
        } else {
          move(controlled, controlledSource, controlledVelocity, 0);
          move(threat, threatSource, event.threatVelocity, 0);
        }
        const origin = screen(controlled.pos);
        const threatOrigin = screen(threat.pos);
        if (!landing) {
          const stateLabel = afterTick ? 'MOVED' : 'NOW';
          label(`${controlled.kind.toUpperCase()} · ${stateLabel}`, origin.x - 42, origin.y - 72, colorFor(controlled.kind), 'center', 17);
          label(`${threat.kind.toUpperCase()} · ${stateLabel}`, threatOrigin.x + 48, threatOrigin.y + 84, colorFor(threat.kind), 'center', 17);
        } else {
          planes.forEach(targetMarker);
        }
        const beforeA = screen({ x: controlledSource.pos.x + event.before.x / 60, y: controlledSource.pos.y + event.before.y / 60 });
        const afterA = screen({ x: controlledSource.pos.x + event.after.x / 60, y: controlledSource.pos.y + event.after.y / 60 });
        const nextB = screen({ x: threatSource.pos.x + event.threatVelocity.x / 60, y: threatSource.pos.y + event.threatVelocity.y / 60 });
        const beforePosition = { x: controlledSource.pos.x + event.before.x / 60, y: controlledSource.pos.y + event.before.y / 60 };
        const afterPosition = { x: controlledSource.pos.x + event.after.x / 60, y: controlledSource.pos.y + event.after.y / 60 };
        const threatPosition = { x: threatSource.pos.x + event.threatVelocity.x / 60, y: threatSource.pos.y + event.threatVelocity.y / 60 };
        if (!repaired) {
          arrow(screen(controlledSource.pos), endpoint(controlled, event.before, .22), palette.proposed, 6, [10, 7]);
          arrow(screen(threatSource.pos), endpoint(threat, event.threatVelocity, .22), palette.ink, 4);
          if (repairSearch) {
            const scanProgress = clamp01((time - 3.2) / 1.4);
            const scanIndex = Math.min(63, Math.floor(scanProgress * 64));
            const scanAngle = scanIndex * Math.PI * 2 / 64;
            const scanVelocity = {
              x: Math.cos(scanAngle) * controlled.spec.speed,
              y: Math.sin(scanAngle) * controlled.spec.speed,
            };
            arrow(screen(controlledSource.pos), endpoint(controlled, scanVelocity, .28),
              palette.safe, 5);
            label(`TEST HEADING ${String(scanIndex + 1).padStart(2, '0')} / 64`,
              origin.x, origin.y - 105, palette.safe, 'center', 17);
          }
          physicalDisc(controlledSource, beforePosition, colorFor(controlledSource.kind));
          physicalDisc(threatSource, threatPosition, colorFor(threatSource.kind));
          bracket(beforeA, nextB, palette.danger);
          cross({ x: (beforeA.x + nextB.x) / 2, y: (beforeA.y + nextB.y) / 2 });
          label('COLORED CIRCLES = WHERE THE PLANES WILL BE NEXT FRAME', innerWidth / 2, innerHeight - 38, palette.dim, 'center', 15);
          panel('5 · ONE LAST CHECK BEFORE MOVING',
            repairSearch ? 'SEARCH 64 DIRECTIONS FOR THE SAFEST REPAIR'
              : time < 1.2 ? 'PREVIEW THE NEXT FRAME' : 'TOO CLOSE · DO NOT MOVE YET',
            repairSearch
              ? 'THE AIRCRAFT HAVE NOT MOVED · ONLY CANDIDATE NEXT STEPS ARE CHANGING'
              : `NEXT-FRAME GAP ${event.clearanceBefore.toFixed(3)} < REQUIRED 0.250`);
        } else if (!landing) {
          arrow(screen(controlledSource.pos), endpoint(controlled, event.before, .22), palette.proposed, 3, [10, 7]);
          arrow(screen(controlledSource.pos), endpoint(controlled, event.after, .22), palette.safe, 8);
          box(beforeA, 5, palette.proposed, 2);
          physicalDisc(controlledSource, afterPosition, colorFor(controlledSource.kind));
          physicalDisc(threatSource, threatPosition, colorFor(threatSource.kind));
          bracket(afterA, nextB, palette.safe);
          label(afterTick ? 'THE SAFE PREVIEW IS NOW THE CURRENT FRAME' : 'COLORED CIRCLES = SAFER NEXT FRAME', innerWidth / 2, innerHeight - 38, afterTick ? palette.safe : palette.dim, 'center', 15);
          const repairPhase = time < 4.25 ? 'TURN YELLOW SLIGHTLY' : 'CHECK AGAIN · NOW SAFE';
          panel('5 · ONE LAST CHECK BEFORE MOVING', afterTick ? 'MOVE BOTH PLANES ONE FRAME' : repairPhase, `AMBER = OLD DIRECTION · CYAN = SAFER DIRECTION · GAP ${event.clearanceAfter.toFixed(3)} > 0.250`);
        } else {
          drawLandingRoute(controlled, controlledAfterTick);
          drawLandingRoute(threat, threatAfterTick);
          const landingProgress = (time - 6.4) / 4.6;
          box(screen(controlled.pos), 11, palette.safe, 4);
          box(screen(threat.pos), 8, palette.ink, 3);
          if (landingProgress >= .96) planes.forEach(landedMark);
          panel('5 · ONE LAST CHECK BEFORE MOVING', landingProgress >= .96 ? 'BOTH AIRCRAFT LANDED' : 'SAFE TO MOVE · NORMAL ROUTING RESUMES', 'THE FINAL CHECK CHANGED ONE STEP · NOT EITHER DESTINATION');
        }
      }

      if (name === 'spawn-reservation') {
        const scenario = window.__scenarios.spawnReservation;
        const beforeSpawn = time < 6;
        const landing = time >= 7.2;
        const incomingSource = {
          kind: scenario.warning.kind,
          id: 9402,
          age: 0,
          pos: { ...scenario.warning.pos },
          spec: samples[scenario.warning.kind].spec,
          target: runwayFor(scenario.warning.kind),
        };
        const planes = usePlanes(beforeSpawn
          ? [scenario.plane]
          : [scenario.plane, incomingSource]);
        const controlled = planes.find(plane => plane.id === scenario.plane.id);
        const incoming = planes.find(plane => plane.id === incomingSource.id);
        if (beforeSpawn) {
          sim.spawnWarnings.push({
            ...scenario.warning,
            pos: { ...scenario.warning.pos },
            warningRemaining: Math.max(0, scenario.warning.warningRemaining
              * (1 - Math.max(0, time - 2.8) / 3.2)),
          });
          frameScene([
            controlled,
            { ...incomingSource, pos: { ...incomingSource.pos } },
          ], ['blue'], 1.45);
        } else {
          frameScene(planes, ['blue', 'red'], landing ? .86 : 1.35);
        }
        const controlledStart = scenario.plane.pos;
        const warningPoint = scenario.warning.pos;
        const countdown = Math.max(0, scenario.warning.warningRemaining
          * (1 - Math.max(0, time - 2.8) / 3.2));
        if (time < 2.8) {
          move(controlled, scenario.plane, scenario.direct.velocity, 0);
          const projected = {
            x: controlledStart.x + scenario.direct.velocity.x * scenario.warning.warningRemaining,
            y: controlledStart.y + scenario.direct.velocity.y * scenario.warning.warningRemaining,
          };
          arrow(screen(controlledStart), screen(projected), palette.danger, 6, [10, 7]);
          physicalDisc(controlled, projected, palette.danger);
          box(screen(warningPoint), 15, palette.red, 4);
          cross(screen(warningPoint));
          label(`RED ARRIVES IN ${scenario.warning.warningRemaining.toFixed(1)} S`,
            screen(warningPoint).x, screen(warningPoint).y - 35, palette.red, 'center', 18);
          panel('3 · RESERVE SPACE FOR AIRCRAFT NOT HERE YET',
            'DIRECT ROUTE OCCUPIES THE FUTURE ENTRY POINT',
            `PROJECT BLUE TO THE WARNING TIME · CLEARANCE ${scenario.direct.clearance.toFixed(2)} < 0`);
        } else if (beforeSpawn) {
          const progress = smooth((time - 2.8) / 3.2);
          move(controlled, scenario.plane, scenario.selected.velocity,
            scenario.warning.warningRemaining * progress);
          arrow(screen(controlled.pos), endpoint(controlled, scenario.selected.velocity, 1.2),
            palette.safe, 7);
          box(screen(warningPoint), 15, palette.red, 4);
          label(`RED ARRIVES IN ${countdown.toFixed(1)} S`,
            screen(warningPoint).x, screen(warningPoint).y - 35, palette.red, 'center', 18);
          panel('3 · RESERVE SPACE FOR AIRCRAFT NOT HERE YET',
            'BLUE CLEARS THE RESERVED ENTRY BEFORE COUNTDOWN ZERO',
            `THE WARNING IS A FUTURE MOVING OBSTACLE · SELECTED CLEARANCE ${scenario.selected.clearance.toFixed(2)} ≥ 2`);
        } else if (!landing) {
          move(controlled, scenario.plane, scenario.selected.velocity,
            scenario.warning.warningRemaining);
          move(incoming, incomingSource, scenario.warning.velocity, time - 6);
          physicalDisc(controlled, controlled.pos, palette.safe);
          physicalDisc(incoming, incoming.pos, palette.red);
          label('BLUE ALREADY CLEAR', screen(controlled.pos).x,
            screen(controlled.pos).y - 45, palette.safe, 'center', 17);
          label('RED ENTERS SAFELY', screen(incoming.pos).x,
            screen(incoming.pos).y - 45, palette.red, 'center', 17);
          panel('3 · RESERVE SPACE FOR AIRCRAFT NOT HERE YET',
            'COUNTDOWN ZERO · THE RESERVED AIRCRAFT ENTERS',
            'NO EMERGENCY TURN IS NEEDED BECAUSE THE CONFLICT WAS SOLVED BEFORE SPAWN');
        } else {
          const progress = (time - 7.2) / 4.4;
          const blueClear = {
            x: controlledStart.x + scenario.selected.velocity.x * scenario.warning.warningRemaining,
            y: controlledStart.y + scenario.selected.velocity.y * scenario.warning.warningRemaining,
          };
          const redClear = {
            x: incomingSource.pos.x + scenario.warning.velocity.x * 1.2,
            y: incomingSource.pos.y + scenario.warning.velocity.y * 1.2,
          };
          placeOnLandingRoute(controlled, blueClear, progress);
          placeOnLandingRoute(incoming, redClear, progress);
          drawLandingRoute(controlled, blueClear);
          drawLandingRoute(incoming, redClear);
          if (progress >= .96) planes.forEach(landedMark);
          panel('3 · RESERVE SPACE FOR AIRCRAFT NOT HERE YET',
            progress >= .96 ? 'BOTH AIRCRAFT LANDED' : 'SAFE ENTRY · NORMAL ROUTING CONTINUES',
            'BLUE → BLUE · RED → RED · THE WARNING CHANGED TIMING, NOT DESTINATIONS');
        }
      }

      if (name === 'threshold-release') {
        const scenario = window.__scenarios.thresholdRelease;
        const planes = usePlanes([scenario.active, scenario.queued]);
        const active = planes.find(plane => plane.id === scenario.active.id);
        const queued = planes.find(plane => plane.id === scenario.queued.id);
        frameScene(planes, ['blue'], 1.65);
        const approach = scenario.runway.approach;
        const end = scenario.runway.end;
        const oldPhase = time < 5.2;
        const newPhase = time >= 5.8;
        let capacity = '12 / 12';
        let activeLabel = 'AIRBORNE SLOT OCCUPIED';
        if (oldPhase) {
          const progress = smooth(time / 4.7);
          if (progress < .58) {
            active.pos = lerpPoint(scenario.active.pos, approach, progress / .58);
            active.heading = angleTo(scenario.active.pos, approach);
          } else {
            active.pos = lerpPoint(approach, end, (progress - .58) / .42);
            active.heading = angleTo(approach, end);
          }
          queued.pos = { ...scenario.queued.pos };
          setPath(queued, velocityTo(queued, approach));
          arrow(screen(scenario.active.pos), screen(approach), palette.blue, 5, [9, 7]);
          arrow(screen(approach), screen(end), palette.proposed, 6, [9, 7]);
          label('OLD: SECOND AIRBORNE WAYPOINT', screen(end).x,
            screen(end).y - 30, palette.proposed, 'center', 16);
          label('WAITING · CAPACITY FULL', screen(queued.pos).x,
            screen(queued.pos).y - 42, palette.dim, 'center', 16);
          if (progress >= .98) {
            capacity = '11 / 12';
            activeLabel = 'SLOT FINALLY RELEASED AT RUNWAY END';
          }
          panel('4 · RELEASE CAPACITY AT THE APPROACH POINT',
            time < 4.7 ? 'OLD ROUTE · LAND, THEN KEEP AN AIRBORNE RUNWAY-END WAYPOINT' : 'OLD ROUTE FINALLY RELEASES THE SLOT',
            `${activeLabel} · INBOUND CAPACITY ${capacity}`);
        } else if (!newPhase) {
          active.pos = { ...scenario.active.pos };
          queued.pos = { ...scenario.queued.pos };
          panel('4 · RELEASE CAPACITY AT THE APPROACH POINT',
            'REWIND · REMOVE THE REDUNDANT SECOND WAYPOINT',
            'THE SIMULATOR ALREADY OWNS THE GROUND ROUTE AFTER THE APPROACH POINT');
        } else {
          const progress = smooth((time - 5.8) / 2.8);
          active.pos = lerpPoint(scenario.active.pos, approach, progress);
          active.heading = angleTo(scenario.active.pos, approach);
          const released = progress >= .96;
          if (released) {
            active.state = 'landing';
            const groundProgress = smooth((time - 8.5) / 2.5);
            active.pos = lerpPoint(approach, end, groundProgress);
            active.heading = angleTo(approach, end);
            queued.pos = lerpPoint(scenario.queued.pos, scenario.active.pos, groundProgress);
            queued.heading = angleTo(scenario.queued.pos, scenario.active.pos);
            capacity = groundProgress > .05 ? '12 / 12' : '11 / 12';
          } else {
            queued.pos = { ...scenario.queued.pos };
          }
          arrow(screen(scenario.active.pos), screen(approach), palette.safe, 7);
          box(screen(approach), 12, palette.safe, 4);
          label('SIMULATOR ACCEPTS LANDING HERE', screen(approach).x,
            screen(approach).y - 36, palette.safe, 'center', 17);
          label(released ? 'NEXT ARRIVAL ENTERS' : 'WAITING', screen(queued.pos).x,
            screen(queued.pos).y - 42, released ? palette.blue : palette.dim, 'center', 16);
          panel('4 · RELEASE CAPACITY AT THE APPROACH POINT',
            released ? 'LANDING RECORDED · SLOT RELEASED IMMEDIATELY' : 'NEW ROUTE · COMMIT ONLY TO THE APPROACH',
            released
              ? `GROUND MOVEMENT CONTINUES OUTSIDE AIRBORNE CAPACITY · INBOUND CAPACITY ${capacity}`
              : 'NO SPEED, SCORE, COLLISION, OR TAXI RULE CHANGED');
        }
      }

      if (name === 'decision-field' || name === 'coordination-passes'
          || name === 'safety-shield') {
        stageStrip(name === 'decision-field' ? 0 : name === 'coordination-passes' ? 1 : 2);
      }
    };

    const matching = [decision, coordination, shield].every(scenario =>
      scenario.planes.every(plane => plane.target.color === plane.kind));
    return {
      matchingRunways: matching,
      decision: {
        focus: decision.planes.find(plane => plane.id === decision.focusId).kind,
        directClearance: decision.planes.find(plane => plane.id === decision.focusId).candidates[1].find(candidate => Math.abs(candidate.offset) < 1e-9).clearance,
        selectedClearance: decision.planes.find(plane => plane.id === decision.focusId).passes[1].clearance,
      },
      coordination: {
        kinds: coordination.planes.map(plane => plane.kind),
        ages: coordination.planes.map(plane => plane.age),
        passDeltas: coordination.deltas,
        directClearance: coordination.direct.clearance,
        sweep0Clearance: coordination.sweep0.clearance,
        sweep3Clearance: coordination.sweep3.clearance,
      },
      shield: {
        kind: 'deterministic constructed next-tick test',
        kinds: shield.planes.map(plane => plane.kind),
        clearanceBefore: shield.event.clearanceBefore,
        clearanceAfter: shield.event.clearanceAfter,
        finalInterventions: shield.event.interventions,
      },
      spawnReservation: {
        controlledKind: spawnReservation.plane.kind,
        warningKind: spawnReservation.warning.kind,
        directClearance: spawnReservation.direct.clearance,
        selectedClearance: spawnReservation.selected.clearance,
      },
      thresholdRelease: {
        kind: thresholdRelease.active.kind,
        targetColor: thresholdRelease.active.target.color,
      },
    };
  });

  if (!audit.matchingRunways) throw new Error('Semantic audit failed: aircraft/runway color mismatch.');
  console.log('Semantic audit:', JSON.stringify(audit, null, 2));

  const defaultNames = [
    'decision-field',
    'coordination-passes',
    'spawn-reservation',
    'threshold-release',
    'safety-shield',
  ];
  const captureNames = process.env.CAPTURE_NAMES
    ? process.env.CAPTURE_NAMES.split(',').map(name => name.trim()).filter(Boolean)
    : defaultNames;
  for (const name of captureNames) {
    if (!defaultNames.includes(name)) throw new Error(`Unknown explainer: ${name}`);
    const directory = path.join(temporaryDir, name);
    fs.mkdirSync(directory, { recursive: true });
    for (let frame = 0; frame < frameCount; frame++) {
      await page.evaluate(({ name, time }) => window.__renderScenario(name, time), { name, time: frame / fps });
      await page.waitForTimeout(20);
      await page.screenshot({ path: path.join(directory, `frame-${String(frame).padStart(3, '0')}.png`) });
    }
    await encode(name);
    console.log(`Rendered ${name}.gif`);
  }
} finally {
  await browser.close();
  fs.rmSync(temporaryDir, { recursive: true, force: true });
}
