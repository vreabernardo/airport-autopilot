# Task

Maximize the final controller's `compositeMetric` from
`npm run --silent evaluate` without crashes.

Rules:

- Edit only `autopilot.js`.
- Do not access files outside this repository or use the network.
- Do not modify the evaluator, fixed files, dependencies, prompt, or loop.
- Keep code simple when scores are effectively tied.

Loop forever:

1. If `results.tsv` does not exist, run the unchanged baseline and create it with header `commit\tmetric\tmean\tmin\tsurvived\tstatus\tdescription` plus the baseline row.
2. Make one coherent controller experiment.
3. Run `npm run --silent evaluate > run.json 2> run.log`; read only `variants.final` unless it crashes.
4. Append the result to `results.tsv`.
5. If all seeds survive and `compositeMetric` improves, commit `autopilot.js`. Otherwise restore `autopilot.js` from `HEAD`.
6. Continue immediately. Never ask questions and never stop.
