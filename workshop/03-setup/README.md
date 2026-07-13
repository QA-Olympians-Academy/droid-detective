# Chapter 3 — Hands-On Setup: Building the Agentic Environment

**Duration:** 30 minutes  
**Goal:** every participant has a working environment before writing a line of code.

---

## Required tools

| Tool | Install | Verify |
|------|---------|--------|
| Node.js 20+ | [nodejs.org](https://nodejs.org) | `node -v` |
| pnpm | `npm i -g pnpm` | `pnpm -v` |
| JDK 11+ | [adoptium.net](https://adoptium.net) | `java -version` |
| Android SDK | Android Studio or `sdkmanager` | `adb --version` |
| Claude Code | `npm i -g @anthropic-ai/claude-code` | `claude --version` |
| AppClaw | `npm i -g appclaw` | `appclaw --version` |

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

## Step 5 — Configure .env

```bash
cp .env.example .env
```

```env
ANTHROPIC_API_KEY=sk-ant-...

# AppClaw
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
AGENT_MODE=dom
PLATFORM=android
DEVICE_UDID=emulator-5554
APP_PATH=apps/demo.apk
MAX_STEPS=20
SHOW_TOKEN_USAGE=true

# LambdaTest — required for the Bot
LT_USERNAME=your-lt-username
LT_ACCESS_KEY=your-lt-access-key
LT_APP_URL=lt://APP123456
```

**Never commit `.env` to git.**

---

## Step 6 — Smoke test

```bash
pnpm test
```

Expected: 9 passing tests. Common issues:

| Symptom | Fix |
|---------|-----|
| `Could not connect to Appium` | Check port 4723 is free |
| `No device found` | `adb devices` — restart emulator |
| `App not installed` | Verify APK path in `wdio.conf.ts` |
| `ANDROID_HOME not set` | Re-export and restart terminal |

---

## Step 7 — Claude Code authentication

```bash
claude   # opens browser — log in with your Anthropic account
```

Verify Claude has project context:
```
> What test specs exist in this project?
```

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
- [ ] `pnpm test` passes all 9 tests
- [ ] `appclaw --version` returns 1.1.x or higher
- [ ] `claude --version` returns a version number
- [ ] `.env` is populated with `ANTHROPIC_API_KEY`
- [ ] `appclaw "Open the Login screen"` produces a step log
