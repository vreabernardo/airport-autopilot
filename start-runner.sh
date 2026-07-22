#!/usr/bin/env bash
set -eu

project_dir=$(cd -- "$(dirname -- "$0")" && pwd)
pid_file="$project_dir/runner.pid"
log_file="$project_dir/run.log"

if [[ -f "$pid_file" ]]; then
  existing_pid=$(cat "$pid_file")
  if kill -0 "$existing_pid" 2>/dev/null; then
    echo "Runner is already active (PID $existing_pid)."
    exit 0
  fi
  rm -f "$pid_file"
fi

cd "$project_dir"
nohup node runner.mjs >>"$log_file" 2>&1 &
runner_pid=$!
echo "$runner_pid" >"$pid_file"

sleep 1
if ! kill -0 "$runner_pid" 2>/dev/null; then
  echo "Runner failed to start. Check $log_file"
  exit 1
fi

echo "Runner started in the background (PID $runner_pid)."
echo "Log: $log_file"
