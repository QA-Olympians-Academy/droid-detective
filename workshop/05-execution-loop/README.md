# Chapter 5 — Building the Agentic Execution Loop

**Duration:** 45 minutes  
**Prerequisites:** Chapter 3 complete (environment running), Chapter 4 complete (reasoning understood)

---

## Learning objectives

- Understand the Think → Act → Observe → Repeat loop in practice
- Run an AppClaw agent against the demo app
- Build deterministic YAML flows from agent sessions
- Manage credentials safely with env files
- Run the custom Bot agent against a real cloud device

---

## The execution loop

The core loop is the same whether you use AppClaw or the Bot:

```
┌─────────────────────────────────────────────────────────┐
│                   Execution Loop                        │
│                                                         │
│  Goal (plain English)                                   │
│       │                                                 │
│       ▼                                                 │
│  Think — LLM reasons about current DOM state            │
│       │  "I need to tap the Login tab first"            │
│       ▼                                                 │
│  Act — tool call (tap, type, scroll…)                   │
│       │                                                 │
│       ▼                                                 │
│  Observe — Appium executes → new DOM returned           │
│       │                                                 │
│       └──► Repeat until terminal tool called            │
└─────────────────────────────────────────────────────────┘
```

The loop terminates when the agent calls `write_test_result` (pass/fail) or `write_error`, or when the step limit is reached.

---

## AppClaw — fastest path to the loop

AppClaw is a pre-built agentic layer over Appium. Start with:

```bash
appclaw "Log in with alice@example.com and 10203040 and verify I am logged in"
```

AppClaw will:
1. Connect to the running emulator
2. Install the app from `APP_PATH`
3. Read the current screen DOM
4. Plan and execute steps in the loop
5. Print a step-by-step log with ✓ / ✗ per action

### DOM mode vs Vision mode

```env
AGENT_MODE=dom      # reads the accessibility tree (faster, cheaper)
AGENT_MODE=vision   # takes a screenshot (better for canvas/games)
```

DOM mode covers 95% of native Android apps. Use `vision` only when elements have no accessibility attributes.

---

## The Playground — record a flow interactively

The playground is an interactive REPL where you build a flow step by step:

```bash
pnpm run claw:play
```

| Command | What it does |
|---------|-------------|
| Natural language | Execute a step on the device |
| `/steps` | Show accumulated steps so far |
| `/export` | Save as YAML flow to `flows/` |
| `/clear` | Reset step list |
| `/device` | Show connected device info |
| `/help` | Full command reference |

---

## YAML flows — deterministic runs, no LLM cost

Once a flow is recorded, export it. YAML flows run **without calling any LLM** — fast, deterministic, and safe for CI.

```bash
pnpm run claw:flow flows/login.yaml
pnpm run claw:flow flows/forms-toggle.yaml
```

See `examples/login.yaml` and `examples/forms-toggle.yaml` for complete annotated flows.

---

## Credentials — never hardcode

Create `.appclaw/env/dev.yaml` (see `examples/dev.env.yaml`):

```yaml
secrets:
  email: '${TEST_EMAIL}'       # resolved from shell environment
  password: '${TEST_PASSWORD}'
```

Export values in your shell:

```bash
export TEST_EMAIL=alice@example.com
export TEST_PASSWORD=10203040
```

Reference in flows:

```yaml
- type '${secrets.email}' in email field
- type '${secrets.password}' in password field
```

---

## The Bot — the production agent

For cloud devices, custom tools, or a specific LLM, the project ships a custom agent in `bot/`.

```
CLI args + .env
      │
      ▼
WebdriverIO remote()  ──── LambdaTest cloud (Pixel 8 Pro, API 34)
      │
      ▼
  AI Agent loop
      │  tools
      ├── element_action   ← tap, type, clear, scroll
      ├── keyboard_action  ← Enter, Tab, Back
      ├── wait             ← explicit pauses
      ├── write_error      ← log a failure
      └── write_test_result ← final pass/fail
```

### AppClaw vs The Bot

| Situation | AppClaw | The Bot |
|-----------|---------|---------|
| Exploratory testing | ✅ fastest | ✅ works |
| CI regression (no LLM cost) | ✅ YAML flows | ❌ always calls LLM |
| Custom tools | ❌ limited | ✅ add any tool |
| Real cloud devices | ❌ local only | ✅ LambdaTest built-in |
| Team owns and extends | ❌ | ✅ full source |

---

## Exercises

- [Exercise 5a — Your first agent run](exercises/exercise-5a.md)
- [Exercise 5b — Run the Bot against LambdaTest](exercises/exercise-5b.md)
