# Workshop Playbook — Agentic Mobile QA (3 hours)

**Instructor runbook.** Companion to [WORKSHOP-3H.md](WORKSHOP-3H.md) (the agenda) and
[WORKSHOP.md](WORKSHOP.md) (full chapter content). This document is what you run
the room from: prerequisites, pre-flight, a timed run-of-show, checkpoints, and
a troubleshooting table built from real failures.

**Format:** 3 hours · 1 break · hands-on · **fully local, no cloud LLM key.**
The agent, self-healing, and analysis all run on **Ollama + llama3.1** locally.

---

## 0. Student prerequisites — MUST be done BEFORE the session

> The setup is heavy (multi-GB downloads + an Android emulator). The 25-minute
> in-session setup block is for **fixing stragglers, not first-time installs.**
> Send this section 4–5 days ahead. A student who arrives having *not* completed
> and **verified** the checklist cannot do the hands-on labs.

### 0.1 Hardware & OS
- **macOS (Apple Silicon or Intel), Linux, or Windows + WSL2.**
- **≥ 16 GB RAM** (the emulator + llama3.1 8B both run locally). 8 GB will struggle.
- **~20 GB free disk** (Android system image ~4 GB, emulator ~1 GB, JDK/SDK ~2 GB,
  llama3.1 ~4.9 GB, node_modules, the demo APK ~120 MB).
- A **GitHub account** (for the CI chapter; read access is enough).

### 0.2 Toolchain to install (with verify commands)

| Tool | Install | Verify (must succeed) |
|------|---------|----------------------|
| Node.js 20+ | [nodejs.org](https://nodejs.org) | `node -v` |
| pnpm 10 | `corepack enable` (ships with Node) | `pnpm -v` |
| JDK 17 | macOS: `brew install openjdk@17` · else [adoptium.net](https://adoptium.net) | `java -version` |
| Android SDK | Android Studio, **or** command-line tools (see 0.3) | `adb --version` |
| Android build-tools + emulator + platform 34 + system image | via `sdkmanager` (see 0.3) | `emulator -version` |
| Appium 3 | `npm i -g appium` | `appium --version` |
| UiAutomator2 driver | `appium driver install uiautomator2` | `appium driver list --installed` |
| Ollama | [ollama.com](https://ollama.com) | `ollama --version` |
| AppClaw CLI | `npm i -g appclaw@1.9.3` | `appclaw --version` |

> **macOS JDK note:** do **not** use `brew install --cask temurin` in a headless
> shell — it runs a `.pkg` installer that needs `sudo`. `brew install openjdk@17`
> (a formula) installs without sudo; set `JAVA_HOME=$(brew --prefix openjdk@17)`.
>
> **AppClaw pin:** install `appclaw@1.9.3`, not `@1.1.0` — the old version depends
> on `df-vision@1.1.77`, which has been unpublished from npm and won't install.

### 0.3 Android SDK packages (if not using Android Studio's SDK manager)

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk      # Linux: $HOME/Android/Sdk
mkdir -p "$ANDROID_HOME/cmdline-tools"
# download command-line tools from https://developer.android.com/studio#command-line-tools-only
# unzip so the binaries live at: $ANDROID_HOME/cmdline-tools/latest/bin/

SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
# Apple Silicon → arm64-v8a ; Intel/Linux/CI → x86_64
yes | "$SDKM" "platform-tools" "emulator" "platforms;android-34" \
              "build-tools;34.0.0" \
              "system-images;android-34;google_apis;arm64-v8a"
```

> **`build-tools;34.0.0` is required** — Appium needs `aapt2` (which lives there)
> to parse the APK. Without it you get `Could not find 'aapt2'`.

Create the emulator:
```bash
echo "no" | "$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd \
  -n workshop_avd -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_6 --force
```

### 0.4 Environment variables (add to `~/.zshrc` / `~/.bashrc`)
```bash
export JAVA_HOME=$(brew --prefix openjdk@17)         # or your JDK path
export ANDROID_HOME=$HOME/Library/Android/sdk        # Linux: $HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0
export PATH=$PATH:$JAVA_HOME/bin
```

### 0.5 Pull the local model (large download — do this on good Wi-Fi)
```bash
ollama serve &            # background server on :11434
ollama pull llama3.1      # ~4.9 GB — the reasoning/agent/healing model
ollama list               # must show llama3.1
```
> **No Anthropic/OpenAI key is needed anywhere in this workshop.**

### 0.6 Clone, install, and get the demo app
```bash
git clone https://github.com/QA-Olympians-Academy/droid-detective.git
cd droid-detective
pnpm install                       # uses the pinned pnpm@10.28.0
pnpm run appium:install-driver     # idempotent — installs uiautomator2 if missing

# The demo app APK is git-ignored — download it (WebdriverIO native demo app):
curl -L -o apps/demo.apk \
  "$(curl -s https://api.github.com/repos/webdriverio/native-demo-app/releases/latest | grep -o 'https://[^"]*\.apk')"
unzip -l apps/demo.apk >/dev/null && echo "✓ apps/demo.apk ready"   # package: com.wdiodemoapp
```

### 0.7 Configure `.env`
```bash
cp .env.example .env
```
Confirm it contains (this is the default):
```env
LLM_PROVIDER=ollama
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
PLATFORM=android
DEVICE_UDID=emulator-5554
APP_PATH=apps/demo.apk
```

### 0.8 ✅ Pre-flight smoke test (the gate — students run this and screenshot the result)
```bash
# 1. boot the emulator (headless)
emulator -avd workshop_avd -no-window -no-audio -no-boot-anim -gpu swiftshader_indirect &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 3; done
adb devices                          # expect: emulator-5554  device

# 2. local model responds
curl -s http://localhost:11434/api/tags >/dev/null && echo "✓ ollama up"

# 3. the WDIO suite runs and the app installs (a few tests may fail — that's fine)
pnpm test
```
**Green condition:** `emulator-5554 device`, Ollama up, and `pnpm test` **starts,
installs the app, and runs specs** (some assertions may fail — the point is the
stack works). Students should arrive at this state.

---

## 1. Instructor pre-flight (day-of, ~30 min before)

- [ ] Your own machine passes the entire §0 checklist.
- [ ] `ollama serve` running; `ollama list` shows `llama3.1`.
- [ ] Emulator boots in < 60 s; `adb devices` clean (kill stale ones: `adb kill-server`).
- [ ] `pnpm test` runs; note which specs pass/fail so live demos are predictable.
- [ ] Self-healing demo dry-run works (see §4, block 01:55): break `~Carousel`, run
      the heal loop, confirm it patches to `//*[@resource-id="Carousel"]` and goes green.
- [ ] Projector font ≥ 16pt; terminal + editor + emulator window arranged.
- [ ] A `git stash` / clean branch ready so you can reset demo edits between runs.
- [ ] Offline fallback: pre-recorded clips of the emulator run and the heal loop,
      in case conference Wi-Fi dies mid-demo.

---

## 2. Run-of-show (180 min)

| Time | Block | Mode | Checkpoint |
|------|-------|------|-----------|
| 00:00 | Opening — the fragility problem & "AI & I" | Talk | — |
| 00:15 | Architecture in one picture (Appium · MCP · Agent · loop) | Talk | — |
| 00:30 | **Setup & smoke test** | Hands-on | ✅ everyone green on §0.8 |
| 00:55 | The agent's mind (goals vs steps, DOM interpretation) | Talk+demo | — |
| 01:15 | **Hands-on: the execution loop** (AppClaw / agentic run) | Hands-on | ✅ everyone ran one agent loop |
| 01:45 | *Break* | — | — |
| 01:55 | **Self-healing** (break → heal → green) | Hands-on | ✅ everyone saw a heal |
| 02:25 | Observability (reasoning traces, confidence) | Demo | — |
| 02:40 | End-to-end demo (goal → locators → spec → result) | Live demo | — |
| 02:55 | CI + wrap-up + Q&A | Talk | — |

### Block detail & instructor cues

**00:30 — Setup & smoke test (25 min).** Do *not* teach installation. Run §0.8
live; walk the room. Gate: every student shows `emulator-5554 device` + a running
`pnpm test`. Pair anyone stuck with a neighbour. If >2 are red, use a spare
pre-configured machine / cloud VM.

**01:15 — Execution loop (30 min).** Everyone runs one agentic loop:
```bash
appclaw "Open the Login screen and log in with demo@wdio.dev / Password123!"
```
Show DOM-mode vs vision-mode. Then the deterministic path (zero LLM):
```bash
pnpm run claw:flow flows/login.yaml
```

**01:55 — Self-healing (30 min) — the centrepiece.** Live break→heal:
```bash
# 1. break a selector in a page object (rename to a wrong accessibility id)
#    e.g. droid/pageobjects/swipe.page.ts:  ~Carousel  → ~Carousel-BROKEN
# 2. run the suite → the swipe tests fail; wdio.conf's afterTest snapshots the DOM
pnpm test
# 3. run the healer (local llama3.1, no key)
node .github/scripts/heal-and-retry.js
```
Narrate what scrolls by: *detect the genuinely-failed selector → read the
failure-time DOM snapshot → ask llama3.1 → validate the patch (safe string,
compiles, only-failing selector, target actually in the DOM) → apply → retry.*
Expected end state: `✓ patched … → //*[@resource-id="Carousel"]` and
`✅ Tests passed after self-healing`.

> **Teaching point:** the model is non-deterministic (8B). The value isn't a
> perfect model — it's the **guardrails**: it only patches a selector that
> failed, only if the new one is valid, compiles, and its target exists in the
> captured DOM. A bad suggestion is rejected, never applied. Run it twice to show
> the retry loop absorbing format variance.

**02:55 — CI (5 min).** One slide: AppClaw YAML flows (zero-LLM) as the first
gate; WDIO specs with self-healing *inside* the emulator job; analysis opens an
issue only when real selectors broke. Point to `.github/workflows/android-tests.yml`.

---

## 3. Checkpoints (don't advance the room past a red one)

1. **00:55** — `emulator-5554 device` + `pnpm test` runs for everyone.
2. **01:45** — everyone completed one `appclaw` / flow run.
3. **02:25** — everyone watched a heal go green (or ran it themselves).

---

## 4. Troubleshooting (every one of these was hit while building the workshop)

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Could not find 'aapt2'` | `build-tools` not installed | `sdkmanager "build-tools;34.0.0"` |
| `Cannot find module 'tsconfig-paths/register'` | dep missing | `pnpm add -D tsconfig-paths` (already in repo) |
| `TS5103: Invalid value for '--ignoreDeprecations'` | TS 5.9 rejects `"6.0"` | set `"ignoreDeprecations": "5.0"` in `tsconfig.json` |
| `application at '…/apps/demo.apk' does not exist` | relative app path vs cwd | already fixed — `wdio.conf.ts` resolves the APK from `__dirname` |
| `Could not find a driver for 'UiAutomator2'` | wrong `APPIUM_HOME` | `export APPIUM_HOME=$HOME/.appium`; re-run `appium driver install uiautomator2` |
| `driver 'uiautomator2' is already installed` | driver is a project dep too | harmless — `appium:install-driver` is idempotent |
| `adb: no devices/emulators found` | emulator not booted | boot it (§0.8); `adb kill-server && adb start-server` |
| `Could not find a connected Android device in 20000ms` | Appium started before device ready | wait for `sys.boot_completed=1` before `pnpm test` |
| Emulator dead-slow | no acceleration | Apple Silicon: use `arm64-v8a` image; Intel/Linux: enable HAXM/KVM |
| `npm i -g appclaw` fails on `df-vision-1.1.77.tgz 404` | old appclaw's dep unpublished | install `appclaw@1.9.3` |
| Ollama call hangs / very slow | first load into RAM, or low RAM | pre-`ollama run llama3.1` once; close other apps |
| Healer: "no parseable patch" every retry | 8B format non-determinism | expected occasionally; the script retries 5× — re-run |
| Healer patches a wrong selector | model hallucinated a value | it won't apply — the DOM-existence guard rejects targets not in the snapshot |

### CI-only gotchas (for the GitHub Actions chapter)
| Symptom | Fix |
|---------|-----|
| `Multiple versions of pnpm specified` | remove `version:` from `pnpm/action-setup`; let `packageManager` in `package.json` decide |
| `ERR_PNPM_OUTDATED_LOCKFILE` | commit an up-to-date `pnpm-lock.yaml` |
| Self-heal step: `adb: no devices` | healing must run **inside** the `android-emulator-runner` `script:` block, not as a later step |
| `could not add label: 'ci' not found` | analysis script no longer sets labels; opens the issue plainly |
| `example.spec.ts` failures block CI | excluded via `WDIO_EXCLUDE: specs/example.spec.ts` in the workflow env |

---

## 5. One-shot student setup script (share as `setup.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail
export ANDROID_HOME=${ANDROID_HOME:-$HOME/Library/Android/sdk}
export JAVA_HOME=${JAVA_HOME:-$(brew --prefix openjdk@17 2>/dev/null || echo /usr/lib/jvm/java-17)}
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/build-tools/34.0.0:$PATH"

echo "checks:"; node -v; pnpm -v; java -version 2>&1 | head -1; adb --version | head -1
appium --version; ollama --version; appclaw --version

ollama list | grep -q llama3.1 || ollama pull llama3.1
[ -f apps/demo.apk ] || curl -L -o apps/demo.apk \
  "$(curl -s https://api.github.com/repos/webdriverio/native-demo-app/releases/latest | grep -o 'https://[^"]*\.apk')"
pnpm install
pnpm run appium:install-driver
echo "✅ prerequisites satisfied — boot the emulator and run 'pnpm test' to finish the smoke test"
```

---

## 6. What "success" looks like at 03:00
- Every student booted a local Android emulator and ran the WDIO suite.
- Every student ran at least one **agentic** loop on a real device with **local
  llama3.1** — no cloud key.
- Every student watched (or ran) a **self-heal** turn a broken selector green.
- The class understands the guardrail model: *the LLM proposes, the validators
  dispose* — and where this plugs into CI.
