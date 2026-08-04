#!/usr/bin/env bash
#
# build-branches.sh — generate cumulative per-chapter participant branches.
#
# For each chapter checkpoint `start/<chapter>` we build a branch off `main` where:
#   • chapters BEFORE this one keep the complete reference code in examples/,
#   • this chapter and every chapter after it have their exercise files replaced
#     with the stub versions in workshop/stubs/ (typed skeletons + TODOs, so
#     participants build them live),
#   • workshop/stubs/ and this script are removed from the participant branch
#     (the answers stay on main: `git checkout main -- examples/<chapter>`).
#
# So a participant who joins at chapter N checks out `start/chNN`, has everything
# before N already working, and implements chapter N onward themselves.
# Chapters 1–3, 10 and 11 have no exercise code — participants starting there
# use `start/ch04`.
#
# This script is idempotent: re-running it force-updates the branches. Run it
# from the repo root on `main` with examples/ and workshop/stubs/ committed.
# Pre-existing unrelated working-tree changes are NOT committed because we
# stage explicit paths only (never `git add -A`).
#
# Usage:
#   bash workshop/build-branches.sh           # build branches locally
#   PUSH=1 bash workshop/build-branches.sh    # build AND push to origin
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

BASE_BRANCH="main"
STUB_ROOT="workshop/stubs"
PUSH="${PUSH:-0}"

# Ordered chapter list; CHAPTERS[i] is the branch suffix start/<key> and
# CH_DIRS[i] the matching examples/ subdirectory. Parallel indexed arrays are
# used instead of an associative array so this runs on macOS's stock bash 3.2.
CHAPTERS=(ch04            ch05                ch06             ch07               ch08          ch09)
CH_DIRS=(ch04-agent-mind ch05-execution-loop ch06-self-healing ch07-observability ch08-e2e-demo ch09-agent-ci)

git rev-parse --verify "$BASE_BRANCH" >/dev/null
[ -d "$STUB_ROOT" ] || { echo "ERROR: $STUB_ROOT not found — run from main with workshop/stubs committed." >&2; exit 1; }

ORIGINAL_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

n=${#CHAPTERS[@]}
for ((i = 0; i < n; i++)); do
  start_ch="${CHAPTERS[$i]}"
  branch="start/${start_ch}"
  echo ""
  echo "=== Building ${branch} (chapters ${start_ch}+ stubbed) ==="

  # Fresh branch from main — resets tracked files to main's complete state.
  git checkout -B "$branch" "$BASE_BRANCH" >/dev/null 2>&1

  # Stub this chapter and every chapter after it.
  for ((j = i; j < n; j++)); do
    dir="${CH_DIRS[$j]}"
    src="${STUB_ROOT}/${dir}"
    dest="examples/${dir}"
    [ -d "$src" ] || { echo "  (no stubs for ${CHAPTERS[$j]}, skipping)"; continue; }
    cp "$src"/* "$dest"/
    git add "$dest"
    echo "  stubbed examples/${dir}"
  done

  # Hide the build tooling (the finished answers stay reachable on main).
  git rm -rq workshop/stubs
  git rm -q workshop/build-branches.sh

  git commit -q -m "workshop: ${branch} starter — chapters ${start_ch}+ as exercises

Cumulative checkpoint: chapters before ${start_ch} are complete; ${start_ch} onward
are stubbed for participants to implement. Stubs and build tooling removed."
  echo "  committed ${branch}"

  if [ "$PUSH" = "1" ]; then
    git push -u origin "$branch" --force-with-lease
    echo "  pushed ${branch}"
  fi
done

git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1
echo ""
echo "Done. Built ${n} branches: ${CHAPTERS[*]/#/start/}"
[ "$PUSH" = "1" ] || echo "(local only — re-run with PUSH=1 to push to origin)"
