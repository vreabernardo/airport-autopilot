(() => {
  if (window.__apInstalled) return;
  window.__apInstalled = true;
  window.__apStop = false;
  window.__apStats = { frames: 0, shieldInterventions: 0 };

  const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const planeSpecs = {
    yellow: { speed: 7, radius: 2.4 },
    blue: { speed: 8, radius: 2.6 },
    red: { speed: 9, radius: 2.8 },
  };
  const headings = Array.from({ length: 48 }, (_, k) => {
    const offset = k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 2 * Math.PI / 48;
    return { offset, cos: Math.cos(offset), sin: Math.sin(offset) };
  });
  const shieldHeadings = Array.from({ length: 64 }, (_, k) => {
    const angle = 2 * Math.PI * k / 64;
    return { angle, cos: Math.cos(angle), sin: Math.sin(angle) };
  });
  const optimizedBounds = {
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

  function control(sim) {
    if (window.__apStop || !sim.map || sim.phase !== 'playing') return;
    window.__apStats.frames++;
    const runways = Object.fromEntries(sim.map.runways.map(runway => [runway.color, runway]));
    const airborne = sim.aircraft.filter(ac => ac.state === 'flying' || ac.state === 'departing');
    const flying = airborne.filter(ac => ac.state === 'flying').sort((a, b) => a.id - b.id);
    const warnings = sim.spawnWarnings.map(warning => {
      const spec = planeSpecs[warning.kind];
      return {
        ...warning,
        spec,
        velocity: { x: Math.cos(warning.heading) * spec.speed, y: Math.sin(warning.heading) * spec.speed },
      };
    });
    const chosen = new Map(airborne.map(ac => {
      const heading = ac.path[0] ? angleTo(ac.pos, ac.path[0]) : ac.heading;
      const speed = ac.state === 'departing' ? 10.5 : ac.spec.speed;
      return [ac.id, { x: Math.cos(heading) * speed, y: Math.sin(heading) * speed }];
    }));

    for (const ac of flying) {
      ac.target ||= runways[ac.kind];
      if (window.__apDebug) ac._passSolutions = [];
    }

    for (let iteration = 0; iteration < 4; iteration++) {
      for (const ac of flying) {
        const runway = runways[ac.kind];
        const desired = angleTo(ac.pos, runway.approach);
        const desiredCos = Math.cos(desired), desiredSin = Math.sin(desired);
        const current = Math.atan2(chosen.get(ac.id).y, chosen.get(ac.id).x);
        let best = null;
        for (const candidate of headings) {
          const { offset } = candidate;
          const angle = desired + offset;
          const velocity = {
            x: (desiredCos * candidate.cos - desiredSin * candidate.sin) * ac.spec.speed,
            y: (desiredSin * candidate.cos + desiredCos * candidate.sin) * ac.spec.speed,
          };
          let clearance = Infinity;
          for (const other of airborne) {
            if (other === ac) continue;
            const ov = chosen.get(other.id);
            const px = other.pos.x - ac.pos.x, py = other.pos.y - ac.pos.y;
            const vx = ov.x - velocity.x, vy = ov.y - velocity.y;
            const vv = vx * vx + vy * vy;
            const time = vv < 1e-8 ? 0 : Math.max(0, Math.min(8, -(px * vx + py * vy) / vv));
            clearance = Math.min(clearance, Math.hypot(px + vx * time, py + vy * time) - ac.spec.radius - other.spec.radius);
          }
          for (const warning of warnings) {
            const px = warning.pos.x - ac.pos.x - velocity.x * warning.warningRemaining;
            const py = warning.pos.y - ac.pos.y - velocity.y * warning.warningRemaining;
            const vx = warning.velocity.x - velocity.x, vy = warning.velocity.y - velocity.y;
            const vv = vx * vx + vy * vy;
            const time = vv < 1e-8 ? 0 : Math.max(0, Math.min(7, -(px * vx + py * vy) / vv));
            clearance = Math.min(clearance, Math.hypot(px + vx * time, py + vy * time) - ac.spec.radius - warning.spec.radius);
          }
          const turn = Math.abs(Math.atan2(Math.sin(angle - current), Math.cos(angle - current)));
          const score = (clearance >= 2 ? 10_000 : clearance * 100) + candidate.cos * 20 - turn;
          if (!best || score > best.score) best = { score, angle, velocity, offset, clearance };
        }
        chosen.set(ac.id, best.velocity);
        ac._solution = best;
        if (window.__apDebug) {
          ac._passSolutions.push({
            iteration,
            angle: best.angle,
            offset: best.offset,
            clearance: best.clearance,
            velocity: { ...best.velocity },
          });
        }
      }
    }

    for (const ac of flying) {
      const runway = runways[ac.kind];
      const best = ac._solution;
      if (Math.abs(best.offset) < .05 && best.clearance >= 2) {
        ac.path = [{ ...runway.approach }, { ...runway.end }];
      } else {
        ac.path = [{ x: ac.pos.x + Math.cos(best.angle) * 100, y: ac.pos.y + Math.sin(best.angle) * 100 }];
      }
    }

    const dt = 1 / 60;
    for (let pass = 0; pass < 4; pass++) {
      for (const ac of flying) {
        const velocity = chosen.get(ac.id);
        let nextClearance = Infinity;
        let threat = null;
        for (const other of airborne) {
          if (other === ac) continue;
          const ov = chosen.get(other.id);
          const clearance = Math.hypot(
            ac.pos.x + velocity.x * dt - other.pos.x - ov.x * dt,
            ac.pos.y + velocity.y * dt - other.pos.y - ov.y * dt,
          ) - ac.spec.radius - other.spec.radius;
          if (clearance < nextClearance) {
            nextClearance = clearance;
            threat = { aircraft: other, velocity: ov };
          }
        }
        if (nextClearance > .25) continue;
        window.__apStats.shieldInterventions++;
        let safest = null;
        for (const heading of shieldHeadings) {
          const velocity2 = { x: heading.cos * ac.spec.speed, y: heading.sin * ac.spec.speed };
          let clearance = Infinity;
          for (const other of airborne) {
            if (other === ac) continue;
            const ov = chosen.get(other.id);
            clearance = Math.min(clearance,
              Math.hypot(ac.pos.x + velocity2.x * dt - other.pos.x - ov.x * dt, ac.pos.y + velocity2.y * dt - other.pos.y - ov.y * dt)
              - ac.spec.radius - other.spec.radius);
          }
          if (!safest || clearance > safest.clearance) safest = { ...heading, velocity: velocity2, clearance };
        }
        if (window.__apDebug) {
          window.__apLastShield = {
            elapsed: sim.elapsed,
            aircraft: { id: ac.id, kind: ac.kind, radius: ac.spec.radius, pos: { ...ac.pos } },
            threat: threat && {
              id: threat.aircraft.id,
              kind: threat.aircraft.kind,
              radius: threat.aircraft.spec.radius,
              pos: { ...threat.aircraft.pos },
              velocity: { ...threat.velocity },
            },
            before: { ...velocity },
            after: { ...safest.velocity },
            clearanceBefore: nextClearance,
            clearanceAfter: safest.clearance,
          };
        }
        chosen.set(ac.id, safest.velocity);
        ac.path = [{ x: ac.pos.x + safest.cos * 100, y: ac.pos.y + safest.sin * 100 }];
      }
    }
  }

  function install() {
    const game = window.__game;
    if (!game || game.__directControllerInstalled) return;
    const originalReset = game.reset;
    const originalSetBounds = game.setBounds;
    game.reset = function resetWithOptimizedBounds(map) {
      return originalReset.call(this, map, optimizedBounds);
    };
    game.setBounds = function keepOptimizedBounds() {
      return originalSetBounds.call(this, optimizedBounds);
    };
    originalSetBounds.call(game, optimizedBounds);
    const originalStep = game.step;
    game.step = function stepWithController(dt) {
      control(this);
      return originalStep.call(this, dt);
    };
    game.__directControllerInstalled = true;
  }

  window.__apStatus = () => {
    const game = window.__game;
    if (!game) return { ok: false };
    return {
      ok: Boolean(game.__directControllerInstalled),
      phase: game.phase,
      elapsed: game.elapsed,
      landings: game.score.landings,
      departures: game.score.departures,
      airborne: game.aircraft.filter(ac => ac.state === 'flying').length,
      total: game.aircraft.length,
      warnings: game.spawnWarnings.length,
      bounds: game.bounds,
      stats: window.__apStats,
      stop: window.__apStop,
    };
  };
  window.__airportControlDirect = control;
  setInterval(install, 10);
})();
