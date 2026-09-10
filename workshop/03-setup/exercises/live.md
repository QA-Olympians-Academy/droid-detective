# Live 3 — The 60-second green check

**Slot:** 00:30 · Ch3 Setup (hands-on) · **Time:** 5 min · **Needs:** laptop, emulator booted
**Format:** hands on keyboard, then pair up red with green

---

## Do this now

Run these four, in order. Each one is a yes/no:

```bash
adb devices          # expect:  emulator-5554   device
ollama list          # expect:  llama3.1 in the list
appclaw --version    # expect:  2.x
pnpm test            # expect:  it starts, installs the app, and runs specs
```

Then hold up a hand: **green** if all four behaved, **red** if any didn't.

Failing assertions in `pnpm test` are **fine** — the gate is that the run starts,
installs the app, and executes specs.

---

## What you should get

Everyone green before the room moves on. This is the checkpoint the rest of the workshop
stands on: Chapters 5 and 6 are hands-on and cannot be followed from a red machine.

The usual four failures, in order of how often they happen:

| Symptom | Fix |
|---|---|
| `adb: no devices/emulators found` | Emulator not booted — boot it, wait for `sys.boot_completed=1` |
| `Could not find 'aapt2'` | `sdkmanager "build-tools;34.0.0"` |
| `Unknown AVD name [workshop_avd]` | AVD never created — see PLAYBOOK §0.8 step 0 |
| `appclaw` missing or 1.x | `npm i -g @appclaw/cli` (the **scoped** package) |

---

## Instructor cue

- **Pair every red hand with a green neighbour immediately** — don't debug from the front.
- More than two reds you can't clear in the block: put them on a spare machine or have them
  drive a neighbour's keyboard. Do not spend the Chapter 5 block on installs.
- **Behind schedule?** `adb devices` and `ollama list` only — those two gate the labs.
