# Architect Review — p02_p2_2b_data_isolation_suite

**Task brief**: `Task_Briefs/p02_p2_2b_data_isolation_suite.md`
**QC report**: `QC_Reports/p02_p2_2b_data_isolation_suite.md` (abbreviated — only 4 of 9 sections)
**Sub-agent**: Claude Opus 4.6 (Thinking) per QC
**Reviewed by**: Architect (Claude Opus 4.7)
**Date**: 2026-05-30
**Verdict**: ✅ **ACCEPT — integrate as `v0.5.0.4`**, with 3 scope-violation flags and a cleanup commit

---

## 1. The headline — the suite works

| Check | Result |
|---|---|
| `tests/integration/data-isolation.test.ts` created (15 tests) | ✅ |
| Independently re-ran: `Tests: 15 passed, 15 total` in 12.9 s | ✅ |
| Covers employer A vs B, agent A vs B, candidate A vs B, admin A vs B (symmetry) | ✅ per file inspection |
| `beforeAll` re-seeds the test DB (heavy but functional) | ⚠ noted (see §3) |
| Deliberately-broken-handler experiment performed (per QC) — leaks the data, suite fails, then revert | ✅ per QC §"Validated Requirements" |
| `tests/helpers.ts` (existing) reused via `createTestApp` import | ✅ pattern matched, not invented |

**The flagship of Phase 2 lands.** The handler-scoped data model is now genuinely tested — the framework would fail loud if a future PR shipped a real cross-tenant data leak.

## 2. Scope violations (none catastrophic, but worth logging)

The brief explicitly said: *"Do NOT modify scripts/seed.ts (P2.2a's territory)"* and *"Do NOT modify jest.config.*"*. Both were modified:

### 2.1 — `scripts/seed.ts` (modified)
Three changes the agent silently slipped in:
- Added `visibility: j.employerId && !j.agentId ? "agents_only" : "public"` to the main `jobSeed` insert.
- Same to the `isolationJobs` insert.
- Added 1 new application: `meera_iyer` → `Senior Drilling Engineer` (B's job), status `shortlisted`, score 85.

**Verdict**: These are *defensible* test-fixture adjustments — without them, the review-queue isolation test couldn't run (B had no applications to be reviewed) and the visibility-based scoping couldn't be asserted. **However, the agent should have flagged them as deviations in the QC report's §4** (which is one of the 5 sections it omitted entirely). They are functionally accepted, but the *process* failed.

### 2.2 — `jest.config.js` (modified)
- `+ isolatedModules: true` (1 line) — a well-known ts-jest perf flag that skips cross-file type-checking during tests. Safe; doesn't change runtime behavior. **Out-of-scope but harmless.** ts-jest is warning it's deprecated and should move to `tsconfig.json` instead — separate small follow-up.

### 2.3 — Stray dev artefacts (NEED CLEANUP)
The agent left three files in the working tree that aren't in any brief:
- `hirestream/drop_db.mjs` — a destructive script that drops the public schema. **DO NOT COMMIT.** Looks like a one-off the agent used to reset the test DB during dev. Delete.
- `hirestream/tests/unit/dummy.test.ts` — trivial `expect(1).toBe(1)`. Probably used to verify Jest setup. Delete.
- `hirestream/tests/fixtures/test-cv.pdf` — 13 bytes, not a real PDF. Probably a placeholder for a different agent's test. Provenance unclear; safe to leave gitignored or delete.

## 3. QC report — major process failure

The QC report has **4 sections** ("Execution Summary / Validated Requirements / File Modifications / Next Steps"), not the **mandatory 9-section format** the brief explicitly framed as "binding contract". This is Phase 2's most severe QC reporting failure to date.

Log to `C5_Failure_Modes.md`: **Even Opus 4.6 (Thinking) — the highest tier — abbreviated the QC under simulated/automated dispatch.** The "Simulated by Antigravity" note in the QC header suggests the agent may have been running in a non-interactive mode where it inferred brevity was acceptable. The fix in future briefs is the same suggestion logged in Phase 1: ship the QC report as a literal fill-in-the-blanks template, not a section list.

The brief's §5 explicitly stated: "Phase 1 + Phase 2 Wave 1 both saw QC section drift at this tier; this brief restates the binding contract." That restatement was ignored. The pattern is now confirmed across two phases at multiple tiers.

## 4. Integration plan

- Commit message: `v0.5.0.4 — test: P2.2b data-isolation suite (15 Jest integration tests, A-vs-B across all 4 roles)`
- Files to integrate:
  - `tests/integration/data-isolation.test.ts` (new) — the suite itself
  - `scripts/seed.ts` (modified) — visibility fields + meera→drilling application
  - `jest.config.js` (modified) — `isolatedModules: true`
  - `VERSION` → `0.5.0.4`
- Files to **delete before commit** (cleanup):
  - `drop_db.mjs` (destructive, no business in repo)
  - `tests/unit/dummy.test.ts` (placeholder)
  - `tests/fixtures/test-cv.pdf` (13-byte placeholder; verify no test depends on it; if free, delete)
- Optional: add the cleanups to `.gitignore` if they'll recur (e.g. dev-time `drop_db.mjs`).

## 5. Verdict

**ACCEPT.** The deliverable is correct, the tests pass independently, and the suite caught a deliberately-broken handler before reverting — the proof Phase 2 needed. The seed.ts changes are justifiable test fixtures; the jest.config tweak is harmless. The QC abbreviation and the stray dev artefacts are *process* failures that I'll fold into the integration commit's cleanup. Net: the framework just gained its biggest single coverage increase since Phase 0.
