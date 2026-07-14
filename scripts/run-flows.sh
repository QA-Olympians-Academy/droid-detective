#!/usr/bin/env bash
# Run one AppClaw flow, or all flows in flows/ if no name is given.
#
# Invoked as a SINGLE-LINE command from the android-emulator-runner `script:`
# (that action mangles multi-line if/for blocks), e.g.:
#   script: bash scripts/run-flows.sh "${{ github.event.inputs.flow }}"
#
# Usage: scripts/run-flows.sh [flow-file-name-relative-to-flows/]
set -euo pipefail
cd "$(dirname "$0")/.."

flow_name="${1:-}"

if [ -n "$flow_name" ]; then
  echo "Running flow: flows/$flow_name"
  exec bash scripts/appclaw.sh --flow "flows/$flow_name"
fi

# No specific flow → run them all. nullglob so an empty match isn't a literal glob.
shopt -s nullglob
flows=(flows/*.yaml flows/*.yml)
if [ "${#flows[@]}" -eq 0 ]; then
  echo "No flow files found in flows/" >&2
  exit 1
fi

for flow in "${flows[@]}"; do
  echo "=== Running flow: $flow ==="
  bash scripts/appclaw.sh --flow "$flow"
done
