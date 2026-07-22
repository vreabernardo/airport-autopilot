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
    'for (const ac of flying) {\n      if (window.__captureExplain) { ac._capturePasses = []; ac._captureCandidates = []; }\n      ac.target ||= runways[ac.kind];',
  )
  .replace(
    'let best = null;\n        for (const candidate of headings) {',
    'let best = null;\n        const captureCandidates = [];\n        for (const candidate of headings) {',
  )
  .replace(
    'if (!best || score > best.score) best = { score, angle, velocity, offset, clearance };',
    'if (window.__captureExplain) captureCandidates.push({ score, angle, velocity: { ...velocity }, offset, clearance });\n          if (!best || score > best.score) best = { score, angle, velocity, offset, clearance };',
  )
  .replace(
    'chosen.set(ac.id, best.velocity);\n        ac._solution = best;',
    'chosen.set(ac.id, best.velocity);\n        ac._solution = best;\n        if (window.__captureExplain) { ac._capturePasses[iteration] = { ...best, velocity: { ...best.velocity } }; ac._captureCandidates[iteration] = captureCandidates; }',
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
          window.__captureShieldEvents.push({ aircraft: ac, before: { ...velocity }, after: { ...safest.velocity }, clearanceBefore: nextClearance, threat });
        }
        chosen.set(ac.id, safest.velocity);
        ac.path =`,
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
      ink: '#f2efe2', dim: '#68747a', panel: '#10191d', edge: '#627078',
      yellow: '#e3bf47', blue: '#6f9ed8', red: '#d65e69', safe: '#65c98e', danger: '#d65e69', black: '#071014',
    };
    const colorFor = kind => palette[kind] || palette.ink;
    const runwayFor = kind => sim.map.runways.find(runway => runway.color === kind);
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
    });

    let decision = null;
    for (let trial = 0; trial < 6000 && !decision; trial++) {
      const planes = [clonePlane('blue', 9101), clonePlane('red', 9102)];
      planes[0].pos = randomPoint();
      planes[1].pos = randomPoint();
      stage(planes);
      const candidates = planes[0]._captureCandidates[1];
      const direct = candidates.find(candidate => Math.abs(candidate.offset) < 1e-9);
      const selected = planes[0]._capturePasses[1];
      if (planes.every(clearOfOwnRunway) && screenDistance(planes[0].pos, planes[1].pos) > 180
          && direct?.clearance < 2 && selected.clearance >= 2 && Math.abs(selected.offset) > .12) {
        decision = { planes: planes.map(snapshot), focusId: planes[0].id };
      }
    }
    if (!decision) throw new Error('Could not synthesize a valid direct-conflict decision scene.');

    let coordination = null;
    for (let trial = 0; trial < 30000 && !coordination; trial++) {
      const planes = [clonePlane('yellow', 9201), clonePlane('blue', 9202), clonePlane('red', 9203)];
      for (const plane of planes) plane.pos = randomPoint();
      stage(planes);
      const deltas = planes.map(plane => Math.abs(Math.atan2(
        Math.sin(plane._capturePasses[1].angle - plane._capturePasses[0].angle),
        Math.cos(plane._capturePasses[1].angle - plane._capturePasses[0].angle),
      )));
      const directUnsafe = planes.some(plane => plane._captureCandidates[0].find(candidate => Math.abs(candidate.offset) < 1e-9)?.clearance < 2);
      if (planes.every(clearOfOwnRunway) && pairwiseSeparated(planes) && directUnsafe && Math.max(...deltas) > .12
          && planes.every(plane => plane._capturePasses[1].clearance >= 2)) {
        coordination = { planes: planes.map(snapshot), deltas };
      }
    }
    if (!coordination) throw new Error('Could not synthesize a valid two-sweep coordination scene.');

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
      const event = window.__captureShieldEvents.find(item => item.threat?.aircraft);
      if (event && event.clearanceBefore <= .25) {
        shield = {
          planes: planes.map(snapshot),
          event: {
            aircraftId: event.aircraft.id,
            threatId: event.threat.aircraft.id,
            before: { ...event.before }, after: { ...event.after },
            threatVelocity: { ...event.threat.velocity }, clearanceBefore: event.clearanceBefore,
          },
        };
      }
    }
    if (!shield) throw new Error('Could not synthesize a real safety-shield intervention.');

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
      context.fillRect(24, 24, 480, 104);
      context.strokeStyle = palette.edge;
      context.lineWidth = 2;
      context.strokeRect(25, 25, 478, 102);
      context.fillStyle = palette.edge;
      for (let x = 34; x < 494; x += 8) context.fillRect(x, 34, 3, 3);
      label(title, 42, 60, palette.ink, 'left', 14);
      label(phase, 42, 85, palette.safe, 'left', 12);
      label(detail, 42, 110, palette.dim, 'left', 12);
    };
    const targetMarker = plane => {
      const point = screen(plane.target.approach);
      box(point, 12, colorFor(plane.kind), 2);
      label(`${plane.kind.toUpperCase()} RUNWAY`, point.x, point.y - 20, colorFor(plane.kind), 'center', 11);
    };
    const endpoint = (plane, velocity, seconds = 2.6) => screen({
      x: plane.pos.x + velocity.x * seconds,
      y: plane.pos.y + velocity.y * seconds,
    });
    const usePlanes = sourcePlanes => {
      const planes = sourcePlanes.map(source => ({
        ...samples[source.kind], ...source, spec: samples[source.kind].spec,
        pos: { ...source.pos }, path: [], target: source.target, state: 'flying', age: 30,
      }));
      sim.aircraft.splice(0, sim.aircraft.length, ...planes);
      return planes;
    };
    const drawPlaneIdentity = plane => {
      const point = screen(plane.pos);
      box(point, 24, colorFor(plane.kind), 2);
      label(plane.kind.toUpperCase(), point.x, point.y + 43, colorFor(plane.kind), 'center', 11);
      targetMarker(plane);
    };
    const setPath = (plane, velocity) => {
      plane.heading = Math.atan2(velocity.y, velocity.x);
      plane.path = [{ x: plane.pos.x + velocity.x * 12, y: plane.pos.y + velocity.y * 12 }];
    };

    window.__renderScenario = (name, time) => {
      context.clearRect(0, 0, innerWidth, innerHeight);
      const blink = Math.floor(time * 4) % 2 === 0;

      if (name === 'decision-field') {
        const scenario = window.__scenarios.decision;
        const planes = usePlanes(scenario.planes);
        const focus = planes.find(plane => plane.id === scenario.focusId);
        const threat = planes.find(plane => plane.id !== scenario.focusId);
        const selected = focus.passes[1];
        const candidates = focus.candidates[1];
        const direct = candidates.find(candidate => Math.abs(candidate.offset) < 1e-9);
        const phase = time < 2 ? 0 : time < 4 ? 1 : 2;
        setPath(focus, phase === 2 ? selected.velocity : direct.velocity);
        setPath(threat, threat.direct);
        planes.forEach(drawPlaneIdentity);
        const origin = screen(focus.pos);
        const directEnd = endpoint(focus, direct.velocity);
        line(origin, directEnd, direct.clearance < 2 ? palette.danger : palette.safe, 4, [8, 6]);

        if (phase === 0) {
          panel('48-HEADING VELOCITY SEARCH', '01  DIRECT BEARING', `${focus.kind.toUpperCase()} AIRCRAFT → ${focus.kind.toUpperCase()} RUNWAY`);
          label(`CLEARANCE ${direct.clearance.toFixed(2)}`, directEnd.x, directEnd.y - 14, palette.danger, 'center', 11);
        } else if (phase === 1) {
          panel('48-HEADING VELOCITY SEARCH', '02  CLOSEST APPROACH / 8 s', 'RELATIVE MOTION COLLAPSES TWO TRAJECTORIES TO ONE GAP');
          const p = { x: threat.pos.x - focus.pos.x, y: threat.pos.y - focus.pos.y };
          const v = { x: threat.direct.x - direct.velocity.x, y: threat.direct.y - direct.velocity.y };
          const vv = v.x * v.x + v.y * v.y;
          const t = vv < 1e-8 ? 0 : Math.max(0, Math.min(8, -(p.x * v.x + p.y * v.y) / vv));
          const a = screen({ x: focus.pos.x + direct.velocity.x * t, y: focus.pos.y + direct.velocity.y * t });
          const b = screen({ x: threat.pos.x + threat.direct.x * t, y: threat.pos.y + threat.direct.y * t });
          line(origin, a, palette.danger, 3, [6, 5]);
          line(screen(threat.pos), b, palette.danger, 3, [6, 5]);
          line(a, b, palette.ink, 2);
          box(a, 18, palette.danger, 3);
          box(b, 18, palette.danger, 3);
          if (blink) label('UNSAFE GAP', (a.x + b.x) / 2, (a.y + b.y) / 2 - 24, palette.danger, 'center', 12);
        } else {
          panel('48-HEADING VELOCITY SEARCH', '03  SAFE MAXIMUM', 'SAFETY TIER → RUNWAY PROGRESS → TURN COST');
          const visible = Math.min(candidates.length, Math.floor((time - 4) * 30));
          candidates.slice(0, visible).forEach(candidate => {
            line(origin, endpoint(focus, candidate.velocity), candidate.clearance >= 2 ? palette.safe : palette.danger, candidate === direct ? 2 : 1);
          });
          const chosenEnd = endpoint(focus, selected.velocity);
          line(origin, chosenEnd, palette.ink, 6);
          box(chosenEnd, 8, palette.safe, 3);
          label(`SELECTED  ${selected.clearance.toFixed(2)} CLEAR`, chosenEnd.x, chosenEnd.y - 16, palette.safe, 'center', 11);
        }
      }

      if (name === 'coordination-passes') {
        const scenario = window.__scenarios.coordination;
        const planes = usePlanes(scenario.planes);
        const phase = time < 1.5 ? -1 : time < 3.75 ? 0 : 1;
        planes.forEach(plane => {
          const velocity = phase < 0 ? plane.direct : plane.passes[phase].velocity;
          setPath(plane, velocity);
          drawPlaneIdentity(plane);
          const origin = screen(plane.pos);
          line(origin, endpoint(plane, velocity), colorFor(plane.kind), phase === 1 ? 5 : 3, phase < 0 ? [8, 6] : []);
          if (phase >= 0) {
            const oldVelocity = phase === 0 ? plane.direct : plane.passes[0].velocity;
            line(origin, endpoint(plane, oldVelocity), palette.dim, 2, [5, 5]);
          }
          if (phase === 1) {
            const delta = Math.abs(Math.atan2(
              Math.sin(plane.passes[1].angle - plane.passes[0].angle),
              Math.cos(plane.passes[1].angle - plane.passes[0].angle),
            ));
            if (delta > .1) {
              box(origin, 34 + (blink ? 4 : 0), palette.ink, 3);
              label('REVISED', origin.x, origin.y - 46, palette.ink, 'center', 11);
            }
          }
        });
        if (phase < 0) {
          panel('SEQUENTIAL BEST RESPONSE', 'INITIAL VELOCITY FIELD', 'EACH COLOR IS AIMED AT ITS MATCHING RUNWAY');
          if (blink) label('DIRECT CHOICES CONFLICT', 600, 610, palette.danger, 'center', 12);
        } else {
          panel('SEQUENTIAL BEST RESPONSE', `SWEEP 0${phase + 1} / 02`, phase === 0
            ? 'REPLACE EACH VELOCITY IMMEDIATELY IN STABLE ID ORDER'
            : 'SECOND SWEEP CONSUMES THE FULL UPDATED FIELD');
          label(phase === 0 ? 'PARTIAL JOINT FIELD' : 'SAFE JOINT FIELD', 600, 610, phase === 0 ? palette.ink : palette.safe, 'center', 12);
        }
      }

      if (name === 'safety-shield') {
        const scenario = window.__scenarios.shield;
        const planes = usePlanes(scenario.planes);
        const event = scenario.event;
        const controlled = planes.find(plane => plane.id === event.aircraftId);
        const threat = planes.find(plane => plane.id === event.threatId);
        const repaired = time >= 3;
        setPath(controlled, repaired ? event.after : event.before);
        setPath(threat, event.threatVelocity);
        planes.forEach(targetMarker);
        const origin = screen(controlled.pos);
        const beforeEnd = endpoint(controlled, event.before, 2.2);
        const afterEnd = endpoint(controlled, event.after, 2.2);
        const threatOrigin = screen(threat.pos);
        box(origin, 25, colorFor(controlled.kind), 3);
        box(threatOrigin, 25, colorFor(threat.kind), 3);
        const controlledLabel = { x: origin.x - 84, y: origin.y - 42 };
        const threatLabel = { x: threatOrigin.x + 84, y: threatOrigin.y + 52 };
        line({ x: controlledLabel.x + 22, y: controlledLabel.y + 4 }, origin, colorFor(controlled.kind), 2);
        line({ x: threatLabel.x - 22, y: threatLabel.y - 7 }, threatOrigin, colorFor(threat.kind), 2);
        label(controlled.kind.toUpperCase(), controlledLabel.x, controlledLabel.y, colorFor(controlled.kind), 'center', 11);
        label(threat.kind.toUpperCase(), threatLabel.x, threatLabel.y, colorFor(threat.kind), 'center', 11);
        if (!repaired) {
          panel('LAST-FRAME SAFETY SHIELD', '01  PROJECT EXACTLY 1 / 60 s', `EDGE CLEARANCE ${event.clearanceBefore.toFixed(3)} ≤ 0.250`);
          line(origin, beforeEnd, palette.danger, 5);
          line(threatOrigin, endpoint(threat, event.threatVelocity, 2.2), colorFor(threat.kind), 4);
          box(origin, 30, palette.danger, 3);
          box(threatOrigin, 30, palette.danger, 3);
          if (blink) label('NEXT SAMPLE UNSAFE', (origin.x + threatOrigin.x) / 2, Math.min(origin.y, threatOrigin.y) - 44, palette.danger, 'center', 12);
        } else {
          panel('LAST-FRAME SAFETY SHIELD', '02  SEARCH 64 HEADINGS', 'REPLACE ONE VECTOR; KEEP THE REST OF THE FIELD');
          for (let index = 0; index < 64; index += 4) {
            const angle = Math.PI * 2 * index / 64;
            const candidate = { x: Math.cos(angle) * controlled.spec.speed, y: Math.sin(angle) * controlled.spec.speed };
            line(origin, endpoint(controlled, candidate, 1.15), palette.dim, 1);
          }
          line(origin, beforeEnd, palette.danger, 2, [5, 5]);
          line(origin, afterEnd, palette.safe, 6);
          box(afterEnd, 8, palette.safe, 3);
          label('SAFEST IMMEDIATE VECTOR', afterEnd.x, afterEnd.y - 16, palette.safe, 'center', 11);
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
      coordination: { kinds: coordination.planes.map(plane => plane.kind), passDeltas: coordination.deltas },
      shield: { kinds: shield.planes.map(plane => plane.kind), clearanceBefore: shield.event.clearanceBefore },
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
