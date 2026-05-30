# C6_Active_Tasks — in-flight sub-agent work

Mirrors `PMD-DevFactory/C_Agent_Orchestration/C6_Active_Tasks/` for this project.

## Folders

- `Task_Briefs/` — Architect-authored, self-contained briefs. One `.md` per task. Slug pattern: `pNN_pX_Y_<short>` (e.g. `p01_p1_1_route_auto_discovery`). Template: `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/Task_Brief_template.md`.
- `QC_Reports/` — Sub-agent writes here after editing code, before stopping. All 9 sections required. Template: `.../C3_Templates/QC_Report_template.md`.
- `Architect_Reviews/` — Architect's per-task verdict + spot-check notes. Decides ACCEPT (integrate + commit) or FIX (follow-up brief). Template: `.../C3_Templates/Architect_Review_template.md`. File slug: `<task-slug>_Review.md`.

## Lifecycle (per task)

```
Architect    → writes Task_Brief        → Task_Briefs/<slug>.md
Operator     → dispatches to AG agent   → (Antigravity, model per PRD §7.1)
AG agent     → reads brief + Conventions → edits hirestream/...
             → writes QC_Report          → QC_Reports/<slug>.md
             → STOPS (no commits, no deploys)
Architect    → spot-checks the diff      → trusts the diff, not the QC report's self-grade
             → writes Architect_Review   → Architect_Reviews/<slug>_Review.md
             → ACCEPT: integrate + npm run test:deep + commit (per the existing vX.Y.Z.W convention)
             → FIX: hand a follow-up brief back
On phase close → move artefacts → C7_Archived_Tasks/Phase_NN/
```

## Hard rules (carry-ins from DevFactory C1)

- Sub-agents **NEVER** touch production paths (`/srv/`, `/opt/`, anything outside `hirestream/...` or the named workspace in the brief).
- Sub-agents **NEVER** commit, push, or restart services.
- QC Reports **MUST** have all 9 sections — abbreviations are rejected.
- On architectural ambiguity → sub-agent STOPS and asks via QC Section 7. No inventing.
- Architect **ALWAYS** spot-checks code; QC reports can be confidently wrong.

## Current phase

See `../Phase_PRDs/Phase_01_PRD.md` for the locked phase + the AG dispatch plan.
