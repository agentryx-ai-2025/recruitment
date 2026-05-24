# iOS — Live Status

> **Status:** ⏸ **Deferred.** No iOS work has started or will start until Android v1.0 is on the Play Store internal track. This file is a placeholder so context onboarding works the moment iOS work begins.

**Last updated:** 2026-05-12 · **Updated by:** Subhash (planning) · **Build version:** _none yet_

---

## TL;DR — where we are right now

| | |
|---|---|
| **Current phase** | Deferred / not started |
| **Sprint goal** | n/a until Android internal track lives |
| **Code shipped** | None |
| **Apple Developer account** | Not enrolled |
| **App Store status** | No app registered |
| **Sentry status** | No project created |
| **Verify items** | 0 of ~25 seeded (iOS-specific deltas) |
| **Days into iOS plan** | Not started |

---

## What needs to happen before iOS phase starts

In order:

1. **Android v1.0 reaches Play Store internal track** ([../Android/02_STATUS.md](../Android/02_STATUS.md) shows phase 7+)
2. **HPSEDC + STIS sign off on Android v1.0** (gate: same as F7.7 in Android roadmap)
3. **Apple Developer enrolment kicked off** (allow 1–3 weeks for verification, especially under HPSEDC name)
4. **APNs Auth Key (.p8) generated** in Apple Developer portal
5. **Decision D7 resolved** (Universal Links domain on HPSEDC side)

Until all five are true, this folder stays in deferred state and gets touched only when something material changes (e.g. HPSEDC kicks off Apple enrolment early).

---

## In flight (active right now)

_Nothing — deferred state._

---

## Just shipped

_Nothing yet._

---

## Next 3 things (when iOS kicks off)

1. Apple Developer enrolment (do this **first** — calendar dependency, not work)
2. Bundle ID + APNs key (one afternoon once enrolment is approved)
3. First TestFlight build (validates the iOS toolchain end-to-end before any feature work)

---

## Blocked

| Task | Blocked by | Since | Severity | Owner |
|---|---|---|---|---|
| All iOS work | Android v1.0 not yet shipped | 2026-05-12 | — (intentional) | n/a |

---

## Health indicators (RAG)

| Dimension | Status | Why |
|---|---|---|
| Schedule | 🟢 | Deferred intentionally; no slip |
| Scope | 🟢 | Locked to Android v1.0 parity |
| Quality risk | 🟢 | Android codebase will absorb the hard lessons first |
| Resourcing | 🟡 | Same engineer as Android — sequential, not parallel |
| External dependencies | 🟡 | Apple enrolment timing is HPSEDC-dependent |

---

## Quick links

- Roadmap: [01_ROADMAP.md](01_ROADMAP.md)
- Dev plan (delta over Android): [00_DEV_PLAN.md](00_DEV_PLAN.md)
- Learnings + issues log: [03_LEARNINGS_AND_ISSUES.md](03_LEARNINGS_AND_ISSUES.md)
- Android sibling status: [../Android/02_STATUS.md](../Android/02_STATUS.md)
- Cross-platform docs: [../00_README.md](../00_README.md)

---

## Status-file update protocol

Same rules as [../Android/02_STATUS.md](../Android/02_STATUS.md). Don't duplicate them here. The rules apply the moment the first iOS commit lands.
