# Exercise 9a — AppClaw Flows in CI

**Time:** 20 minutes  
**Prerequisites:** Chapter 5 complete (`flows/login.yaml` and `flows/forms-toggle.yaml` exist), GitHub repo with Actions enabled

---

## Goal

Wire your recorded AppClaw YAML flows into a GitHub Actions workflow so they run on every push — without calling any LLM and without requiring a `ANTHROPIC_API_KEY`.

---

## Part 1 — Verify your flows run locally (3 min)

Before pushing to CI, confirm both flows pass on the local emulator:

```bash
pnpm run claw:flow flows/login.yaml
pnpm run claw:flow flows/forms-toggle.yaml
```

Both should exit with `✅`. If either fails, fix it before continuing.

---

## Part 2 — Copy the workflow file (2 min)

```bash
mkdir -p .github/workflows
cp workshop/09-ci-github/examples/appclaw-flows-ci.yml .github/workflows/
```

Read through the file. Answer before pushing:

1. Which step runs the YAML flows?
2. Why does the `run_flows` step have `continue-on-error: true`?
3. What is the `appclaw-explore` job and when does it run?
4. Which environment variables do the flows need to resolve credentials?

---

## Part 3 — Configure secrets (3 min)

The flows use `${secrets.email}` and `${secrets.password}` from `.appclaw/env/dev.yaml`.
In CI, these resolve from the environment as `TEST_EMAIL` and `TEST_PASSWORD`.

Add them in GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|------|-------|
| `TEST_EMAIL` | `alice@example.com` |
| `TEST_PASSWORD` | `10203040` |

These are test credentials — not real user data. Still, treat them as secrets so the pattern is correct for when real credentials are needed.

---

## Part 4 — Push and watch the run (7 min)

```bash
git checkout -b exercise-9a-appclaw-ci
git add .github/workflows/appclaw-flows-ci.yml
git commit -m "ci: add AppClaw flows workflow"
git push origin exercise-9a-appclaw-ci
```

Open a pull request. In **Actions**, watch the `AppClaw Flows` workflow.

Answer:
1. How long did the emulator take to boot?
2. Which flows ran? In what order?
3. Did both flows pass?
4. Was the `appclaw-explore` job triggered? Why / why not?
5. How long did the full `appclaw-flows` job take vs the `android-tests.yml` job?

---

## Part 5 — Introduce a flow failure (5 min)

Edit `flows/login.yaml` to break it:

```yaml
steps:
  - tap Login tab
  - wait until email field is visible
  - type '${secrets.email}' in email field
  - type '${secrets.password}' in WRONG FIELD NAME   # ← broken step
  - tap LOGIN button
```

Push the change:

```bash
git add flows/login.yaml
git commit -m "exercise: broken flow step"
git push origin exercise-9a-appclaw-ci
```

Watch the Actions run. Answer:
1. Which step failed in the log?
2. Was the `appclaw-logs` artifact uploaded?
3. Did the `android-tests.yml` workflow run? Should it?
4. What would you need to change in `appclaw-flows-ci.yml` to make it a required status check on the PR?

**Revert before merging:**
```bash
git checkout flows/login.yaml
git add flows/login.yaml
git commit -m "exercise: restore flow"
git push origin exercise-9a-appclaw-ci
```

---

## Part 6 — Add a new flow to CI (bonus)

Record a new flow in the playground:

```bash
pnpm run claw:play
```

Record any user journey (e.g. navigate to Forms, toggle the switch twice, verify state). Export it:

```
/export
```

The new flow file appears in `flows/`. Push it — it runs automatically in the next CI trigger without changing the workflow file.

---

## Definition of done

- [ ] `appclaw-flows-ci.yml` is in `.github/workflows/`
- [ ] `TEST_EMAIL` and `TEST_PASSWORD` secrets are configured
- [ ] Both `login.yaml` and `forms-toggle.yaml` pass in the Actions run
- [ ] You can explain why no `ANTHROPIC_API_KEY` is needed for this workflow
- [ ] You saw a broken flow fail and produce an artifact
- [ ] (Bonus) New flow runs automatically without changing the workflow

---

## Key concept: LLM cost in CI

| Trigger | LLM calls | Cost |
|---------|-----------|------|
| AppClaw YAML flow | 0 | Free |
| AppClaw agent run | ~2–5 per step | Cents per run |
| Bot agent run | ~2–5 per step | Cents per run |
| `heal-and-retry.js` | 1 call on failure | Cents per failure |
| `analyse-failures.js` | 1 call on failure | Cents per failure |

YAML flows should be the CI default. Agent runs are for exploration, debugging, and healing — not the steady-state regression gate.
