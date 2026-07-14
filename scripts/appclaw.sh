#!/usr/bin/env bash
# Local/CI runner for the AppClaw CLI.
#
# appclaw's published dependency `df-vision` was unpublished from npm (only a
# security-holder placeholder remains), so `npm i -g appclaw@<any>` fails. This
# installs appclaw into ./.appclaw-cli with df-vision overridden to the vendored
# stub (tools/df-vision-stub), then execs it. df-vision powers VISION mode only;
# DOM-based YAML flows never touch it.
#
# Usage:
#   scripts/appclaw.sh --flow flows/login.yaml       # run a flow
#   scripts/appclaw.sh --playground                  # any appclaw args
#   APP_PATH=… DEVICE_UDID=… PLATFORM=… scripts/appclaw.sh --flow …
set -euo pipefail

# Repo root, regardless of where the script is invoked from.
cd "$(dirname "$0")/.."

BIN=".appclaw-cli/node_modules/.bin/appclaw"
if [ ! -x "$BIN" ]; then
  echo "Installing appclaw into .appclaw-cli (first run)…" >&2
  mkdir -p .appclaw-cli
  # The override lets `npm install` succeed despite df-vision@1.1.79 being
  # unpublished — it resolves df-vision to our stub instead.
  cat > .appclaw-cli/package.json <<'JSON'
{
  "name": "appclaw-runner",
  "private": true,
  "dependencies": { "appclaw": "1.9.3" },
  "overrides": { "df-vision": "file:../tools/df-vision-stub" }
}
JSON
  ( cd .appclaw-cli && npm install --no-audit --no-fund )
fi

# npm materializes the file: override as a SYMLINK, which Node's ESM loader fails
# to resolve on some npm/node versions (CI: "Cannot find package 'df-vision'").
# Force a real copy so `import … from 'df-vision'` always resolves.
DEST=".appclaw-cli/node_modules/df-vision"
if [ ! -f "$DEST/index.js" ] || [ -L "$DEST" ]; then
  echo "Materializing df-vision stub into node_modules…" >&2
  rm -rf "$DEST"
  mkdir -p "$DEST"
  cp tools/df-vision-stub/package.json tools/df-vision-stub/index.js "$DEST/"
fi

# Defaults for this repo; respect anything already exported.
export APP_PATH="${APP_PATH:-apps/demo.apk}"
export PLATFORM="${PLATFORM:-android}"

exec "$BIN" "$@"
