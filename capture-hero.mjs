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
const outputDir = path.join(projectDir, 'docs');
const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-hero-'));
const targetSeconds = Number(process.env.TARGET_HOURS || 0.5) * 60 * 60;
const captureSeconds = Number(process.env.CAPTURE_SECONDS || 180);
const seedValue = Number(process.env.SEED || 101) >>> 0;
const outputName = process.env.HERO_OUTPUT || 'airspace-after-thirty-minutes-live.gif';
const outputFps = Math.max(1, Math.min(30, Number(process.env.HERO_FPS) || 10));
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
      .replace(/Y\s*=\s*new se\(d\)/, 'Y=window.__airportViewport=new se(d)');
    await route.fulfill({ response, body: exposed });
  });
  await page.addInitScript(solverSource);
  await page.goto('https://airport.apunen.com/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(() => window.__apStatus?.().phase === 'playing', undefined, { timeout: 90_000 });
  await page.getByRole('button', { name: 'Hide scoreboard' }).click();

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
  const captureStart = await page.evaluate(() => {
    const game = window.__game;
    game.update = () => {};
    window.__captureAircraft = game.aircraft;
    game.aircraft = game.aircraft.filter(aircraft =>
      aircraft.state === 'flying' || aircraft.state === 'departing' || aircraft.state === 'landing');
    return game.elapsed;
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
      for (let step = 0; step < count; step++) window.__game.step(1 / 60);
      window.__captureAircraft = game.aircraft;
      game.aircraft = game.aircraft.filter(aircraft =>
        aircraft.state === 'flying' || aircraft.state === 'departing' || aircraft.state === 'landing');
    }, steps);
    await page.waitForTimeout(16);
    await page.screenshot({
      path: path.join(framesDir, `frame-${String(index).padStart(4, '0')}.jpg`),
      type: 'jpeg',
      quality: 88,
    });
  }

  const finalState = await page.evaluate(() => {
    window.__game.aircraft = window.__captureAircraft;
    return window.__apStatus();
  });
  if (finalState.phase !== 'playing') throw new Error(`Game over at ${finalState.elapsed.toFixed(1)} seconds.`);
  const simulatedCaptureSeconds = finalState.elapsed - captureStart;
  if (Math.abs(simulatedCaptureSeconds - captureSeconds) > 1 / 30) {
    throw new Error(`Expected ${captureSeconds}s of simulation, captured ${simulatedCaptureSeconds.toFixed(3)}s.`);
  }
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  await execute(ffmpeg, [
    '-y', '-framerate', String(outputFps), '-i', path.join(framesDir, 'frame-%04d.jpg'),
    '-vf', 'scale=1200:-1:flags=lanczos,hqdn3d=8:6:24:18,split[s0][s1];[s0]palettegen=max_colors=64:stats_mode=diff[p];[s1][p]paletteuse=dither=none:diff_mode=rectangle',
    '-loop', '0', path.join(outputDir, outputName),
  ]);
  fs.writeFileSync(path.join(outputDir, `${path.basename(outputName, '.gif')}.json`), `${JSON.stringify({ seed: seedValue, capturedFrames, ...finalState }, null, 2)}\n`);
  console.log(`Captured ${finalState.elapsed.toFixed(1)} seconds with ${finalState.landings + finalState.departures} operations.`);
} finally {
  await browser.close();
  fs.rmSync(framesDir, { recursive: true, force: true });
}
