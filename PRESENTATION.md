---
marp: true
theme: default
paginate: true
style: |
  section {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 22px;
    padding: 40px 60px;
    background: #0f1117;
    color: #e2e8f0;
  }
  h1 { color: #7dd3fc; font-size: 2em; margin-bottom: 0.3em; }
  h2 { color: #38bdf8; font-size: 1.4em; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 0.6em; }
  h3 { color: #93c5fd; font-size: 1.1em; margin-bottom: 0.4em; }
  code { background: #1e293b; color: #7dd3fc; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
  pre { background: #1e293b; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px; font-size: 0.75em; line-height: 1.5; }
  pre code { background: transparent; padding: 0; color: #e2e8f0; }
  table { border-collapse: collapse; width: 100%; font-size: 0.85em; }
  th { background: #1e3a5f; color: #7dd3fc; padding: 8px 12px; text-align: left; }
  td { border-top: 1px solid #1e293b; padding: 6px 12px; }
  tr:nth-child(even) td { background: #0f1a2e; }
  strong { color: #fbbf24; }
  em { color: #a5f3fc; }
  ul li { margin-bottom: 4px; }
  .lead h1 { font-size: 2.4em; text-align: center; margin-top: 0.6em; }
  .lead p { text-align: center; color: #94a3b8; }
  section.title { background: linear-gradient(135deg, #0f1117 0%, #0c1a35 100%); }
  section.module { background: #0f1117; }
  section.exercise { background: #0a1a0a; border-top: 4px solid #22c55e; }
  section.demo { background: #1a0f0f; border-top: 4px solid #f59e0b; }
  .badge { display: inline-block; background: #1e3a5f; color: #7dd3fc; border-radius: 12px; padding: 2px 10px; font-size: 0.7em; font-weight: bold; margin-left: 8px; }
  footer { color: #475569; font-size: 0.65em; }
---

<!-- _class: title lead -->

# Test Smarter, Not Harder
# Agentic Mobile QA in Practice

*Ioannis Papadakis · Snappi*
*AutomationSTAR 2026 · Wednesday 4 November · 09:00–16:05*

---

<!-- paginate: false -->

## About Me

**Ioannis Papadakis**
Senior SDET at Snappi (Greece)

- Building mobile automation infrastructure for a fintech super-app
- Contributor to Appium ecosystem tooling
- Spending too much time making AI agents talk to emulators

**What I'll share today:** the architecture we built, the mistakes we made, and why we think agentic automation is no longer optional.

---

## Who This Is For

- **Senior QA engineers** moving beyond script-based automation
- **SDETs** who maintain large Appium/WebdriverIO suites
- **Automation architects** evaluating the next stack
- **Engineering leaders** who need resilient CI on mobile

**No prior AI experience required** — but you should be comfortable with terminal commands.

---

<!-- paginate: true -->

## What You Will Build Today

By 16:05 you will have a running, end-to-end agentic workflow:

1. **AI agent** that reads DOM hierarchy and plans test steps
2. **Appium + MCP** integration that gives Claude live device access
3. **AppClaw YAML flows** that run deterministically — zero LLM cost
4. **Self-healing** selector recovery from a three-category failure model
5. **Agentic observability** with reasoning traces and confidence scoring
6. **WebdriverIO spec** with gestures and Page Object Model
7. **GitHub Actions** pipeline with AppClaw CI gate and AI failure analysis

All on a real Android device or emulator. All code is yours to keep.

---

## Full Day Schedule

| Time | Chapter |
|------|---------|
| 09:00 | **Ch 1 — The Story Shift** |
| 09:30 | **Ch 2 — Architecture & Foundations** |
| 10:00 | **Ch 3 — Setup & Tooling** |
| 10:30 | **Ch 4 — The Agent's Mind** |
| 11:00 | **Ch 5 — The Execution Loop** |
| 11:45 | **Ch 6 — Self-Healing Selectors** |
| 12:15 | **Ch 7 — Agentic Observability** |
| 13:00 | *Lunch* |
| 13:45 | **Ch 8 — E2E Demo** |
| 14:30 | **Ch 9 — CI with GitHub Actions** |
| 15:00 | **Ch 10 — Future Outlook** |
| 15:30 | **Ch 11 — Q&A Games** |
| 16:05 | *Close* |

---

<!-- _class: title lead -->

# Chapter 1
## The Story Shift

*09:00 – 09:30 · Why agents, why now*

---

## Mobile Testing Has a Fragility Problem

The average enterprise mobile test suite:

- **30–60%** of failures are selector mismatches, not real bugs
- Redesign → **hundreds of broken tests** overnight
- Locator hunting consumes more time than writing new tests
- CI is green until a designer renames a button

This isn't a skill gap. It's a **structural problem** — static locators cannot adapt to a living UI.

---

## Three Things Changed in the Last 18 Months

**1. LLMs can reason about UI hierarchies**
Not just pattern-match text — actually understand that a `ViewGroup` with `contentDescription="Login"` is a button.

**2. MCP gives agents real tool access**
Claude can call Appium directly: dump hierarchy, tap elements, type text, assert state — in a tool loop, not just in chat.

**3. Local models are capable — and free — enough for CI**
A full test-generation cycle now runs on free local models (llama3.1 via Ollama) — no per-token cost, and slower than cloud but fine for CI on your own compute.

The infrastructure finally caught up with the idea.

---

## What Stayed the Same

Appium is still the bridge. W3C WebDriver is still the protocol. UIAutomator2 is still on the device.

**Agents sit on top — they don't replace the stack.**

```
Your test goal (plain English or spec file)
          │
          ▼
     AI Agent ← reasons about what to do next
          │   calls tools
          ▼
    Appium MCP ← live DOM inspection + interactions
          │   W3C WebDriver
          ▼
    UIAutomator2 ← native Android instrumentation
          │
          ▼
     Android app
```

---

## The Old Way vs The Agentic Way

| | Traditional | Agentic |
|--|-------------|---------|
| Write tests | Manual selector hunting | Goal → agent generates |
| Selector breaks | CI fails, dev fixes | Agent self-heals |
| New screen | Dump XML, map IDs | Agent crawls at runtime |
| CI failure | Read logs manually | Agent analyses & files issue |
| Requirements → tests | JIRA + manual effort | Agent reads page, writes spec |

**Same Appium. Same device. Fundamentally different feedback loop.**

---

<!-- _class: title lead -->

# Chapter 2
## Architecture & Foundations

*09:30 – 10:00 · The full stack*

---

## What Is a Test Agent?

An agent is a **reasoning loop** between an LLM and a set of tools.

```
Goal: "Verify login works with valid credentials"
        │
        ▼
   [Think] What do I need to do first?
        │
        ▼
   [Tool] appium.getPageSource()  → returns DOM XML
        │
        ▼
   [Think] I see ~Login tab. I should tap it.
        │
        ▼
   [Tool] appium.tap("~Login")
        │
        ▼
   [Think] Now fill credentials…
        └─ repeat until goal is met or max steps reached
```

---

## The Agent Loop

```typescript
while (!done && steps < MAX_STEPS) {
    const response = await claude.messages.create({
        model: 'llama3.1',
        tools: appiumTools,          // getPageSource, tap, type, assert…
        messages: conversationHistory
    })

    if (response.stop_reason === 'end_turn') {
        done = true
    } else {
        const result = await dispatchTool(response.tool_use)
        conversationHistory.push(assistantTurn, toolResultTurn)
    }
}
```

The model decides **what tool to call next**. Your code decides **what tools exist**.

---

## Tool Design — The Key Decision

**Too narrow:** Agent gets stuck when the UI changes

```typescript
{ name: 'tap_login_button',   // ❌ only works for this one button
  description: 'Taps the login button' }
```

**Too broad:** Agent hallucinates actions

```typescript
{ name: 'do_anything',         // ❌ no constraints
  description: 'Does a mobile action' }
```

**Right level:**

```typescript
{ name: 'tap_element',         // ✅ stable, reusable
  description: 'Taps element by accessibility ID or XPath',
  input_schema: { selector: { type: 'string' } } }
```

---

## Appium MCP — Live Device Access for Claude

The `@appium/mcp-server` exposes Appium as MCP tools:

```bash
npm i -g @appium/mcp-server
```

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "mcp-appium": {
      "command": "appium-mcp",
      "args": []
    }
  }
}
```

Now Claude Code can call Appium directly — no wrapper code needed.

---

## What MCP Gives Claude

Inside a Claude Code session, after MCP is wired:

```
> What elements are on the current screen?

Claude calls: mcp-appium.getPageSource()
Returns: full accessibility tree XML

Claude responds:
  ~Home-screen     (ScrollView, visible)
  ~Login           (View, clickable)
  ~Forms           (View, clickable)
  WEBDRIVER        (TextView, not clickable)
  Demo app for the appium-boilerplate (TextView)
```

Real-time, no manual dump, no XML parsing.

---

## Four Components of the Stack

| Component | Role |
|-----------|------|
| **LLM (llama3.1, local via Ollama)** | Reasons about the UI, decides what to do next |
| **MCP / tool layer** | Exposes Appium actions as callable functions |
| **Appium + UIAutomator2** | Executes actions on the real device or emulator |
| **Test runner (WebdriverIO)** | Provides spec structure, assertions, CI hook |

The agent orchestrates all four — you configure the boundaries of each.

---

<!-- _class: title lead -->

# Chapter 3
## Setup & Tooling

*10:00 – 10:30 · Environment, prompt engineering*

---

## Tool Requirements

| Tool | Version | Check |
|------|---------|-------|
| Node.js | ≥ 20 | `node -v` |
| pnpm | ≥ 10 | `pnpm -v` |
| Java JDK | 17 | `java -version` |
| Android SDK | API 34 | `sdkmanager --list` |
| Appium | 2.x | `appium -v` |
| AppClaw | latest | `appclaw --version` |
| Ollama | latest | `ollama --version` |
| Claude Code | latest | `claude --version` |

```bash
# Verify everything at once
pnpm run check:env

# One-time local LLM setup (install from https://ollama.com)
ollama serve            # start the local model server
ollama pull llama3.1    # download the workshop model
```

---

## Required Environment Variables

```env
# Ollama (local — no cloud API key needed)
LLM_PROVIDER=ollama
LLM_API_KEY=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.1
VISION_MODEL=llama3.2-vision

# AppClaw / agent
AGENT_MODE=dom
PLATFORM=android
DEVICE_UDID=emulator-5554
APP_PATH=apps/demo.apk
MAX_STEPS=20
SHOW_TOKEN_USAGE=true

# Test credentials
TEST_EMAIL=alice@example.com
TEST_PASSWORD=10203040
```

---

## Prompt Engineering — Two Techniques

**Chain-of-Thought (CoT)** — ask the model to reason step by step

```
Before tapping any element, state which screen you are on,
what element you plan to interact with, and why you chose that locator.
```

Use CoT when the agent needs to **plan** (multi-step navigation, drag & drop).

**Shot prompting** — anchor with a concrete example

```
Example — login flow step:
  Observe: email field ~input-email is visible
  Action: type 'alice@example.com' into ~input-email
  Verify: field value matches typed text
```

Use shot prompting to enforce **output format consistency**.

---

## When to Use Each

| Scenario | Technique | Why |
|----------|-----------|-----|
| Test goal decomposition | CoT | Multi-step, order matters |
| Selector selection | CoT | Requires reasoning about stability |
| Output format (YAML flow) | Shot | Anchors to exact schema |
| Error classification (A/B/C) | Shot | Consistent category output |
| Self-healing patch | Both | Reason first, format output |
| Locator review | Shot | Consistent PR comment format |

---

<!-- _class: exercise -->

## Exercise 3 — Environment Smoke Test

**Part A — Verify toolchain**

```bash
pnpm run check:env
adb devices
```

Both should complete without errors.

**Part B — First agent run**

```bash
appclaw "Open the Login screen and verify the email field is visible"
```

Watch the emulator. Count the Think→Act→Observe cycles in the log.

**Answer:** How many steps did it take? Did the agent pick `~input-email`?

---

<!-- _class: title lead -->

# Chapter 4
## The Agent's Mind

*10:30 – 11:00 · DOM reading, reasoning, planning*

---

## Think → Act → Observe

Every agent step is the same three-phase cycle:

```
 ┌──────────────────────────────────────────────┐
 │  THINK                                        │
 │  "I am on the Login screen. I need to type   │
 │   into the email field. The best locator is  │
 │   ~input-email (contentDescription present)."│
 └────────────────────┬─────────────────────────┘
                      │
 ┌────────────────────▼─────────────────────────┐
 │  ACT                                          │
 │  tool: tap_element  selector: ~input-email   │
 └────────────────────┬─────────────────────────┘
                      │
 ┌────────────────────▼─────────────────────────┐
 │  OBSERVE                                      │
 │  getPageSource() → keyboard visible, field   │
 │  focused. Proceed to type credential.        │
 └──────────────────────────────────────────────┘
```

---

## How the Agent Reads the DOM

```xml
<android.view.ViewGroup
  content-desc="input-email"
  resource-id="com.wdiodemoapp:id/email"
  clickable="true"
  bounds="[32,400][1048,512]" />
```

Agent priority for this element:

1. `content-desc="input-email"` → selector `~input-email` ✅ **use this**
2. `resource-id="...id/email"` → `id:com.wdiodemoapp:id/email` ✅ fallback
3. `bounds` → ❌ never — pixel coordinates break on any screen size change

---

## Reasoning Trace — Annotated

```
Step 1 — THINK:
  Screen: Login. Goal: fill credentials.
  I see ~input-email with contentDescription — HIGH confidence locator.

Step 2 — ACT: tap ~input-email

Step 3 — OBSERVE: keyboard appeared, field has focus. ✅

Step 4 — ACT: type 'alice@example.com'

Step 5 — OBSERVE: field value matches. Next: password field.
  I see ~input-password — HIGH confidence.

Step 6 — ACT: type password into ~input-password

Step 7 — ACT: tap ~button-LOGIN

Step 8 — OBSERVE: "You are logged in!" visible on screen. ✅ DONE
```

---

## Error Reasoning — Three Failure Categories

When a selector fails, the agent classifies the failure:

| Category | What happened | Example |
|----------|--------------|---------|
| **A — Rename** | Same element, new label | `~input-email` → `~email-input` |
| **B — Structural** | Container changed | Element moved inside new `FrameLayout` |
| **C — Flow change** | New screen or step required | Auth gate added before login |

The category determines the healing strategy — patch the locator (A), re-crawl the subtree (B), or revise the test plan (C).

---

<!-- _class: exercise -->

## Exercise 4a — Read the DOM, Build a Plan

Open `workshop/04-agent-mind/examples/dom-hierarchy-sample.xml`.

1. List every element with a `content-desc` attribute
2. For each, write: selector, element type, is it interactive?
3. Build a 4-step test plan using **Observe / Action / Verify** format:
   - Goal: "Open Login, fill credentials, tap LOGIN, verify logged in"

Use no code — natural language only. This is the agent's internal reasoning.

---

<!-- _class: exercise -->

## Exercise 4b — Error Reasoning

A test reports:

```
NoSuchElementError: ~cart-tab not found
```

The live DOM shows `~Checkout-tab` instead.

1. Classify the failure (Category A, B, or C)
2. Write the reasoning the agent should produce
3. Write the JSON healing patch:

```json
{ "file": "droid/pageobjects/main.page.ts",
  "old": "~cart-tab",
  "new": "~Checkout-tab" }
```

---

<!-- _class: title lead -->

# Chapter 5
## The Execution Loop

*11:00 – 11:45 · AppClaw, YAML flows, the Bot*

---

## AppClaw — An Agent You Can Use Today

AppClaw is a pre-built agentic layer over Appium.

```bash
npm i -g appclaw
```

**Plain English mode:**

```bash
appclaw "Log in with alice@example.com and verify I am logged in"
```

```
Step 1: Tap the Login tab         → tapped ~Login
Step 2: Type email address        → typed into ~input-email
Step 3: Type password             → typed into ~input-password
Step 4: Tap LOGIN                 → tapped ~button-LOGIN
Step 5: Verify "logged in" text   → found on screen ✅
```

No selectors. No page object. Just the goal.

---

## The Playground — Interactive Agent

Build flows step by step:

```bash
pnpm run claw:play
```

```
> tap the Login tab
  ✓ tapped ~Login

> type alice@example.com in the email field
  ✓ typed into ~input-email

> verify logged in text is visible
  ✓ "logged in" found on screen

> /export
  ✓ Saved to flows/login.yaml
```

Use `/steps`, `/export`, `/clear`, `/device`, `/help`.

---

## YAML Flows — Agent Output Without Runtime Cost

Exported flows run **without any LLM at execution time**:

```yaml
name: Login — valid credentials
platform: android
---
setup:
  - open demo app
  - wait until Login tab is visible

steps:
  - tap Login tab
  - type '${secrets.email}' in email field
  - type '${secrets.password}' in password field
  - tap LOGIN button

assertions:
  - verify 'logged in' is visible
```

```bash
pnpm run claw:flow flows/login.yaml
```

Fast. Cheap. CI-ready. **Zero LLM calls.**

---

## Credentials Without Hardcoding

```yaml
# .appclaw/env/dev.yaml
variables:
  app_name: demo
secrets:
  email: '${TEST_EMAIL}'        # resolved from shell env
  password: '${TEST_PASSWORD}'  # redacted in logs as ***
```

```bash
export TEST_EMAIL=alice@example.com
export TEST_PASSWORD=10203040
pnpm run claw:flow flows/login.yaml
```

Secrets never appear in flow files or logs.

---

## The Bot — Build Your Own Agentic Runner

```
CLI args + .env
      │
      ▼
WebdriverIO remote() ─────────── LambdaTest cloud (Pixel 8 Pro)
      │
      ▼
callAgentInit()
      │  page source + system prompt
      ▼
callLlmAgentLoop()  ◄──────────── OpenRouter (GPT-4o / Claude / Gemini)
      │
      ├─ tool_calls? YES
      │       ▼
      │  executeMobileDriverLoop()
      │       ├─ element_action  → tap, type, scroll
      │       ├─ keyboard_action → hide keyboard
      │       ├─ wait            → pause
      │       └─ write_test_result → end ✅ / ❌
      │
      └─ tool_calls? NO → test complete
```

---

## Why Build Your Own?

AppClaw is excellent for exploration and YAML flows. You need a custom agent when:

- **Real cloud devices** — LambdaTest, BrowserStack, Sauce Labs
- **Custom tools** — biometrics mock, deep link injection, network throttle
- **Any LLM** — GPT-4o, Claude, Gemini, Grok — swap per run
- **Your system prompt** — tuned to your app's quirks and edge cases
- **Team owns the code** — extend, audit, version-control the agent itself

---

<!-- _class: exercise -->

## Exercise 5a — Record a YAML Flow

```bash
pnpm run claw:play
```

1. Navigate to the Forms screen
2. Toggle the switch on and off
3. Verify the switch state after each toggle
4. `/export` — save as `flows/forms-toggle.yaml`

Then run it without the playground:

```bash
pnpm run claw:flow flows/forms-toggle.yaml
```

**Goal:** the flow runs and exits ✅ with zero LLM calls.

---

<!-- _class: exercise -->

## Exercise 5b — Run the Bot

Create `bot/prompt-templates/SmokeTest.md`:

```markdown
### Smoke Test
1. Verify Home screen shows WEBDRIVER title
2. Navigate to Login — verify email + password fields visible
3. Navigate to Forms — verify text input and switch visible
4. Report overall pass/fail
```

Run it:

```bash
pnpm run bot:debug \
  --lt-user $LT_USERNAME \
  --lt-key  $LT_ACCESS_KEY \
  --app-id  lt://APP123456 \
  --test-file SmokeTest.md
```

Watch the log: LLM picks a tool → driver executes → page source feeds back → repeat.

---

<!-- _class: title lead -->

# Chapter 6
## Self-Healing Selectors

*11:45 – 12:15 · When the UI moves*

---

## The Self-Healing Problem

A selector breaks in CI. Traditional outcome:

```
1. CI fails
2. Dev gets paged
3. Dev opens XML dump
4. Dev finds the new selector
5. Dev updates the page object
6. Dev opens a PR
7. CI passes again

Total time: 2–4 hours
```

Agentic outcome: *CI heals itself in the same run.*

---

## The Healing Loop

```
Test fails: ~input-email not found
        │
        ▼
Agent calls appium.getPageSource()
        │
        ▼
Agent: "I see ~email-input — likely renamed (Category A)"
        │
        ▼
Agent writes JSON patch → applyPatches() updates page object
        │
        ▼
pnpm test retried → passes ✅
        │
        ▼
PR opened with selector fix for human review
```

---

## heal-and-retry.js — Key Steps

```javascript
// 1. Extract failed selectors from appium.log
const selectors = extractFailedSelectors(log)

// 2. Get live DOM via ADB
const hierarchy = execSync('adb shell uiautomator dump /dev/stdout').toString()

// 3. Ask the local model (llama3.1) for patches
const { patches } = await getPatches(selectors, hierarchy)
// patches: [{ file, old, new }, ...]

// 4. Apply to page objects
for (const p of patches) {
    const src = fs.readFileSync(p.file, 'utf8')
    fs.writeFileSync(p.file, src.replaceAll(p.old, p.new))
}

// 5. Retry
execSync('pnpm test')
```

---

## Limits of Self-Healing

| Healable | Not healable |
|----------|-------------|
| Category A — selector rename | Category C — new required screen |
| Category B — element moved in subtree | Missing feature flag or auth gate |
| Minor layout restructure | Missing page object for new screen |

Self-healing is a CI safety net, not a substitute for keeping page objects current. When healing fails, `analyse-failures.js` opens a GitHub Issue for human review.

---

<!-- _class: exercise -->

## Exercise 6 — Break It and Watch It Heal

1. Edit `droid/pageobjects/login.page.ts`: change `~input-email` to `~input-email-BROKEN`
2. Push to a branch and watch the CI run
3. Observe the heal step in the Actions log
4. Classify the failure (A, B, or C)
5. Verify the patched page object in the PR opened by the heal step

**Bonus:** Design a Category B failure scenario — what structural change would force a subtree re-crawl?

---

<!-- _class: title lead -->

# Chapter 7
## Agentic Observability

*12:15 – 13:00 · Understanding what the agent did and why*

---

## Four Observability Layers

| Layer | What you get | Where to look |
|-------|-------------|--------------|
| **Reasoning traces** | Why the agent chose each action | Agent step log |
| **DOM interpretation signals** | Which selectors were evaluated | `SHOW_TOKEN_USAGE=true` |
| **Action confidence scoring** | HIGH / MEDIUM / LOW per step | Annotated trace |
| **AI failure analysis** | Structured GitHub Issue on breakage | Actions → Issues |

Without observability, mobile CI failures are unreadable. With it, the failure log explains itself.

---

## Reading a Reasoning Trace

```
Step 3 — THINK:
  [HIGH confidence] ~button-LOGIN has contentDescription, clickable=true.
  This is the primary submit action.

Step 7 — THINK:
  [MEDIUM confidence] Cart icon has no contentDescription.
  Using XPath text match — may break on copy change.
  Recommend: add contentDescription="cart-tab" to the app.

Step 9 — THINK:
  [LOW confidence] Four ViewGroups at same depth, none labelled.
  Using index[2] as last resort.
  Recommend: a11y audit of this screen.
```

Confidence reflects locator quality, not step success.

---

## Action Confidence Scoring

```typescript
function scoreAction(element: UiElement): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (element.contentDescription)          return 'HIGH'
    if (element.resourceId && !isGenerated(element.resourceId))
                                             return 'HIGH'
    if (element.text && isStableText(element.text))
                                             return 'MEDIUM'
    if (element.className && element.index)  return 'LOW'
    return 'LOW'
}
```

Log `LOW` confidence actions as warnings — they're the selectors most likely to break.

---

## AI Failure Analysis — GitHub Issue

```javascript
// analyse-failures.js
const log = fs.readFileSync('appium.log', 'utf8').slice(-12000)

const { content } = await client.messages.create({
    model: 'llama3.1',
    messages: [{ role: 'user', content:
        `Mobile suite failed. Log:\n${log}\n\n` +
        `Respond with:\n## Summary\n## Failing tests\n` +
        `## Error details\n## Suggested fix`
    }]
})

execSync(`gh issue create --title "CI failure ${date}" \
  --body "${content[0].text}" --label "test-failure,automated"`)
```

---

<!-- _class: exercise -->

## Exercise 7 — Annotate a Reasoning Trace

Open `workshop/07-observability/examples/reasoning-trace-example.md`.

1. Add `[HIGH]`, `[MEDIUM]`, or `[LOW]` confidence tags to each action step
2. Identify the two steps that should trigger a developer warning
3. Fill in the observability summary table:
   - Total steps / HIGH confidence / MEDIUM / LOW
4. Write a one-paragraph developer ticket for the missing `contentDescription`

---

<!-- _class: title lead -->

# Chapter 8
## E2E Demo

*13:45 – 14:30 · Full workflow, POM, gestures*

---

## The Full Five-Step Workflow

```
Step 1: GOAL
  "Verify drag items can be placed into their drop zones and reset"

Step 2: INSPECT
  mcp-appium → dump live DOM → map selectors on Drag screen

Step 3: PLAN
  Agent: navigate → assert screen → drag-l1 → drop-l1 → verify → reset

Step 4: EXECUTE
  WebdriverIO spec with DragPage extending BasePage

Step 5: OBSERVE
  Reasoning trace annotated — HIGH confidence on all drag selectors ✅
```

---

## The Foundation: BasePage

```typescript
export default class BasePage {
    protected async swipe(
        startX: number, startY: number,
        endX: number, endY: number,
        duration = 500
    ): Promise<void> {
        await browser
            .action('pointer', { parameters: { pointerType: 'touch' } })
            .move({ x: startX, y: startY })
            .down().pause(100)
            .move({ duration, x: endX, y: endY })
            .up().perform()
    }

    async waitForElement(selector: string, timeout = 10000) {
        const el = await $(selector)
        await el.waitForDisplayed({ timeout })
        return el
    }
}
```

---

## The Getter Pattern — Why It Matters

```typescript
// ❌ WRONG — fetched once, goes stale after navigation
const btn = await $('~button-LOGIN')
await page.navigateAway()
await btn.click()   // StaleElementReferenceException

// ✅ RIGHT — getter re-queries the DOM on each access
get submitButton() { return $('~button-LOGIN') }

await mainPage.submitButton.click()   // fresh query every time
```

Every element in a page object is a getter. Never a stored reference.

---

## Gesture Testing — Drag & Drop

```typescript
async dragToDropZone(sourceSelector: string, dropSelector: string) {
    const src = await $(sourceSelector)
    const tgt = await $(dropSelector)
    const srcLoc = await src.getLocation()
    const tgtLoc = await tgt.getLocation()
    const srcSize = await src.getSize()
    const tgtSize = await tgt.getSize()

    await browser
        .action('pointer', { parameters: { pointerType: 'touch' } })
        .move({ x: Math.round(srcLoc.x + srcSize.width / 2),
                y: Math.round(srcLoc.y + srcSize.height / 2) })
        .down().pause(600)           // long press triggers drag
        .move({ duration: 1000,
                x: Math.round(tgtLoc.x + tgtSize.width / 2),
                y: Math.round(tgtLoc.y + tgtSize.height / 2) })
        .up().perform()
}
```

---

## Locator Stability — Priority Order

| Priority | Strategy | Survives redesign? |
|----------|----------|--------------------|
| ✅ 1st | `~accessibilityId` | Yes — only breaks if dev changes `contentDescription` |
| ✅ 2nd | `resource-id` | Yes — only breaks if resource ID renamed |
| ⚠️ 3rd | XPath by text | No — any copy change breaks it |
| ❌ Last | Structural XPath | No — any layout change breaks it |

**The agent always prefers accessibility IDs.** If none exist — it asks you to add them.

---

<!-- _class: exercise -->

## Exercise 8 — Inspect → Plan → Execute → Observe

**Part 1 — Inspect**

```
> Using mcp-appium, navigate to the Drag screen
  and list every element with its accessibility ID.
```

**Part 2 — Plan**

Write a natural-language test plan: navigate → assert → drag → verify → reset.

**Part 3 — Execute**

Implement the plan as a WebdriverIO spec using DragPage. Run it: `pnpm test`

**Part 4 — Observe**

Annotate the reasoning trace with confidence scores. Were any LOW?

---

<!-- _class: title lead -->

# Chapter 9
## CI with GitHub Actions

*14:30 – 15:00 · Two workflows, two purposes*

---

## Two Workflows, Two Purposes

```
Push / PR
    │
    ├──► appclaw-flows.yml  (fast, no LLM)
    │         ├── Run flows/login.yaml
    │         ├── Run flows/forms-toggle.yaml
    │         └── Run flows/*.yaml  ──── fail? → artifact uploaded
    │
    └──► android-tests.yml  (WebdriverIO + self-healing)
              ├── 1. Checkout + pnpm install
              ├── 2. Install UIAutomator2 driver
              ├── 3. Start Android emulator (KVM-accelerated)
              ├── 4. pnpm test  ──── pass? → done
              │              └──── fail? ──►
              │                 ├── heal-and-retry.js → pass? → ✅
              │                 └── analyse-failures.js → GitHub Issue
              └── 5. Upload artifacts (screenshots + appium.log)
```

---

## AppClaw Flows in CI — Zero LLM Cost

```yaml
- name: Run AppClaw flows
  uses: reactivecircus/android-emulator-runner@v2
  with:
    api-level: 34
    arch: x86_64
    script: |
      FAILED=0
      for flow in flows/*.yaml; do
        if pnpm run claw:flow "$flow"; then
          echo "✅ $flow passed"
        else
          echo "❌ $flow FAILED"
          FAILED=1
        fi
      done
      exit $FAILED
  env:
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
  continue-on-error: true   # allow artifact upload on failure
```

---

## LLM Cost in CI

| Trigger | LLM calls | Cost |
|---------|-----------|------|
| AppClaw YAML flow | **0** | **Free** — no LLM |
| AppClaw agent run | ~2–5 per step | **Free** (local) — slower |
| Bot agent run | ~2–5 per step | **Free** (local) — slower |
| `heal-and-retry.js` | 1 call on failure | **Free** (local) |
| `analyse-failures.js` | 1 call on failure | **Free** (local) |

**YAML flows are the CI default.** Agent runs are for exploration, debugging, and healing — not the steady-state regression gate.

---

## KVM Acceleration — Required

On Ubuntu runners, without KVM the emulator runs at ~5% of native speed:

```yaml
- name: Enable KVM
  run: |
    echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | \
      sudo tee /etc/udev/rules.d/99-kvm4all.rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger --name-match=kvm
```

Must run **before** the emulator step. Emulator boot: ~4 min without KVM, ~45 s with.

---

## pnpm Caching — Order Matters

```yaml
# ✅ CORRECT — pnpm/action-setup BEFORE setup-node
- uses: pnpm/action-setup@v4
  with:
    version: 10

- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'       # ← setup-node reads pnpm cache key

# ❌ WRONG — setup-node first, pnpm not yet installed
- uses: actions/setup-node@v4
  with:
    cache: 'pnpm'       # silently falls back to no cache
- uses: pnpm/action-setup@v4
```

---

## PR Locator Review — Agent on Every PR

```yaml
review-locators:
  if: github.event_name == 'pull_request'
  steps:
    - name: Review changed locators
      run: node .github/scripts/review-locators.js
      env:
        LLM_PROVIDER: ollama
        LLM_BASE_URL: http://localhost:11434/v1
        LLM_MODEL: llama3.1
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        PR_NUMBER: ${{ github.event.pull_request.number }}
        BASE_SHA: ${{ github.event.pull_request.base.sha }}
        HEAD_SHA: ${{ github.event.pull_request.head.sha }}
```

`review-locators.js` diffs changed page object files and posts a structured comment flagging brittle selectors — before they merge.

---

<!-- _class: exercise -->

## Exercise 9a — AppClaw Flows in CI

```bash
mkdir -p .github/workflows
cp workshop/09-ci-github/examples/appclaw-flows-ci.yml .github/workflows/
```

1. Add `TEST_EMAIL` / `TEST_PASSWORD` to GitHub Secrets
2. Push on a new branch and open a PR
3. Watch the `AppClaw Flows` workflow in Actions
4. Break `flows/login.yaml` (use a wrong field name), push, observe the failure artifact
5. Revert and push again — confirm both flows pass

**Answer:** Why does the `run_flows` step have `continue-on-error: true`?

---

<!-- _class: exercise -->

## Exercise 9b — Wire Up the Full CI Loop

```bash
cp workshop/09-ci-github/examples/android-tests.yml .github/workflows/
cp workshop/09-ci-github/examples/heal-and-retry.js .github/scripts/
cp workshop/09-ci-github/examples/analyse-failures.js .github/scripts/
```

1. Ensure the runner has Ollama running (`ollama serve` + `ollama pull llama3.1`) — no cloud API key needed
2. Push a clean branch — confirm all tests pass
3. Break a selector, push — watch the heal step fire
4. If healing fails, trigger on `main` — observe the GitHub Issue

---

<!-- _class: title lead -->

# Chapter 10
## Future Outlook

*15:00 – 15:30 · Where agentic QA is heading*

---

## Current Capabilities — Today

| Capability | Status |
|------------|--------|
| DOM-based agent navigation | Production-ready |
| AppClaw YAML flows (zero LLM) | Production-ready |
| Self-healing with JSON patches | Production-ready |
| AI failure analysis GitHub Issues | Production-ready |
| PR locator review comments | Production-ready |
| Vision-mode fallback | Beta |
| Multi-agent parallel test suites | Early adopter |

---

## Multi-Agent Architectures

Today: one agent, one device, one goal.

Near term: **orchestrator + specialist agents**

```
Orchestrator
    │
    ├── LoginAgent      (login screen only)
    ├── FormsAgent      (forms + toggles)
    ├── GestureAgent    (swipe, drag, pinch)
    └── AccessibilityAgent (a11y audit per screen)
```

Each agent has a focused system prompt, focused tools, and a bounded scope. The orchestrator coordinates and aggregates results.

---

## What's Coming

**Reinforcement learning from test outcomes**
Agents that improve selector strategy based on which locators survived the last 50 releases.

**Natural language test authoring at scale**
Requirements page in Confluence → agent generates AppClaw YAML + WebdriverIO spec in one pipeline step.

**Production guardrails**
Cost caps, confidence thresholds that gate deployments, audit trails for every AI decision.

**Local models in CI**
Small on-premise LLMs for healing (privacy, latency, cost) with cloud models for exploration.

---

## Discussion

- Which failure type in your current suite would benefit most from self-healing?
- What would you need to trust AI-generated selectors in production without human review?
- Where does "AI makes the decision" feel comfortable vs uncomfortable in your team's workflow?

These aren't rhetorical — bring your actual suite metrics.

---

<!-- _class: title lead -->

# Chapter 11
## Q&A Games

*15:30 – 16:05 · Lock in the learning*

---

## Game 1 — Locator Quiz

**Given this DOM element, what is the best selector?**

```xml
<android.widget.Button
  content-desc="button-LOGIN"
  resource-id="com.wdiodemoapp:id/btn_a3f2c9"
  text="LOGIN"
  bounds="[200,800][880,912]" />
```

| Option | Selector | Stable? |
|--------|----------|---------|
| A | `~button-LOGIN` | ✅ |
| B | `id:com.wdiodemoapp:id/btn_a3f2c9` | ❌ generated hash |
| C | `//android.widget.Button[@text="LOGIN"]` | ⚠️ copy-sensitive |
| D | `bounds=[200,800][880,912]` | ❌ pixel coords |

**Answer: A** — `content-desc` is set explicitly, stable across releases.

---

## Game 2 — Fix the Test

**This test fails in CI. Classify the failure and write the heal patch.**

```typescript
get emailInput() { return $('~input-email') }  // fails
```

Live DOM:

```xml
<android.widget.EditText
  content-desc="email-input"    ← changed!
  resource-id="com.wdiodemoapp:id/email" />
```

**Category A** — rename. Patch:

```json
{ "file": "droid/pageobjects/login.page.ts",
  "old": "~input-email",
  "new": "~email-input" }
```

---

## Game 3 — Selector Bingo

Each player gets a 5×5 card of selectors. The host reads out selector descriptions — mark your card when you have it.

First to complete a row calls **Bingo** and explains why each selector on the row is good, bad, or ugly.

```
~accessibilityId   │ bounds=[...]     │ //Button[2]      │ id:resource-id  │ @text="OK"
content-desc="btn" │ index="3"        │ ~tab-login       │ //EditText[1]   │ id:com.app:id/hash
...
```

See `workshop/11-qa-games/games/selector-bingo.md` for full card and answer key.

---

<!-- paginate: false -->

## What You Built Today

**Ch 1–2 · The Foundation**
Mental model shift · Agent loop · Tool design · MCP integration

**Ch 3–5 · The Execution Layer**
Environment setup · Prompt engineering · Think→Act→Observe · AppClaw YAML flows · Custom Bot

**Ch 6–7 · Resilience & Visibility**
Three-category failure model · Self-healing CI · Reasoning traces · Confidence scoring · AI failure analysis

**Ch 8–9 · Production Patterns**
E2E workflow · POM with getter pattern · Gesture testing · Two-workflow CI · AppClaw in CI (zero LLM cost)

**Ch 10–11 · Looking Ahead**
Future capabilities · Multi-agent architectures · Locked-in learning with games

---

## Why Now — Answered

**LLMs reason about UI** — not just match patterns
**MCP connects agents to real tools** — Appium, file system, GitHub
**Local models are free enough for CI** — no per-token cost, running on your own compute

The combination did not exist 18 months ago. It exists today.

Your next test suite does not have to be brittle. It can reason, adapt, and self-correct.

---

<!-- _class: lead -->

## Thank You

**Ioannis Papadakis** · Snappi
*i.papadakis@snappibank.com*

**Repo:** `droid-detective`
**Workshop doc:** `WORKSHOP.md`
**Slides:** `PRESENTATION.md`

AutomationSTAR 2026 · Wednesday 4 November

*Questions?*
