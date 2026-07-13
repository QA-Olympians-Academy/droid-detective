# Exercise 9 — Wire Up the Full CI Loop

**Time:** 25 minutes  
**Prerequisites:** GitHub repo with Actions enabled (CI installs Ollama and pulls `llama3.1` locally — no API key required)

---

## Goal

Build and verify the complete CI pipeline:  
push → test → heal (if needed) → analyse (if needed) → PR locator review.

---

## Part 1 — Copy the scripts into place (3 min)

The workflow references scripts in `.github/scripts/`. Copy the examples:

```bash
mkdir -p .github/scripts
cp workshop/09-ci-github/examples/analyse-failures.js .github/scripts/
cp workshop/09-ci-github/examples/review-locators.js .github/scripts/
cp workshop/06-self-healing/examples/heal-and-retry.js .github/scripts/
```

The workflow file itself goes in `.github/workflows/`:

```bash
mkdir -p .github/workflows
cp workshop/09-ci-github/examples/android-tests.yml .github/workflows/
```

---

## Part 2 — Confirm the local model in CI (3 min)

No LLM API key is required anymore. Self-healing, failure analysis, and locator review run against a **local** model via Ollama, which the workflow installs and pulls (`ollama pull llama3.1`) inside the job.

The LLM steps read their config from environment variables set in the workflow:

```yaml
env:
  LLM_PROVIDER: ollama
  LLM_API_KEY: ollama          # placeholder — value ignored by Ollama
  LLM_BASE_URL: http://localhost:11434/v1
  LLM_MODEL: llama3.1
```

Tradeoff: on GitHub-hosted runners the model runs on CPU, so the heal/analyse/review steps are slow — but they cost $0. The only secrets you may still need are LambdaTest (`LT_*`), and only for the Bot workflow — skip if not testing the Bot.

---

## Part 3 — Trigger a clean run (5 min)

Push a small change to a new branch:

```bash
git checkout -b exercise-9-ci
echo "# CI test" >> README.md
git add README.md
git commit -m "exercise: trigger CI"
git push origin exercise-9-ci
```

Open a pull request. In **Actions**, watch the `Android Tests` workflow.

Answer:
1. Which job ran? (`test` or `review-locators` or both?)
2. Did the emulator start successfully? How long did it take?
3. Did all 9 tests pass?
4. Did the `review-locators` job post a PR comment? (It should say "No page object changes in this PR")

---

## Part 4 — Trigger self-healing (8 min)

Introduce a Category A failure:

```typescript
// droid/pageobjects/login.page.ts
get emailInput() { return $('~input-email-BROKEN') }
```

```bash
git add droid/pageobjects/login.page.ts
git commit -m "exercise: broken selector for CI healing test"
git push origin exercise-9-ci
```

Watch the Actions run. Answer:
1. Which step failed first? What was the error?
2. Did `Self-heal failing tests` run? What did it log?
3. Did the local model suggest a patch? What was the `newSelector`?
4. Did the retry pass?
5. Did the `review-locators` job flag the changed selector in a PR comment?

---

## Part 5 — Trigger failure analysis (5 min)

Revert healing and push directly to `main` to trigger `analyse-failures.js`:

```bash
git checkout main
# Make the same broken change
git add droid/pageobjects/login.page.ts
git commit -m "exercise: trigger failure analysis on main"
git push origin main
```

Watch the Actions run. Answer:
1. Did `analyse-failures.js` run? (It should — `github.ref == 'refs/heads/main'`)
2. Was a GitHub Issue opened? Go to **Issues** and read it.
3. Does the issue correctly identify the root cause?
4. Is the suggested fix actionable?

**Revert immediately after:**

```bash
git checkout droid/pageobjects/login.page.ts
git add droid/pageobjects/login.page.ts
git commit -m "revert: restore correct selector"
git push origin main
```

---

## Part 6 — Read the artifacts (2 min)

In the Actions run for Part 4 (the failure run):

1. Download the `test-results` artifact
2. Open `appium.log` — find the line where the selector failed
3. Open `screen-*.png` — is the screenshot taken at the point of failure?

---

## Definition of done

- [ ] Clean push triggered both `test` and `review-locators` jobs
- [ ] Broken selector triggered self-healing and retry
- [ ] `review-locators` flagged the broken selector in a PR comment
- [ ] Failure on `main` opened a GitHub Issue with root cause + suggested fix
- [ ] You can describe the full pipeline from push to healed green build

---

## Common issues

| Symptom | Fix |
|---------|-----|
| Emulator fails to start | Check KVM step is present and `api-level: 34` matches the installed system image |
| Local model unreachable | Ensure the workflow's Ollama install + `ollama pull llama3.1` step ran and `ollama serve` is up — the script will silently skip healing otherwise |
| `analyse-failures.js` does not run | Check `github.ref == 'refs/heads/main'` condition — only runs on `main` |
| PR comment not posted | Check `PR_NUMBER` and `GH_TOKEN` are correctly passed; verify `review-locators` job condition |
| Healing retry fails | The failing selector may be a Category B or C — healing only handles renames automatically |
