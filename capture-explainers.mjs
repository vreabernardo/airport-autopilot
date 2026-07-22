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
const frameCount = 90;

const instrumentedSolver = solverSource
  .replace(
    'for (const ac of flying) {\n      ac.target ||= runways[ac.kind];',
    'for (const ac of flying) {\n      if (window.__captureExplain) { ac._capturePasses = []; ac._captureCandidates = []; ac._captureFields = []; }\n      ac.target ||= runways[ac.kind];',
  )
  .replace(
    'let best = null;\n        for (const candidate of headings) {',
    'let best = null;\n        const captureCandidates = [];\n        const captureField = Object.fromEntries([...chosen].map(([id, velocity]) => [id, { ...velocity }]));\n        for (const candidate of headings) {',
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
    'const dt = 1 / 60;\n    for (let pass = 0; pass < 4; pass++) {',
    'const dt = 1 / 60;\n    const captureShieldBefore = Object.fromEntries([...chosen].map(([id, velocity]) => [id, { ...velocity }]));\n    for (let pass = 0; pass < 4; pass++) {',
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
    const stage = planes => {
      for (const plane of planes) {
        plane.target = null;
        plane.state = 'flying';
        plane.path = [{ ...runwayFor(plane.kind).approach }];
        plane.heading = angleTo(plane.pos, plane.path[0]);
      }
      sim.aircraft.splice(0, sim.aircraft.length, ...planes);
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
      kind: plane.kind, id: plane.id, pos: { ...plane.pos }, spec: plane.spec,
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
      for (const plane of planes) plane.pos = randomPoint();
      stage(planes);
      const deltas = planes.map(plane => Math.abs(Math.atan2(
        Math.sin(plane._capturePasses[1].angle - plane._capturePasses[0].angle),
        Math.cos(plane._capturePasses[1].angle - plane._capturePasses[0].angle),
      )));
      const sweep0 = closestPair(planes, passField(planes, 0));
      const sweep1 = closestPair(planes, passField(planes, 1));
      const direct = closestPair(planes, Object.fromEntries(planes.map(plane => [plane.id, velocityTo(plane, runwayFor(plane.kind).approach)])));
      if (pairwiseSeparated(planes) && direct.clearance < 2 && sweep0.clearance >= 2 && sweep1.clearance >= 2
          && Math.max(...deltas) > .12 && direct.time > .5) {
        coordination = { planes: planes.map(snapshot), deltas, direct, sweep0, sweep1 };
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

    window.__scenarios = { decision, coordination, shield };

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
    const targetMarker = plane => {
      const target = plane.solverTarget;
      const midpoint = {
        x: (target.approach.x + target.end.x) / 2,
        y: (target.approach.y + target.end.y) / 2,
      };
      const point = screen(midpoint);
      label(`${plane.kind.toUpperCase()} RUNWAY`, point.x, point.y - 18, colorFor(plane.kind), 'center', 13);
    };
    const endpoint = (plane, velocity, seconds = 2.6) => screen({
      x: plane.pos.x + velocity.x * seconds,
      y: plane.pos.y + velocity.y * seconds,
    });
    const usePlanes = sourcePlanes => {
      const planes = sourcePlanes.map(source => ({
        ...samples[source.kind], ...source, spec: samples[source.kind].spec,
        pos: { ...source.pos }, path: [], target: null, solverTarget: source.target, state: 'flying', age: 30,
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
    const cross = point => {
      line({ x: point.x - 16, y: point.y - 16 }, { x: point.x + 16, y: point.y + 16 }, palette.danger, 6);
      line({ x: point.x + 16, y: point.y - 16 }, { x: point.x - 16, y: point.y + 16 }, palette.danger, 6);
    };
    const bracket = (a, b, color) => {
      line(a, b, color, 4);
      line({ x: a.x - 8, y: a.y - 8 }, { x: a.x + 8, y: a.y + 8 }, color, 3);
      line({ x: b.x - 8, y: b.y - 8 }, { x: b.x + 8, y: b.y + 8 }, color, 3);
    };
    const gapMeter = (value, color) => {
      const x = 860, y = 84, width = 300, maximum = .5;
      line({ x, y }, { x: x + width, y }, palette.edge, 5);
      const thresholdX = x + width * .25 / maximum;
      line({ x: thresholdX, y: y - 18 }, { x: thresholdX, y: y + 18 }, palette.ink, 3);
      label('MIN .250', thresholdX, y - 25, palette.ink, 'center', 14);
      const markerX = x + width * Math.min(maximum, Math.max(0, value)) / maximum;
      box({ x: markerX, y }, 8, color, 4);
      label(value.toFixed(3), markerX, y + 34, color, 'center', 15);
    };

    window.__renderScenario = (name, time) => {
      context.clearRect(0, 0, innerWidth, innerHeight);

      if (name === 'decision-field') {
        const scenario = window.__scenarios.decision;
        const planes = usePlanes(scenario.planes);
        frameScene(planes, ['blue', 'red'], 1.55);
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
        else if (time < 2.1) progress = 1;
        else if (time < 2.7) progress = 1 - (time - 2.1) / .6;
        else if (time < 3.5) mode = 'search';
        else { mode = 'safe'; progress = clamp01((time - 3.5) / 1.6); }
        const focusVelocity = mode === 'safe' ? selected.velocity : direct.velocity;
        if (mode !== 'search') {
          move(focus, focusSource, focusVelocity, scenario.replay.time * progress);
          move(threat, threatSource, threatVelocity, scenario.replay.time * progress);
        } else {
          move(focus, focusSource, direct.velocity, 0);
          move(threat, threatSource, threatVelocity, 0);
        }
        planes.forEach(drawPlaneIdentity);
        const focusStart = screen(focusSource.pos), threatStart = screen(threatSource.pos);
        const focusNow = screen(focus.pos), threatNow = screen(threat.pos);
        if (mode === 'direct') {
          line(focusStart, focusNow, palette.proposed, 5, [10, 7]);
          line(threatStart, threatNow, palette.ink, 3);
          if (progress >= .98) {
            const middle = { x: (focusNow.x + threatNow.x) / 2, y: (focusNow.y + threatNow.y) / 2 };
            bracket(focusNow, threatNow, palette.danger);
            cross(middle);
            panel('1 · TEST THE DIRECT ROUTE', 'MARGIN FAILS', `PREDICTED GAP ${direct.clearance.toFixed(2)} < 2.00`);
          } else if (time >= 2.1) {
            panel('1 · TEST THE DIRECT ROUTE', 'REWIND', 'SAME START · SAME OPPONENT VELOCITY · CHANGE ONE CANDIDATE');
          } else {
            panel('1 · TEST THE DIRECT ROUTE', 'DIRECT CANDIDATE', 'AMBER DASH = PROPOSED · CREAM SOLID = CURRENT FIELD');
          }
        } else if (mode === 'search') {
          const index = Math.min(candidates.length - 1, Math.floor((time - 2.7) / .8 * candidates.length));
          const candidate = candidates[index];
          line(focusStart, endpoint(focus, candidate.velocity, 3.1), palette.proposed, 5, [10, 7]);
          label(`CANDIDATE ${String(index + 1).padStart(2, '0')} / 48`, focusStart.x, focusStart.y - 52, palette.proposed, 'center', 17);
          panel('1 · TEST THE DIRECT ROUTE', 'SEARCH 48 HEADINGS', 'EACH HEADING IS SCORED AGAINST THE EXACT SAME VELOCITY FIELD');
        } else {
          line(focusStart, focusNow, palette.safe, 7);
          line(threatStart, threatNow, palette.ink, 3);
          panel('1 · TEST THE DIRECT ROUTE', 'CHOSEN HEADING STAYS CLEAR', `SAME REPLAY · PREDICTED GAP ${selected.clearance.toFixed(2)} ≥ 2.00`);
        }
      }

      if (name === 'coordination-passes') {
        const scenario = window.__scenarios.coordination;
        const planes = usePlanes(scenario.planes);
        frameScene(planes, ['yellow', 'blue', 'red'], 1.38);
        let mode = 'direct';
        let progress = 0;
        if (time < 1.5) progress = time / 1.5;
        else if (time < 2.1) progress = 1;
        else if (time < 2.7) progress = 1 - (time - 2.1) / .6;
        else if (time < 3.5) mode = 'sweep0';
        else if (time < 4.3) mode = 'sweep1';
        else { mode = 'safe'; progress = clamp01((time - 4.3) / 1.2); }
        planes.forEach((plane, index) => {
          const source = scenario.planes.find(item => item.id === plane.id);
          const velocity = mode === 'direct' ? source.direct : source.passes[1].velocity;
          const replayTime = mode === 'direct' ? scenario.direct.time : scenario.sweep1.time;
          move(plane, source, velocity, mode === 'sweep0' || mode === 'sweep1' ? 0 : replayTime * progress);
          label(String.fromCharCode(65 + index), screen(plane.pos).x, screen(plane.pos).y - 42, palette.ink, 'center', 19);
          if (mode === 'sweep0' || mode === 'sweep1') {
            const origin = screen(plane.pos);
            const previous = mode === 'sweep0' ? source.direct : source.passes[0].velocity;
            const accepted = mode === 'sweep0' ? source.passes[0].velocity : source.passes[1].velocity;
            const start = mode === 'sweep0' ? 2.7 : 3.5;
            line(origin, endpoint(plane, previous), palette.proposed, 4, [10, 7]);
            const active = Math.min(2, Math.floor((time - start) / .8 * planes.length));
            if (index <= active) line(origin, endpoint(plane, accepted), index === active ? palette.safe : palette.ink, 6);
          }
        });
        if (mode === 'direct') {
          const a = planes.find(plane => plane.id === scenario.direct.aId);
          const b = planes.find(plane => plane.id === scenario.direct.bId);
          if (progress >= .98) {
            const middle = { x: (screen(a.pos).x + screen(b.pos).x) / 2, y: (screen(a.pos).y + screen(b.pos).y) / 2 };
            cross(middle);
            panel('2 · COORDINATE THE WHOLE FIELD', 'DIRECT ROUTES CONFLICT', `INDEPENDENT FIELD · MINIMUM GAP ${scenario.direct.clearance.toFixed(2)} < 2.00`);
          } else if (time >= 2.1) {
            panel('2 · COORDINATE THE WHOLE FIELD', 'REWIND', 'NOW UPDATE EACH AIRCRAFT AGAINST THE LATEST SHARED FIELD');
          } else {
            panel('2 · COORDINATE THE WHOLE FIELD', 'REPLAY INDEPENDENT ROUTES', 'A / B / C IDENTIFY AIRCRAFT · ALL THREE VECTORS MOVE TOGETHER');
          }
        } else if (mode === 'sweep0') {
          panel('2 · COORDINATE THE WHOLE FIELD', 'SWEEP 1 BUILDS A SAFE JOINT FIELD', `ACCEPT EACH UPDATE IMMEDIATELY · FINAL GAP ${scenario.sweep0.clearance.toFixed(2)}`);
        } else if (mode === 'sweep1') {
          panel('2 · COORDINATE THE WHOLE FIELD', 'SWEEP 2 REVISITS EARLY DECISIONS', 'EARLY AIRCRAFT NOW SEE THE COMPLETED FIRST-SWEEP FIELD');
        } else {
          panel('2 · COORDINATE THE WHOLE FIELD', 'SWEEP 2 IS JOINTLY SAFE', `RECOMPUTED MINIMUM GAP ${scenario.sweep1.clearance.toFixed(2)} ≥ 2.00`);
        }
      }

      if (name === 'safety-shield') {
        const scenario = window.__scenarios.shield;
        const planes = usePlanes(scenario.planes);
        frameScene(planes, [], 3.2);
        const event = scenario.event;
        const controlled = planes.find(plane => plane.id === event.aircraftId);
        const threat = planes.find(plane => plane.id === event.threatId);
        const controlledSource = scenario.planes.find(plane => plane.id === event.aircraftId);
        const threatSource = scenario.planes.find(plane => plane.id === event.threatId);
        const repaired = time >= 2.8;
        const afterTick = time >= 4.2;
        const controlledVelocity = repaired ? event.after : event.before;
        if (afterTick) {
          move(controlled, controlledSource, event.after, 1 / 60);
          move(threat, threatSource, event.threatVelocity, 1 / 60);
        } else {
          move(controlled, controlledSource, controlledVelocity, 0);
          move(threat, threatSource, event.threatVelocity, 0);
        }
        const origin = screen(controlled.pos);
        const threatOrigin = screen(threat.pos);
        label('A', origin.x, origin.y - 52, palette.ink, 'center', 22);
        label('B', threatOrigin.x, threatOrigin.y + 68, palette.ink, 'center', 22);
        const beforeA = screen({ x: controlledSource.pos.x + event.before.x / 60, y: controlledSource.pos.y + event.before.y / 60 });
        const afterA = screen({ x: controlledSource.pos.x + event.after.x / 60, y: controlledSource.pos.y + event.after.y / 60 });
        const nextB = screen({ x: threatSource.pos.x + event.threatVelocity.x / 60, y: threatSource.pos.y + event.threatVelocity.y / 60 });
        if (!repaired) {
          line(screen(controlledSource.pos), endpoint(controlled, event.before, 1.4), palette.proposed, 6, [10, 7]);
          line(screen(threatSource.pos), endpoint(threat, event.threatVelocity, 1.4), palette.ink, 4);
          bracket(beforeA, nextB, palette.danger);
          cross({ x: (beforeA.x + nextB.x) / 2, y: (beforeA.y + nextB.y) / 2 });
          panel('3 · CHECK THE NEXT SIMULATOR TICK', 'BUFFER VIOLATION DETECTED', `NEXT-TICK GAP ${event.clearanceBefore.toFixed(3)} < 0.250`);
          gapMeter(event.clearanceBefore, palette.danger);
        } else {
          line(screen(controlledSource.pos), endpoint(controlled, event.before, 1.4), palette.proposed, 3, [10, 7]);
          line(screen(controlledSource.pos), endpoint(controlled, event.after, 1.4), palette.safe, 8);
          bracket(afterA, nextB, palette.safe);
          panel('3 · CHECK THE NEXT SIMULATOR TICK', afterTick ? 'SAFE FIELD CONSUMED' : 'SHIELD REPLACES ONE VELOCITY', `FINAL GAP ${event.clearanceAfter.toFixed(3)} > 0.250 · ${event.interventions} INTERNAL REPAIR${event.interventions === 1 ? '' : 'S'}`);
          gapMeter(event.clearanceAfter, palette.safe);
        }
      }
    };

    const matching = Object.values(window.__scenarios).every(scenario =>
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
        passDeltas: coordination.deltas,
        directClearance: coordination.direct.clearance,
        sweep0Clearance: coordination.sweep0.clearance,
        sweep1Clearance: coordination.sweep1.clearance,
      },
      shield: {
        kind: 'deterministic constructed next-tick test',
        kinds: shield.planes.map(plane => plane.kind),
        clearanceBefore: shield.event.clearanceBefore,
        clearanceAfter: shield.event.clearanceAfter,
        finalInterventions: shield.event.interventions,
      },
    };
  });

  if (!audit.matchingRunways) throw new Error('Semantic audit failed: aircraft/runway color mismatch.');
  console.log('Semantic audit:', JSON.stringify(audit, null, 2));

  for (const name of ['decision-field', 'coordination-passes', 'safety-shield']) {
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
