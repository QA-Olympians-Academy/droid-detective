#!/usr/bin/env bash
# =============================================================================
#  droid-detective · workshop environment installer
#
#  One command installs (or repairs) everything the Agentic Mobile QA workshop
#  needs: Node + pnpm, JDK 17, the Android SDK + emulator + AVD, Appium with
#  the UiAutomator2 driver, the AppClaw CLI, Ollama + llama3.1, this repo, its
#  dependencies, the demo APK and .env. Every step is idempotent — re-run it as
#  often as you like; it only does what is still missing.
#
#  Fresh machine:
#    curl -fsSL https://raw.githubusercontent.com/QA-Olympians-Academy/droid-detective/main/setup.sh | bash
#
#  From a clone:
#    ./setup.sh              install / repair everything, then print the report
#    ./setup.sh --check      verify only — print the report (screenshot this)
#    ./setup.sh --boot       boot the workshop emulator and wait until it is ready
#    ./setup.sh --help
#
#  Optional environment knobs:
#    WORKSHOP_DIR      where to clone the repo      (default: ~/droid-detective,
#                      or the current clone when run from inside one)
#    ANDROID_HOME      Android SDK location         (default: ~/Library/Android/sdk
#                      on macOS, ~/Android/Sdk on Linux)
#    WORKSHOP_MIRROR   directory with pre-downloaded big files — see "Mirror"
#    SKIP_MODEL=1      do not pull the LLM (4.9 GB)
#    LLM_MODEL         model to pull                (default: llama3.1)
#    HEADLESS=1        with --boot: no emulator window (CI / servers)
#
#  Supported: macOS (Apple Silicon + Intel), Linux x86_64, Windows via WSL2.
#
#  Mirror — for the room, when twenty people share one Wi-Fi. Put any of these
#  in $WORKSHOP_MIRROR and the installer copies them instead of downloading:
#    commandlinetools-<mac|linux>-*.zip
#    demo.apk
#    system-images/android-34/google_apis/<arm64-v8a|x86_64>/   (whole directory)
#    ollama/models/                                             (copy of ~/.ollama/models)
# =============================================================================

REPO_URL="https://github.com/QA-Olympians-Academy/droid-detective.git"
APK_REPO="webdriverio/native-demo-app"
API_LEVEL="${API_LEVEL:-34}"
BUILD_TOOLS="${BUILD_TOOLS:-34.0.0}"
AVD_NAME="${AVD_NAME:-workshop_avd}"
LLM_MODEL="${LLM_MODEL:-llama3.1}"
CMDLINE_TOOLS_BUILD="${CMDLINE_TOOLS_BUILD:-13114758}"   # exists for both mac and linux
NODE_LINE="${NODE_LINE:-24}"          # Node major installed on Linux when none ≥ NODE_MIN is present
NODE_MIN=20
PNPM_MIN=10
JAVA_MIN=17
PNPM_PIN="10.28.0"                    # matches "packageManager" in package.json
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0   # corepack must never wait for a keypress

# ---- output -----------------------------------------------------------------
if [ -t 1 ]; then B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; D=$'\033[2m'; N=$'\033[0m'
else B=; G=; Y=; R=; D=; N=; fi
CURL_PROGRESS="-sS"; [ -t 1 ] && CURL_PROGRESS="--progress-bar"

step() { CURRENT_STEP="$*"; printf '\n%s▶ %s%s\n' "$B" "$*" "$N"; }
ok()   { printf '  %s✓%s %s\n' "$G" "$N" "$*"; }
warn() { printf '  %s⚠%s %s\n' "$Y" "$N" "$*"; }
info() { printf '  %s·%s %s\n' "$D" "$N" "$*"; }
die()  { printf '\n%s✗ %s%s\n' "$R" "$*" "$N" >&2; exit 1; }
have() { command -v "$1" >/dev/null 2>&1; }

# ---- platform ---------------------------------------------------------------
detect_platform() {
  OS=$(uname -s); ARCH=$(uname -m); WSL=0
  case "$OS" in
    Darwin) PLATFORM=mac ;;
    Linux)  PLATFORM=linux; grep -qi microsoft /proc/version 2>/dev/null && WSL=1 ;;
    *) die "Unsupported OS '$OS'. On Windows, open an Ubuntu (WSL2) terminal and run this there." ;;
  esac
  case "$ARCH" in
    arm64|aarch64) ABI=arm64-v8a; NODE_ARCH=arm64; JDK_ARCH=aarch64 ;;
    x86_64|amd64)  ABI=x86_64;    NODE_ARCH=x64;   JDK_ARCH=x64 ;;
    *) die "Unsupported CPU architecture '$ARCH'." ;;
  esac
  if [ "$PLATFORM" = mac ]; then
    ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
  else
    ANDROID_HOME="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
  fi
  export ANDROID_HOME ANDROID_SDK_ROOT="$ANDROID_HOME"
  case "${SHELL:-}" in
    */zsh)  PROFILE="$HOME/.zshrc" ;;
    */bash) PROFILE="$HOME/.bashrc" ;;
    *)      if [ "$PLATFORM" = mac ]; then PROFILE="$HOME/.zshrc"; else PROFILE="$HOME/.bashrc"; fi ;;
  esac
  EXTRA_PATHS=()
  # Homebrew on Apple Silicon is not on PATH in a non-interactive shell.
  if [ "$PLATFORM" = mac ] && ! have brew; then
    for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
      [ -x "$b" ] && eval "$("$b" shellenv)" && break
    done
  fi
  # nvm-managed Node is invisible to a piped shell — load it if present.
  if ! have node && [ -s "$HOME/.nvm/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
    nvm use default >/dev/null 2>&1 || nvm use --lts >/dev/null 2>&1 || true
  fi
  [ -d "$HOME/.local/node/bin" ]  && PATH="$HOME/.local/node/bin:$PATH"
  [ -d "$HOME/.npm-global/bin" ]  && PATH="$HOME/.npm-global/bin:$PATH"
  # A node@24 keg we installed earlier is keg-only — put it first if there is no other Node.
  if ! have node; then local k; k=$(keg_node) && PATH="$k:$PATH"; fi
  export PATH
}
keg_node() {
  [ "$PLATFORM" = mac ] && have brew || return 1
  local p; p=$(brew --prefix node@24 2>/dev/null) || return 1
  [ -x "$p/bin/node" ] && printf '%s' "$p/bin"
}

# Where is (or will be) the repo?  ./setup.sh inside a clone → that clone.
resolve_repo_dir() {
  local here
  if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    here=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
    if is_repo "$here"; then REPO_DIR="$here"; return; fi
  fi
  if is_repo "$PWD"; then REPO_DIR="$PWD"; return; fi
  REPO_DIR="${WORKSHOP_DIR:-$HOME/droid-detective}"
}
is_repo() { [ -f "$1/package.json" ] && grep -q '"name": *"droid-detective"' "$1/package.json"; }

# ---- downloads --------------------------------------------------------------
# fetch <mirror-glob> <url> <dest> — copies from $WORKSHOP_MIRROR when a file
# matching the glob is there, otherwise downloads.
fetch() {
  local glob="$1" url="$2" dest="$3" m=""
  if [ -n "${WORKSHOP_MIRROR:-}" ]; then
    m=$(compgen -G "$WORKSHOP_MIRROR/$glob" 2>/dev/null | head -1 || true)
    if [ -n "$m" ]; then info "from mirror: $(basename "$m")"; cp "$m" "$dest"; return 0; fi
  fi
  info "downloading $url"
  curl -fL $CURL_PROGRESS -o "$dest" "$url"
}

# ---- versions ---------------------------------------------------------------
node_major() { node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/'; }
pnpm_major() { pnpm -v 2>/dev/null | cut -d. -f1; }
java_major() { "$1" -version 2>&1 | head -1 | sed -E 's/.*"([0-9]+)(\.[0-9]+)*.*/\1/'; }
ver_ge()     { [ "${1:-0}" -ge "$2" ] 2>/dev/null; }

resolve_java() {
  local cand=() d m
  [ -n "${JAVA_HOME:-}" ] && cand+=("$JAVA_HOME")
  if [ "$PLATFORM" = mac ]; then
    have brew && cand+=("$(brew --prefix openjdk@17 2>/dev/null || true)")
    [ -x /usr/libexec/java_home ] && cand+=("$(/usr/libexec/java_home -v "${JAVA_MIN}+" 2>/dev/null || true)")
  fi
  cand+=("$HOME/.local/jdk-17")
  for d in /usr/lib/jvm/java-17-openjdk* /usr/lib/jvm/temurin-17* /usr/lib/jvm/java-21-openjdk* /usr/lib/jvm/temurin-21*; do cand+=("$d"); done
  for d in "${cand[@]}"; do
    [ -n "$d" ] && [ -x "$d/bin/java" ] || continue
    m=$(java_major "$d/bin/java")
    if ver_ge "$m" "$JAVA_MIN"; then JAVA_HOME="$d"; export JAVA_HOME; return 0; fi
  done
  return 1
}

# ---- preflight --------------------------------------------------------------
preflight() {
  step "Preflight"
  [ "$(id -u)" = 0 ] && die "Run this as your normal user, not root/sudo (sudo is requested only where needed)."
  local label="$PLATFORM/$ARCH"; [ "$WSL" = 1 ] && label="WSL2/$ARCH"
  ok "platform: $label · Android ABI: $ABI · SDK: $ANDROID_HOME"

  local free_kb; free_kb=$(df -Pk "$HOME" | awk 'NR==2{print $4}')
  if [ "${free_kb:-0}" -lt $((20*1024*1024)) ]; then warn "only $((free_kb/1024/1024)) GB free in \$HOME — the full setup needs ~20 GB"; else ok "disk: $((free_kb/1024/1024)) GB free"; fi

  local mem_gb=0
  if [ "$PLATFORM" = mac ]; then mem_gb=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 ));
  else mem_gb=$(( $(awk '/MemTotal/{print $2}' /proc/meminfo) / 1024 / 1024 )); fi
  if [ "$mem_gb" -lt 15 ]; then warn "${mem_gb} GB RAM — the emulator plus an 8B model want 16 GB; expect swapping"; else ok "RAM: ${mem_gb} GB"; fi

  if [ "$PLATFORM" = mac ]; then
    have brew || die "Homebrew is required on macOS. Install it from https://brew.sh (one command), open a new terminal, then re-run this script."
    ok "Homebrew $(brew --version | head -1 | awk '{print $2}')"
  else
    local need=() t
    for t in curl unzip git tar xz; do have "$t" || need+=("$t"); done
    if [ ${#need[@]} -gt 0 ]; then
      if have apt-get; then
        info "installing base packages via apt (sudo): ${need[*]}"
        sudo apt-get update -qq && sudo apt-get install -y -qq curl unzip git tar xz-utils
      else
        die "Missing: ${need[*]}. Install them with your package manager and re-run."
      fi
    fi
    ok "base tools present"
    if [ -w /dev/kvm ]; then ok "KVM available (/dev/kvm)"
    elif [ "$WSL" = 1 ]; then warn "no /dev/kvm — the emulator will not run inside WSL2. Enable nested virtualization (Windows 11: nestedVirtualization=true in %UserProfile%\\.wslconfig) or run the emulator in Android Studio on the Windows side."
    else warn "no /dev/kvm — the emulator will be unusably slow. Ubuntu: sudo apt install qemu-kvm && sudo adduser \$USER kvm, then log out and in."; fi
  fi
}

# ---- toolchain --------------------------------------------------------------
ensure_node() {
  step "Node.js ≥ $NODE_MIN"
  if have node && ver_ge "$(node_major)" "$NODE_MIN"; then ok "node $(node -v) ($(command -v node))"; return; fi
  if [ "$PLATFORM" = mac ]; then
    brew install node@24 || true         # LTS keg; verified below (brew exits 1 if only the link step fails)
    PATH="$(brew --prefix node@24)/bin:$PATH"; export PATH
  else
    local tarball tmp
    tarball=$(curl -fsSL "https://nodejs.org/dist/latest-v${NODE_LINE}.x/SHASUMS256.txt" \
              | grep -oE "node-v${NODE_LINE}\.[0-9]+\.[0-9]+-linux-${NODE_ARCH}\.tar\.xz" | head -1)
    [ -n "$tarball" ] || die "could not resolve a Node ${NODE_LINE} tarball for linux-${NODE_ARCH}"
    tmp=$(mktemp -d)
    fetch "$tarball" "https://nodejs.org/dist/latest-v${NODE_LINE}.x/$tarball" "$tmp/node.tar.xz"
    rm -rf "$HOME/.local/node"; mkdir -p "$HOME/.local/node"
    tar -xJf "$tmp/node.tar.xz" -C "$HOME/.local/node" --strip-components=1
    rm -rf "$tmp"
    PATH="$HOME/.local/node/bin:$PATH"; export PATH
  fi
  have node && ver_ge "$(node_major)" "$NODE_MIN" || die "Node install did not take effect"
  ok "node $(node -v)"
}

ensure_npm_prefix() {
  # Global npm installs must not need sudo. If the prefix is not writable,
  # move it to ~/.npm-global.
  local p; p=$(npm prefix -g 2>/dev/null || echo /usr/local)
  if [ -w "$p/lib/node_modules" ] || [ -w "$p/lib" ] || [ -w "$p" ]; then return; fi
  info "npm global prefix $p is not writable — switching to ~/.npm-global"
  npm config set prefix "$HOME/.npm-global"
  mkdir -p "$HOME/.npm-global/bin"
  PATH="$HOME/.npm-global/bin:$PATH"; export PATH
}

ensure_pnpm() {
  step "pnpm ≥ $PNPM_MIN"
  if have pnpm && ver_ge "$(pnpm_major)" "$PNPM_MIN"; then ok "pnpm $(pnpm -v)"; return; fi
  ensure_npm_prefix
  if have corepack; then
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack enable >/dev/null 2>&1 && \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack prepare "pnpm@${PNPM_PIN}" --activate >/dev/null 2>&1 || true
  fi
  if ! have pnpm || ! ver_ge "$(pnpm_major)" "$PNPM_MIN"; then npm install -g "pnpm@${PNPM_MIN}" >/dev/null; fi
  have pnpm && ver_ge "$(pnpm_major)" "$PNPM_MIN" || die "pnpm install did not take effect"
  ok "pnpm $(pnpm -v)"
}

ensure_java() {
  step "JDK ≥ $JAVA_MIN"
  if resolve_java; then ok "java $("$JAVA_HOME/bin/java" -version 2>&1 | head -1 | sed -E 's/.*"([^"]+)".*/\1/') at $JAVA_HOME"; return; fi
  if [ "$PLATFORM" = mac ]; then
    brew install openjdk@17 || true  # a formula: no sudo, unlike the temurin cask; verified below
  else
    local tmp url
    url="https://api.adoptium.net/v3/binary/latest/17/ga/linux/${JDK_ARCH}/jdk/hotspot/normal/eclipse?project=jdk"
    tmp=$(mktemp -d)
    fetch "OpenJDK17*-jdk_${JDK_ARCH}_linux*.tar.gz" "$url" "$tmp/jdk.tgz"
    rm -rf "$HOME/.local/jdk-17"; mkdir -p "$HOME/.local/jdk-17"
    tar -xzf "$tmp/jdk.tgz" -C "$HOME/.local/jdk-17" --strip-components=1
    rm -rf "$tmp"
  fi
  resolve_java || die "JDK install did not take effect"
  ok "java $("$JAVA_HOME/bin/java" -version 2>&1 | head -1 | sed -E 's/.*"([^"]+)".*/\1/') at $JAVA_HOME"
}

ensure_android_sdk() {
  step "Android SDK command-line tools"
  SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
  if [ -x "$SDKM" ]; then ok "sdkmanager present"; return; fi
  local b url="" tmp
  # Google publishes per-OS builds that are not always in sync (15859902 exists
  # for linux only). Probe the pinned build first, then known-good fallbacks.
  if [ -z "${WORKSHOP_MIRROR:-}" ] || ! compgen -G "$WORKSHOP_MIRROR/commandlinetools-${PLATFORM}-*.zip" >/dev/null 2>&1; then
    for b in "$CMDLINE_TOOLS_BUILD" 13114758 12700392 12266719 11076708; do
      url="https://dl.google.com/android/repository/commandlinetools-${PLATFORM}-${b}_latest.zip"
      curl -fsIL --max-time 15 -o /dev/null "$url" && break
      url=""
    done
    [ -n "$url" ] || die "no downloadable Android command-line tools build found for $PLATFORM"
  fi
  tmp=$(mktemp -d)
  fetch "commandlinetools-${PLATFORM}-*.zip" "$url" "$tmp/cmdline-tools.zip"
  unzip -q "$tmp/cmdline-tools.zip" -d "$tmp"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  rm -rf "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
  rm -rf "$tmp"
  [ -x "$SDKM" ] || die "sdkmanager missing after unzip"
  ok "installed to $ANDROID_HOME/cmdline-tools/latest"
}

ensure_sdk_packages() {
  step "Android platform-tools · emulator · platform $API_LEVEL · build-tools $BUILD_TOOLS · system image ($ABI)"
  local img_rel="system-images/android-${API_LEVEL}/google_apis/${ABI}"
  local -a missing=()
  # Mirror short-cut for the 1 GB system image.
  if [ ! -f "$ANDROID_HOME/$img_rel/system.img" ] && [ -n "${WORKSHOP_MIRROR:-}" ] && [ -f "$WORKSHOP_MIRROR/$img_rel/system.img" ]; then
    info "from mirror: $img_rel"
    mkdir -p "$ANDROID_HOME/$img_rel"; cp -R "$WORKSHOP_MIRROR/$img_rel/." "$ANDROID_HOME/$img_rel/"
  fi
  [ -x "$ANDROID_HOME/platform-tools/adb" ]                    || missing+=("platform-tools")
  [ -x "$ANDROID_HOME/emulator/emulator" ]                      || missing+=("emulator")
  [ -d "$ANDROID_HOME/platforms/android-${API_LEVEL}" ]         || missing+=("platforms;android-${API_LEVEL}")
  [ -x "$ANDROID_HOME/build-tools/${BUILD_TOOLS}/aapt2" ]       || missing+=("build-tools;${BUILD_TOOLS}")
  [ -f "$ANDROID_HOME/$img_rel/system.img" ]                    || missing+=("system-images;android-${API_LEVEL};google_apis;${ABI}")
  if [ ${#missing[@]} -eq 0 ]; then ok "all packages present"; return; fi
  info "accepting SDK licences"
  yes_stream | "$SDKM" --licenses >/dev/null 2>&1 || true
  info "installing: ${missing[*]}  (the system image is ~1 GB — be patient)"
  yes_stream | "$SDKM" --install "${missing[@]}"
  [ -x "$ANDROID_HOME/build-tools/${BUILD_TOOLS}/aapt2" ] || die "build-tools ${BUILD_TOOLS} did not install (Appium needs its aapt2)"
  ok "SDK packages installed"
}

yes_stream() { printf 'y\n%.0s' $(seq 1 64); }   # finite, so no SIGPIPE under pipefail
avd_exists() {
  [ -f "${ANDROID_AVD_HOME:-${ANDROID_USER_HOME:-$HOME/.android}/avd}/${AVD_NAME}.ini" ] && return 0
  [ -x "$ANDROID_HOME/emulator/emulator" ] && "$ANDROID_HOME/emulator/emulator" -list-avds 2>/dev/null | grep -qx "$AVD_NAME"
}

ensure_avd() {
  step "Emulator AVD '$AVD_NAME' (Pixel 6 · API $API_LEVEL · $ABI)"
  if avd_exists; then ok "present"; return; fi
  echo no | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
      -n "$AVD_NAME" -k "system-images;android-${API_LEVEL};google_apis;${ABI}" -d pixel_6 --force >/dev/null
  avd_exists || die "AVD creation failed"
  ok "created"
}

appium_version() { appium --version 2>/dev/null | grep -oE '^[0-9]+\.[0-9]+\.[0-9]+' | head -1; }
# Appium otherwise picks the nearest package.json that depends on it as its home,
# so the global driver would land in whatever project you happen to be in.
export APPIUM_HOME="${APPIUM_HOME:-$HOME/.appium}"
ensure_appium() {
  step "Appium + UiAutomator2 driver ($APPIUM_HOME)"
  if have appium && [ -n "$(appium_version)" ]; then ok "appium $(appium_version)"
  else ensure_npm_prefix; npm install -g appium >/dev/null; ok "appium $(appium_version) installed"; fi
  if appium driver list --installed 2>&1 | grep -q uiautomator2; then ok "uiautomator2 driver present"
  else appium driver install uiautomator2 >/dev/null; ok "uiautomator2 driver installed"; fi
}

ensure_appclaw() {
  step "AppClaw CLI (@appclaw/cli)"
  if have appclaw; then ok "appclaw $(appclaw --version 2>/dev/null | head -1)"; return; fi
  ensure_npm_prefix
  npm install -g @appclaw/cli >/dev/null      # NOT the deprecated unscoped 'appclaw' 1.x
  have appclaw || die "appclaw not on PATH after install"
  ok "appclaw $(appclaw --version 2>/dev/null | head -1) installed"
}

ollama_up() { curl -sf --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; }
start_ollama() {
  local i
  ollama_up && return 0
  if [ "$PLATFORM" = mac ] && have brew && brew list --formula ollama >/dev/null 2>&1; then
    brew services start ollama >/dev/null 2>&1 || true     # survives reboots
    for i in $(seq 1 10); do ollama_up && return 0; sleep 1; done
  fi
  mkdir -p "$HOME/.ollama"
  ( trap - ERR; exec nohup ollama serve >"$HOME/.ollama/serve.log" 2>&1 ) &
  for i in $(seq 1 20); do ollama_up && return 0; sleep 1; done
  return 1
}
ensure_ollama() {
  step "Ollama"
  if ! have ollama; then
    if [ "$PLATFORM" = mac ]; then brew install ollama || true   # verified below
    else info "running the official installer (asks for sudo)"; curl -fsSL https://ollama.com/install.sh | sh; fi
    have ollama || die "ollama not on PATH after install"
  fi
  ok "$(ollama --version 2>/dev/null | head -1)"
  if start_ollama; then ok "server responding on :11434"; else warn "could not start the Ollama server — run 'ollama serve' in another terminal"; fi
}

model_present() { ollama list 2>/dev/null | awk 'NR>1{print $1}' | grep -qxE "${LLM_MODEL}(:latest)?"; }
ensure_model() {
  step "Local model $LLM_MODEL"
  if [ -n "${SKIP_MODEL:-}" ]; then warn "skipped (SKIP_MODEL set)"; return; fi
  ollama_up || { warn "Ollama server is down — skipping the model pull; run 'ollama pull $LLM_MODEL' later"; return; }
  if model_present; then ok "present"; return; fi
  if [ -n "${WORKSHOP_MIRROR:-}" ] && [ -d "$WORKSHOP_MIRROR/ollama/models/manifests" ]; then
    local dest="${OLLAMA_MODELS:-$HOME/.ollama/models}"
    info "from mirror: ollama/models → $dest"
    mkdir -p "$dest"; cp -R "$WORKSHOP_MIRROR/ollama/models/." "$dest/"
    model_present && { ok "present (from mirror)"; return; }
  fi
  info "pulling $LLM_MODEL (~4.9 GB — do this on good Wi-Fi)"
  ollama pull "$LLM_MODEL"
  ok "pulled"
}

# ---- the repo ---------------------------------------------------------------
ensure_repo() {
  step "Repository"
  if is_repo "$REPO_DIR"; then ok "using $REPO_DIR"
  else
    info "cloning into $REPO_DIR"
    git clone --quiet "$REPO_URL" "$REPO_DIR"
    ok "cloned"
  fi
  cd "$REPO_DIR"
  step "Project dependencies (pnpm install)"
  pnpm install --reporter=silent 2>/dev/null || pnpm install
  ok "node_modules ready"
  pnpm run --silent appium:install-driver >/dev/null 2>&1 || true
}

apk_ok() { [ -s "$1" ] && unzip -l "$1" >/dev/null 2>&1; }
apk_url() {
  local url tag
  url=$(curl -fsSL "https://api.github.com/repos/${APK_REPO}/releases/latest" 2>/dev/null | grep -o 'https://[^"]*\.apk' | head -1 || true)
  if [ -z "$url" ]; then   # API rate-limited (shared Wi-Fi) → derive from the redirect
    tag=$(curl -fsI "https://github.com/${APK_REPO}/releases/latest" | tr -d '\r' | awk 'tolower($1)=="location:"{print $2}' | sed 's#.*/tag/##')
    [ -n "$tag" ] && url="https://github.com/${APK_REPO}/releases/download/${tag}/android.wdio.native.app.${tag}.apk"
  fi
  [ -n "$url" ] && printf '%s' "$url"
}
ensure_apk() {
  step "Demo app (apps/demo.apk)"
  mkdir -p apps
  if apk_ok apps/demo.apk; then ok "present ($(du -hL apps/demo.apk | cut -f1))"; return; fi
  local url; url=$(apk_url) || die "could not resolve the latest ${APK_REPO} release"
  fetch "demo.apk" "$url" apps/demo.apk
  apk_ok apps/demo.apk || die "downloaded APK is not a valid archive"
  ok "downloaded ($(du -hL apps/demo.apk | cut -f1))"
}

ensure_env() {
  step ".env"
  if [ -f .env ]; then ok "present (left untouched)"; else cp .env.example .env; ok "created from .env.example"; fi
}

# ---- shell profile -----------------------------------------------------------
write_profile() {
  step "Shell profile ($PROFILE)"
  local start='# >>> droid-detective workshop (managed by setup.sh) >>>' end='# <<< droid-detective workshop <<<'
  local tmp; tmp=$(mktemp)
  [ -f "$PROFILE" ] && awk -v s="$start" -v e="$end" '$0==s{skip=1} !skip{print} $0==e{skip=0}' "$PROFILE" >"$tmp"
  {
    echo "$start"
    echo "export JAVA_HOME=\"$JAVA_HOME\""
    echo "export ANDROID_HOME=\"$ANDROID_HOME\""
    echo 'export ANDROID_SDK_ROOT="$ANDROID_HOME"'
    [ -d "$HOME/.local/node/bin" ]  && echo 'export PATH="$HOME/.local/node/bin:$PATH"'
    [ -d "$HOME/.npm-global/bin" ]  && echo 'export PATH="$HOME/.npm-global/bin:$PATH"'
    local k; if k=$(keg_node) && [ "$(command -v node)" = "$k/node" ]; then echo "export PATH=\"$k:\$PATH\""; fi
    echo 'export PATH="$JAVA_HOME/bin:$PATH"'
    echo "export PATH=\"\$PATH:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$ANDROID_HOME/build-tools/${BUILD_TOOLS}:\$ANDROID_HOME/cmdline-tools/latest/bin\""
    echo "$end"
  } >>"$tmp"
  mv "$tmp" "$PROFILE"
  ok "environment block written — open a new terminal (or: source $PROFILE)"
}

# ---- report -----------------------------------------------------------------
declare -a ROWS=(); FAILS=0; WARNS=0
row() { # row <status ok|warn|fail> <label> <detail>
  local s=$1 mark
  case $s in ok) mark="${G}✓${N}";; warn) mark="${Y}⚠${N}"; WARNS=$((WARNS+1));; *) mark="${R}✗${N}"; FAILS=$((FAILS+1));; esac
  ROWS+=("$(printf '  %s  %-24s %s' "$mark" "$2" "$3")")
}
report() {
  step "Environment report"
  ROWS=(); FAILS=0; WARNS=0
  local v
  if have node && ver_ge "$(node_major)" "$NODE_MIN"; then row ok "Node.js" "$(node -v)"; else row fail "Node.js" "${NODE_MIN}+ required"; fi
  if have pnpm && ver_ge "$(pnpm_major)" "$PNPM_MIN"; then row ok "pnpm" "$(pnpm -v)"; else row fail "pnpm" "${PNPM_MIN}+ required"; fi
  if resolve_java; then row ok "JDK" "$("$JAVA_HOME/bin/java" -version 2>&1 | head -1 | sed -E 's/.*"([^"]+)".*/\1/')  $JAVA_HOME"; else row fail "JDK" "${JAVA_MIN}+ required"; fi
  if [ -x "$ANDROID_HOME/platform-tools/adb" ]; then row ok "adb" "$("$ANDROID_HOME/platform-tools/adb" version 2>/dev/null | sed -n 's/^Version \([^ ]*\).*/\1/p')"; else row fail "adb" "platform-tools missing"; fi
  if [ -x "$ANDROID_HOME/emulator/emulator" ]; then row ok "emulator" "$("$ANDROID_HOME/emulator/emulator" -version 2>/dev/null | grep -oE 'version [0-9.]+' | head -1)"; else row fail "emulator" "missing"; fi
  if [ -d "$ANDROID_HOME/platforms/android-${API_LEVEL}" ]; then row ok "platform android-$API_LEVEL" "present"; else row fail "platform android-$API_LEVEL" "missing"; fi
  if [ -x "$ANDROID_HOME/build-tools/${BUILD_TOOLS}/aapt2" ]; then row ok "build-tools $BUILD_TOOLS" "aapt2 present"; else row fail "build-tools $BUILD_TOOLS" "missing (Appium needs aapt2)"; fi
  if [ -f "$ANDROID_HOME/system-images/android-${API_LEVEL}/google_apis/${ABI}/system.img" ]; then row ok "system image" "android-$API_LEVEL google_apis $ABI"; else row fail "system image" "android-$API_LEVEL google_apis $ABI missing"; fi
  if avd_exists; then row ok "AVD $AVD_NAME" "present"; else row fail "AVD $AVD_NAME" "not created"; fi
  if [ "$PLATFORM" = linux ]; then
    if [ -w /dev/kvm ]; then row ok "KVM" "/dev/kvm"; elif [ "$WSL" = 1 ]; then row warn "KVM" "no /dev/kvm in WSL2 — emulator must run on the Windows side"; else row fail "KVM" "no /dev/kvm — emulator will not be usable"; fi
  fi
  v=$(appium_version); if [ -n "$v" ]; then row ok "Appium" "$v"; else row fail "Appium" "not installed globally"; fi
  if [ -n "$v" ] && appium driver list --installed 2>&1 | grep -q uiautomator2; then row ok "UiAutomator2 driver" "installed"; else row fail "UiAutomator2 driver" "missing"; fi
  if have appclaw; then row ok "AppClaw CLI" "$(appclaw --version 2>/dev/null | head -1)"; else row fail "AppClaw CLI" "missing (@appclaw/cli)"; fi
  if have ollama; then
    if ollama_up; then row ok "Ollama" "$(ollama --version 2>/dev/null | head -1 | sed 's/ollama version is //') · server up"
    else row warn "Ollama" "installed, server down — run: ollama serve"; fi
  else row fail "Ollama" "missing"; fi
  if [ -n "${SKIP_MODEL:-}" ]; then row warn "model $LLM_MODEL" "skipped (SKIP_MODEL)"
  elif ! have ollama || ! ollama_up; then row warn "model $LLM_MODEL" "cannot check — server down"
  elif model_present; then row ok "model $LLM_MODEL" "present"
  else row fail "model $LLM_MODEL" "missing — ollama pull $LLM_MODEL"; fi
  if is_repo "$REPO_DIR"; then
    row ok "repo" "$REPO_DIR"
    if [ -d "$REPO_DIR/node_modules/.pnpm" ]; then row ok "node_modules" "installed"; else row fail "node_modules" "run pnpm install"; fi
    if apk_ok "$REPO_DIR/apps/demo.apk"; then row ok "apps/demo.apk" "$(du -hL "$REPO_DIR/apps/demo.apk" | cut -f1)"; else row fail "apps/demo.apk" "missing"; fi
    if [ -f "$REPO_DIR/.env" ]; then row ok ".env" "present"; else row fail ".env" "missing — cp .env.example .env"; fi
  else
    row fail "repo" "not found at $REPO_DIR"
  fi
  printf '%s\n' "${ROWS[@]}"
  echo
  if [ "$FAILS" -eq 0 ]; then
    printf '  %s✅ All green.%s Screenshot this and bring it to the workshop.\n' "$G$B" "$N"
    [ "$WARNS" -gt 0 ] && printf '  %s(%d warning(s) above — read them.)%s\n' "$Y" "$WARNS" "$N"
    printf '  Next: %s./setup.sh --boot%s  then  %spnpm test%s   (from %s)\n' "$B" "$N" "$B" "$N" "$REPO_DIR"
    return 0
  fi
  printf '  %s✗ %d item(s) missing.%s Re-run the installer to fix them:\n' "$R$B" "$FAILS" "$N"
  printf '     curl -fsSL https://raw.githubusercontent.com/QA-Olympians-Academy/droid-detective/main/setup.sh | bash\n'
  return 1
}

# ---- boot -------------------------------------------------------------------
boot() {
  local adb="$ANDROID_HOME/platform-tools/adb" emu="$ANDROID_HOME/emulator/emulator"
  [ -x "$adb" ] && [ -x "$emu" ] || die "Android SDK not installed — run ./setup.sh first"
  avd_exists || die "AVD $AVD_NAME missing — run ./setup.sh first"
  step "Booting $AVD_NAME"
  if [ "$("$adb" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ]; then
    ok "a device is already booted"; "$adb" devices; return 0
  fi
  local -a args=(-avd "$AVD_NAME" -no-audio -no-boot-anim)
  [ -n "${HEADLESS:-}" ] && args+=(-no-window -gpu swiftshader_indirect -no-snapshot -no-metrics)
  mkdir -p "$HOME/.android"
  local log="$HOME/.android/emulator-${AVD_NAME}.log"
  nohup "$emu" "${args[@]}" >"$log" 2>&1 &
  local pid=$! i
  info "emulator pid $pid · log $log"
  for i in $(seq 1 120); do
    kill -0 "$pid" 2>/dev/null || die "emulator exited early — see $log"
    [ "$("$adb" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break
    sleep 3
  done
  [ "$("$adb" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] || die "emulator did not finish booting in 6 minutes — see $log"
  "$adb" devices
  ok "ready — now run: pnpm test   (from $REPO_DIR)"
}

usage() {
  if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then sed -n '2,38p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,2\}//'
  else echo "usage: setup.sh [--check | --boot | --help]   (see the header of setup.sh for the environment knobs)"; fi
}

# ---- main -------------------------------------------------------------------
main() {
  local mode=install
  case "${1:-}" in
    --check|check) mode=check ;;
    --boot|boot)   mode=boot ;;
    -h|--help)     usage; exit 0 ;;
    "") ;;
    *) die "unknown option '$1' (try --help)" ;;
  esac
  detect_platform
  resolve_repo_dir
  case $mode in
    check) resolve_java || true; report ;;
    boot)  resolve_java || true; boot ;;
    install)
      set -eE -o pipefail
      trap 'printf "\n%s✗ step failed: %s%s\n  Fix the error above and re-run the same command — every step is idempotent and resumes where it stopped.\n" "$R" "${CURRENT_STEP:-?}" "$N" >&2' ERR
      preflight
      ensure_node
      ensure_pnpm
      ensure_java
      ensure_android_sdk
      ensure_sdk_packages
      ensure_avd
      ensure_appium
      ensure_appclaw
      ensure_ollama
      ensure_model
      ensure_repo
      ensure_apk
      ensure_env
      write_profile
      set +e; trap - ERR
      report
      ;;
  esac
}

main "$@"
