<!--
DOC: Phase_PRDs/Phase_01_PRD.md
PURPOSE: Per-phase product requirements for Phase 1 of the embedded
         testing & verification framework dev — locked execution spec
         + Antigravity sub-agent dispatch plan.
SOURCE:  Architect-written. Builds on:
           - 03_ROADMAP_AND_INTEGRATION.md §3 (Phase 1 high-level)
           - 04_DEV_CONTEXT_HireStream_Testing_Framework_P1-P5.md
           - PMD-DevFactory/C_Agent_Orchestration/C3_Templates/Phase_PRD_template.md
UPDATE:  Locked at phase start; any change during phase requires an
         entry in this doc's §Status changelog.
OWNER:   Architect (Claude Opus 4.7 in planning session;
         operator-of-record during execution).
AUDIENCE: Sub-agents working in the phase (mandatory reading);
          architect doing per-task reviews.
-->

# Phase 1 — Eliminate manual maintenance + wire CI · Phase PRD

**Phase**: 01
**Status**: Locked — ready to dispatch
**Maps to**: `03_ROADMAP_AND_INTEGRATION.md` §3 Phase 1; `01_EMBEDDED_TESTING_ARCHITECTURE.md` §4 (dev-lifecycle integration), §7 (Day-1 checklist), §3 L2 (surface layer)
**Duration estimate**: ~1 week (~4-5 working days with parallel dispatch)
**Owner**: Architect

---

## 1. Phase goal

Take today's manually-maintained deep-smoke harness (Phase 0 anchor, `v0.4.44.0`) and make the framework **hands-off**: every endpoint is covered automatically, every PR is gated automatically, every deploy is gated automatically. The same framework also installs in the Verify repo so it's proven portable, not HireStream-bespoke. After Phase 1, no human has to remember to maintain the harness — and no broken code reaches `main` or staging without a red status check.

---

## 2. Features in scope

The 5 P1 deliverables. Each becomes one Task Brief.

| # | Deliverable | Spec ref | Acceptance test (Definition of Done) |
|---|---|---|---|
| **P1.1** | Route auto-discovery in `scripts/deep-smoke.mjs` | `01` §3 L2 · `03` §3 Phase 1.1 | Add a dummy GET route in a feature branch; run `npm run smoke` *without* editing the harness; the new route is probed. Manual `ROUTES` dict shrinks to a per-role allowlist (which roles *should* reach each path); `FORBIDDEN` is auto-derived as the complement. Existing 105-check pass count must not regress. |
| **P1.2** | CI workflow `.github/workflows/pr-check.yml` | `01` §4 (PR row) · `03` §3 Phase 1.2 | Opening a PR triggers the workflow; it runs `npm test` + `npm run smoke`; both checks appear on the PR. A deliberately broken PR (e.g. a route returning 500) → check fails → merge button disabled per branch protection. |
| **P1.3** | Pre-deploy gate around `pm2 restart` | `01` §4 (pre-deploy row) · `03` §3 Phase 1.3 | A wrapper script (`scripts/deploy-gate.sh` or similar) runs `DEEP_URL=<target> npm run smoke` before invoking `pm2 restart hirestream`; on red, the restart is aborted with a clear error. Verified with a deliberately broken build against staging. |
| **P1.4** | Embed the same framework in the Verify app repo | `03` §3 Phase 1.4 | `verify` repo has `scripts/deep-smoke.mjs`, `tests/DEEP_TESTING.md`, `npm run smoke` script, and a Verify-appropriate `ROUTES` allowlist. `npm run smoke` against `verify-stg.agentryx.dev` passes. Proves the harness pattern is portable; no copy-paste of HireStream-specific code. |
| **P1.5** | Day-1 checklist enforcement script | `01` §7 · `03` §3 Phase 1.5 | `scripts/verify-skeleton.mjs` reads the project structure and asserts every Day-1-checklist item exists (`tests/{unit,integration,e2e,fixtures}`, `scripts/deep-smoke.mjs`, `tests/DEEP_TESTING.md`, `VERIFICATION.md`, `package.json` has `test:deep` script). Wired into CI; deleting a required file → CI fails with a clear message naming what's missing. |

---

## 3. Features explicitly NOT in scope

Defer to later phases. Listed here to prevent scope creep:

- Mutation endpoints (POST/PATCH/DELETE) smoke coverage → **P2.2**
- Data-isolation tests (employer A vs employer B) → **P2.2**
- Zod-derived input fuzz → **P2.1**
- Any L4 work (structured logs, anomaly detection, digest, triage) → **P2.3 / P2.4 / P3**
- Confidence score → **P3.3**
- Mutation testing (Stryker) → **P4.3**
- Verify-portal bridge (publishing signals to Verify) → **P5**
- Renaming `Verificaion` → `Verification` and other doc cleanups → housekeeping, separate from this phase

---

## 4. Dependencies

**Must be complete before phase start:**
- Phase 0 anchor live (`hirestream/scripts/deep-smoke.mjs` at `v0.4.44.0`) — done
- Architecture docs `00`-`03` and context file `04` reviewed by architect — done
- Skeleton folders (`Phase_PRDs/`, `C6_Active_Tasks/{Task_Briefs,QC_Reports,Architect_Reviews}/`, `C7_Archived_Tasks/`) created — done
- Antigravity authentication working for the operator — **operator to confirm** (screenshot showed "Authenticating..."; not blocking until first dispatch)

**Provides for Phase 2:**
- A working CI pipeline that any new test/smoke addition will plug into (P2 deliverables ride on this).
- An auto-discovery base that P2's mutation/fuzz layers extend rather than re-invent.
- Verify repo has the same skeleton, so P2-P5 mirrors in Verify without re-bootstrapping.

---

## 5. Risk areas specific to this phase

Most P1 risk is in agent coordination and CI infrastructure, not in product behaviour (CI/gate work doesn't touch the running app). Concrete items:

| Risk | Affected task | Mitigation |
|---|---|---|
| Express `app._router.stack` walking misses dynamically-mounted sub-routers or conditional routes | P1.1 | Brief specifies probing the live server's actual mounted routes (via a startup-time enumeration endpoint or by walking the router AFTER all `app.use()` calls), not the source files. Acceptance test verifies the dummy route case. |
| GitHub Actions runner can't reach `TEST_DATABASE_URL` (local Postgres) | P1.2 | Use a hosted ephemeral test DB (e.g. Neon free-tier branch per CI run) or a self-hosted runner. Decide before dispatch; brief includes the chosen approach. |
| Pre-deploy gate breaks the operator's existing `pm2 restart hirestream` flow | P1.3 | Wrapper script; old `pm2 restart` continues to work. Documented in `tests/DEEP_TESTING.md`. |
| Verify repo has a different role inventory than HireStream | P1.4 | Brief includes a discovery pass first — agent reads the Verify auth + roles before authoring the smoke harness. |
| Skeleton check trips on legitimate variations (e.g. an app with no `e2e/` because it has no UI) | P1.5 | Make required items configurable per `00_factory.json` (project meta); brief includes this. |
| 4 agents working in parallel produce conflicting changes to shared files (e.g. `package.json`, `VERSION`) | Coordination | Each Task Brief explicitly lists "files in scope"; `package.json` script additions are sequenced through architect-integration, not parallel agent commits. VERSION bumps only by architect after each task's integration. |

---

## 6. Exit criteria

Phase 1 is complete when ALL of the following are true. Tick boxes during execution; archive the ticked PRD on phase close.

- [ ] **P1.1** Route auto-discovery merged; acceptance test passes (dummy route auto-probed)
- [ ] **P1.2** PR check workflow active on `main`; a deliberately red PR is blocked from merge
- [ ] **P1.3** Pre-deploy gate verified to abort a broken-build deploy against staging
- [ ] **P1.4** Verify repo has the harness; `npm run smoke` passes against `verify-stg.agentryx.dev`
- [ ] **P1.5** Day-1 checklist script runs in CI; HireStream + Verify both pass; a deliberately incomplete project fails with a clear message
- [ ] All 5 QC Reports archived to `C7_Archived_Tasks/Phase_01/`
- [ ] Phase 1 Retrospective written at `C7_Archived_Tasks/Phase_01/Retrospective.md`
- [ ] `hirestream/VERSION` bumped to `v0.5.0.0` (minor — significant new framework feature)
- [ ] `04_DEV_CONTEXT_*.md` §3 (Current technical state) updated to reflect P1 done
- [ ] `Phase_02_PRD.md` drafted (locks the next phase before this one closes)

---

## 7. Sub-agent task breakdown — Antigravity dispatch plan

Phase 1 fans out across **5 sub-agent tasks** in **2 waves**. Wave 1 runs 4 agents in **parallel** (files don't conflict); Wave 2 dispatches the one task that benefits from Wave 1 being finalised.

### 7.1 · Model picks (drawn from your Antigravity capability set)

| Tier | Model | Used for | Why |
|---|---|---|---|
| 🔴 (architectural) | Claude Opus 4.6 Thinking | (none in P1) | Reserved for the architect role, not sub-agent work |
| 🟡 (substantial, needs reasoning) | **Claude Sonnet 4.6 Thinking** | P1.1 | Express router internals + module-walking + edge cases — needs careful reasoning |
| 🟡 (substantial, cross-repo) | **Gemini 3.1 Pro High** | P1.4 | Cross-repo work; understanding two codebases at once; Gemini Pro handles this well |
| 🟢 (mechanical, well-bounded) | **Gemini 3.5 Flash High** | P1.2, P1.3 | CI YAML is heavily-templated; Flash High is fast + accurate on boilerplate |
| 🟢 (validation script) | **Gemini 3.5 Flash Medium** | P1.5 | Small validation utility; reading + asserting on file paths; Flash Medium plenty |

Total: **4 models in use across 5 tasks**. Two tasks (P1.2 + P1.3) use the same model — they're sibling CI workflows and benefit from one agent's consistency.

### 7.2 · Wave 1 — 4 agents in parallel

| Task slug | Model (AG pick) | Files in scope | Effort | Brief written? |
|---|---|---|---|---|
| `p01_p1_1_route_auto_discovery` | Claude Sonnet 4.6 Thinking | `hirestream/scripts/deep-smoke.mjs` + small env-gated `__routes` diagnostic endpoint | 90-120 min | ✅ `C6_Active_Tasks/Task_Briefs/p01_p1_1_route_auto_discovery.md` |
| `p01_p1_2_ci_pr_check_workflow` | Gemini 3.5 Flash High | New: `hirestream/.github/workflows/pr-check.yml` | 30-45 min | ✅ `.../p01_p1_2_ci_pr_check_workflow.md` |
| `p01_p1_3_pre_deploy_gate` | Gemini 3.5 Flash High | New: `hirestream/scripts/deploy-gate.sh` (+ doc append) | 30-45 min | ✅ `.../p01_p1_3_pre_deploy_gate.md` |
| `p01_p1_5_day1_skeleton_check` | Gemini 3.5 Flash Medium | New: `hirestream/scripts/verify-skeleton.mjs` + `VERIFICATION.md` + one `package.json` script entry | 30-45 min | ✅ `.../p01_p1_5_day1_skeleton_check.md` |

**Parallelism safety:** Wave 1 tasks edit **disjoint file sets**. The only shared file is `package.json` (for new `npm run` script entries). Resolution: each Task Brief includes its `package.json` edit as a small, idempotent block; the architect integrates them serially during review (5 minutes).

**Dispatch flow per agent:**
1. Operator opens Antigravity, selects the model named in the table.
2. Pastes the **Standing Prompt** (from `PMD-DevFactory/C_Agent_Orchestration/C2_Standing_Prompts/`) + path to the Task Brief.
3. Agent reads `C1_Conventions_for_Agents.md` + the brief.
4. Agent edits `hirestream/...` only.
5. Agent writes QC Report to `C6_Active_Tasks/QC_Reports/<task-slug>.md` (all 9 sections).
6. Agent STOPS. No commits, no deploys.
7. Operator pings architect.

### 7.3 · Wave 2 — 1 agent sequential (after Wave 1 architect-reviewed)

| Task slug | Model (AG pick) | Files in scope | Effort | Brief written? |
|---|---|---|---|---|
| `p01_p1_4_verify_framework_port` | Gemini 3.1 Pro High | `verify/scripts/deep-smoke.mjs`, `verify/scripts/verify-skeleton.mjs`, `verify/tests/DEEP_TESTING.md`, `verify/VERIFICATION.md`, `verify/package.json`, + small `__routes` endpoint on the Verify server | 90-120 min | ✅ `.../p01_p1_4_verify_framework_port.md` — **drafted now; DO NOT DISPATCH until Wave 1 lands** (the brief's §intro and Wave-2 marker make this explicit) |

**Why sequential:** P1.4 benefits from the **finalised** HireStream auto-discovery design (P1.1) being available as a reference. Dispatching P1.4 before P1.1 lands would force the agent to design for a moving target. Also, P1.4 is in a separate repo, so the wait doesn't block Wave 1's work — it just optimises P1.4's quality.

### 7.4 · Architect-side workflow (operator + Claude Code session)

```
Wave 1 dispatch
  └─> 4 AG agents work in parallel (~2-3 hr wall time)
  └─> QC Reports trickle back to C6_Active_Tasks/QC_Reports/
       └─> Architect reviews each (spot-check the actual diff, do NOT
            trust the QC report's "everything passes" alone — see
            DevFactory C5_Failure_Modes.md)
       └─> Architect writes Architect_Review per task
       └─> If ACCEPT: integrate to hirestream/, run `npm run test:deep`,
            commit per the v0.4.X.Y convention (one logical commit per task)
       └─> If FIX: hand corrections back as follow-up brief

[after Wave 1 all green and integrated]

Wave 2 dispatch
  └─> 1 AG agent (P1.4)
  └─> Same review cycle

[after Wave 2 green]

End-of-Phase ritual
  └─> Move all 5 task artefacts C6 → C7_Archived_Tasks/Phase_01/
  └─> Write Phase_01/Retrospective.md
  └─> Bump VERSION to v0.5.0.0
  └─> Draft Phase_02_PRD.md
  └─> Update 04_DEV_CONTEXT_*.md §3
```

### 7.5 · Standing prompt + conventions to reference

Every Task Brief must include — at the top, before Section 1:

- Read `PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md` first.
- Cold-start context: the agent has never seen this conversation. The brief must be self-contained.
- Tier-specific failure modes from `C5_Failure_Modes.md` (e.g. for Sonnet: check for over-building; for Gemini Flash: check for under-reading the spec).
- Standing rules:
  - Sub-agent NEVER touches PROD (`/srv/`, `/opt/`, pm2 paths).
  - Sub-agent NEVER commits, NEVER pushes.
  - Sub-agent ALWAYS writes the full 9-section QC Report.
  - On architectural ambiguity → STOP and ask via QC Section 7, do not invent.

---

## 8. What success looks like (one-paragraph)

At Phase 1 close, opening any PR on HireStream or Verify automatically runs the full test:deep harness, fails on any regression, and blocks merge. Adding a new endpoint requires zero harness maintenance — auto-discovery picks it up. Trying to `pm2 restart` a broken build aborts with a clear message before the restart happens. The Verify repo carries the same skeleton as HireStream, proving portability. Five new Agentryx apps could be bootstrapped from this skeleton tomorrow.

---

## 9. Open decisions (must resolve before dispatch)

- [ ] **CI test-DB**: Neon-branch-per-CI vs self-hosted runner vs Docker-Postgres-in-CI. Decide before writing the P1.2 brief.
- [ ] **Antigravity authentication**: operator confirmed working (screenshot showed "Authenticating..." — not blocking; resolve before first dispatch).
- [ ] **Verify repo location**: confirm path with operator (presumably `/home/subhash.thakur.india/Projects/Recruitment/agentryx-verify/` per `Agentryx-Verify-Roadmap/00_README.md` §Document conventions).
- [ ] **Task slug convention**: confirming `p01_pX_Y_<short>` — matches DevFactory archived pattern (`p06_sim_quicksuper` etc.). The `p01` prefix = Phase 01 (not repo-wide task counter).

---

## 10. Status changelog

| Date | Status | Note | Author |
|---|---|---|---|
| 2026-05-30 | Locked — ready to dispatch | Initial draft. Skeleton folders created; context file `04` written; AG dispatch plan finalised at 4 parallel + 1 sequential. | Architect (Claude Opus 4.7) |
