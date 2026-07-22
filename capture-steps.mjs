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
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-steps-'));
const coordinationDir = path.join(temporaryDir, 'coordination');
const shieldDir = path.join(temporaryDir, 'shield');
const solverSource = fs.readFileSync(path.join(projectDir, 'autopilot.js'), 'utf8');
const captureOnly = process.env.CAPTURE_ONLY || 'all';
fs.mkdirSync(coordinationDir, { recursive: true });
fs.mkdirSync(shieldDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

async function renderGif(input, output) {
  await execute(process.env.FFMPEG || 'ffmpeg', [
    '-y', '-framerate', '15', '-i', path.join(input, 'frame-%03d.png'),
    '-vf', 'fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer',
    '-loop', '0', path.join(outputDir, output),
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
      .replace(/Y\s*=\s*new se\(d\)/, 'Y=window.__airportViewport=new se(d)');
    if (exposed === source) throw new Error('Game instrumentation points were not found.');
    await route.fulfill({ response, body: exposed });
  });
  await page.addInitScript(() => { window.__apDebug = true; });
  await page.addInitScript(solverSource);
  await page.goto('https://airport.apunen.com/', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForFunction(
    () => window.__apStatus?.().phase === 'playing' && window.__airportViewport,
    undefined,
    { timeout: 90_000 },
  );
  await page.getByRole('button', { name: 'Hide scoreboard' }).click();

  await page.evaluate(() => {
    const layer = document.createElement('canvas');
    layer.id = 'solver-step-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:9000;pointer-events:none;width:100%;height:100%';
    document.body.append(layer);
    const panel = document.createElement('div');
    panel.id = 'solver-step-panel';
    const style = document.createElement('style');
    style.textContent = `
      #solver-step-panel{position:fixed;right:24px;top:24px;z-index:9001;width:350px;padding:19px 21px;
        color:#f4f7f8;background:rgba(8,13,20,.92);border:1px solid rgba(255,255,255,.15);
        font:500 11px/1.3 ui-monospace,monospace;letter-spacing:.08em}
      #solver-step-panel b{display:block;margin-bottom:13px;font-size:13px;color:white}
      #solver-step-panel .passes{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
      #solver-step-panel .pass{padding:7px 0;text-align:center;color:#71808b;border:1px solid #28343d}
      #solver-step-panel .pass.active{color:#081016;background:#65e6a7;border-color:#65e6a7}
      #solver-step-panel p{margin:13px 0 0;color:#74838f;letter-spacing:.03em}
    `;
    document.head.append(style);
    document.body.append(panel);
    const screen = point => window.__airportViewport.worldToScreen(point);
    const prepare = () => {
      const ratio = devicePixelRatio || 1;
      layer.width = innerWidth * ratio;
      layer.height = innerHeight * ratio;
      const context = layer.getContext('2d');
      context.scale(ratio, ratio);
      context.lineCap = 'round';
      return context;
    };
    const line = (context, from, to, color, width = 2, dash = []) => {
      context.beginPath(); context.setLineDash(dash); context.moveTo(from.x, from.y); context.lineTo(to.x, to.y);
      context.strokeStyle = color; context.lineWidth = width; context.stroke(); context.setLineDash([]);
    };

    window.__drawCoordination = activePass => {
      const sim = window.__game;
      const flying = sim.aircraft.filter(aircraft => aircraft.state === 'flying' && aircraft._passSolutions?.length === 4);
      if (!flying.length) return;
      let focus = flying.find(aircraft => aircraft.id === window.__coordinationFocusId);
      if (!focus) {
        focus = flying.reduce((best, aircraft) => {
          const first = aircraft._passSolutions[0].angle;
          const last = aircraft._passSolutions[3].angle;
          const change = Math.abs(Math.atan2(Math.sin(last - first), Math.cos(last - first)));
          return !best || change > best.change ? { aircraft, change } : best;
        }, null).aircraft;
        window.__coordinationFocusId = focus.id;
      }
      const context = prepare();
      const origin = screen(focus.pos);
      const colors = ['#8b9aa5', '#7ca9ff', '#f1c84a', '#65e6a7'];
      focus._passSolutions.forEach((solution, index) => {
        const end = screen({ x: focus.pos.x + solution.velocity.x * 2.7, y: focus.pos.y + solution.velocity.y * 2.7 });
        line(context, origin, end, index === activePass ? colors[index] : `${colors[index]}55`, index === activePass ? 5 : 2);
        context.beginPath(); context.arc(end.x, end.y, index === activePass ? 6 : 3, 0, Math.PI * 2);
        context.fillStyle = colors[index]; context.fill();
      });
      context.beginPath(); context.arc(origin.x, origin.y, 26, 0, Math.PI * 2);
      context.strokeStyle = colors[activePass]; context.lineWidth = 3; context.stroke();
      panel.innerHTML = `<b>SEQUENTIAL COORDINATION</b><div class="passes">${[0, 1, 2, 3]
        .map(index => `<span class="pass ${index === activePass ? 'active' : ''}">PASS ${index + 1}</span>`).join('')}</div>
        <p>Each pass consumes the velocities selected by the previous pass. The field converges together.</p>`;
    };

    window.__drawShield = progress => {
      const event = window.__apLastShield;
      if (!event?.threat) return;
      const context = prepare();
      const origin = screen(event.aircraft.pos);
      const threat = screen(event.threat.pos);
      const beforeEnd = screen({ x: event.aircraft.pos.x + event.before.x * 1.8, y: event.aircraft.pos.y + event.before.y * 1.8 });
      const afterEnd = screen({ x: event.aircraft.pos.x + event.after.x * 1.8, y: event.aircraft.pos.y + event.after.y * 1.8 });
      const beforePhase = progress < 0.5;
      for (let index = 0; index < 64; index++) {
        const angle = 2 * Math.PI * index / 64;
        const end = screen({
          x: event.aircraft.pos.x + Math.cos(angle) * 10,
          y: event.aircraft.pos.y + Math.sin(angle) * 10,
        });
        line(context, origin, end, 'rgba(245,247,248,.10)', 1);
      }
      line(context, origin, beforeEnd, beforePhase ? '#ef6671' : 'rgba(239,102,113,.25)', beforePhase ? 5 : 2);
      line(context, origin, afterEnd, beforePhase ? 'rgba(101,230,167,.25)' : '#65e6a7', beforePhase ? 2 : 5);
      line(context, origin, threat, 'rgba(239,102,113,.75)', 2, [6, 6]);
      for (const [point, radius, color] of [[origin, 30, '#ef6671'], [threat, 30, '#ef6671']]) {
        context.beginPath(); context.arc(point.x, point.y, radius + Math.sin(progress * Math.PI * 4) * 3, 0, Math.PI * 2);
        context.strokeStyle = color; context.lineWidth = 2; context.stroke();
      }
      panel.innerHTML = `<b>LAST-FRAME SAFETY SHIELD</b><div class="passes">
        <span class="pass ${beforePhase ? 'active' : ''}">PREDICT</span>
        <span class="pass ${beforePhase ? '' : 'active'}">CORRECT</span>
      </div><p>At 1/60 s, projected clearance is ${event.clearanceBefore.toFixed(3)}. The shield searches 64 headings and replaces only the unsafe vector.</p>`;
    };
  });

  while (true) {
    const state = await page.evaluate(() => {
      const game = window.__game;
      const limit = Math.min(180, game.elapsed + 30);
      while (game.phase === 'playing' && game.elapsed < limit) game.step(1 / 60);
      return window.__apStatus();
    });
    if (state.phase !== 'playing') throw new Error(`Game over during warm-up at ${state.elapsed.toFixed(1)} seconds.`);
    if (state.elapsed >= 180) break;
  }

  if (captureOnly !== 'shield') {
    for (let frame = 0; frame < 90; frame++) {
      await page.evaluate(activePass => {
        const game = window.__game;
        const limit = game.elapsed + 1 / 15;
        while (game.phase === 'playing' && game.elapsed < limit) game.step(1 / 60);
        window.__drawCoordination(activePass);
      }, Math.floor(frame / 15) % 4);
      await page.screenshot({ path: path.join(coordinationDir, `frame-${String(frame).padStart(3, '0')}.png`), timeout: 60_000 });
    }
    await renderGif(coordinationDir, 'coordination-passes.gif');
  }

  if (captureOnly !== 'coordination') {
    await page.evaluate(() => { window.__apLastShield = null; });
    for (let attempt = 0; attempt < 120; attempt++) {
      const found = await page.evaluate(() => {
        const game = window.__game;
        const limit = game.elapsed + 0.5;
        while (game.phase === 'playing' && game.elapsed < limit && !window.__apLastShield) game.step(1 / 60);
        return Boolean(window.__apLastShield);
      });
      if (found) break;
      if (attempt === 119) throw new Error('No safety-shield event occurred during capture window.');
    }
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '[data-phase="paused"]{display:none!important}';
      document.head.append(style);
      window.__game.togglePause();
    });
    for (let frame = 0; frame < 90; frame++) {
      await page.evaluate(progress => window.__drawShield(progress), frame / 89);
      await page.screenshot({ path: path.join(shieldDir, `frame-${String(frame).padStart(3, '0')}.png`), timeout: 60_000 });
    }
    await renderGif(shieldDir, 'safety-shield.gif');
  }
} finally {
  await browser.close();
  fs.rmSync(temporaryDir, { recursive: true, force: true });
}
