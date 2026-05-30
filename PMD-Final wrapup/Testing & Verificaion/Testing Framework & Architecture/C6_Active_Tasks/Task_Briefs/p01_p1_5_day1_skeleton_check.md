<!--
TASK BRIEF
SLUG: p01_p1_5_day1_skeleton_check
PHASE: 01 — Eliminate manual maintenance + wire CI
TIER: 🟢 (validation script — mechanical)
AG MODEL: Gemini 3.5 Flash (Medium)
WAVE: 1 (parallel with p01_p1_1, p01_p1_2, p01_p1_3)
-->

# Task Brief — p01_p1_5_day1_skeleton_check

**Assigned tier**: 🟢 — Gemini 3.5 Flash (Medium)
**Effort estimate**: 30-45 min
**Workspace**: DEV only — `hirestream/scripts/` + `hirestream/VERIFICATION.md` (new) + minor CI hook
**Files to create**:
- `hirestream/scripts/verify-skeleton.mjs` (NEW)
- `hirestream/VERIFICATION.md` (NEW — see §2.3)
**Files to edit (DO NOT touch unless explicitly listed below)**:
- `hirestream/package.json` — add ONE script: `"verify:skeleton": "node scripts/verify-skeleton.mjs"`. Do not touch any other field.
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_5_day1_skeleton_check.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **"Gemini Flash under-reads spec"** — read §2 here carefully. The Day-1 checklist items in §2.1 are exact; do not add or omit any.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md` §7 — **the Day-1 checklist** is the source of truth. Your script asserts on it.

---

## 1. Background — why this task exists

The Day-1 checklist in `01_EMBEDDED_TESTING_ARCHITECTURE.md` §7 lists the minimum embedded-framework footprint every new Agentryx app must have **before** feature work begins. Today, the checklist is just a doc — there's no enforcement. A new app could "forget" to set it up; that's exactly the kind of slow drift that ends with the next app re-living HireStream's last 8 weeks.

**Goal of this task**: a Node script (`scripts/verify-skeleton.mjs`) that asserts the project structure conforms to the Day-1 checklist. Wired into CI (via a small addition to `pr-check.yml` that p01_p1_2 owns — but you do NOT touch that file; see §3). Runs locally as `npm run verify:skeleton`.

This is Phase 1, deliverable 5 from `Phase_01_PRD.md` §2 (row P1.5).

---

## 2. What you must change

### 2.1 — Create `hirestream/scripts/verify-skeleton.mjs`

A Node ESM script that checks the project conforms to the Day-1 checklist. Exact items to verify (from `01_EMBEDDED_TESTING_ARCHITECTURE.md` §7):

| Check | What it asserts |
|---|---|
| 1 | `tests/unit/` directory exists |
| 2 | `tests/integration/` directory exists |
| 3 | `tests/e2e/` directory exists |
| 4 | `tests/fixtures/` directory exists |
| 5 | `tests/DEEP_TESTING.md` file exists |
| 6 | `tests/setup.ts` (or `tests/setup.js`) file exists |
| 7 | `scripts/deep-smoke.mjs` file exists |
| 8 | `package.json` has a `"smoke"` script |
| 9 | `package.json` has a `"test:deep"` script |
| 10 | `package.json` has a `"test"` script |
| 11 | `VERIFICATION.md` exists at repo root (see §2.3 — you create this in this same task) |

For each check, on failure, append a clear message to a `missing` array. After all checks run:

- If `missing` is empty: print `Day-1 skeleton: OK (11/11 checks)` and exit 0.
- If `missing` is non-empty: print `Day-1 skeleton: FAIL (<count> missing)` followed by one line per missing item, with the exact file path expected. Exit 1.

Implementation specifics:

- Use Node 20 native (no extra deps). `import { existsSync, readFileSync } from "node:fs"`.
- Resolve paths relative to the **project root** (the dir containing `package.json`). Locate the project root by walking up from `process.cwd()` until a `package.json` is found.
- For the `package.json` script checks (items 8/9/10): parse the JSON; assert the script key exists with a non-empty value. Do NOT execute the script.
- Keep the script under 100 lines (a tight validation utility, not a framework).
- Add a 4-line comment block at the top: name, purpose, expected exit codes, "extend by editing the CHECKS array".

### 2.2 — Add the `npm run verify:skeleton` script

In `hirestream/package.json`, under `"scripts"`, add exactly:

```json
"verify:skeleton": "node scripts/verify-skeleton.mjs"
```

Place it alphabetically near `test:deep` for readability. **Do not modify any other script.** Do not modify `dependencies`, `devDependencies`, `name`, `version`, or any other field.

### 2.3 — Create `hirestream/VERIFICATION.md`

A short doc (≤ 30 lines) at the repo root that:

- Lists the project's current confidence threshold (start at `60`; will ratchet up in Phase 3).
- Links to the three testing entry points:
  - `tests/DEEP_TESTING.md` for the test-deep gate
  - `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/04_DEV_CONTEXT_*.md` for the in-flight phased dev
  - `scripts/deep-smoke.mjs` as the harness anchor
- Includes a stub for the 90-day score-trend chart (a literal `TBD` until p3_3 reporter lands).
- States: "Last skeleton check: `<date or 'TBD'>`" (a future task will auto-update this).

Use this template (adapt as needed):

```markdown
# Verification — HireStream

Project's current confidence threshold: **60** (Phase 1 baseline; will ratchet up per Phase 3).

Last `npm run verify:skeleton`: `TBD` (updated by the script in a future Phase).

## Quick reference

- `npm run test:deep` — the combined gate (jest + smoke)
- `npm run smoke` — surface-layer health (route + authz matrix) against staging
- `npm run smoke:local` — same against the local dev server
- `npm run verify:skeleton` — Day-1 checklist enforcement
- `tests/DEEP_TESTING.md` — entry-point documentation

## Confidence trend (last 90 days)

TBD — will be populated by `scripts/confidence.mjs` in Phase 3.

## Phased dev (where we are)

See `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/03_ROADMAP_AND_INTEGRATION.md` for the full P1-P5 roadmap and current phase.
```

### 2.4 — Do NOT modify `.github/workflows/pr-check.yml`

The CI hook for this script lives in `pr-check.yml`, which is owned by the sibling task `p01_p1_2_ci_pr_check_workflow`. Coordination: that brief authors `pr-check.yml`; this brief authors the script that `pr-check.yml` will invoke. The architect integrates both. **You do NOT touch `pr-check.yml`.**

---

## 3. What you must NOT change

- Do **NOT** touch `.github/workflows/` (owned by p01_p1_2).
- Do **NOT** modify `scripts/deep-smoke.mjs` (owned by p01_p1_1).
- Do **NOT** create `scripts/deploy-gate.sh` (owned by p01_p1_3).
- Do **NOT** modify any product code under `server/` or `client/`.
- Do **NOT** add new npm dependencies.
- Do **NOT** modify `package.json` beyond adding the ONE script entry in §2.2.
- Do **NOT** modify the Day-1 checklist in `01_EMBEDDED_TESTING_ARCHITECTURE.md` itself. If you think the checklist should change, STOP and document in QC §5 (out-of-scope finding).
- Do **NOT** commit. Do **NOT** push.

---

## 4. Validation steps (mandatory; paste raw output into QC Section 3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — syntax check
node --check scripts/verify-skeleton.mjs && echo "syntax OK"

# Step 2 — run against the current repo (should pass 11/11)
npm run verify:skeleton
# Expected: "Day-1 skeleton: OK (11/11 checks)"; exit 0

# Step 3 — capture exit code
npm run verify:skeleton; echo "exit=$?"
# Expected: exit=0

# Step 4 — Forced-fail: temporarily rename one required file
mv tests/DEEP_TESTING.md tests/DEEP_TESTING.md.bak
npm run verify:skeleton; echo "exit=$?"
# Expected: FAIL output listing tests/DEEP_TESTING.md as missing; exit=1
mv tests/DEEP_TESTING.md.bak tests/DEEP_TESTING.md

# Step 5 — Forced-fail: temporarily remove the test:deep script
node -e "const p=require('./package.json'); const orig=p.scripts['test:deep']; delete p.scripts['test:deep']; require('fs').writeFileSync('./package.json',JSON.stringify(p,null,2));"
npm run verify:skeleton; echo "exit=$?"
# Expected: FAIL output listing package.json.scripts.test:deep as missing; exit=1
# Restore: open package.json and put test:deep back to "npm test && npm run smoke"
node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('./package.json','utf8')); p.scripts['test:deep']='npm test && npm run smoke'; fs.writeFileSync('./package.json',JSON.stringify(p,null,2)+'\n');"
npm run verify:skeleton
# Re-run; expected: "Day-1 skeleton: OK (11/11 checks)"; exit 0

# Step 6 — VERIFICATION.md exists at repo root
ls -la VERIFICATION.md && head -10 VERIFICATION.md
```

**Expected outputs**: see inline.

If any step diverges, your task is NOT done — investigate. STOP if you can't restore `package.json` cleanly; document in QC §7 (and the architect will manually restore).

---

## 5. QC report — required

Use template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`.

Save to: `PMD-Final wrapup/.../C6_Active_Tasks/QC_Reports/p01_p1_5_day1_skeleton_check.md`. All 9 sections required.

---

## 6. After QC report is written, STOP

Do NOT commit. The architect integrates the script + the VERIFICATION.md + the package.json edit.

---

## 7. Acceptance — done when

> "`npm run verify:skeleton` exits 0 with `Day-1 skeleton: OK (11/11 checks)` against the current HireStream repo; deleting any required file makes it exit 1 with a clear message naming the missing item; `VERIFICATION.md` exists at the repo root; no other file was modified."
