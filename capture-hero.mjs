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
const targetSeconds = process.env.TARGET_HOURS
  ? Number(process.env.TARGET_HOURS) * 60 * 60
  : Number(process.env.TARGET_MINUTES || 15) * 60;
const captureSeconds = Math.min(targetSeconds, Number(process.env.CAPTURE_MINUTES || 2) * 60);
const seedValue = Number(process.env.SEED || 101) >>> 0;
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

  await page.evaluate(target => {
    window.__heroTargetSeconds = target;
    const panel = document.createElement('div');
    panel.id = 'hero-control-panel';
    panel.innerHTML = `
      <div class="hero-kicker"><span></span> AUTONOMOUS CONTROL · 60 HZ</div>
      <div class="hero-title">Holding the entire sky.</div>
      <div class="hero-stats">
        <div><b id="hero-clock">00:00:00</b><small>CONTROLLED</small></div>
        <div><b id="hero-routed">0</b><small>ROUTED</small></div>
        <div><b id="hero-airborne">0</b><small>IN THE AIR</small></div>
      </div>
      <div class="hero-progress"><i></i></div>
      <div class="hero-foot">48 candidate headings · predictive separation · last-frame shield</div>`;
    const style = document.createElement('style');
    style.textContent = `
      #hero-control-panel { position:fixed; z-index:10000; top:24px; left:24px; width:420px;
        padding:22px 24px 20px; color:#f5f7f8; background:rgba(8,13,20,.92);
        border:1px solid rgba(255,255,255,.14); font-family:Inter,-apple-system,sans-serif;
        box-shadow:0 18px 60px rgba(0,0,0,.22); backdrop-filter:blur(10px) }
      .hero-kicker { color:#8fa0ae; font:600 11px/1.2 ui-monospace,monospace; letter-spacing:.12em }
      .hero-kicker span { display:inline-block; width:7px; height:7px; margin-right:7px;
        border-radius:50%; background:#65e6a7; box-shadow:0 0 14px #65e6a7 }
      .hero-title { margin:11px 0 18px; font-size:28px; font-weight:500; letter-spacing:-.03em }
      .hero-stats { display:grid; grid-template-columns:1.35fr 1fr 1fr; gap:12px }
      .hero-stats b { display:block; font:500 20px/1.1 ui-monospace,monospace }
      .hero-stats small { display:block; margin-top:5px; color:#778794; font:600 9px/1 ui-monospace,monospace; letter-spacing:.12em }
      .hero-progress { height:2px; margin-top:19px; overflow:hidden; background:rgba(255,255,255,.1) }
      .hero-progress i { display:block; width:0; height:100%; background:#65e6a7 }
      .hero-foot { margin-top:11px; color:#778794; font:500 10px/1.2 ui-monospace,monospace }
    `;
    document.head.append(style);
    document.body.append(panel);
    window.__updateHero = () => {
      const state = window.__apStatus();
      const hours = Math.floor(state.elapsed / 3600).toString().padStart(2, '0');
      const minutes = Math.floor(state.elapsed % 3600 / 60).toString().padStart(2, '0');
      const seconds = Math.floor(state.elapsed % 60).toString().padStart(2, '0');
      document.querySelector('#hero-clock').textContent = `${hours}:${minutes}:${seconds}`;
      document.querySelector('#hero-routed').textContent = (state.landings + state.departures).toLocaleString('en-US');
      document.querySelector('#hero-airborne').textContent = state.airborne;
      document.querySelector('.hero-progress i').style.width = `${Math.min(100, state.elapsed / window.__heroTargetSeconds * 100)}%`;
      return state;
    };
  }, targetSeconds);

  const fastForwardUntil = targetSeconds - captureSeconds;
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

  const frameCount = 90;
  for (let frame = 0; frame < frameCount; frame++) {
    const nextElapsed = fastForwardUntil + captureSeconds * (frame + 1) / frameCount;
    const state = await page.evaluate(limit => {
      const game = window.__game;
      while (game.phase === 'playing' && game.elapsed < limit) game.step(1 / 60);
      return window.__updateHero();
    }, nextElapsed);
    if (state.phase !== 'playing') throw new Error(`Game over at ${state.elapsed.toFixed(1)} seconds.`);
    await page.waitForTimeout(20);
    await page.screenshot({ path: path.join(framesDir, `frame-${String(frame).padStart(3, '0')}.png`), timeout: 0 });
  }

  const finalState = await page.evaluate(() => window.__apStatus());
  const ffmpeg = process.env.FFMPEG || 'ffmpeg';
  await execute(ffmpeg, [
    '-y', '-framerate', '15', '-i', path.join(framesDir, 'frame-%03d.png'),
    '-vf', 'fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer',
    '-loop', '0', path.join(outputDir, 'control-room.gif'),
  ]);
  fs.writeFileSync(path.join(outputDir, 'control-room.json'), `${JSON.stringify({ seed: seedValue, ...finalState }, null, 2)}\n`);
  console.log(`Captured ${finalState.elapsed.toFixed(1)} seconds with ${finalState.landings + finalState.departures} operations.`);
} finally {
  await browser.close();
  fs.rmSync(framesDir, { recursive: true, force: true });
}
