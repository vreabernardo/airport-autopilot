import crypto from 'node:crypto';
import fs from 'node:fs';
import { chromium } from 'playwright';

const controllerUrl = new URL('../autopilot.js', import.meta.url);
const modelUrl = new URL('./fixed/site/_app/immutable/nodes/2.Busf_-R-.js', import.meta.url);
const assetsUrl = new URL('./fixed/site/_app/immutable/chunks/CurhFkDx.js', import.meta.url);
const controllerSource = fs.readFileSync(controllerUrl, 'utf8');
const sha256 = url => crypto.createHash('sha256').update(fs.readFileSync(url)).digest('hex');

const seeds = [101, 102, 103, 104, 105];
const variants = [
  { name: 'direct_only', options: { directOnly: true, shieldPasses: 0 } },
  { name: 'one_planning_sweep', options: { planningPasses: 1 } },
  { name: 'two_sweeps_no_shield', options: { shieldPasses: 0 } },
  { name: 'final', options: {} },
];
const warmupSeconds = 300;
const durationSeconds = 1200;
const bounds = {
  minX: -39.87250908482147,
  maxX: 39.87250908482153,
  minY: -41.776872340890876,
  maxY: 41.77687234089083,
  corners: [
    { x: -39.87250908482147, y: 14.340904712088388 },
    { x: -7.083181918691736, y: 41.77687234089083 },
    { x: 39.87250908482153, y: -14.340904712088431 },
    { x: 7.083181918691778, y: -41.776872340890876 },
  ],
};

const browser = await chromium.launch({
  headless: true,
  args: ['--allow-file-access-from-files'],
});
try {
  const page = await browser.newPage({ viewport: { width: 138, height: 138 } });
  await page.addInitScript(controllerSource);
  await page.goto(new URL('./fixed/eval.html', import.meta.url).href);
  const rows = await page.evaluate(async ({ seeds, variants, warmupSeconds, durationSeconds, bounds }) => {
    const base = location.href.slice(0, -'fixed/eval.html'.length);
    const { Sim } = await import(`${base}fixed/site/_app/immutable/nodes/2.Busf_-R-.js`);
    const { b: map } = await import(`${base}fixed/site/_app/immutable/chunks/CurhFkDx.js`);
    const control = window.__airportControlDirect;
    const seeded = initial => {
      let seed = initial;
      return () => {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
      };
    };

    const output = [];
    for (const variant of variants) {
      for (const seed of seeds) {
        Math.random = seeded(seed);
        window.__apOptions = variant.options;
        window.__apStats = { frames: 0, shieldInterventions: 0 };
        const sim = new Sim();
        sim.reset(map, bounds);
        const spawnDistance = new Map();
        const previousState = new Map();
        const inflation = [];
        let afterWarmup = null;
        while (sim.phase === 'playing' && sim.elapsed < durationSeconds) {
          for (const aircraft of sim.aircraft) previousState.set(aircraft.id, aircraft.state);
          control(sim);
          sim.step(1 / 60);
          for (const aircraft of sim.aircraft) {
            const runway = map.runways.find(item => item.color === aircraft.kind);
            if (!spawnDistance.has(aircraft.id)) {
              spawnDistance.set(aircraft.id, Math.hypot(
                aircraft.pos.x - runway.approach.x,
                aircraft.pos.y - runway.approach.y,
              ));
            }
            if (previousState.get(aircraft.id) === 'flying' && aircraft.state === 'landing') {
              inflation.push(aircraft.age * aircraft.spec.speed / spawnDistance.get(aircraft.id));
            }
          }
          if (!afterWarmup && sim.elapsed >= warmupSeconds) afterWarmup = { ...sim.score };
        }
        const survived = sim.phase === 'playing' && sim.elapsed >= durationSeconds;
        const measuredMinutes = Math.max(1 / 60, (sim.elapsed - warmupSeconds) / 60);
        const operationsAfterWarmup = afterWarmup
          ? sim.score.landings + sim.score.departures - afterWarmup.landings - afterWarmup.departures
          : 0;
        output.push({
          variant: variant.name,
          seed,
          survived,
          crashAtSeconds: survived ? null : sim.elapsed,
          landings: sim.score.landings,
          departures: sim.score.departures,
          operationsAfterWarmup,
          steadyStateOperationsPerMinute: operationsAfterWarmup / measuredMinutes,
          meanPathInflation: inflation.reduce((sum, value) => sum + value, 0) / Math.max(1, inflation.length),
          pathInflationSamples: inflation.length,
          controlledFrames: window.__apStats.frames,
          shieldInterventions: window.__apStats.shieldInterventions,
        });
      }
    }
    return output;
  }, { seeds, variants, warmupSeconds, durationSeconds, bounds });

  const summarize = variant => {
    const selected = rows.filter(row => row.variant === variant.name);
    const survived = selected.filter(row => row.survived).length;
    const meanPace = selected.reduce((sum, row) => sum + row.steadyStateOperationsPerMinute, 0) / selected.length;
    const worstSeedPace = Math.min(...selected.map(row => row.steadyStateOperationsPerMinute));
    const meanPathInflation = selected.reduce((sum, row) => sum + row.meanPathInflation, 0) / selected.length;
    return {
      options: variant.options,
      survived: `${survived}/${selected.length}`,
      meanSteadyStateOperationsPerMinute: meanPace,
      worstSeedOperationsPerMinute: worstSeedPace,
      meanPathInflation,
      compositeMetric: survived === selected.length
        ? 0.75 * meanPace + 0.25 * worstSeedPace - 0.2 * Math.max(0, meanPathInflation - 1)
        : 0,
      shieldInterventions: selected.reduce((sum, row) => sum + row.shieldInterventions, 0),
      controlledFrames: selected.reduce((sum, row) => sum + row.controlledFrames, 0),
    };
  };
  const summaries = Object.fromEntries(variants.map(variant => [variant.name, summarize(variant)]));
  const result = {
    schemaVersion: 1,
    gameSnapshot: {
      source: 'https://airport.apunen.com/',
      retrievedOn: '2026-07-22',
    },
    controllerSha256: sha256(controllerUrl),
    gameBundleSha256: {
      model: sha256(modelUrl),
      assetsAndMap: sha256(assetsUrl),
    },
    seeds,
    warmupSeconds,
    durationSeconds,
    bounds,
    definitions: {
      survived: 'Simulation remained in phase "playing" through durationSeconds.',
      steadyStateOperationsPerMinute: 'Landings plus departures after warmupSeconds, divided by measured post-warm-up minutes.',
      meanPathInflation: 'For each landing, aircraft age times native speed divided by spawn-to-runway-approach distance; averaged per seed.',
      shieldIntervention: 'One aircraft velocity replacement during one of four sequential next-tick shield passes.',
    },
    variants: summaries,
    aggregate: summaries.final,
    runs: rows,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  await browser.close();
}
