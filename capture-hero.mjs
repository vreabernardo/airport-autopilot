import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const execute = promisify(execFile);
const projectDir = process.env.PROJECT_DIR || path.dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.HERO_OUTPUT_DIR || path.join(projectDir, 'docs');
const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-hero-'));
const targetSeconds = Number(process.env.TARGET_HOURS ?? 0) * 60 * 60;
const captureSeconds = Number(process.env.CAPTURE_SECONDS || 24);
const seedValue = Number(process.env.SEED || 101) >>> 0;
const outputName = process.env.HERO_OUTPUT || 'early-conflict-cinematic.gif';
const outputFps = Math.max(1, Math.min(30, Number(process.env.HERO_FPS) || 12));
const solverSource = fs.readFileSync(path.join(projectDir, 'autopilot.js'), 'utf8');

fs.mkdirSync(outputDir, { recursive: true });

const seededRandom = seed => {
  let value = seed;
  Math.random = () => {
    value |= 0;
    value = value + 0x6D2B79F5 | 0;
    let result = Math.imul(value ^ value >>> 15, 1 | value);
    result = result + Math.imul(result ^ result >>> 7, 61 | result) ^ result;
    return ((result ^ result >>> 14) >>> 0) / 4294967296;
  };
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 675 } });
  await page.addInitScript(seededRandom, seedValue);
  await page.route('**/_app/immutable/nodes/2.*.js', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const needle = 'X=new ot,';
    if (!source.includes(needle)) throw new Error('Game-model patch point was not found.');
    const exposed = source
      .replace(needle, 'X=window.__game=new ot,')
      .replace(/Y\s*=\s*new se\(d\)/, 'Y=window.__airportViewport=new se(d)')
      .replace('fe=new oe(Y)', 'fe=window.__airportRenderer=new oe(Y)');
    await route.fulfill({ response, body: exposed });
  });
  await page.addInitScript(solverSource);
  await page.goto('https://airport.apunen.com/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(
    () => window.__apStatus?.().phase === 'playing' && window.__airportRenderer,
    undefined,
    { timeout: 90_000 },
  );
  const fastForwardUntil = targetSeconds;
  while (true) {
    const state = await page.evaluate(limit => {
      const game = window.__game;
      const end = Math.min(limit, game.elapsed + 60);
      while (game.phase === 'playing' && game.elapsed < end) game.step(1 / 60);
      return window.__apStatus();
    }, fastForwardUntil);
    if (state.phase !== 'playing') throw new Error(`Game over at ${state.elapsed.toFixed(1)} seconds.`);
    if (state.elapsed >= fastForwardUntil) break;
    if (Math.floor(state.elapsed) % 600 < 61) {
      console.log(`Fast-forward: ${(state.elapsed / 3600).toFixed(2)}h, ${state.landings + state.departures} routed`);
    }
  }

  // Headless requestAnimationFrame can be heavily throttled. Freeze its update
  // hook and advance the simulation explicitly so every encoded second contains
  // exactly 60 controller/game ticks regardless of wall-clock capture speed.
  const captureSetup = await page.evaluate(() => {
    const game = window.__game;
    const runwayFor = kind => game.map.runways.find(runway => runway.color === kind);
    const velocityTo = (aircraft, point) => {
      const angle = Math.atan2(point.y - aircraft.pos.y, point.x - aircraft.pos.x);
      return {
        x: Math.cos(angle) * aircraft.spec.speed,
        y: Math.sin(angle) * aircraft.spec.speed,
      };
    };
    const currentVelocity = aircraft => {
      const point = aircraft.path?.[0];
      if (point) return velocityTo(aircraft, point);
      return {
        x: Math.cos(aircraft.heading) * aircraft.spec.speed,
        y: Math.sin(aircraft.heading) * aircraft.spec.speed,
      };
    };
    const pairClearance = (a, av, b, bv, horizon = 8) => {
      const px = b.pos.x - a.pos.x;
      const py = b.pos.y - a.pos.y;
      const vx = bv.x - av.x;
      const vy = bv.y - av.y;
      const vv = vx * vx + vy * vy;
      const time = vv < 1e-8 ? 0 : Math.max(0, Math.min(horizon, -(px * vx + py * vy) / vv));
      return {
        time,
        clearance: Math.hypot(px + vx * time, py + vy * time)
          - a.spec.radius - b.spec.radius,
      };
    };
    const selectFocus = () => {
      const flying = game.aircraft.filter(aircraft => aircraft.state === 'flying');
      let best = null;
      for (let aIndex = 0; aIndex < flying.length; aIndex++) {
        for (let bIndex = aIndex + 1; bIndex < flying.length; bIndex++) {
          const a = flying[aIndex];
          const b = flying[bIndex];
          const aRunway = runwayFor(a.kind);
          const bRunway = runwayFor(b.kind);
          if (!aRunway || !bRunway) continue;
          const aDirect = velocityTo(a, aRunway.approach);
          const bDirect = velocityTo(b, bRunway.approach);
          const direct = pairClearance(a, aDirect, b, bDirect);
          const actual = pairClearance(a, currentVelocity(a), b, currentVelocity(b));
          const runwayDistance = Math.min(
            Math.hypot(a.pos.x - aRunway.approach.x, a.pos.y - aRunway.approach.y),
            Math.hypot(b.pos.x - bRunway.approach.x, b.pos.y - bRunway.approach.y),
          );
          if (direct.clearance >= 2 || actual.clearance < 2 || runwayDistance < 50) continue;
          const score = (2 - direct.clearance) + Math.min(8, actual.clearance - 2) + runwayDistance / 80;
          if (!best || score > best.score) {
            best = {
              ids: [a.id, b.id],
              score,
              elapsed: game.elapsed,
              airborneCount: flying.length,
              runwayDistance,
              directClearance: direct.clearance,
              actualClearance: actual.clearance,
            };
          }
        }
      }
      return best;
    };
    let focus = selectFocus();
    for (let tick = 0; tick < 60 * 6 * 60 && !focus; tick++) {
      game.step(1 / 60);
      focus = selectFocus();
    }
    if (!focus) {
      throw new Error('Could not find an early direct-conflict pair resolved by the controller.');
    }

    game.update = () => {};
    const viewport = window.__airportViewport;
    const airportRenderer = window.__airportRenderer;
    const syncAircraft = airportRenderer.syncAircraft.bind(airportRenderer);
    airportRenderer.syncAircraft = (...args) => {
      if (window.__heroRenderIds) {
        args[0] = args[0].filter(aircraft => window.__heroRenderIds.has(aircraft.id));
      }
      const result = syncAircraft(...args);
      for (const entry of airportRenderer.entries.values()) {
        entry.airborneHalo.visible = false;
      }
      return result;
    };
    const syncPaths = airportRenderer.syncPaths.bind(airportRenderer);
    airportRenderer.syncPaths = (...args) => {
      const result = syncPaths(...args);
      airportRenderer.pathGroup.visible = false;
      return result;
    };
    const home = {
      x: viewport.cameraTarget.x,
      y: viewport.cameraTarget.y,
      zoom: viewport.camera.zoom,
    };
    const overlay = document.createElement('canvas');
    overlay.width = innerWidth;
    overlay.height = innerHeight;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;width:100%;height:100%;pointer-events:none;image-rendering:pixelated';
    document.body.append(overlay);
    const context = overlay.getContext('2d');
    context.imageSmoothingEnabled = false;
    const hideTransientLabels = () => {
      document.querySelectorAll('body *').forEach(element => {
        if (/^(landing|departure)$/i.test(element.textContent?.trim() || '')) {
          element.style.visibility = 'hidden';
        }
      });
      document.querySelectorAll('.landing-assist').forEach(element => {
        element.style.visibility = 'hidden';
      });
    };
    hideTransientLabels();
    new MutationObserver(hideTransientLabels).observe(document.body, {
      childList: true,
      subtree: true,
    });
    const smooth = value => {
      const t = Math.max(0, Math.min(1, value));
      return t * t * (3 - 2 * t);
    };
    const line = (from, to, color, width = 3, dash = []) => {
      context.beginPath();
      context.setLineDash(dash);
      context.moveTo(Math.round(from.x) + .5, Math.round(from.y) + .5);
      context.lineTo(Math.round(to.x) + .5, Math.round(to.y) + .5);
      context.strokeStyle = color;
      context.lineWidth = width;
      context.lineCap = 'butt';
      context.stroke();
      context.setLineDash([]);
    };
    const arrow = (from, to, color, width = 4, dash = []) => {
      line(from, to, color, width, dash);
      const angle = Math.atan2(to.y - from.y, to.x - from.x);
      const size = 10 + width;
      context.beginPath();
      context.moveTo(to.x, to.y);
      context.lineTo(to.x - Math.cos(angle - .48) * size, to.y - Math.sin(angle - .48) * size);
      context.lineTo(to.x - Math.cos(angle + .48) * size, to.y - Math.sin(angle + .48) * size);
      context.closePath();
      context.fillStyle = color;
      context.fill();
    };
    const label = (text, x, y, color = '#f5edcf', align = 'left', size = 15) => {
      context.fillStyle = color;
      context.font = `700 ${size}px Hind, ui-sans-serif, sans-serif`;
      context.textAlign = align;
      context.fillText(text, Math.round(x), Math.round(y));
      context.textAlign = 'left';
    };
    const reticle = (point, color, time, radius = 28) => {
      const pulse = Math.round((Math.sin(time * Math.PI * 3) + 1) * 3);
      const outer = radius + pulse;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const corner = { x: point.x + sx * outer, y: point.y + sy * outer };
        line(corner, { x: corner.x - sx * 12, y: corner.y }, color, 3);
        line(corner, { x: corner.x, y: corner.y - sy * 12 }, color, 3);
      }
    };
    const predictedPair = (a, av, b, bv) => {
      const prediction = pairClearance(a, av, b, bv);
      return {
        ...prediction,
        a: { x: a.pos.x + av.x * prediction.time, y: a.pos.y + av.y * prediction.time },
        b: { x: b.pos.x + bv.x * prediction.time, y: b.pos.y + bv.y * prediction.time },
      };
    };
    const sceneryLayer = viewport.scene.getObjectByName('airport-scenery');
    const panelLabels = ['Landings', 'Departures', 'Pace', 'Duration'];
    window.__heroAudit = {
      directFrames: 0,
      coordinatedFrames: 0,
      missingFocusFrames: 0,
      returnedHomeFrames: 0,
      fullSceneryVisible: Boolean(sceneryLayer?.visible),
      performancePanelVisible: panelLabels.every(text =>
        [...document.querySelectorAll('body *')].some(element =>
          element.textContent?.trim() === text
          && getComputedStyle(element).visibility !== 'hidden'
          && getComputedStyle(element).display !== 'none')),
    };
    window.__renderHero = time => {
      const [firstId, secondId] = focus.ids;
      const first = game.aircraft.find(aircraft => aircraft.id === firstId);
      const second = game.aircraft.find(aircraft => aircraft.id === secondId);
      let focusAmount = 0;
      if (time >= .8 && time < 1.4) focusAmount = smooth((time - .8) / .6);
      else if (time >= 1.4 && time < 4.6) focusAmount = 1;
      else if (time >= 4.6 && time < 6.5) focusAmount = 1 - smooth((time - 4.6) / 1.9);
      if (time >= 1.4 && time < 4.6) {
        if (first && second) {
          if (time < 2.9) window.__heroAudit.directFrames++;
          else window.__heroAudit.coordinatedFrames++;
        } else {
          window.__heroAudit.missingFocusFrames++;
        }
      }
      if (time >= 6.5 && focusAmount < 1e-6) window.__heroAudit.returnedHomeFrames++;
      if (first && second) {
        window.__heroLastFocus = {
          x: (first.pos.x + second.pos.x) / 2,
          y: (first.pos.y + second.pos.y) / 2,
        };
      }
      const midpoint = window.__heroLastFocus || home;
      viewport.cameraState = 'diagram';
      viewport.cameraTarget.set(
        home.x + (midpoint.x - home.x) * focusAmount,
        home.y + (midpoint.y - home.y) * focusAmount,
      );
      viewport.camera.zoom = home.zoom + (2.6 - home.zoom) * focusAmount;
      viewport.applyCamera();
      viewport.camera.updateProjectionMatrix();
      const focusOnly = time >= .8 && time < 6.5 && first && second;
      window.__heroRenderIds = focusOnly ? new Set([first.id, second.id]) : null;
      airportRenderer.syncAircraft(
        focusOnly ? [first, second] : game.aircraft,
        null,
        new Set(),
        true,
      );
      airportRenderer.pathGroup.visible = false;
      for (const entry of airportRenderer.entries.values()) {
        entry.airborneHalo.visible = false;
      }
      viewport.render();
      context.clearRect(0, 0, innerWidth, innerHeight);

      context.fillStyle = 'rgba(7, 18, 23, .88)';
      context.fillRect(760, 18, 414, 82);
      context.strokeStyle = '#43d7e5';
      context.lineWidth = 2;
      context.strokeRect(760, 18, 414, 82);
      label('AUTONOMOUS AIRSPACE · 60 HZ', 780, 47, '#f5edcf', 'left', 15);
      let phase = 'FIRST LIVE CONFLICT · FOCUS PAIR';
      if (time >= .8 && time < 1.4) phase = 'LOCKING A LIVE CONFLICT';
      else if (time >= 1.4 && time < 2.9) phase = 'DIRECT ROUTES INTERSECT';
      else if (time >= 2.9 && time < 4.6) phase = 'COORDINATED VELOCITIES';
      else if (time >= 4.6 && time < 6.5) phase = 'CONFLICT CLEARED';
      else if (time >= 6.5) phase = 'CONTROL CONTINUES';
      label(phase, 780, 79, '#43d7e5', 'left', 22);

      if (!first || !second || time < .8 || time >= 4.8) return;
      const firstPoint = viewport.worldToScreen(first.pos);
      const secondPoint = viewport.worldToScreen(second.pos);
      reticle(firstPoint, '#43d7e5', time);
      reticle(secondPoint, '#f5edcf', time + .2);
      if (time < 2.9) {
        const firstRunway = runwayFor(first.kind);
        const secondRunway = runwayFor(second.kind);
        const firstVelocity = velocityTo(first, firstRunway.approach);
        const secondVelocity = velocityTo(second, secondRunway.approach);
        const prediction = predictedPair(first, firstVelocity, second, secondVelocity);
        arrow(firstPoint, viewport.worldToScreen({
          x: first.pos.x + firstVelocity.x * 2.2,
          y: first.pos.y + firstVelocity.y * 2.2,
        }), '#f2ae49', 5, [9, 6]);
        arrow(secondPoint, viewport.worldToScreen({
          x: second.pos.x + secondVelocity.x * 2.2,
          y: second.pos.y + secondVelocity.y * 2.2,
        }), '#f2ae49', 5, [9, 6]);
        const collision = viewport.worldToScreen({
          x: (prediction.a.x + prediction.b.x) / 2,
          y: (prediction.a.y + prediction.b.y) / 2,
        });
        const ring = 18 + ((time * 20) % 18);
        context.beginPath();
        context.arc(collision.x, collision.y, ring, 0, Math.PI * 2);
        context.strokeStyle = '#ff4f91';
        context.lineWidth = 4;
        context.stroke();
        label('PREDICTED CONFLICT', collision.x, collision.y - 38, '#ff4f91', 'center', 14);
      } else {
        for (const [aircraft, color] of [[first, '#43d7e5'], [second, '#f5edcf']]) {
          const velocity = currentVelocity(aircraft);
          arrow(
            viewport.worldToScreen(aircraft.pos),
            viewport.worldToScreen({
              x: aircraft.pos.x + velocity.x * 2.5,
              y: aircraft.pos.y + velocity.y * 2.5,
            }),
            color,
            6,
          );
        }
        label('SHARED FIELD · SAFE', (firstPoint.x + secondPoint.x) / 2,
          Math.min(firstPoint.y, secondPoint.y) - 48, '#43d7e5', 'center', 16);
      }
    };
    window.__captureAircraft = game.aircraft;
    window.__captureWarnings = game.spawnWarnings;
    game.aircraft = game.aircraft.filter(aircraft =>
      aircraft.state === 'flying' || aircraft.state === 'departing' || aircraft.state === 'landing');
    game.spawnWarnings = [];
    return { start: game.elapsed, focus };
  });
  const capturedFrames = Math.round(captureSeconds * outputFps);
  let completedSteps = 0;
  for (let index = 0; index < capturedFrames; index++) {
    const targetSteps = Math.round((index + 1) * 60 / outputFps);
    const steps = targetSteps - completedSteps;
    completedSteps = targetSteps;
    await page.evaluate(count => {
      const game = window.__game;
      game.aircraft = window.__captureAircraft;
      game.spawnWarnings = window.__captureWarnings;
      for (let step = 0; step < count; step++) window.__game.step(1 / 60);
      window.__captureAircraft = game.aircraft;
      window.__captureWarnings = game.spawnWarnings;
      game.aircraft = game.aircraft.filter(aircraft =>
        aircraft.state === 'flying' || aircraft.state === 'departing' || aircraft.state === 'landing');
      game.spawnWarnings = [];
    }, steps);
    await page.waitForTimeout(16);
    await page.evaluate(time => window.__renderHero(time), (index + 1) / outputFps);
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(index).padStart(4, '0')}.png`),
    });
  }

  const finalState = await page.evaluate(() => {
    window.__game.aircraft = window.__captureAircraft;
    window.__game.spawnWarnings = window.__captureWarnings;
    return { ...window.__apStatus(), heroAudit: window.__heroAudit };
  });
  if (finalState.phase !== 'playing') throw new Error(`Game over at ${finalState.elapsed.toFixed(1)} seconds.`);
  if (!finalState.heroAudit.fullSceneryVisible) throw new Error('Hero audit failed: full game scenery is hidden.');
  if (!finalState.heroAudit.performancePanelVisible) throw new Error('Hero audit failed: performance panel is hidden.');
  if (captureSeconds >= 6.5) {
    if (finalState.heroAudit.missingFocusFrames > 0
        || finalState.heroAudit.directFrames < outputFps
        || finalState.heroAudit.coordinatedFrames < outputFps) {
      throw new Error(`Hero audit failed: conflict continuity ${JSON.stringify(finalState.heroAudit)}.`);
    }
    if (finalState.heroAudit.returnedHomeFrames < outputFps) {
      throw new Error('Hero audit failed: camera did not return to the full airspace.');
    }
  }
  const simulatedCaptureSeconds = finalState.elapsed - captureSetup.start;
  if (Math.abs(simulatedCaptureSeconds - captureSeconds) > 1 / 30) {
    throw new Error(`Expected ${captureSeconds}s of simulation, captured ${simulatedCaptureSeconds.toFixed(3)}s.`);
  }
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  await execute(ffmpeg, [
    '-y', '-framerate', String(outputFps), '-i', path.join(framesDir, 'frame-%04d.png'),
    '-vf', 'scale=1200:-1:flags=neighbor,split[s0][s1];[s0]palettegen=max_colors=48:stats_mode=diff[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle',
    '-loop', '0', path.join(outputDir, outputName),
  ]);
  fs.writeFileSync(path.join(outputDir, `${path.basename(outputName, '.gif')}.json`), `${JSON.stringify({
    seed: seedValue,
    capturedFrames,
    focus: captureSetup.focus,
    ...finalState,
  }, null, 2)}\n`);
  console.log(`Captured ${finalState.elapsed.toFixed(1)} seconds with ${finalState.landings + finalState.departures} operations.`);
} finally {
  await browser.close();
  fs.rmSync(framesDir, { recursive: true, force: true });
}
