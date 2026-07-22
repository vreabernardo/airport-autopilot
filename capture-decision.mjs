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
const framesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'airport-decision-'));
const solverSource = fs.readFileSync(path.join(projectDir, 'autopilot.js'), 'utf8');

fs.mkdirSync(outputDir, { recursive: true });
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
    layer.id = 'solver-decision-layer';
    layer.style.cssText = 'position:fixed;inset:0;z-index:9000;pointer-events:none;width:100%;height:100%';
    document.body.append(layer);
    const legend = document.createElement('div');
    legend.id = 'solver-legend';
    legend.innerHTML = '<b>THE SEARCH FIELD</b><span><i></i> selected heading</span><span><i></i> rejected conflict</span><small>48 headings · 8 second horizon · 4 coordination passes</small>';
    const style = document.createElement('style');
    style.textContent = `
      #solver-legend{position:fixed;right:24px;top:24px;z-index:9001;display:grid;gap:8px;padding:18px 20px;
        color:#f4f7f8;background:rgba(8,13,20,.9);border:1px solid rgba(255,255,255,.15);
        font:500 11px/1.2 ui-monospace,monospace;letter-spacing:.08em}
      #solver-legend b{margin-bottom:4px;font-size:13px;color:white}
      #solver-legend span{color:#9aa8b2} #solver-legend i{display:inline-block;width:24px;height:2px;margin:0 9px 3px 0;background:#65e6a7}
      #solver-legend span:nth-of-type(2) i{background:#ef6671} #solver-legend small{margin-top:4px;color:#687782}
    `;
    document.head.append(style);
    document.body.append(legend);

    const planeSpecs = {
      yellow: { speed: 7, radius: 2.4 },
      blue: { speed: 8, radius: 2.6 },
      red: { speed: 9, radius: 2.8 },
    };
    const offsets = Array.from({ length: 48 }, (_, index) =>
      index === 0 ? 0 : (index % 2 ? 1 : -1) * Math.ceil(index / 2) * 2 * Math.PI / 48);
    const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
    const screen = point => window.__airportViewport.worldToScreen(point);

    window.__drawDecisionField = () => {
      const sim = window.__game;
      const flying = sim.aircraft.filter(aircraft => aircraft.state === 'flying');
      if (!flying.length) return;
      let focus = flying.find(aircraft => aircraft.id === window.__focusAircraftId);
      if (!focus) {
        focus = flying.reduce((best, aircraft) => {
          const nearest = Math.min(...sim.aircraft.filter(other => other !== aircraft)
            .map(other => Math.hypot(other.pos.x - aircraft.pos.x, other.pos.y - aircraft.pos.y)));
          return !best || nearest < best.nearest ? { aircraft, nearest } : best;
        }, null).aircraft;
        window.__focusAircraftId = focus.id;
      }

      const runway = sim.map.runways.find(item => item.color === focus.kind);
      const desired = angleTo(focus.pos, runway.approach);
      const airborne = sim.aircraft.filter(aircraft => aircraft.state === 'flying' || aircraft.state === 'departing');
      const velocityOf = aircraft => {
        const heading = aircraft.path[0] ? angleTo(aircraft.pos, aircraft.path[0]) : aircraft.heading;
        const speed = aircraft.state === 'departing' ? 10.5 : aircraft.spec.speed;
        return { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed };
      };
      const candidates = offsets.map(offset => {
        const angle = desired + offset;
        const velocity = { x: Math.cos(angle) * focus.spec.speed, y: Math.sin(angle) * focus.spec.speed };
        let clearance = Infinity;
        for (const other of airborne) {
          if (other === focus) continue;
          const otherVelocity = velocityOf(other);
          const px = other.pos.x - focus.pos.x, py = other.pos.y - focus.pos.y;
          const vx = otherVelocity.x - velocity.x, vy = otherVelocity.y - velocity.y;
          const vv = vx * vx + vy * vy;
          const time = vv < 1e-8 ? 0 : Math.max(0, Math.min(8, -(px * vx + py * vy) / vv));
          clearance = Math.min(clearance, Math.hypot(px + vx * time, py + vy * time) - focus.spec.radius - other.spec.radius);
        }
        return { angle, velocity, clearance, selected: Math.abs(offset - (focus._solution?.offset ?? 99)) < 1e-5 };
      });

      const ratio = devicePixelRatio || 1;
      layer.width = innerWidth * ratio;
      layer.height = innerHeight * ratio;
      const context = layer.getContext('2d');
      context.scale(ratio, ratio);
      const origin = screen(focus.pos);
      for (const candidate of candidates) {
        const end = screen({ x: focus.pos.x + candidate.velocity.x * 2.6, y: focus.pos.y + candidate.velocity.y * 2.6 });
        context.beginPath(); context.moveTo(origin.x, origin.y); context.lineTo(end.x, end.y);
        context.strokeStyle = candidate.selected ? '#65e6a7' : candidate.clearance < 2 ? 'rgba(239,102,113,.55)' : 'rgba(245,247,248,.2)';
        context.lineWidth = candidate.selected ? 4 : candidate.clearance < 2 ? 2 : 1;
        context.stroke();
      }
      context.beginPath(); context.arc(origin.x, origin.y, 25, 0, Math.PI * 2);
      context.strokeStyle = '#65e6a7'; context.lineWidth = 2; context.setLineDash([4, 5]); context.stroke(); context.setLineDash([]);
      context.fillStyle = 'rgba(8,13,20,.9)'; context.fillRect(origin.x + 31, origin.y - 17, 126, 31);
      context.fillStyle = '#f4f7f8'; context.font = '600 11px ui-monospace,monospace';
      context.fillText(`PLANE ${focus.id} · ${focus.kind.toUpperCase()}`, origin.x + 41, origin.y + 3);
    };
  });

  while (true) {
    const state = await page.evaluate(() => {
      const game = window.__game;
      const limit = Math.min(600, game.elapsed + 30);
      while (game.phase === 'playing' && game.elapsed < limit) game.step(1 / 60);
      return window.__apStatus();
    });
    if (state.phase !== 'playing') throw new Error(`Game over during warm-up at ${state.elapsed.toFixed(1)} seconds.`);
    if (state.elapsed >= 600) break;
  }

  for (let frame = 0; frame < 90; frame++) {
    await page.evaluate(() => {
      const game = window.__game;
      const limit = game.elapsed + 0.5;
      while (game.phase === 'playing' && game.elapsed < limit) game.step(1 / 60);
      window.__drawDecisionField();
    });
    await page.waitForTimeout(20);
    await page.screenshot({ path: path.join(framesDir, `frame-${String(frame).padStart(3, '0')}.png`) });
  }

  await execute(process.env.FFMPEG || 'ffmpeg', [
    '-y', '-framerate', '15', '-i', path.join(framesDir, 'frame-%03d.png'),
    '-vf', 'fps=15,scale=1200:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer',
    '-loop', '0', path.join(outputDir, 'decision-field.gif'),
  ]);
} finally {
  await browser.close();
  fs.rmSync(framesDir, { recursive: true, force: true });
}
