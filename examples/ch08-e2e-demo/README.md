# ch08 — End-to-End: From Goal to Spec

The final artifact of the full workflow — narrative goal → live DOM inspection
(`/appium-locators`) → agent plan → **a spec a human maintains**.

| File | What it is |
|------|------------|
| `login.page.ts` | Page object with agent-discovered accessibility-id locators, extending the shared `BasePage`. |
| `login.spec.ts` | Production-quality spec: happy path, failure path, navigation — independent tests, explicit assertions. |

## Run it (needs emulator, no LLM)

```bash
pnpm test -- --spec examples/ch08-e2e-demo/login.spec.ts
```

WebdriverIO starts Appium as a service, installs `apps/demo.apk`, and runs the
spec on `emulator-5554` — same as `pnpm test` for the main suite in
`droid/specs/`.

## What "production-quality" means here

- Selectors come **verbatim from the inspected DOM** (`~button-LOGIN`, not
  `~LOGIN-button`).
- Each `it` is runnable alone — `beforeEach` re-navigates.
- The failure path is a first-class test, not an afterthought.
- The page object owns the locators; the spec owns the intent.

Theory and exercises: [workshop/08-e2e-demo](../../workshop/08-e2e-demo/README.md)
