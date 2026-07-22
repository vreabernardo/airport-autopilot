#!/bin/zsh
set -eu

project_dir=${0:A:h}
pid_file="$project_dir/runner.pid"

if [[ -f "$pid_file" ]]; then
  runner_pid=$(<"$pid_file")
  if kill -0 "$runner_pid" 2>/dev/null; then
    echo "Runner is active (PID $runner_pid)."
    tail -n 8 "$project_dir/run.log" 2>/dev/null || true
    exit 0
  fi
fi

echo "Runner is not active."
