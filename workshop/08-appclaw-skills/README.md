# Chapter 8 — AppClaw Skills: Teaching Claude Code to Drive AppClaw

**Duration:** 45 minutes  
**Prerequisites:** Chapter 3 (environment green), Chapter 5 (you have run `appclaw` and a YAML flow), Claude Code open in the project root

---

## Learning objectives

- Explain what a Claude Code skill is and how one is triggered
- Know which skills ship with this project, where they live, and how they are installed and updated
- Use `/generate-appclaw-flow` to turn a plain-English request into a runnable YAML flow
- Use `/use-appclaw-cli` to configure, run and troubleshoot AppClaw
- Feed `/appium-locators` output into a flow so the steps use real accessibility ids
- Write a project skill that encodes knowledge about the app under test

---

## Why skills

Chapter 1 promised that automation knowledge moves from people into **skills and prompts**. Chapter 5 showed the run-time half of that: AppClaw reads the screen, the flow file carries the steps. This chapter is the authoring half.

A **skill** is a Markdown file (`SKILL.md`) that Claude Code loads when a task matches it. It tells Claude *how this team does a job*: which commands exist, which flags are real, what the YAML schema is, what to check before writing a file, when to ask first. The result is that "write me a login flow" produces a file that parses, uses the right step syntax and puts secrets in the right place. Without the skill, Claude guesses the schema from training data and you spend the session fixing it.

Skills run **inside Claude Code**, on the model behind Claude Code. They are not the local Ollama model that AppClaw's goal mode uses. The flow a skill writes then runs with **zero** LLM calls (Chapter 5). Only goal runs and the Bot touch Ollama.

---

## Anatomy of a skill

```
.claude/skills/<name>/
└── SKILL.md
```

```markdown
---
name: generate-appclaw-flow
description: >
  Generate YAML flow files for AppClaw mobile automation. ... Trigger when the
  user wants to create, edit, or fix a YAML flow file for AppClaw.
---

# AppClaw Flow Generator
(the instructions Claude follows: workflow, schema, rules, examples)
```

Two frontmatter fields do the work:

| Field | Used for |
|-------|----------|
| `name` | The slash command: `/generate-appclaw-flow` |
| `description` | **Auto-triggering.** Claude reads every skill's description at session start and loads the skill when your request matches it, even if you never type the slash command |

So there are two ways to run a skill:

```
/generate-appclaw-flow a flow that types hello on the Forms screen   ← explicit
Write me an AppClaw flow for the Forms text input                    ← Claude picks the skill from its description
```

The explicit form is what you want in a workshop: everyone runs the same thing.

---

## The skills in this project

```
.agents/skills/                     ← the files (installed by the skills CLI)
├── generate-appclaw-flow/SKILL.md
├── use-appclaw-cli/SKILL.md
├── review-changes/SKILL.md
└── emil-design-eng/SKILL.md
.claude/skills/                     ← what Claude Code reads
├── generate-appclaw-flow  → ../../.agents/skills/generate-appclaw-flow   (symlink)
├── use-appclaw-cli        → ../../.agents/skills/use-appclaw-cli         (symlink)
├── review-changes         → ../../.agents/skills/review-changes          (symlink)
├── emil-design-eng        → ../../.agents/skills/emil-design-eng         (symlink)
└── appium-locators/SKILL.md        ← this repo's own skill, no symlink
skills-lock.json                    ← source repo + content hash per installed skill
```

| Skill | Source | What it does | Use it when |
|-------|--------|--------------|-------------|
| `/generate-appclaw-flow` | AppClaw repo | Writes or fixes a YAML flow: checks existing flows and `.appclaw/env/`, proposes a plan, writes the file only after you approve, validates it | You want a new flow, or a flow step fails to parse |
| `/use-appclaw-cli` | AppClaw repo | Operates the CLI: modes and flags, `.env`, device selection, vision setup, troubleshooting tables | A command or flow fails and you want a diagnosis, or you need `.env` or env-file changes |
| `/appium-locators <apk>` | this repo | Launches the app through the Appium MCP server and returns a ranked locator map | You need real accessibility ids before writing steps (the Inspect step from Chapter 5) |
| `/review-changes` | AppClaw repo | Reviews a diff **of the AppClaw source code** for CLI / VS Code extension drift | Only if you contribute to AppClaw itself. It has nothing to review in this repo |
| `emil-design-eng` | AppClaw repo | UI design-engineering philosophy | Comes with the bundle. Not part of this course |

The four AppClaw skills were installed with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add AppiumTestDistribution/appclaw     # install / reinstall all four
npx skills list                                   # what is installed in this project
npx skills update                                 # pull newer SKILL.md versions, refresh skills-lock.json
```

`skills-lock.json` is committed, so the whole room runs the same skill text. If `npx skills update` changes a skill, that is a diff to review and commit like any other.

---

## Before you start

```bash
appclaw --version      # 2.x
appclaw doctor         # Node, .env, Ollama, appium-mcp, connected devices — all ✓
claude --version       # Claude Code CLI; or open the project in VS Code with the extension
```

`setup.sh` installs everything except Claude Code. If you do not have it:

```bash
npm install -g @anthropic-ai/claude-code
cd droid-detective && claude
```

Open Claude Code **in the project root**. Skills are discovered from `.claude/skills/` under the directory the session starts in. If you type `/` and the AppClaw skills are not in the list, you are in the wrong directory.

---

## Skill 1 — `/generate-appclaw-flow`

The skill follows a fixed workflow. Knowing it tells you what to expect at each turn:

```
1. Understand   platform, appId, the journey, what "done" looks like
2. Check        existing flows/ for overlap, .appclaw/env/ for variables and secrets
3. Propose      file path, flat vs phased format, the steps, any new env bindings
                ── waits for your approval ──
4. Generate     writes the YAML (and .appclaw/env/<name>.yaml if needed)
5. Validate     parses the flow; offers to run it if a device is connected
```

Step 3 is the point of the skill. A flow file drives a real device with no model in the loop, so the skill will not write one you have not read.

### A good request

Give it the same things you would give a colleague:

```
/generate-appclaw-flow

App: com.wdiodemoapp (WebdriverIO demo app, already installed on emulator-5554).
Journey: open the Forms tab, type "hello" into the text input, verify the result
label shows "hello".
Known accessibility ids: bottom tabs are Home | Webview | Login | Forms | Swipe | Drag;
the input is text-input, the result label is input-text-result.
Format: phased (setup / steps / assertions). File: flows/forms-text.yaml.
```

Things the skill does well without being asked: `launchApp` in `setup`, a `waitUntil` before the first tap, single quotes around interpolated values, no hardcoded secrets. Things it cannot know: your accessibility ids and your success text. Supply those, or it will guess labels from the screen name and you find out at run time.

What the exchange looks like: [examples/skill-session.md](examples/skill-session.md). What it should produce: [examples/ch08-appclaw-skills/forms-text.yaml](../../examples/ch08-appclaw-skills/forms-text.yaml).

### Run what it wrote

```bash
pnpm run claw:flow flows/forms-text.yaml          # zero LLM calls
appclaw --flow flows/forms-text.yaml --strict     # fail instead of falling back to the LLM
```

`--strict` matters in this course. A natural-language step the parser does not recognise normally falls back to LLM parsing, which here means the local Ollama model and a slow, unreliable step. Strict mode fails fast and names the step. Rewrite it in structured form (`tap: "Forms"`) or ask the skill to.

Every run writes a report to `.appclaw/runs/<runId>/`: a `manifest.json` with per-step status, a screenshot per step under `steps/`, and a `recording.mp4`. `appclaw --report` serves them in a browser. When a step fails, the step's screenshot is the first thing to look at, and the first thing to paste into `/use-appclaw-cli`.

### Fix a flow

Paste the failing step and the error into the same skill:

```
/generate-appclaw-flow flows/forms-text.yaml fails at step 4:
  ✗ tap "Forms tab" — no element matched. On screen: Home, Webview, Login, Forms, Swipe, Drag
Fix the step.
```

It reads the flow, matches the on-screen label list, and proposes `tap: "Forms"`.

---

## Skill 2 — `/use-appclaw-cli`

The operator skill. It knows the modes (`--flow`, `--tui`, `--explore`, `--record`, `--replay`, `--report`, `doctor`), every `.env` variable AppClaw reads, the device-selection order, and a set of diagnosis tables. It reads `.env`, `.appclaw/env/` and your device list **before** answering, and it prefers `appclaw --help` over its own memory when they disagree.

Typical prompts:

```
/use-appclaw-cli appclaw --flow flows/login.yaml exits with "No devices found" — diagnose
/use-appclaw-cli create .appclaw/env/dev.yaml for TEST_EMAIL / TEST_PASSWORD and update flows/login.yaml to use ${secrets.*}
/use-appclaw-cli which .env values switch AppClaw to vision mode, and which local model would I need?
/use-appclaw-cli where does appclaw write run reports and how do I open them?
```

### The safety policy

The skill has an explicit line it will not cross without asking:

| Runs without asking | Asks you first |
|---------------------|----------------|
| `appclaw --help`, `--version`, `doctor` | `appclaw "goal"` (agent mode) |
| `appclaw --flow …` (deterministic, no LLM) | `appclaw --explore …` |
| `appclaw --report` (read-only) | `appclaw --record …` |
| reading `.env`, `.appclaw/env/`, flow files | `appclaw --tui` / `--playground` |

Right-hand column: consumes model tokens and takes real actions on the device. This is the same boundary Chapter 9 draws for CI, and a good template for skills you write yourself.

---

## Skill 3 — `/appium-locators`

Not from AppClaw; it belongs to this repo and needs the Appium MCP server configured in Claude Code (see the root [README](../../README.md#agentic-locator-discovery-appium-locators)):

```json
{ "mcpServers": { "mcp-appium": { "command": "npx", "args": ["@appium/mcp-server"] } } }
```

```
/appium-locators apps/demo.apk
```

It launches the app, reads the hierarchy and returns locators ranked resource-id → accessibility-id → text XPath → structural XPath. The point in this chapter: its output is exactly the "known accessibility ids" line of a good `/generate-appclaw-flow` request. Inspect first, then generate. That is Chapter 5's Inspect → Plan → Execute with the skills doing the typing.

---

## Three places knowledge lives

It is easy to confuse the skill with AppClaw's own app guide. They are read by different programs at different times:

| Layer | File | Read by | When |
|-------|------|---------|------|
| Claude Code skill | `.claude/skills/<name>/SKILL.md` | Claude Code | Authoring time: writing flows, debugging, configuring |
| AppClaw app guide | `.appclaw/guides/<appId>.md` | AppClaw's agent | Run time, goal mode only, when the goal names the app |
| Env bindings | `.appclaw/env/<name>.yaml` | AppClaw flow runner | Run time, resolving `${variables.*}` and `${secrets.*}` |

This project already has an app guide, [.appclaw/guides/com.wdiodemoapp.md](../../.appclaw/guides/com.wdiodemoapp.md): tab ids, field ids, demo credentials, what "logged in" looks like. It improves the agent's planning in goal mode. It does **nothing** for Claude Code when you ask for a flow. The exercise fixes that by putting the same facts into a skill.

---

## Writing your own skill

The AppClaw skills know AppClaw. They do not know the WebdriverIO demo app. A short project skill closes that gap:

```
.claude/skills/wdio-demo-app/SKILL.md
```

```markdown
---
name: wdio-demo-app
description: >
  Facts about the WebdriverIO native demo app (com.wdiodemoapp) used in this
  workshop: screens, accessibility ids, demo credentials, success texts. Load
  whenever writing or fixing AppClaw flows, page objects or specs for this app.
---
- Bottom tabs (accessibility ids): Home | Webview | Login | Forms | Swipe | Drag
- Login screen: input-email, input-password, button-LOGIN; success alert contains "logged in"
- Valid demo credentials: alice@example.com / 10203040 (public, not secrets)
...
```

Full version: [examples/ch08-appclaw-skills/wdio-demo-app/SKILL.md](../../examples/ch08-appclaw-skills/wdio-demo-app/SKILL.md). Rules that make a skill useful:

- **The description is a trigger, not a summary.** Say *when* to load it ("whenever writing flows for this app"), not only what it contains.
- **Facts, not prose.** Ids, labels, success texts, credentials that are public. Claude does not need to be told what a tab bar is.
- **One subject per skill.** App knowledge in one, team conventions in another. Short skills compose; a long one does not.
- **Say what to prefer.** "Use accessibility ids; never text XPath for tabs" changes output more than any example does.
- **New session to pick it up.** Skills are read at session start. Restart Claude Code after adding one.

Creating the folder by hand is fine. `npx skills init wdio-demo-app` scaffolds the same `SKILL.md` if you prefer a template; move it under `.claude/skills/`.

---

## Exercises

- [Live 8 — Brief the skill before I do](exercises/live.md) (3 min, paper)
- [Exercise 8 — Generate, break and repair a flow with skills, then write your own](exercises/exercise-8.md) (20 min)

Reference code: [examples/ch08-appclaw-skills/](../../examples/ch08-appclaw-skills/).
