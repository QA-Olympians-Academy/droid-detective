# Chapter 3 — Hands-On Setup: Building the Agentic Environment

**Duration:** 30 minutes  
**Goal:** every participant has a working environment before writing a line of code.

---

## Required tools

| Tool | Install | Verify |
|------|---------|--------|
| Node.js 20+ | [nodejs.org](https://nodejs.org) | `node -v` |
| pnpm 10 | `corepack enable` (ships with Node) | `pnpm -v` |
| JDK 17 | macOS: `brew install openjdk@17` · else [adoptium.net](https://adoptium.net) | `java -version` |
| Android SDK + build-tools 34 | Android Studio or `sdkmanager` | `adb --version` · `emulator -version` |
| Appium 3 | `npm i -g appium` | `appium --version` |
| UiAutomator2 driver | `appium driver install uiautomator2` | `appium driver list --installed` |
| AppClaw CLI | `npm i -g @appclaw/cli` (scoped 2.x) | `appclaw --version` |
| Ollama (local model) | [ollama.com](https://ollama.com) | `ollama --version` |

> Install the **scoped** `@appclaw/cli` (2.x). The old unscoped `appclaw` (1.x) is
> deprecated and fails to install (`ETARGET … df-vision@1.1.79`).
> Full prerequisites, with the macOS JDK caveat: [PLAYBOOK-3H §0](../../docs/PLAYBOOK-3H.md).

---

## Precondition — Download the demo app

The workshop drives the **WebdriverIO native demo app**. Its APK is not committed
(`apps/*.apk` is git-ignored), so download it once after the checks above and save
it as `apps/demo.apk` (the path `APP_PATH` / `wdio.conf.ts` expect):

```bash
# latest Android release of webdriverio/native-demo-app
curl -L -o apps/demo.apk \
  "$(curl -s https://api.github.com/repos/webdriverio/native-demo-app/releases/latest \
     | grep -o 'https://[^"]*\.apk')"

# verify it is a complete APK
unzip -l apps/demo.apk >/dev/null && echo "✓ apps/demo.apk ready"
```

Package id: `com.wdiodemoapp` (Home / Webview / Login / Forms / Swipe / Drag screens).
The emulator installs it automatically on the first `pnpm test` / AppClaw run.

---

## Step 1 — Environment variables

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Reload: `source ~/.zshrc` — verify: `adb --version`

---

## Step 2 — Clone and install

```bash
git clone https://github.com/your-org/droid-detective.git
cd droid-detective
pnpm install
pnpm run appium:install-driver    # installs UIAutomator2 — one-time only
```

Drop the APK in `apps/demo.apk`.

---

## Step 3 — Create the emulator

```bash
sdkmanager "system-images;android-34;google_apis;x86_64"
avdmanager create avd \
  --name Pixel_7 \
  --package "system-images;android-34;google_apis;x86_64" \
  --device "pixel_7"
```

---

## Step 4 — Start the emulator

```bash
emulator -avd Pixel_7 -no-snapshot &
adb devices   # expected: emulator-5554   device
```

---

## Step 5 — Start the local model (Ollama)

AppClaw and the Bot now call a **local** model through Ollama — no cloud API key required. Start the server and pull the model:

```bash
ollama serve                    # start the local server (skip if already running)
ollama pull llama3.1            # the reasoning model used throughout the course
ollama pull llama3.2-vision     # optional — only needed for vision mode
```

Verify: `ollama list` should show `llama3.1`.

---

## Step 6 — Configure .env

```bash
cp .env.example .env
```

```env
# AppClaw — local model via Ollama
LLM_PROVIDER=ollama
LLM_API_KEY=ollama                       # placeholder — value is ignored by Ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
VISION_MODEL=llama3.2-vision
AGENT_MODE=dom
PLATFORM=android
DEVICE_UDID=emulator-5554
APP_PATH=apps/demo.apk
MAX_STEPS=20
SHOW_TOKEN_USAGE=true

# LambdaTest — OPTIONAL. Only for the cloud-device Bot run (exercise 5b) and the
# bot CI workflow. Not needed for any of the workshop's hands-on blocks.
# LT_USERNAME=your-lt-username
# LT_ACCESS_KEY=your-lt-access-key
# LT_APP_URL=lt://APP123456
```

**Never commit `.env` to git.**

---

## Step 7 — Smoke test

```bash
pnpm test
```

**Green condition:** the run **starts, installs the app, and executes specs.**
Some assertions may fail — that is fine; the point is that the stack works
end to end. Common issues:

| Symptom | Fix |
|---------|-----|
| `Could not connect to Appium` | Check port 4723 is free |
| `No device found` | `adb devices` — restart emulator |
| `App not installed` | Verify APK path in `wdio.conf.ts` |
| `ANDROID_HOME not set` | Re-export and restart terminal |

---

## Step 8 — Validate the agentic environment

Run your first plain-English prompt:

```bash
appclaw "Open the Login screen"
```

Observe the step log. If you see `✓ Navigated to Login screen`, the full stack is working.

---

## Prompt Engineering in this stack

Two techniques are used throughout the course. See `examples/` for worked samples:

| Technique | When to use | Example file |
|-----------|-------------|-------------|
| **Chain-of-Thought** | Complex reasoning, multi-step goals | [chain-of-thought.md](examples/chain-of-thought.md) |
| **Zero/Single-Shot** | Structured output, code generation | [shot-prompting.md](examples/shot-prompting.md) |

Understanding these shapes how you write test goals, system prompts, and healing instructions.

---

## Checkpoint

- [ ] `adb devices` shows `emulator-5554   device`
- [ ] `pnpm test` starts, installs the app, and runs specs (failing assertions are OK)
- [ ] `appclaw --version` returns 2.x
- [ ] `ollama list` shows `llama3.1`
- [ ] `.env` is populated with `LLM_PROVIDER=ollama` and `LLM_MODEL=llama3.1`
- [ ] `appclaw "Open the Login screen"` produces a step log
