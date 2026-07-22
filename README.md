# Airport Solver Runner

Runs the bundled Airport Simulator solver against the production website in a
visible, isolated Chromium window. The process belongs to your terminal, so it
does not stop when a Codex turn or Playwright MCP request ends.

## First-time setup

```bash
cd ~/Personal/airport-solver-runner
npm install
npm run setup
```

## Run

```bash
cd ~/Personal/airport-solver-runner
npm start
```

Keep the terminal open. Status is printed every 15 seconds. Press `Ctrl+C` to
stop cleanly. Closing the Chromium window also stops the runner.

The browser uses `browser-profile/`, separate from regular Chrome and other
Playwright agents. If the game reaches game over, the window stays open for
inspection.

## Optional settings

Override settings with environment variables:

```bash
VIEWPORT_WIDTH=1440 VIEWPORT_HEIGHT=900 npm start
SOLVER_PATH=/absolute/path/to/autopilot.js npm start
```

The bundled solver is `autopilot.js`. The runner does not enter a player name,
force game over, or submit a leaderboard score itself.
