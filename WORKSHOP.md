# Test Smarter, Not Harder: Agentic Mobile QA in Practice

**Speaker:** Ioannis Papadakis · Snappi  
**Level:** Intermediate  
**Stack:** Claude Code · Appium · WebdriverIO · AppClaw · GitHub Actions

This course guides you from a working Android environment to a fully agentic test system where AI agents discover elements, plan test steps, execute on real devices, self-heal broken selectors, and report CI failures autonomously.

---

## Schedule

| Time | Chapter | Duration |
|------|---------|----------|
| 09:00 | **Ch1** — A Story About Mobility & the Shift to Agentic Testing | 20 min |
| 09:20 | **Ch2** — Architectural Foundations of Agentic Mobile Test Automation | 25 min |
| 09:45 | **Ch3** — Hands-On Setup: Building the Agentic Environment | 30 min |
| 10:15 | *Break* | 10 min |
| 10:25 | **Ch4** — The Agent's Mind: Reasoning, Planning & Context Understanding | 30 min |
| 10:55 | **Ch5** — Building the Agentic Execution Loop | 45 min |
| 11:40 | *Break* | 10 min |
| 11:50 | **Ch6** — Self-Healing Test Design | 30 min |
| 12:20 | **Ch7** — Agentic Observability for Mobile QA | 30 min |
| 12:50 | *Lunch* | 60 min |
| 13:50 | **Ch8** — Full End-to-End Demo: From High-Level Goal to Autonomous Test Execution | 45 min |
| 14:35 | **Ch9** — CI Integration with GitHub Actions | 30 min |
| 15:05 | *Break* | 10 min |
| 15:15 | **Ch10** — Future Outlook: Next-Gen Mobile QA Systems | 20 min |
| 15:35 | **Ch11** — Q&A + Open Discussion (Including Games!) | 30 min |
| 16:05 | End | |

---

## Chapter 1 — A Story About Mobility & the Shift to Agentic Testing

### The fragility problem

I have been working for years trying to automate many kinds of software products. Mobile Test Automation was by far the most challenging.

Consider a typical enterprise mobile team: 400 automated tests, weekly UI releases, 3 QA engineers spending 30–40% of their sprint on broken selectors. The tests were not wrong. The product was not broken. The automation was **brittle** — and the brittleness was structural.

**Three structural problems:**

1. **Static locators in a moving UI** — a designer renames `~Login-button` to `~btn-login` and 47 tests break overnight. No real regression. Just noise.
2. **Scripted steps in a reasoning problem** — a test says `tap(~checkout-confirm)` and the app says a dialog appeared first. The script has no way to adapt.
3. **Knowledge locked in people** — when your senior automation engineer leaves, the tribal knowledge about timing quirks and launch states goes with them.

### Three things changed in the last 18 months

**1. LLMs reason about UI structure**
A model can understand that a `ViewGroup` with `contentDescription="Login"` is a tab — from contextual reasoning, not a lookup table.

**2. MCP makes reasoning actionable**
The Model Context Protocol lets a model call Appium directly: dump the DOM, tap an element, type text, assert state — all inside a reasoning loop.

**3. "AI & I" — not AI instead of I**
Agents handle mechanical adaptation (healing selectors, navigating new flows). Engineers handle goals, strategy, and edge case judgment.

### The shift in mental model

| Old model | New model |
|-----------|-----------|
| Write selectors manually | Agent discovers selectors from live DOM |
| Fix broken selectors manually | Agent patches selectors on failure |
| Test script = sequential steps | Test goal = intent, agent plans steps |
| CI failure requires human investigation | CI failure triggers healing loop |
| Knowledge locked in people | Knowledge encoded in skills and prompts |

### Discussion questions

1. What percentage of your CI failures are selector mismatches vs real bugs?
2. Which part of your team's workflow is most repetitive?
3. What automation knowledge lives only in people's heads right now?

---

## Chapter 2 — Architectural Foundations of Agentic Mobile Test Automation

### Traditional Appium pipeline

```
Test Script (TypeScript/Python)
      │  W3C WebDriver commands
      ▼
Appium Server  →  UIAutomator2  →  Android app
```

Every step is predefined. Failures are unrecoverable without code changes. The DOM is accessed with `$('~selector')` — no reasoning, just string matching.

### Agentic pipeline

```
High-Level Test Goal (plain English)
            │
            ▼
      LLM Agent  ◄─────────────────────────────────┐
            │  "What should I do next?"             │
            │  tool calls                           │
            ▼                                       │
      MCP Layer                                     │
      ├── get_page_source()                         │
      ├── tap(selector)                             │
      ├── type(selector, text)                      │
      └── write_test_result(pass/fail, message)     │
            │  W3C WebDriver commands               │
            ▼                                       │
      Appium Server → UIAutomator2 → Android app    │
            │  New DOM state / result               │
            └───────────────────────────────────────┘
```

Each pass: **Think → Act → Observe → Repeat**

### The four components

**Appium** — the low-level executor. Translates WebDriver commands to UIAutomator2. Unchanged from traditional automation.

**MCP** — the orchestrator. Defines the typed tool interface between the LLM and Appium. Separates *what to do* (agent decision) from *how to do it* (tool implementation).

**LLM Agent** — the decision-maker. Receives the goal + current DOM + action history. Produces a reasoning trace and a tool call. Repeats until terminal.

**Observability feedback loop** — captures reasoning traces, action logs, and confidence signals. Feeds back into dashboards and healing agents.

### DOM interpretation vs DOM scraping

| | DOM scraping | DOM interpretation |
|---|---|---|
| Input | Raw XML string | Parsed accessibility tree with context |
| Process | Regex / string match | Semantic reasoning |
| Output | Matching node | Understanding of element role |
| Breaks when | Selector changes | Structural meaning changes |

### File-by-file architecture

See `workshop/02-arch-foundations/examples/architecture-overview.md` for the annotated breakdown of how all `bot/` files connect to each other.

---

## Chapter 3 — Hands-On Setup: Building the Agentic Environment

### Required tools

| Tool | Install | Verify |
|------|---------|--------|
| Node.js 20+ | [nodejs.org](https://nodejs.org) | `node -v` |
| pnpm | `npm i -g pnpm` | `pnpm -v` |
| JDK 11+ | [adoptium.net](https://adoptium.net) | `java -version` |
| Android SDK | Android Studio | `adb --version` |
| Claude Code | `npm i -g @anthropic-ai/claude-code` | `claude --version` |
| AppClaw | `npm i -g appclaw` | `appclaw --version` |

### Environment variables

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Clone and install

```bash
git clone https://github.com/your-org/droid-detective.git
cd droid-detective
pnpm install
pnpm run appium:install-driver
```

### Configure .env

```env
ANTHROPIC_API_KEY=sk-ant-...
LLM_PROVIDER=anthropic
LLM_API_KEY=sk-ant-...
AGENT_MODE=dom
PLATFORM=android
DEVICE_UDID=emulator-5554
APP_PATH=apps/demo.apk
MAX_STEPS=20
SHOW_TOKEN_USAGE=true
LT_USERNAME=your-lt-username
LT_ACCESS_KEY=your-lt-access-key
LT_APP_URL=lt://APP123456
```

### Smoke test

```bash
pnpm test
# Expected: 9 passing tests
```

### Validate the agentic environment

```bash
appclaw "Open the Login screen"
```

If you see `✓ Navigated to Login screen`, the full stack is working.

### Prompt engineering techniques

Two techniques used throughout this course. See `workshop/03-setup/examples/`.

**Chain-of-Thought** — ask the model to reason step-by-step before acting. Use when:
- The task has more than 2 sequential decisions
- The outcome depends on a condition you cannot know in advance (current screen state)
- You need the model to explain its reasoning

```
Goal: Log in with valid credentials.

Before acting, reason through:
- What screen are you currently on?
- What navigation is required to reach the login form?
- How will you verify successful login?

Then execute the plan.
```

**Zero-Shot / Single-Shot** — provide zero or one example before the real request:

```
# Zero-shot: model knows the format already
appclaw "Navigate to the Forms screen and toggle the switch"

# Single-shot: anchor output format with one example
Input:  Login screen with ~email-input, ~LOGIN-button
Output: flows/login-valid.yaml with two steps

Now generate for: Checkout screen with ~checkout-item-list, ~checkout-confirm
```

---

## Chapter 4 — The Agent's Mind: Reasoning, Planning & Context Understanding

### What is a high-level test goal?

A goal is a statement of **intent**, not a list of steps.

| Low-level (scripted) | High-level (agentic) |
|---|---|
| `tap('~Login-tab'); type('~email-input', ...); tap('~LOGIN-button')` | `"Log in with valid credentials"` |
| `scroll(0, -500); tap('~product-3')` | `"Add the third product to the cart"` |

### How agents interpret DOM hierarchies

The agent reads the accessibility tree as text and reasons about element identity:

```xml
<android.view.ViewGroup content-desc="Login-tab" clickable="true"/>
```

Agent reasoning:
> *"This is a clickable ViewGroup with content-desc='Login-tab'. It is a navigation tab. To reach the login form, I should tap it using ~Login-tab."*

See `workshop/04-agent-mind/examples/dom-hierarchy-sample.xml` for the full annotated sample.

### Planning next actions

The agent plans one step at a time, re-evaluating after each action:

```
Goal: "Log in and verify the home screen"

Step 1: DOM shows home screen — I need to navigate to Login first → tap(~Login-tab)
Step 2: DOM shows login form — type email → type(~input-email, "alice@example.com")
Step 3: DOM shows email filled — type password → type(~input-password, "10203040")
Step 4: DOM shows both filled — tap login → tap(~button-LOGIN)
Step 5: DOM shows "logged in" — goal met → write_test_result(pass)
```

### Error reasoning

```
NoSuchElementError: ~email-input

Agent reasoning:
- Is the element in the hierarchy under a different name?
- DOM shows: content-desc="input-email"
- The order is reversed: email-input → input-email
- This is a rename, not a removal.
- Retry with ~input-email
```

See `workshop/04-agent-mind/examples/reasoning-trace.md` for a full annotated trace.

### Exercises

- **Exercise 4a** — Given a DOM, write a test plan (`workshop/04-agent-mind/exercises/exercise-4a.md`)
- **Exercise 4b** — Trace an agent's error reasoning (`workshop/04-agent-mind/exercises/exercise-4b.md`)

---

## Chapter 5 — Building the Agentic Execution Loop

### The execution loop

```
Think — LLM reasons about current DOM state
  │  "I need to tap the Login tab first"
  ▼
Act — tool call (tap, type, scroll…)
  │
  ▼
Observe — Appium executes → new DOM returned
  │
  └──► Repeat until terminal tool called
```

### AppClaw — fastest path to the loop

```bash
appclaw "Log in with alice@example.com and 10203040 and verify I am logged in"
```

AppClaw will:
1. Connect to the running emulator
2. Install the app
3. Read the current screen DOM
4. Plan and execute steps in the loop
5. Print a step-by-step log with ✓ / ✗ per action

**DOM mode vs Vision mode:**

| | DOM mode | Vision mode |
|--|----------|-------------|
| `AGENT_MODE` | `dom` | `vision` |
| How it sees the UI | Accessibility XML tree | Screenshot |
| Speed | Fast | Slower |
| Best for | Standard apps | Games, custom renderers |

### The Playground — record flows interactively

```bash
pnpm run claw:play

> tap the Login tab          ✓ tapped ~Login-tab
> type alice@example.com…    ✓ typed into ~input-email
> tap the LOGIN button       ✓ tapped ~button-LOGIN
> verify logged in text      ✓ found on screen
> /export                    ✓ Saved to flows/login-valid.yaml
```

### YAML flows — deterministic, zero LLM cost

```bash
pnpm run claw:flow flows/login.yaml
pnpm run claw:flow flows/forms-toggle.yaml
```

YAML flows run without calling any LLM. Fast, cheap, CI-ready.

### Credentials — never hardcode

```yaml
# .appclaw/env/dev.yaml
secrets:
  email: '${TEST_EMAIL}'
  password: '${TEST_PASSWORD}'
```

```bash
export TEST_EMAIL=alice@example.com
export TEST_PASSWORD=10203040
```

### The Bot — the production agent

For cloud devices, custom tools, or a specific LLM:

```
CLI args + .env
      │
      ▼
WebdriverIO remote()  ──── LambdaTest cloud
      │
      ▼
AI Agent loop
      ├── element_action   ← tap, type, clear, scroll
      ├── keyboard_action  ← Enter, Tab, Back
      ├── wait             ← explicit pauses
      ├── write_error      ← log a failure
      └── write_test_result ← final pass/fail
```

```bash
pnpm run bot \
  --lt-user $LT_USERNAME \
  --lt-key  $LT_ACCESS_KEY \
  --app-id  $LT_APP_URL \
  --test-file SmokeTest.md \
  --log-level debug
```

### AppClaw vs The Bot

| Situation | AppClaw | The Bot |
|-----------|---------|---------|
| Exploratory testing | ✅ fastest | ✅ works |
| CI regression (no LLM cost) | ✅ YAML flows | ❌ always calls LLM |
| Custom tools | ❌ limited | ✅ add any tool |
| Real cloud devices | ❌ local only | ✅ LambdaTest built-in |
| Team owns and extends | ❌ | ✅ full source |

### Exercises

- **Exercise 5a** — Your first execution loop (`workshop/05-execution-loop/exercises/exercise-5a.md`)
- **Exercise 5b** — Run the Bot against LambdaTest (`workshop/05-execution-loop/exercises/exercise-5b.md`)

---

## Chapter 6 — Self-Healing Test Design

### Three categories of fixable failures

**Category A — Rename:** element exists, `content-desc` changed.
```
Before: ~email-input → After: ~input-email
Fix: update the selector
```

**Category B — Structural change:** element exists but is inside a new container.
```
Before: Button directly visible
After:  Button inside a new ScrollView, off-screen
Fix: add scroll before the interaction
```

**Category C — Flow change:** a new screen or dialog was inserted.
```
Before: Login → Home
After:  Login → "Allow notifications?" dialog → Home
Fix: detect and dismiss the dialog, then continue
```

### The healing loop

```
Test fails: selector not found
      ├── Step 1: Parse appium.log → extract failing selectors
      ├── Step 2: adb shell uiautomator dump → get live DOM
      ├── Step 3: Send to Claude → returns JSON patch array
      ├── Step 4: Apply patches to page object files
      └── Step 5: pnpm test retry
```

See `workshop/06-self-healing/examples/heal-and-retry.js` for the full implementation.

### Adaptive navigation strategies

| Unexpected state | Recovery strategy |
|---|---|
| Dialog appeared mid-flow | Read content-desc → tap dismiss → continue |
| Splash/onboarding screen | Tap past or swipe to skip |
| Wrong screen | `keyboard_action(BACK)` until correct screen |
| Loading state | `wait` → re-read DOM when spinner gone |

### Limits of self-healing

Self-healing is a resilience layer, not a substitute for good test design. Do not heal:
- Tests that expose real functional regressions
- Tests where the business logic changed
- Tests where the assertion itself is wrong

### Exercise

- **Exercise 6** — Break → Watch → Heal (`workshop/06-self-healing/exercises/exercise-6.md`)

---

## Chapter 7 — Agentic Observability for Mobile QA

### Why observability is different for agentic systems

In traditional automation, a failure is deterministic: the test did X, expected Y, got Z.

In agentic automation, failure can mean: the agent chose the wrong action, timing was off, healing ran but root cause was unfixed, or the DOM was ambiguous. Without observability, all of these look like "test failed."

### Four observability layers

**Layer 1 — Reasoning traces**
Every step produces a thinking block: what the agent saw, concluded, and decided.

```json
{ "type": "thinking", "thinking": "I can see the Login tab. The Home tab is selected. I need to tap Login-tab first..." }
```

**Layer 2 — DOM interpretation signals**
After each `get_page_source()`, log:
- Number of elements with accessibility IDs vs without
- Which screen was identified
- DOM quality score

**Layer 3 — Action confidence scoring**

| Signal | Low confidence | High confidence |
|--------|---------------|----------------|
| Selector type | Text XPath | Accessibility ID |
| Wait required | Yes | No |
| Retry count | >1 | 0 |

A step with consistent low confidence across runs = a flakiness candidate. Fix the locator before it fails.

**Layer 4 — Failure analysis issues**
When healing cannot recover, `analyse-failures.js` converts the Appium log into a structured GitHub issue with root cause, failing tests, and suggested fix.

### Using observability to explain AI decisions

When an agent makes an unexpected decision:
1. Find the step in the trace log
2. Read the "Reasoning" block
3. Identify what the agent saw that led to the decision
4. If the DOM was ambiguous → add a more specific selector
5. If the goal was ambiguous → tighten the test goal wording

See `workshop/07-observability/examples/reasoning-trace-example.md` for a full annotated trace with confidence annotations.

### Exercise

- **Exercise 7** — Read a trace and identify confidence signals (`workshop/07-observability/exercises/exercise-7.md`)

---

## Chapter 8 — Full End-to-End Demo: From High-Level Goal to Autonomous Test Execution

### The full workflow

```
1. PROVIDE GOAL (plain English narrative)
   "Log in, add item to cart, validate total"
         │
         ▼
2. INSPECT (live DOM via Appium MCP)
   /appium-locators apps/demo.apk
   → Returns ranked locator map for every element
         │
         ▼
3. PLAN (agent + Claude Code)
   Given locators + goal → numbered step plan
         │
         ▼
4. EXECUTE (WebdriverIO + POM)
   /generate-wdio-spec → TypeScript spec
   pnpm test → CI-ready output
         │
         ▼
5. OBSERVE (reasoning trace + result)
   Review trace — did the agent reason correctly?
```

### Step 1: Inspect with Appium MCP

```
> Using mcp-appium, navigate to the Login screen
  and list every element with its accessibility ID.
```

Or use the skill:
```
/appium-locators apps/demo.apk
```

### Locator priority order

| Priority | Strategy | Format | Breaks when |
|----------|----------|--------|------------|
| ✅ 1st | Accessibility ID | `~contentDescription` | `contentDescription` renamed |
| ✅ 2nd | Resource ID | `android=new UiSelector().resourceId(...)` | Resource ID renamed |
| ⚠️ 3rd | Text | `//*[@text="OK"]` | Any copy change |
| ❌ Last | Structural XPath | `//LinearLayout[2]` | Any layout change |

### Step 2: Plan

```
> Based on the locators, write a plan for testing that
  drag-l1 can be placed in drop-l1 and the board can be reset.
```

A good plan includes:
- Navigation steps for each screen transition
- Timing notes (wait for element, not fixed pauses)
- Specific assertions
- At least one edge case

### Step 3: Execute with WebdriverIO + POM

```typescript
export default class BasePage {
  protected async swipe(startX, startY, endX, endY, duration = 500) {
    await browser
      .action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ x: startX, y: startY }).down().pause(100)
      .move({ duration, x: endX, y: endY }).up().perform()
  }
}
```

**The getter pattern — never cache element references:**

```typescript
// ✅ Fresh reference on every access
get loginButton() { return $('~button-LOGIN') }

// ❌ Cached — StaleElementReferenceException
private loginButton = $('~button-LOGIN')
```

### Gesture testing — drag with long-press

```typescript
async dragToDropZone(sourceSelector: string, dropSelector: string) {
  const src = await $(sourceSelector)
  const tgt = await $(dropSelector)
  const srcLoc = await src.getLocation()
  const srcSize = await src.getSize()
  const tgtLoc = await tgt.getLocation()
  const tgtSize = await tgt.getSize()

  await browser
    .action('pointer', { parameters: { pointerType: 'touch' } })
    .move({ x: srcLoc.x + srcSize.width / 2, y: srcLoc.y + srcSize.height / 2 })
    .down()
    .pause(600)   // long press triggers drag recogniser
    .move({ duration: 1000, x: tgtLoc.x + tgtSize.width / 2, y: tgtLoc.y + tgtSize.height / 2 })
    .up().perform()
}
```

### Exercise

- **Exercise 8** — Full narrative goal to running spec (`workshop/08-e2e-demo/exercises/exercise-8.md`)

---

## Chapter 9 — CI Integration with GitHub Actions

### Two workflows, two purposes

| Workflow | Runs | LLM cost | Healing |
|----------|------|----------|---------|
| `appclaw-flows-ci.yml` | AppClaw YAML flows | ❌ none | Manual |
| `android-tests.yml` | WebdriverIO specs | ✅ on failure only | ✅ automatic |

AppClaw flows run fast (no model call per step) as the first CI gate. WebdriverIO specs run second with agentic healing.

### AppClaw flows in CI

```yaml
- name: Run AppClaw flows
  run: |
    for flow in flows/*.yaml; do
      pnpm run claw:flow "$flow"
    done
  env:
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
    DEVICE_UDID: emulator-5554
    APP_PATH: apps/demo.apk
```

No `ANTHROPIC_API_KEY` needed — YAML flows make zero LLM calls.

### KVM acceleration

```yaml
- name: Enable KVM
  run: |
    echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | \
      sudo tee /etc/udev/rules.d/99-kvm4all.rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger --name-match=kvm
```

Without this the emulator runs at ~5% of native speed.

### Self-healing step (runs only on failure)

```yaml
- name: Self-heal failing tests
  if: steps.run_tests.outcome == 'failure'
  run: node .github/scripts/heal-and-retry.js
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Failure analysis issues (main branch only)

```yaml
- name: Analyse failures and open issue
  if: steps.run_tests.outcome == 'failure' && github.ref == 'refs/heads/main'
  run: node .github/scripts/analyse-failures.js
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}
```

### PR locator review

```yaml
review-locators:
  if: github.event_name == 'pull_request'
  steps:
    - name: Review changed locators
      run: node .github/scripts/review-locators.js
      env:
        ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        PR_NUMBER: ${{ github.event.pull_request.number }}
        BASE_SHA: ${{ github.event.pull_request.base.sha }}
        HEAD_SHA: ${{ github.event.pull_request.head.sha }}
```

### Required secrets

| Secret | Required for |
|--------|-------------|
| `TEST_EMAIL` | AppClaw flows |
| `TEST_PASSWORD` | AppClaw flows |
| `ANTHROPIC_API_KEY` | Self-healing, failure analysis, locator review |
| `LT_USERNAME` | Bot workflow (LambdaTest) |
| `LT_ACCESS_KEY` | Bot workflow (LambdaTest) |
| `GITHUB_TOKEN` | Auto-provided |

### Exercises

- **Exercise 9a** — AppClaw flows in CI (`workshop/09-ci-github/exercises/exercise-9a.md`)
- **Exercise 9b** — Wire up the full CI loop (`workshop/09-ci-github/exercises/exercise-9b.md`)

---

## Chapter 10 — Future Outlook: Next-Gen Mobile QA Systems

### Where we are today

| Capability | Status |
|---|---|
| Single-agent loop (Think → Act → Observe) | ✅ Production |
| DOM-based locator healing | ✅ Production |
| YAML flow generation | ✅ Production |
| AI-generated failure analysis | ✅ Production |
| Multi-agent coordination | 🔬 Early research |
| Reinforcement learning from test outcomes | 🔬 Research |
| Natural-language test authoring at scale | 🚀 Emerging |
| Production-grade guardrails | 🚀 Emerging |

### Multi-agent setups

```
Coordinator agent
      ├── Locator specialist     — maintains the accessibility ID map
      ├── Flow specialist        — generates and validates YAML flows
      ├── Healing specialist     — patches selectors on failure
      └── Observability agent    — monitors confidence, reports trends
```

Different parts of the test suite degrade at different rates. A multi-agent system assigns healing bandwidth where it is most needed.

### Reinforcement learning from outcomes

1. Agent heals a selector
2. Healed test passes for N consecutive CI runs
3. System infers the heal was correct → increases confidence
4. Selectors with consistent high confidence are promoted to "trusted"

### Production-grade guardrails

| Risk | Guardrail |
|---|---|
| Agent actions outside test scope | Allowlist of permitted selectors per run |
| Healing introduces incorrect selector | Human review gate before merge |
| Agent generates PII in test data | Credential isolation (env files, secret stores) |
| Agent retries beyond step limit | Hard cap + `write_error` on timeout |

### Discussion questions

1. Which future direction has the highest ROI for your current team?
2. What is the trust barrier that would prevent your organisation from adopting AI-generated tests in CI today?
3. Where does human judgment remain irreplaceable in this future system?

---

## Chapter 11 — Q&A + Open Discussion (Including Games!)

### Open Q&A

Come prepared with at least one question. Suggested categories:

**Technical:**
- How does this work on iOS?
- What happens when the app has no accessibility IDs?
- How do you handle biometric authentication in the agent loop?

**Team and process:**
- How do you convince a team to trust AI-generated tests?
- What does the QA engineer's role look like in an agentic system?
- What does PR review look like when a healing agent proposes a patch?

**Cost and scale:**
- What does this cost per test run?
- How do you run 1000 agent tests in CI without exceeding the LLM budget?
- When is a YAML flow better than an agent run?

### Games

| Game | Players | Time |
|------|---------|------|
| Locator Quiz | Teams of 2–4 | 8 min |
| Fix the Broken Test | Individual | 10 min |
| Selector Bingo | Full group | 8 min |

See `workshop/11-qa-games/games/` for all game materials.

---

## Quick Reference

### Selector cheat sheet

```typescript
$('~accessibilityId')                          // ✅ preferred
$('android=new UiSelector().resourceId("pkg:id/name")') // ✅ preferred
$('//android.widget.TextView[@text="OK"]')     // ⚠️ text XPath
$('//android.widget.EditText[1]')              // ❌ positional — never
```

### Commands

```bash
pnpm test                                      # full WebdriverIO suite
pnpm test --spec droid/specs/x.spec.ts        # single spec
appclaw "goal"                                 # agent run
pnpm run claw:play                             # interactive REPL
pnpm run claw:flow flows/x.yaml               # YAML flow (no LLM)
appclaw --explore "app description"           # generate flows
```

### LLM cost per CI trigger

| Trigger | LLM calls | Cost |
|---------|-----------|------|
| AppClaw YAML flow | 0 | Free |
| AppClaw agent run | ~2–5 per step | Cents per run |
| `heal-and-retry.js` | 1 call on failure | Cents per failure |
| `analyse-failures.js` | 1 call on failure | Cents per failure |
| `review-locators.js` | 1 call per PR | Cents per PR |

### Common failures and fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| `element not displayed after 10000ms` | Wrong selector or slow transition | Recrawl with MCP; increase `waitforTimeout` |
| `Could not connect to Appium` | Appium not started | Check service config in `wdio.conf.ts` |
| `No device found` | Emulator offline | `adb devices` → restart emulator |
| `StaleElementReferenceException` | Element cached | Use getter pattern |
| `tap misses element` | Label mismatch | Recrawl or use `AGENT_MODE=vision` |
| Agent hits MAX_STEPS | Goal too broad | Break into smaller sub-goals |
