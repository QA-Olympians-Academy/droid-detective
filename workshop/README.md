# Test Smarter, Not Harder: Agentic Mobile QA in Practice
## Workshop Materials

**Conference:** AutomationSTAR 2026 · Wednesday 4 November · 09:00–16:05 CET
**Speaker:** Ioannis Papadakis · Snappi

---

## How to use this folder

Each chapter is self-contained. Read the `README.md` for the theory, open `examples/` for working code, and follow `exercises/` to practise.

You can start any chapter independently — prerequisites are listed at the top of each README.

---

## Chapters

| # | Folder | Topic | Time |
|---|--------|-------|------|
| 1 | [01-story-shift/](01-story-shift/) | The Story Shift — why agents, why now | 09:00 |
| 2 | [02-arch-foundations/](02-arch-foundations/) | Architecture & Foundations — the full stack | 09:30 |
| 3 | [03-setup/](03-setup/) | Setup & Tooling — environment, prompt engineering | 10:00 |
| 4 | [04-agent-mind/](04-agent-mind/) | The Agent's Mind — Think→Act→Observe, DOM reading | 10:30 |
| 5 | [05-execution-loop/](05-execution-loop/) | The Execution Loop — AppClaw, YAML flows, The Bot | 11:00 |
| 6 | [06-self-healing/](06-self-healing/) | Self-Healing Selectors — failure categories, healing loop | 11:45 |
| 7 | [07-observability/](07-observability/) | Agentic Observability — traces, confidence, failure issues | 12:15 |
| — | *Lunch* | | 13:00 |
| 8 | [08-e2e-demo/](08-e2e-demo/) | E2E Demo — full workflow, POM, gestures | 13:45 |
| 9 | [09-ci-github/](09-ci-github/) | CI with GitHub Actions — two workflows, AppClaw CI | 14:30 |
| 10 | [10-future-outlook/](10-future-outlook/) | Future Outlook — multi-agent, RL, NL authoring | 15:00 |
| 11 | [11-qa-games/](11-qa-games/) | Q&A Games — locator quiz, fix-the-test, bingo | 15:30 |

---

## Exercises

| Exercise | Chapter | Topic |
|----------|---------|-------|
| 3 | Setup | Environment smoke test + first agent run |
| 4a | Agent's Mind | Read DOM, build a test plan |
| 4b | Agent's Mind | Error reasoning + JSON heal patch |
| 5a | Execution Loop | Record and run a YAML flow |
| 5b | Execution Loop | Run the Bot with SmokeTest.md |
| 6 | Self-Healing | Break a selector, watch CI heal |
| 7 | Observability | Annotate a reasoning trace |
| 8 | E2E Demo | Inspect → Plan → Execute → Observe |
| 9a | CI | AppClaw flows in GitHub Actions |
| 9b | CI | Full WebdriverIO CI loop with healing |

---

## Quick Reference

```bash
pnpm test                              # run full WebdriverIO suite
appclaw "goal"                         # AppClaw agent run
pnpm run claw:play                     # AppClaw interactive playground
pnpm run claw:flow flows/x.yaml        # run YAML flow (zero LLM cost)
pnpm run bot -- --task "..."           # custom AI agent on LambdaTest
adb shell uiautomator dump /dev/stdout # dump live device hierarchy
```

## Skill commands

```
/appium-locators apps/demo.apk   # crawl app, return ranked locator map
/generate-appclaw-flow           # create AppClaw YAML from plain English
/use-appclaw-cli                 # troubleshoot a failing flow or command
/generate-page-object            # generate WebdriverIO page object
/generate-wdio-spec              # generate WebdriverIO spec
```

## LLM Cost Reference

| Trigger | LLM calls | Cost |
|---------|-----------|------|
| AppClaw YAML flow | 0 | Free |
| AppClaw agent run | ~2–5 per step | Cents per run |
| Bot agent run | ~2–5 per step | Cents per run |
| `heal-and-retry.js` | 1 on failure | Cents per failure |
| `analyse-failures.js` | 1 on failure | Cents per failure |
