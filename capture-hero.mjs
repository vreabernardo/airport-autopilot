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
const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-hero-'));
const targetSeconds = Number(process.env.TARGET_HOURS || 2) * 60 * 60;
const captureSeconds = Number(process.env.CAPTURE_SECONDS || 60);
const seedValue = Number(process.env.SEED || 101) >>> 0;
const outputName = process.env.HERO_OUTPUT || 'airspace-after-two-hours-live.gif';
const outputFps = Math.max(1, Math.min(15, Number(process.env.HERO_FPS) || 5));
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

  const cdp = await page.context().newCDPSession(page);
  let capturedFrames = 0;
  let writes = Promise.resolve();
  cdp.on('Page.screencastFrame', event => {
    const index = capturedFrames++;
    writes = writes.then(() => fs.promises.writeFile(
      path.join(framesDir, `frame-${String(index).padStart(4, '0')}.jpg`),
      Buffer.from(event.data, 'base64'),
    ));
    void cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId });
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 88,
    maxWidth: 1200,
    maxHeight: 675,
    everyNthFrame: 4,
  });
  await page.waitForTimeout(captureSeconds * 1000);
  await cdp.send('Page.stopScreencast');
  await writes;
  if (capturedFrames < captureSeconds * 10) {
    throw new Error(`Screencast produced only ${capturedFrames} frames.`);
  }

  const finalState = await page.evaluate(() => window.__apStatus());
  if (finalState.phase !== 'playing') throw new Error(`Game over at ${finalState.elapsed.toFixed(1)} seconds.`);
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  // CDP emits frames at the renderer's actual cadence, which can vary between
  // machines. Use the measured rate so the encoded minute remains one minute.
  const sourceFps = (capturedFrames / captureSeconds).toFixed(6);
  await execute(ffmpeg, [
    '-y', '-framerate', sourceFps, '-i', path.join(framesDir, 'frame-%04d.jpg'),
    '-vf', `fps=${outputFps},scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer`,
    '-loop', '0', path.join(outputDir, outputName),
  ]);
  fs.writeFileSync(path.join(outputDir, `${path.basename(outputName, '.gif')}.json`), `${JSON.stringify({ seed: seedValue, capturedFrames, ...finalState }, null, 2)}\n`);
  console.log(`Captured ${finalState.elapsed.toFixed(1)} seconds with ${finalState.landings + finalState.departures} operations.`);
} finally {
  await browser.close();
  fs.rmSync(framesDir, { recursive: true, force: true });
}
