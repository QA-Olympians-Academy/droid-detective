# Chapter 9 — CI Integration with GitHub Actions

**Duration:** 30 minutes  
**Prerequisites:** Chapters 5–8 complete, GitHub repo with Actions enabled

---

## Learning objectives

- Configure the full Android test pipeline in GitHub Actions
- Set up a hardware-accelerated Android emulator in CI
- Run AppClaw YAML flows as deterministic, zero-LLM-cost CI jobs
- Manage AppClaw secrets safely via GitHub Actions secrets
- Wire self-healing as a CI step that runs only on failure
- Add automated PR locator review using Claude
- Generate AI-powered failure analysis issues on `main` breakages
- Manage secrets and artifacts correctly

---

## The full CI pipeline

Every piece built in this course connects across two workflows:

```
Push / PR
    │
    ├──► appclaw-flows.yml (fast, no LLM)
    │         ├── Run flows/login.yaml
    │         ├── Run flows/forms-toggle.yaml
    │         └── Run flows/*.yaml  ──── fail? → ✅ artifact uploaded
    │
    └──► android-tests.yml (WebdriverIO + self-healing)
              ├── 1. Checkout + pnpm install
              ├── 2. Install UIAutomator2 driver
              ├── 3. Start Android emulator (KVM-accelerated)
              ├── 4. pnpm test  ──── pass? → ✅ done
              │              └──── fail? ──►
              │                            ├── 5. heal-and-retry.js  ──── pass? → ✅
              │                            └── 6. analyse-failures.js → GitHub Issue
              │
              └── 7. Upload artifacts (screenshots + appium.log)

    [PR only]
    └── review-locators job → posts PR comment on changed page objects
```

**Two workflows, two purposes:**

| Workflow | Runs flows | LLM cost | Healing |
|----------|------------|----------|---------|
| `appclaw-flows.yml` | AppClaw YAML | ❌ none | Manual |
| `android-tests.yml` | WebdriverIO specs | ✅ on failure | ✅ automatic |

AppClaw flows run fast (no model call per step) and serve as the first gate. WebdriverIO specs run second and include agentic healing.

---

## AppClaw flows in CI

YAML flows recorded in the playground (Chapter 5) run in CI without calling any LLM — deterministic, fast, and free of API cost.

### How AppClaw flows run in CI

```bash
# Locally:
pnpm run claw:flow flows/login.yaml

# In CI — identical command, different env:
pnpm run claw:flow flows/login.yaml
```

The only difference is where credentials come from. Locally they come from your shell environment; in CI they come from GitHub Actions secrets injected as environment variables.

### Mapping AppClaw secrets to GitHub Actions secrets

In `.appclaw/env/dev.yaml`:
```yaml
secrets:
  email: '${TEST_EMAIL}'
  password: '${TEST_PASSWORD}'
```

In the GitHub Actions workflow:
```yaml
env:
  TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
```

AppClaw reads `TEST_EMAIL` and `TEST_PASSWORD` from the process environment at runtime. The values are masked in logs (shown as `***`).

### Running all flows in one step

```yaml
- name: Run AppClaw flows
  run: |
    for flow in flows/*.yaml; do
      echo "Running $flow"
      pnpm run claw:flow "$flow"
    done
  env:
    TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
    TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
    DEVICE_UDID: emulator-5554
    APP_PATH: apps/demo.apk
    PLATFORM: android
```

See [examples/appclaw-flows-ci.yml](examples/appclaw-flows-ci.yml) for the full annotated workflow.

---

## Required secrets

Configure under **Settings → Secrets and variables → Actions**:

| Secret | Required for |
|--------|-------------|
| `TEST_EMAIL` | AppClaw flows (credential injection) |
| `TEST_PASSWORD` | AppClaw flows (credential injection) |
| `ANTHROPIC_API_KEY` | Self-healing, failure analysis, locator review |
| `LT_USERNAME` | Bot workflow (LambdaTest) |
| `LT_ACCESS_KEY` | Bot workflow (LambdaTest) |
| `LT_APP_URL` | Bot workflow (LambdaTest) |
| `GITHUB_TOKEN` | Auto-provided — no setup needed |

---

## Step 1 — Emulator in CI

The emulator runs via `reactivecircus/android-emulator-runner@v2`. Key parameters:

```yaml
- uses: reactivecircus/android-emulator-runner@v2
  with:
    api-level: 34
    arch: x86_64
    profile: pixel_6
    avd-name: test_avd
    emulator-options: -no-snapshot-save -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim
    disable-animations: true
    script: pnpm test
  continue-on-error: true   # ← lets the heal step run even on failure
  id: run_tests
```

**KVM acceleration** is required on Ubuntu runners for x86_64 emulation to be performant:

```yaml
- name: Enable KVM
  run: |
    echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | \
      sudo tee /etc/udev/rules.d/99-kvm4all.rules
    sudo udevadm control --reload-rules
    sudo udevadm trigger --name-match=kvm
```

Without this step the emulator boots but runs at ~5% of native speed.

---

## Step 2 — Self-healing as a CI step

The heal step runs **only when tests failed** using the `outcome` context from the test step:

```yaml
- name: Self-heal failing tests
  if: steps.run_tests.outcome == 'failure'
  run: node .github/scripts/heal-and-retry.js
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

The script (`heal-and-retry.js`) reads `appium.log`, fetches the live DOM via ADB, asks Claude for patches, applies them, and retries `pnpm test`. If the retry passes, CI turns green without human intervention.

See `examples/heal-and-retry.js` in Chapter 6.

---

## Step 3 — Failure analysis issues

When healing cannot recover (or the failure is on `main`), `analyse-failures.js` opens a structured GitHub issue:

```yaml
- name: Analyse failures and open issue
  if: steps.run_tests.outcome == 'failure' && github.ref == 'refs/heads/main'
  run: node .github/scripts/analyse-failures.js
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GITHUB_REPOSITORY: ${{ github.repository }}
```

See `examples/analyse-failures.js` for the implementation.

---

## Step 4 — PR locator review

A separate job reviews changed page object files on every pull request:

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

The script diffs changed page object files, asks Claude to review the selectors for brittleness, and posts a comment directly on the PR.

See `examples/review-locators.js` for the implementation.

---

## Step 5 — Artifacts

Always upload screenshots and the Appium log — even on failure:

```yaml
- name: Upload test artifacts
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: |
      appium.log
      screen-*.png
    retention-days: 7
```

`if: always()` ensures artifacts are available even when the job fails. Screenshots are taken by `wdio.conf.ts` on failure; the Appium log contains the full selector resolution trace.

---

## pnpm caching

Cache the pnpm store using the lock file as the key:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'        # ← handles cache key automatically
```

And the pnpm action must be declared **before** `setup-node`:

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 10
- uses: actions/setup-node@v4   # ← after pnpm/action-setup
  with:
    node-version: '20'
    cache: 'pnpm'
```

Order matters — `setup-node` needs pnpm installed to compute the cache key.

---

## Complete workflow

See [examples/android-tests.yml](examples/android-tests.yml) for the full annotated pipeline.

---

## Exercises

- [Exercise 9a — AppClaw flows in CI](exercises/exercise-9a.md)
- [Exercise 9b — Wire up the full CI loop](exercises/exercise-9b.md)
