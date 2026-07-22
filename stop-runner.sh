#!/bin/zsh
set -eu

project_dir=${0:A:h}
pid_file="$project_dir/runner.pid"

if [[ ! -f "$pid_file" ]]; then
  echo "Runner is not active (no PID file)."
  exit 0
fi

runner_pid=$(<"$pid_file")
if kill -0 "$runner_pid" 2>/dev/null; then
  kill -TERM "$runner_pid"
  echo "Stop requested for runner PID $runner_pid."
else
  echo "Runner PID $runner_pid is no longer active."
fi

rm -f "$pid_file"
