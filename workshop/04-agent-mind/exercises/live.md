# Live 4 — Steps in, goal out

**Slot:** 00:55 · Ch4 The agent's mind (talk + demo) · **Time:** 4 min · **Needs:** the DOM sample on screen
**Format:** 2 min solo → 2 min group answer

---

## Do this now

**Part A — collapse the script (60 s).** Rewrite these five steps as **one** sentence you
would hand an agent. No selectors, no waits:

```
1. tap(~Login-tab)
2. waitFor(~input-email, 5000)
3. setValue(~input-email, "demo@wdio.dev")
4. setValue(~input-password, "Password123!")
5. tap(~button-LOGIN)
```

**Part B — pick the selector (60 s).** Open
[dom-hierarchy-sample.xml](../examples/dom-hierarchy-sample.xml). For the tab bar's login
control, write the selector you would use **and the rule that got you there**.

---

## What you should get

**Part A** — something close to:

> *"Log in with demo@wdio.dev / Password123! and verify I am logged in."*

Note what disappeared: the order, the wait, and every selector. Note what appeared: a
**verification**. A goal has to say what "done" means, because the agent — not you — decides
the steps.

**Part B** — the priority ladder, in order:

1. `~content-desc` — accessibility id, **preferred**
2. `//*[@resource-id="…"]` — resource-id XPath
3. `//*[contains(@text,"…")]` — text, fragile: copy changes and localisation break it
4. class-based XPath — **last resort**

And the rule that matters more than the ladder: **copy the value verbatim from the page
source — never invent one.** That single instruction is what stops a model hallucinating a
plausible-looking id.

---

## Instructor cue

- Collect two or three Part A answers and put them side by side. Ones that still smuggle in
  step order ("first tap the login tab, then…") make the point better than the clean ones.
- Part B: someone will pick the `text` selector because it reads nicer. That's the moment to
  ask what happens when the app ships in German.
- **Behind schedule?** Part A only. 90 seconds.
