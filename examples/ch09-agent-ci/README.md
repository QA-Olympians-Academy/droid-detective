# ch09 — Agentic CI

The two LLM-powered CI helpers that make the pipeline self-maintaining. Both
run against a **local model** (Ollama) so CI cost stays at $0, and both
degrade gracefully: without GitHub env vars they print to stdout, so you can
run them right now.

| File | CI trigger | What it does |
|------|------------|--------------|
| `review-locators.js` | pull request touching `droid/pageobjects/` | Diffs the changed page objects, asks the model to flag brittle selectors (index/structural/bounds/text-based), posts a PR comment. |
| `analyse-failures.js` | red build on `main` | Summarises `appium.log` into a structured GitHub issue: summary, failing tests, error details, suggested fix. |

## Run them locally (needs Ollama: `ollama pull llama3.1`)

```bash
# stage a change to any page object first, then:
node examples/ch09-agent-ci/review-locators.js

# after any test run that produced an appium.log:
node examples/ch09-agent-ci/analyse-failures.js
```

In CI they are wired with `BASE_SHA`/`HEAD_SHA`/`PR_NUMBER`/`GH_TOKEN`
(review) and `GITHUB_REPOSITORY`/`GH_TOKEN` (analysis) — see the annotated
workflows in
[workshop/09-ci-github/examples](../../workshop/09-ci-github/examples/) and
the healing step from [ch06](../ch06-self-healing/README.md) that runs between
them.

Theory and exercises: [workshop/09-ci-github](../../workshop/09-ci-github/README.md)
