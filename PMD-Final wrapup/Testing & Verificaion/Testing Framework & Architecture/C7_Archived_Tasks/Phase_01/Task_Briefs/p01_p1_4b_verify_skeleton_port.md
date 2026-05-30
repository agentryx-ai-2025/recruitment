<!--
TASK BRIEF (micro-brief — completes the piece P1.4 had to stop on)
SLUG: p01_p1_4b_verify_skeleton_port
PHASE: 01 — Eliminate manual maintenance + wire CI
TIER: 🟢 (mechanical, well-bounded)
AG MODEL: Gemini 3.5 Flash (Medium or High)
DEPENDENCY: p01_p1_5_day1_skeleton_check has been integrated.
            hirestream/scripts/verify-skeleton.mjs now exists (~2.5 KB).
            p01_p1_4_verify_framework_port was PARTIAL ACCEPT — this brief
            closes that loop.
-->

# Task Brief — p01_p1_4b_verify_skeleton_port

**Assigned tier**: 🟢 — Gemini 3.5 Flash (Medium or High)
**Effort estimate**: 10-15 min
**Workspace**: DEV only — `agentryx-verify/scripts/`
**Files to create**: `agentryx-verify/scripts/verify-skeleton.mjs` (NEW — a copy of HireStream's, with one path adjustment if needed)
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_4b_verify_skeleton_port.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/hirestream/scripts/verify-skeleton.mjs` — the canonical source. Read it before copying.
3. The QC report for `p01_p1_4_verify_framework_port` — note: that brief stopped at this missing piece. This brief closes it.

---

## 1. Background — why this task exists

P1.5 (Day-1 skeleton check) shipped `hirestream/scripts/verify-skeleton.mjs` — a Node script that asserts the project conforms to the 11-item Day-1 checklist. The same script should live in **every** Agentryx app, including the Verify portal. P1.4 (Verify framework port) had to stop at this step because the canonical source didn't exist yet. Now it does.

**Goal of this task**: copy `hirestream/scripts/verify-skeleton.mjs` to `agentryx-verify/scripts/verify-skeleton.mjs`, run it, confirm it passes 11/11. That's it.

---

## 2. What you must change

### 2.1 — Copy the script

```bash
cp /home/subhash.thakur.india/Projects/Recruitment/hirestream/scripts/verify-skeleton.mjs \
   /home/subhash.thakur.india/Projects/Recruitment/agentryx-verify/scripts/verify-skeleton.mjs
```

The script walks up from `process.cwd()` to find `package.json` — so it's portable as-is. **Do not modify the script** unless one of the Day-1 checklist items doesn't apply to Verify (highly unlikely — the checklist is the universal Agentryx contract). If you think a modification is needed, **STOP** and document in QC §7 instead of inventing one.

### 2.2 — Confirm `agentryx-verify/package.json` already has the `verify:skeleton` script

P1.4 should have added it. Verify it exists:

```bash
grep -A0 "verify:skeleton" /home/subhash.thakur.india/Projects/Recruitment/agentryx-verify/package.json
```

If absent, add it: `"verify:skeleton": "node scripts/verify-skeleton.mjs"`. Place alphabetically near `smoke`. **No other changes to package.json.**

---

## 3. What you must NOT change

- Do **NOT** modify `agentryx-verify/scripts/verify-skeleton.mjs` after copying (unless documented per §2.1).
- Do **NOT** modify `hirestream/scripts/verify-skeleton.mjs`.
- Do **NOT** create or modify any other file in either repo.
- Do **NOT** modify any Verify product code.
- Do **NOT** commit. Do **NOT** push.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/agentryx-verify

# Step 1 — syntax
node --check scripts/verify-skeleton.mjs && echo "syntax OK"

# Step 2 — run against Verify
npm run verify:skeleton 2>&1 | tail -15
# Expected: "Day-1 skeleton: OK (11/11 checks)" — exit 0

# Step 3 — capture exit code
npm run verify:skeleton > /dev/null 2>&1; echo "exit=$?"
# Expected: exit=0

# Step 4 — forced-fail check (rename a required file, then restore)
mv tests/DEEP_TESTING.md tests/DEEP_TESTING.md.bak
node scripts/verify-skeleton.mjs; echo "exit=$?"
mv tests/DEEP_TESTING.md.bak tests/DEEP_TESTING.md
# Expected: FAIL with the missing path listed; exit=1

# Step 5 — confirm restored
node scripts/verify-skeleton.mjs; echo "exit=$?"
# Expected: 11/11 OK; exit=0

# Step 6 — diff against the HireStream original (should be byte-identical)
diff /home/subhash.thakur.india/Projects/Recruitment/hirestream/scripts/verify-skeleton.mjs scripts/verify-skeleton.mjs
# Expected: no output (files identical)
```

**Expected outputs**: see inline. If any step diverges, STOP and document in QC §7.

---

## 5. QC report — required

Use template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. All 9 sections required. Save to `C6_Active_Tasks/QC_Reports/p01_p1_4b_verify_skeleton_port.md`.

---

## 6. After QC report is written, STOP

Do NOT commit. Architect integrates with the rest of P1.4 as `agentryx-verify v0.2.2`.

---

## 7. Acceptance — done when

> "`agentryx-verify/scripts/verify-skeleton.mjs` is byte-identical to HireStream's; `npm run verify:skeleton` exits 0 with `Day-1 skeleton: OK (11/11 checks)`; removing any required file makes it exit 1 with a clear FAIL message."
