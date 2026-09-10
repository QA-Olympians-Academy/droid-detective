# Live 6 — Heal it offline, then break the healer

**Slot:** 01:55 · Ch6 Self-healing (hands-on) · **Time:** 5 min · **Needs:** laptop only — **no emulator, no model**
**Format:** hands on keyboard → 60 s prediction

---

## Do this now

**Part A — watch a heal (2 min).** This one runs offline against a canned failure, so it
works even if your emulator is unhappy:

```bash
node examples/ch06-self-healing/self-healer.js
```

Read the five steps it prints, then look at what it changed:

```bash
diff -u examples/ch06-self-healing/fixtures/pageobjects/login.page.ts \
        examples/ch06-self-healing/.healed/login.page.ts
```

**Part B — predict a rejection (60 s).** Suppose the model proposed
`~login-button-v3` — a selector that appears **nowhere** in the captured DOM.
Which gate stops it, and what does the run do next?

---

## What you should get

**Part A** — two patches, from two different causes:

| Was | Became | Why |
|---|---|---|
| `~Login-tab` | `~login-tab-v2` | content-desc renamed |
| `~button-LOGIN` | `//*[@resource-id="button-LOGIN"]` | label moved from content-desc to resource-id — the classic gotcha |

**Part B** — the **DOM-existence gate**. A patch is applied only if its target actually
exists in the captured page source, so a hallucinated id is rejected and **never written**.
The run stays red. That is the correct outcome: no corruption, no false green.

The boundary worth saying out loud: self-healing is a **resilience layer**, not a cover for
real regressions. Never heal a functional bug, changed business logic, or a wrong assertion.

---

## Instructor cue

- Part A is the safe demo — it needs neither emulator nor Ollama, so a red machine can still take part.
- The healer also rewrites the comment at the top of the fixture (a naive string replace). If someone spots it, that's a good eye — say it's a known wart in the example, not the pipeline.
- **Behind schedule?** Run Part A on the projector and ask Part B to the room. 2 minutes.
