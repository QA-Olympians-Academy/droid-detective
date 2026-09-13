# ch08 — AppClaw Skills: the flow a skill writes, and the skill that knows the app

The two artifacts of Chapter 8: a YAML flow authored with `/generate-appclaw-flow`,
and a project skill that gives Claude Code the demo app's accessibility ids so the
next flow needs no hand-holding.

| File | What it is |
|------|------------|
| `forms-text.yaml` | Forms screen flow: tap `Forms`, type into `text-input`, verify `input-text-result`. What the skill should produce for Exercise 8, Part A. Verified 8/8 steps with `--strict`. |
| `wdio-demo-app/SKILL.md` | Project skill: tabs, screen containers, Login and Forms ids, demo credentials, flow conventions. Answer to Exercise 8, Part C. |

## Run the flow (needs emulator, no LLM)

```bash
pnpm run claw:flow examples/ch08-appclaw-skills/forms-text.yaml
appclaw --flow examples/ch08-appclaw-skills/forms-text.yaml --strict   # no LLM fallback allowed
```

Reports land in `.appclaw/runs/<runId>/` (manifest, one screenshot per step, recording);
`appclaw --report` serves them in a browser.

## Install the skill

```bash
cp -R examples/ch08-appclaw-skills/wdio-demo-app .claude/skills/
# restart Claude Code — skills load at session start
```

Then ask `/generate-appclaw-flow` for a flow **without** listing any ids and watch it use
`Forms`, `text-input` and `input-text-result` on its own.

Theory and exercises: [workshop/08-appclaw-skills](../../workshop/08-appclaw-skills/README.md)
