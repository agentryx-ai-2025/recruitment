# Verify — Updates & Version Control

This folder is the **per-version development log** for Agentryx Verify. Every incremental update to the live product gets a `<version>_Dev_Plan.md` file here that records:

- What was planned to ship
- What actually shipped (with the acceptance + smoke checkboxes ticked once verified)
- How that update advanced the master roadmap
- The queue of next-update candidates

Each file is its own historical record. They evolve from "plan" to "ship record" by ticking checkboxes and updating the status banner — not by being deleted or rewritten.

---

## Index — current state

| Version | Status | Date | Headline ships | Doc |
|---|---|---|---|---|
| **v0.2.1** | ✅ shipped | 2026-05-06 | Admin Roadmap Dashboard · Activity Feed · `/api/auth/me` hardening | [`0.2.1_Dev_Plan.md`](0.2.1_Dev_Plan.md) |
| _v0.2.2_ | _next_ | _—_ | _Likely: in-app notifications drawer OR cross-project Home OR row_type discriminator_ | _—_ |

**Current live build:** `v0.2.1` at https://verify-stg.agentryx.dev · pm2 process `agentryx-verify`

---

## How these docs relate to the rest of the strategy folder set

```
PMD-Final wrapup/
├── Agentryx-Verify-Roadmap/         ← STRATEGIC docs (slow-moving)
│   ├── 00_README.md                  Index for the strategy set
│   ├── 01_CURRENT_STATE.md           What exists today
│   ├── 02_VISION.md                  Octopus-hub model + 8 principles
│   ├── 03_ROADMAP.md                 The 9 phases
│   ├── 04_API_AND_INTEGRATION.md     Public API + webhook design
│   ├── 05_MODULE_PLAYBOOK.md         How to add a module
│   └── Roadmap_Dev_Checklist.md      Live built-vs-planned scoreboard
│
└── Verify-Updates & Ver. Control/    ← TACTICAL docs (this folder, fast-moving)
    ├── 00_README.md                  This file — the version index
    ├── 0.2.1_Dev_Plan.md             v0.2.1 plan + ship record
    └── 0.2.2_Dev_Plan.md             (created when v0.2.2 is started)
```

**Reading order when joining the project:**
1. `Agentryx-Verify-Roadmap/00_README.md` — orient yourself
2. `Agentryx-Verify-Roadmap/01_CURRENT_STATE.md` — know what exists
3. `Agentryx-Verify-Roadmap/03_ROADMAP.md` — know where it's going
4. `Agentryx-Verify-Roadmap/Roadmap_Dev_Checklist.md` — see what's shipped vs planned in detail
5. **This folder** — see what's been built and what's next, in version order

---

## How to add a new version doc

When starting a new update (e.g. v0.2.2):

1. **Create** `0.2.2_Dev_Plan.md` in this folder using the v0.2.1 file as a template
2. **At the top** include: status banner (planned → in-progress → shipped), target ship date, effort, anchor / hub / no-training tests, cross-references to the strategy folder
3. **Pick scope** by cross-referring to `Roadmap_Dev_Checklist.md` — pull from the "planned ⚪" column for the active phase, plus any low-hanging fruit from the previous dev plan's queue
4. **Implementation plan** lists the files to add / modify
5. **Acceptance criteria** + **smoke checklist** as unchecked boxes — tick them as the work progresses
6. **Roadmap impact** section is filled in after shipping (counts before vs after)
7. **Update this index** with the new row at the top of the version table
8. **Update `Roadmap_Dev_Checklist.md`** to flip the relevant features from ⚪ planned to ✅ shipped (with the version label)

---

## What this folder is NOT for

- **Code commit messages.** Those live in git. The dev plans cite them but don't replace them.
- **Detailed bug logs.** Those live in the Issues panel inside the product (`/p/<slug>` → Issues log).
- **Customer-facing changelogs.** When that becomes a need (Phase 7 — Knowledge base), it lives in the in-product KB, not here.
- **Strategic decisions.** Those go in `02_VISION.md` or its successors. This folder records *what was built when* — not *why we chose to build it*.

---

## Sequence rule

**One version doc per ship**, even if the ship is small. A 30-minute one-feature update gets its own file. This keeps the historical record granular and makes it easy to point at exactly what changed when.

If multiple small features ship together (typical), they share a version doc — e.g. v0.2.1 included Roadmap Dashboard + Activity Feed + auth-me hardening, all under one file.
