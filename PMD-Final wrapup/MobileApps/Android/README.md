# Android — Folder Index

This folder holds the **execution artifacts** for the HPSEDC Android app. The strategic/cross-platform docs live one level up at [/PMD-Final wrapup/MobileApps/](..). The split is intentional: strategy is written once, execution is updated continuously.

---

## Files in this folder

| File | What it is | Edit frequency |
|---|---|---|
| [00_DEV_PLAN.md](00_DEV_PLAN.md) | The implementation plan — 8 phases, 12 screens, store checklist, test strategy. Written once at kickoff, only edited if scope materially changes. | Rare |
| [01_ROADMAP.md](01_ROADMAP.md) | Feature backlog — every shippable unit with status, owner, dependencies, Est/Actual days, Verify item. Includes the DoD checklist. | Every status change |
| [02_STATUS.md](02_STATUS.md) | Live snapshot — "where are we right now". The agent / engineer context-pickup file. | Every working session |
| [03_LEARNINGS_AND_ISSUES.md](03_LEARNINGS_AND_ISSUES.md) | Running log of surprises, root causes, lessons. Reverse-chronological. | Whenever a non-obvious lesson lands |
| [04_CHANGELOG.md](04_CHANGELOG.md) | Per-build release notes. Feeds the Play Store listing. | Every build |

---

## How a new engineer or agent picks up context here

Read in this order:

1. **[02_STATUS.md](02_STATUS.md)** — 30 seconds, tells you where we are
2. **[01_ROADMAP.md](01_ROADMAP.md)** — 2 minutes, tells you what's in flight and what's next
3. **[03_LEARNINGS_AND_ISSUES.md](03_LEARNINGS_AND_ISSUES.md)** — 2 minutes, tells you what's bitten us already
4. **[00_DEV_PLAN.md](00_DEV_PLAN.md)** — 10 minutes, full strategic plan (only if Status/Roadmap don't give enough context)
5. **Up one level** — cross-platform docs at [../00_README.md](../00_README.md) onward

That's the entire context onboarding. Five files, ~15 minutes, full picture.

---

## Update obligations

This folder is **only useful if it stays fresh.** The rules:

- **Touching code touches docs.** Any commit that changes app behaviour must also touch `01_ROADMAP.md` (status column) and `02_STATUS.md` (Just shipped / In flight). If you don't, the docs lie.
- **Learnings get logged same day.** Don't batch a "lessons learned" doc at end-of-sprint. By then you'll have forgotten the texture.
- **Status updates do not need approval.** Just update. The doc is a tool, not a deliverable.
- **Verify sync is non-negotiable.** Every roadmap row has a Verify item column — file the seed update in the same commit. Pattern set by [feedback_verify_module_sync.md](../../../../.claude/projects/-home-subhash-thakur-india-Projects-Recruitment/memory/feedback_verify_module_sync.md) in user memory.
