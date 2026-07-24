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
const captureSeconds = Number(process.env.CAPTURE_SECONDS || 26);
const seedValue = Number(process.env.SEED || 101) >>> 0;
const outputName = process.env.HERO_OUTPUT || 'holding-pattern-cinematic.gif';
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
  const captureSetup = await page.evaluate(({ captureSeconds }) => {
    const game = window.__game;
    const runwayFor = kind => game.map.runways.find(runway => runway.color === kind);
    const samples = {};
    for (let tick = 0; tick < 60 * 3 * 60
        && (!samples.blue || !samples.yellow || !samples.red); tick++) {
      for (const aircraft of game.aircraft) {
        if (aircraft.state === 'flying'
            && (aircraft.kind === 'blue' || aircraft.kind === 'yellow' || aircraft.kind === 'red')) {
          samples[aircraft.kind] ||= {
            ...aircraft,
            pos: { ...aircraft.pos },
            path: [],
            target: null,
          };
        }
      }
      game.step(1 / 60);
    }
    if (!samples.blue || !samples.yellow || !samples.red) {
      throw new Error('Could not load native blue, yellow, and red aircraft assets.');
    }
    while (game.elapsed < 100) game.step(1 / 60);
    const hold = {
      center: { x: -3, y: -1 },
      radiusX: 15,
      radiusY: 23,
    };
    const pointOnHold = phase => ({
      x: hold.center.x + Math.cos(phase) * hold.radiusX,
      y: hold.center.y + Math.sin(phase) * hold.radiusY,
    });
    const phaseSpeed = (phase, speed) => speed / Math.hypot(
      hold.radiusX * Math.sin(phase),
      hold.radiusY * Math.cos(phase),
    );
    const rewindPhase = (phase, seconds, speed) => {
      const steps = Math.ceil(seconds * 60);
      for (let step = 0; step < steps; step++) {
        phase -= phaseSpeed(phase, speed) * seconds / steps;
      }
      return phase;
    };
    const releasedPlans = [
      { kind: 'blue', releaseAt: 1, gatePhase: Math.PI * 1.5 },
      { kind: 'yellow', releaseAt: 3, gatePhase: Math.PI * .75 },
      { kind: 'red', releaseAt: 12, gatePhase: Math.PI * 1.75 },
    ].map((plan, index) => ({
      ...plan,
      phase: rewindPhase(
        plan.gatePhase,
        plan.releaseAt,
        samples[plan.kind].spec.speed,
      ),
      age: index,
    }));
    const arrivalPlan = [
      ...releasedPlans,
      { kind: 'yellow', releaseAt: null, gatePhase: null, phase: 2, age: 3 },
      { kind: 'blue', releaseAt: null, gatePhase: null, phase: 3, age: 4 },
      { kind: 'red', releaseAt: null, gatePhase: null, phase: 4.8, age: 5 },
    ];
    const stageAircraft = (plan, id) => {
      const pos = pointOnHold(plan.phase);
      const tangent = Math.atan2(
        hold.radiusY * Math.cos(plan.phase),
        -hold.radiusX * Math.sin(plan.phase),
      );
      return {
        ...samples[plan.kind],
        id,
        pos,
        heading: tangent,
        path: [{
          x: pos.x + Math.cos(tangent) * 100,
          y: pos.y + Math.sin(tangent) * 100,
        }],
        target: null,
        state: 'flying',
        age: plan.age,
        landProgress: 0,
        takeoffProgress: 0,
      };
    };
    const staged = arrivalPlan.map((plan, index) => stageAircraft(plan, 9801 + index));
    game.spawningEnabled = false;
    game.spawnWarnings.splice(0, game.spawnWarnings.length);
    game.aircraft.splice(0, game.aircraft.length, ...staged);
    game.drawing = null;
    game.hoveredId = null;
    game.hoveredRunwayId = null;
    window.__apStop = true;
    const stagedAt = game.elapsed;
    const holdState = new Map(staged.map((aircraft, index) => [
      aircraft.id,
      {
        aircraft,
        phase: arrivalPlan[index].phase,
        releaseAt: arrivalPlan[index].releaseAt,
        gatePhase: arrivalPlan[index].gatePhase,
        released: false,
      },
    ]));
    const nativeStep = game.step.bind(game);
    game.step = function stepWithHoldingPattern(dt) {
      const heroElapsed = this.elapsed - stagedAt;
      const heldNext = [];
      for (const entry of holdState.values()) {
        const aircraft = this.aircraft.find(candidate => candidate.id === entry.aircraft.id);
        if (!aircraft || entry.released) continue;
        if (entry.releaseAt !== null && heroElapsed + dt >= entry.releaseAt) {
          entry.released = true;
          const gate = pointOnHold(entry.gatePhase);
          const runway = runwayFor(aircraft.kind);
          window.__heroAudit.releaseEvents.push({
            id: aircraft.id,
            kind: aircraft.kind,
            targetColor: runway.color,
            time: heroElapsed + dt,
            gateDeviation: Math.hypot(aircraft.pos.x - gate.x, aircraft.pos.y - gate.y),
          });
          aircraft.target = runway;
          aircraft.path = [{ ...runway.approach }, { ...runway.end }];
          aircraft.heading = Math.atan2(
            runway.approach.y - aircraft.pos.y,
            runway.approach.x - aircraft.pos.x,
          );
          continue;
        }
        entry.phase += phaseSpeed(entry.phase, aircraft.spec.speed) * dt;
        const next = pointOnHold(entry.phase);
        const holdSpeed = Math.hypot(
          next.x - aircraft.pos.x,
          next.y - aircraft.pos.y,
        ) / dt;
        window.__heroAudit.holdSpeedMin = Math.min(
          window.__heroAudit.holdSpeedMin,
          holdSpeed,
        );
        window.__heroAudit.holdSpeedMax = Math.max(
          window.__heroAudit.holdSpeedMax,
          holdSpeed,
        );
        window.__heroAudit.holdSpeedErrorMax = Math.max(
          window.__heroAudit.holdSpeedErrorMax,
          Math.abs(holdSpeed - aircraft.spec.speed),
        );
        const tangent = Math.atan2(
          hold.radiusY * Math.cos(entry.phase),
          -hold.radiusX * Math.sin(entry.phase),
        );
        aircraft.path = [{
          x: aircraft.pos.x + Math.cos(tangent) * 100,
          y: aircraft.pos.y + Math.sin(tangent) * 100,
        }];
        heldNext.push({ aircraft, next, tangent });
      }
      const eventsBefore = this.events.length;
      const statesBefore = new Map(this.aircraft.map(aircraft => [
        aircraft.id,
        aircraft.state,
      ]));
      const result = nativeStep(dt);
      for (const event of this.events.slice(eventsBefore).filter(event => event.type === 'land')) {
        window.__heroAudit.landingEvents.push({
          time: this.elapsed - stagedAt,
          kind: event.color,
        });
      }
      for (const aircraft of this.aircraft) {
        if (statesBefore.get(aircraft.id) === 'landing' && aircraft.state === 'taxiing-in') {
          window.__heroAudit.rolloutEvents.push({
            id: aircraft.id,
            kind: aircraft.kind,
            time: this.elapsed - stagedAt,
          });
        }
      }
      for (const { aircraft, next, tangent } of heldNext) {
        if (!this.aircraft.includes(aircraft) || aircraft.state !== 'flying') continue;
        aircraft.pos = next;
        aircraft.heading = tangent;
        aircraft.path = [{
          x: next.x + Math.cos(tangent) * 100,
          y: next.y + Math.sin(tangent) * 100,
        }];
      }
      return result;
    };
    const focus = {
      ids: staged.map(aircraft => aircraft.id),
      staged: true,
      captureControl: 'deterministic racetrack hold with timed runway releases',
      runways: game.map.runways.map(runway => ({
        color: runway.color,
        approach: { ...runway.approach },
        end: { ...runway.end },
      })),
      hold,
      arrivalPlan,
      airborneCount: staged.length,
      positions: staged.map(aircraft => ({
        id: aircraft.id,
        kind: aircraft.kind,
        pos: { ...aircraft.pos },
      })),
    };

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
        if (/^(landing|departure|drag this plane)$/i.test(element.textContent?.trim() || '')) {
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
    const label = (text, x, y, color = '#f5edcf', align = 'left', size = 15) => {
      context.fillStyle = color;
      context.font = `700 ${size}px Hind, ui-sans-serif, sans-serif`;
      context.textAlign = align;
      context.fillText(text, Math.round(x), Math.round(y));
      context.textAlign = 'left';
    };
    const sceneryLayer = viewport.scene.getObjectByName('airport-scenery');
    const panelLabels = ['Landings', 'Departures', 'Pace', 'Duration'];
    window.__heroAudit = {
      holdingFrames: 0,
      landingFrames: 0,
      landingsCompleted: 0,
      returnedHomeFrames: 0,
      minPhysicalClearance: Number.POSITIVE_INFINITY,
      minPhysicalPair: null,
      holdSpeedMin: Number.POSITIVE_INFINITY,
      holdSpeedMax: 0,
      holdSpeedErrorMax: 0,
      releaseEvents: [],
      landingEvents: [],
      rolloutEvents: [],
      fullSceneryVisible: Boolean(sceneryLayer?.visible),
      performancePanelVisible: panelLabels.every(text =>
        [...document.querySelectorAll('body *')].some(element =>
          element.textContent?.trim() === text
          && getComputedStyle(element).visibility !== 'hidden'
          && getComputedStyle(element).display !== 'none')),
    };
    const startLandings = game.score.landings;
    window.__renderHero = time => {
      const aircraft = focus.ids
        .map(id => game.aircraft.find(candidate => candidate.id === id))
        .filter(Boolean);
      const flying = aircraft.filter(item => item.state === 'flying');
      const landing = aircraft.filter(item => item.state === 'landing');
      const completed = game.score.landings - startLandings;
      window.__heroAudit.landingsCompleted = completed;
      if (landing.length) window.__heroAudit.landingFrames++;
      else if (flying.length >= 2) window.__heroAudit.holdingFrames++;
      let focusAmount = 0;
      if (time >= .5 && time < 1.5) focusAmount = smooth((time - .5));
      else if (time >= 1.5 && time < captureSeconds - 2) focusAmount = 1;
      else if (time >= captureSeconds - 2) {
        focusAmount = 1 - smooth((time - (captureSeconds - 2)) / 2);
      }
      if (time >= captureSeconds - 1 && focusAmount < .55) {
        window.__heroAudit.returnedHomeFrames++;
      }
      if (aircraft.length) {
        const runwayMidpoint = focus.runways.reduce((sum, runway) => ({
          x: sum.x + (runway.approach.x + runway.end.x) / 2 / focus.runways.length,
          y: sum.y + (runway.approach.y + runway.end.y) / 2 / focus.runways.length,
        }), { x: 0, y: 0 });
        window.__heroLastFocus = {
          x: (aircraft.reduce((sum, item) => sum + item.pos.x, 0)
            + runwayMidpoint.x * 2) / (aircraft.length + 2),
          y: (aircraft.reduce((sum, item) => sum + item.pos.y, 0)
            + runwayMidpoint.y * 2) / (aircraft.length + 2),
        };
      }
      const midpoint = window.__heroLastFocus || home;
      viewport.cameraState = 'diagram';
      viewport.cameraTarget.set(
        home.x + (midpoint.x - home.x) * focusAmount,
        home.y + (midpoint.y - home.y) * focusAmount,
      );
      viewport.camera.zoom = home.zoom + (1.55 - home.zoom) * focusAmount;
      viewport.applyCamera();
      viewport.camera.updateProjectionMatrix();
      const focusOnly = time >= .5 && time < captureSeconds - 1 && aircraft.length;
      window.__heroRenderIds = focusOnly ? new Set(aircraft.map(item => item.id)) : null;
      airportRenderer.syncAircraft(
        focusOnly ? aircraft : game.aircraft,
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
      let phase = 'THREE RUNWAYS · SIX ARRIVALS';
      if (landing.length) {
        phase = `${[...new Set(landing.map(item => item.kind.toUpperCase()))].join(' + ')} ON FINAL`;
      } else if (completed) {
        phase = `${completed} LANDED · ${flying.length} STILL HOLDING`;
      } else if (time >= 1.5) phase = 'RACETRACK HOLD · ARRIVAL SEQUENCE';
      label(phase, 780, 79, '#43d7e5', 'left', 22);
    };
    window.__heroFocusIds = [...focus.ids];
    window.__captureAircraft = game.aircraft;
    window.__captureWarnings = game.spawnWarnings;
    game.aircraft = game.aircraft.filter(aircraft =>
      aircraft.state === 'flying' || aircraft.state === 'departing' || aircraft.state === 'landing');
    game.spawnWarnings = [];
    return { start: game.elapsed, focus };
  }, { captureSeconds });
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
      for (let step = 0; step < count; step++) {
        window.__game.step(1 / 60);
        const focus = window.__heroFocusIds
          .map(id => game.aircraft.find(aircraft => aircraft.id === id))
          .filter(aircraft => aircraft?.state === 'flying'
            || aircraft?.state === 'departing'
            || aircraft?.state === 'landing');
        for (let firstIndex = 0; firstIndex < focus.length; firstIndex++) {
          for (let secondIndex = firstIndex + 1; secondIndex < focus.length; secondIndex++) {
            const first = focus[firstIndex];
            const second = focus[secondIndex];
            const clearance = Math.hypot(
              second.pos.x - first.pos.x,
              second.pos.y - first.pos.y,
            ) - first.spec.radius - second.spec.radius;
            if (clearance < window.__heroAudit.minPhysicalClearance) {
              window.__heroAudit.minPhysicalClearance = clearance;
              window.__heroAudit.minPhysicalPair = [first.id, second.id];
            }
          }
        }
      }
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
  if (finalState.heroAudit.minPhysicalClearance < 2) {
    throw new Error(`Hero audit failed: closest pass ${JSON.stringify({
      clearance: finalState.heroAudit.minPhysicalClearance,
      pair: finalState.heroAudit.minPhysicalPair,
    })}.`);
  }
  if (captureSeconds >= 12) {
    const releaseEvents = finalState.heroAudit.releaseEvents;
    const landingEvents = finalState.heroAudit.landingEvents;
    const rolloutEvents = finalState.heroAudit.rolloutEvents;
    const maxGateDeviation = Math.max(...releaseEvents.map(event => event.gateDeviation));
    const colors = events => [...new Set(events.map(event => event.kind))].sort().join(',');
    const rolloutDurations = rolloutEvents.map(rollout => {
      const landing = landingEvents.find(event => event.kind === rollout.kind);
      return landing ? rollout.time - landing.time : 0;
    });
    if (finalState.heroAudit.holdingFrames < outputFps * 2
        || finalState.heroAudit.landingFrames < outputFps * 6
        || finalState.heroAudit.landingsCompleted !== 3
        || finalState.airborne !== 3
        || releaseEvents.length !== 3
        || landingEvents.length !== 3
        || rolloutEvents.length !== 3
        || colors(releaseEvents) !== 'blue,red,yellow'
        || colors(landingEvents) !== 'blue,red,yellow'
        || colors(rolloutEvents) !== 'blue,red,yellow'
        || releaseEvents.some(event => event.kind !== event.targetColor)
        || maxGateDeviation > .5
        || finalState.heroAudit.holdSpeedErrorMax > .02
        || rolloutDurations.some(duration => duration < 6 || duration > 10)) {
      throw new Error(`Hero audit failed: arrival sequence ${JSON.stringify(finalState.heroAudit)}.`);
    }
    if (finalState.heroAudit.returnedHomeFrames < outputFps / 2) {
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
