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
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-game-scenes-'));
const fps = 15;
const frameCount = 90;

fs.mkdirSync(outputDir, { recursive: true });

async function encode(name) {
  await execute(process.env.FFMPEG || 'ffmpeg', [
    '-y', '-framerate', String(fps), '-i', path.join(temporaryDir, name, 'frame-%03d.png'),
    '-vf', 'fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=112[p];[s1][p]paletteuse=dither=bayer',
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
  await page.goto('https://airport.apunen.com/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(
    () => window.__game?.phase === 'playing' && window.__airportViewport && window.__game.aircraft.length,
    undefined,
    { timeout: 90_000 },
  );

  await page.evaluate(() => {
    const sim = window.__game;
    const source = sim.aircraft[0];
    const clone = (id, kindIndex) => ({
      ...source,
      id,
      pos: { ...source.pos },
      path: [],
      target: null,
      state: 'flying',
      age: 20 + kindIndex,
      landProgress: 0,
      takeoffProgress: 0,
    });
    const aircraft = [source, clone(source.id + 10_000, 1), clone(source.id + 20_000, 2)];
    aircraft.forEach(item => {
      item.state = 'flying';
      item.path = [];
      item.target = null;
    });
    sim.aircraft.splice(0, sim.aircraft.length, ...aircraft);
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
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100%;height:100%;pointer-events:none';
    document.body.append(overlay);
    const context = overlay.getContext('2d');

    const colors = {
      ink: '#f4f7f8', muted: '#a9b4bc', panel: 'rgba(8,13,20,.91)',
      red: '#ef6671', green: '#65e6a7', blue: '#74a8ff', yellow: '#f1c84a', white: '#ffffff',
    };
    const ease = value => {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    };
    const mix = (from, to, t) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    const line = (from, to, color, width = 3, dash = []) => {
      context.beginPath(); context.setLineDash(dash); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y);
      context.strokeStyle = color; context.lineWidth = width; context.lineCap = 'round'; context.stroke(); context.setLineDash([]);
    };
    const route = (points, color, width = 4, dash = []) => {
      context.beginPath(); context.setLineDash(dash); context.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) context.lineTo(point.x, point.y);
      context.strokeStyle = color; context.lineWidth = width; context.lineJoin = 'round'; context.lineCap = 'round'; context.stroke();
      context.setLineDash([]);
    };
    const ring = (point, radius, color, width = 3) => {
      context.beginPath(); context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.strokeStyle = color; context.lineWidth = width; context.stroke();
    };
    const label = (text, x, y, color = colors.ink, align = 'left', size = 12) => {
      context.fillStyle = color;
      context.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textAlign = align; context.fillText(text, x, y); context.textAlign = 'left';
    };
    const panel = (title, phase, detail) => {
      context.fillStyle = colors.panel; context.fillRect(24, 24, 430, 100);
      context.strokeStyle = 'rgba(255,255,255,.18)'; context.lineWidth = 1; context.strokeRect(24.5, 24.5, 429, 99);
      label(title, 46, 53, colors.ink, 'left', 13);
      label(phase, 46, 79, colors.green, 'left', 11);
      context.fillStyle = colors.muted; context.font = '500 12px Inter, system-ui, sans-serif'; context.fillText(detail, 46, 103);
    };
    const transform = () => {
      const viewport = window.__airportViewport;
      const origin = viewport.worldToScreen({ x: 0, y: 0 });
      const xBasis = viewport.worldToScreen({ x: 1, y: 0 });
      const yBasis = viewport.worldToScreen({ x: 0, y: 1 });
      const a = xBasis.x - origin.x, b = yBasis.x - origin.x;
      const d = xBasis.y - origin.y, e = yBasis.y - origin.y;
      const determinant = a * e - b * d;
      return {
        toWorld(point) {
          const sx = point.x - origin.x, sy = point.y - origin.y;
          return { x: (sx * e - b * sy) / determinant, y: (a * sy - d * sx) / determinant };
        },
      };
    };
    const setAircraft = (aircraft, position, next) => {
      const converter = transform();
      const world = converter.toWorld(position);
      const future = converter.toWorld(next);
      aircraft.pos = world;
      aircraft.heading = Math.atan2(future.y - world.y, future.x - world.x);
      aircraft.path = [future];
    };
    const hideUnused = count => {
      window.__game.aircraft.forEach((aircraft, index) => {
        aircraft.state = index < count ? 'flying' : 'landed';
      });
    };
    const focus = (point, color, time, text) => {
      ring(point, 42 + Math.sin(time * 4) * 3, color, 3);
      label(text, point.x, point.y + 62, color, 'center', 10);
    };

    window.__renderScenario = (kind, time) => {
      context.clearRect(0, 0, innerWidth, innerHeight);
      const planes = window.__game.aircraft;

      if (kind === 'decision-field') {
        hideUnused(2);
        const controlledStart = { x: 250, y: 470 };
        const crossingStart = { x: 560, y: 155 };
        const collision = { x: 560, y: 365 };
        const runway = { x: 790, y: 390 };
        const phase = time < 1.8 ? 0 : time < 3.6 ? 1 : 2;
        const controlled = phase < 2 ? controlledStart : mix(controlledStart, { x: 405, y: 300 }, ease((time - 3.6) / 2.4) * .35);
        const crossing = mix(crossingStart, { x: 560, y: 290 }, ease(time / 6));
        const selected = { x: 465, y: 270 };
        setAircraft(planes[0], controlled, phase === 2 ? selected : runway);
        setAircraft(planes[1], crossing, { x: 560, y: 560 });

        line(controlledStart, runway, colors.red, 3, [9, 8]);
        line(crossingStart, { x: 560, y: 545 }, colors.muted, 3, [9, 8]);
        focus(controlled, phase === 2 ? colors.green : colors.yellow, time, 'CONTROLLED AIRCRAFT');
        if (phase === 0) {
          panel('VELOCITY SEARCH', '1 / 3  DIRECT', 'Prefer the runway bearing.');
          label('DIRECT VELOCITY', 410, 430, colors.red, 'center', 11);
        } else if (phase === 1) {
          panel('VELOCITY SEARCH', '2 / 3  PREDICT', 'Project relative motion over 8 seconds.');
          const projection = ease((time - 1.8) / 1.2);
          const ghostA = mix(controlledStart, collision, projection);
          const ghostB = mix(crossingStart, collision, projection);
          ring(ghostA, 29, colors.red, 2); ring(ghostB, 29, colors.red, 2);
          ring(collision, 45 + Math.sin(time * 5) * 3, colors.red, 4);
          label('CLEARANCE < 2', collision.x, collision.y + 72, colors.red, 'center', 11);
        } else {
          panel('VELOCITY SEARCH', '3 / 3  CHOOSE', 'Safety first, then progress, then turn cost.');
          const angles = [-.72, -.48, -.24, 0, .24, .48, .72];
          for (const angle of angles) {
            const end = { x: controlledStart.x + Math.cos(angle) * 210, y: controlledStart.y + Math.sin(angle) * 210 };
            line(controlledStart, end, angle < -.3 ? 'rgba(101,230,167,.7)' : 'rgba(239,102,113,.55)', angle < -.3 ? 3 : 2);
          }
          line(controlledStart, selected, colors.green, 6);
          ring(selected, 8, colors.green, 3);
          label('SELECTED VELOCITY', selected.x, selected.y - 20, colors.green, 'center', 11);
        }
      }

      if (kind === 'coordination-passes') {
        hideUnused(3);
        const starts = [{ x: 270, y: 400 }, { x: 610, y: 160 }, { x: 930, y: 410 }];
        const center = { x: 610, y: 360 };
        const pass = Math.min(3, Math.floor(time / 1.5));
        const solutions = [
          [[center], [center], [center]],
          [[{ x: 450, y: 270 }, { x: 475, y: 185 }], [center], [center]],
          [[{ x: 450, y: 270 }, { x: 475, y: 185 }], [{ x: 720, y: 260 }, { x: 865, y: 330 }], [center]],
          [[{ x: 450, y: 270 }, { x: 475, y: 185 }], [{ x: 720, y: 260 }, { x: 865, y: 330 }], [{ x: 760, y: 505 }, { x: 505, y: 525 }]],
        ];
        const routeColors = [colors.green, colors.blue, colors.yellow];
        starts.forEach((start, index) => {
          const path = solutions[pass][index];
          const movement = mix(start, path[0], ease((time % 1.5) / 1.5) * .08);
          setAircraft(planes[index], movement, path[0]);
          route([start, ...path], pass === 0 ? colors.red : routeColors[index], 5);
          ring(movement, 35, index === pass - 1 ? colors.white : routeColors[index], index === pass - 1 ? 3 : 2);
        });
        panel('SEQUENTIAL COORDINATION', `PASS ${pass + 1} / 4`, pass === 0
          ? 'Three direct choices share one conflict.'
          : pass === 3 ? 'The joint velocity field is stable.' : 'Consume the latest field and sweep again.');
        if (pass === 0) {
          ring(center, 48 + Math.sin(time * 5) * 3, colors.red, 4);
          label('JOINT CONFLICT', center.x, center.y + 76, colors.red, 'center', 11);
        } else if (pass === 3) {
          label('NON-INTERSECTING FIELD', 610, 575, colors.green, 'center', 11);
        }
      }

      if (kind === 'safety-shield') {
        hideUnused(2);
        const corrected = time >= 3;
        const approach = ease(Math.min(time, 3) / 3);
        const leftBefore = mix({ x: 310, y: 400 }, { x: 500, y: 400 }, approach);
        const rightBefore = mix({ x: 875, y: 400 }, { x: 690, y: 400 }, approach);
        const correction = ease((time - 3) / 3);
        const left = corrected ? mix({ x: 500, y: 400 }, { x: 590, y: 265 }, correction) : leftBefore;
        const right = corrected ? mix({ x: 690, y: 400 }, { x: 610, y: 400 }, correction * .65) : rightBefore;
        const unsafe = { x: 600, y: 400 };
        const safe = { x: 625, y: 225 };
        setAircraft(planes[0], left, corrected ? safe : unsafe);
        setAircraft(planes[1], right, { x: 420, y: 400 });
        focus(left, corrected ? colors.green : colors.red, time, corrected ? 'CORRECTED AIRCRAFT' : 'THREATENED AIRCRAFT');
        if (!corrected) {
          panel('LAST-FRAME SHIELD', '1 / 2  PROJECT 1/60 s', 'The next sampled footprints overlap.');
          line(left, unsafe, colors.red, 5); line(right, unsafe, colors.red, 5);
          ring({ x: 575, y: 400 }, 31, colors.red, 2); ring({ x: 625, y: 400 }, 31, colors.red, 2);
          ring(unsafe, 50 + Math.sin(time * 5) * 3, colors.red, 4);
        } else {
          panel('LAST-FRAME SHIELD', '2 / 2  REPAIR', 'Replace one velocity; preserve every other decision.');
          line({ x: 500, y: 400 }, unsafe, 'rgba(239,102,113,.45)', 3, [8, 7]);
          line({ x: 500, y: 400 }, safe, colors.green, 6);
          line({ x: 690, y: 400 }, { x: 420, y: 400 }, colors.blue, 5);
          ring(safe, 31, colors.green, 2); ring({ x: 625, y: 400 }, 31, colors.blue, 2);
          label('ONE VECTOR CHANGED', safe.x, safe.y - 24, colors.green, 'center', 11);
        }
      }
    };
  });

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
