import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const gameUrl = process.env.GAME_URL || 'https://airport.apunen.com/';
const solverPath = path.resolve(process.env.SOLVER_PATH || path.join(projectDir, 'autopilot.js'));
const profileDir = path.resolve(process.env.PROFILE_DIR || path.join(projectDir, 'browser-profile'));
const viewport = {
  width: Number.parseInt(process.env.VIEWPORT_WIDTH || '1280', 10),
  height: Number.parseInt(process.env.VIEWPORT_HEIGHT || '800', 10),
};

if (!fs.existsSync(solverPath)) {
  throw new Error(`Solver not found: ${solverPath}`);
}

const solverSource = fs.readFileSync(solverPath, 'utf8');
let shuttingDown = false;
let context;

const timestamp = () => new Date().toISOString();
const log = (...parts) => console.log(`[${timestamp()}]`, ...parts);

async function patchGameBundle(route) {
  try {
    const response = await route.fetch();
    let body = await response.text();
    const needle = 'X=new ot,';

    if (!body.includes(needle)) {
      throw new Error('The production bundle changed: game-model patch point was not found.');
    }

    body = body.replace(needle, 'X=window.__game=new ot,');
    await route.fulfill({ response, body });
    log('Production game model exposed to the bundled solver.');
  } catch (error) {
    log('Bundle patch failed:', error instanceof Error ? error.message : String(error));
    await route.abort('failed');
  }
}

async function status(page) {
  return page.evaluate(() => window.__apStatus?.() ?? { ok: false });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`${signal} received; closing the runner.`);
  await context?.close().catch(() => {});
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

context = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--mute-audio',
  ],
});

context.on('close', () => {
  log('Browser closed. Runner exiting.');
  process.exit(0);
});

await context.route('**/_app/immutable/nodes/2.*.js', patchGameBundle);
await context.addInitScript(solverSource);

const existingPages = context.pages();
const page = existingPages[0] ?? await context.newPage();
page.on('pageerror', error => log('PAGE ERROR:', error.message));
page.on('console', message => {
  if (message.type() === 'error') log('CONSOLE ERROR:', message.text());
});

log(`Launching ${gameUrl}`);
log(`Solver: ${solverPath}`);
log(`Profile: ${profileDir}`);
await page.goto(gameUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });

await page.waitForFunction(
  () => window.__apStatus?.().ok === true && window.__apStatus?.().phase === 'playing',
  undefined,
  { timeout: 90_000 },
);

log('Solver is active. Leave this terminal open; press Ctrl+C to stop.');

let gameOverReported = false;
while (!shuttingDown) {
  await page.waitForTimeout(15_000);
  const current = await status(page).catch(error => ({ ok: false, error: String(error) }));

  if (!current.ok) {
    log('Status unavailable:', JSON.stringify(current));
    continue;
  }

  const operations = current.landings + current.departures;
  const pace = current.elapsed > 0 ? operations * 60 / current.elapsed : 0;
  log(
    `t=${current.elapsed.toFixed(0)}s`,
    `L=${current.landings}`,
    `D=${current.departures}`,
    `pace=${pace.toFixed(2)}/min`,
    `air=${current.airborne}`,
    `warnings=${current.warnings}`,
    `phase=${current.phase}`,
  );

  if (current.phase === 'gameover' && !gameOverReported) {
    gameOverReported = true;
    log('GAME OVER. The browser will remain open for inspection; press Ctrl+C when done.');
  }
}
