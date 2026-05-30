<!--
TASK BRIEF
SLUG: p01_p1_3_pre_deploy_gate
PHASE: 01 — Eliminate manual maintenance + wire CI
TIER: 🟢 (mechanical, well-bounded)
AG MODEL: Gemini 3.5 Flash (High)
WAVE: 1 (parallel with p01_p1_1, p01_p1_2, p01_p1_5)
-->

# Task Brief — p01_p1_3_pre_deploy_gate

**Assigned tier**: 🟢 — Gemini 3.5 Flash (High)
**Effort estimate**: 30-45 min
**Workspace**: DEV only — `hirestream/scripts/` + `hirestream/tests/DEEP_TESTING.md`
**Files to create**: `hirestream/scripts/deploy-gate.sh` (NEW)
**Files to edit**: `hirestream/tests/DEEP_TESTING.md` (append a §)
**Files NOT in scope**: `package.json` (do NOT add a new script entry — the operator invokes the script directly per the existing deploy pattern)
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_3_pre_deploy_gate.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **"Gemini Flash under-reads spec"** — read §2 here twice.
3. `hirestream/scripts/deep-smoke.mjs` — the harness being gated on.
4. `hirestream/tests/DEEP_TESTING.md` — entry-point doc; append to it.

---

## 1. Background — why this task exists

The current deploy flow is manual: developer/architect runs `npm run build` then `pm2 restart hirestream`. If the build is broken (a 5xx-producing change, a missing migration, etc.), it goes live immediately. There is no automatic pre-flight check.

**Goal of this task**: provide a single script `scripts/deploy-gate.sh` that wraps `pm2 restart hirestream` with a pre-flight: run `npm run smoke` against the **target** environment first; if any FAIL, abort the restart with a clear error.

This is Phase 1, deliverable 3 from `Phase_01_PRD.md` §2 (row P1.3).

---

## 2. What you must change

### 2.1 — Create `hirestream/scripts/deploy-gate.sh`

A bash script with these exact properties:

- **Shebang**: `#!/usr/bin/env bash`
- **Strict mode**: `set -euo pipefail` at the top.
- **Usage**: `./scripts/deploy-gate.sh <target-url> [--force]`
  - `<target-url>` (required): the `DEEP_URL` to probe before restart, e.g. `https://hirestream-stg.agentryx.dev` or `http://localhost:5000`.
  - `--force` (optional): skips the gate; logs a loud warning and proceeds. For emergency use only.
- **Behaviour**:
  1. Parse args. If `<target-url>` missing, print usage and exit 2.
  2. Print a banner: `=== Deploy gate: probing <target-url> ===`.
  3. Run `DEEP_URL=<target-url> npm run smoke`. Capture exit code.
  4. If exit code 0:
     - Print `=== Deploy gate: PASS ===`.
     - Invoke `pm2 restart hirestream` (capture exit code; propagate it).
     - If `pm2 restart` succeeds, print `=== Restart complete ===` and exit 0.
  5. If exit code != 0:
     - If `--force` was passed: print a multi-line WARNING (in red if terminal supports it) explaining the gate failed; then proceed to `pm2 restart`.
     - If `--force` was NOT passed: print `=== Deploy gate: FAIL — aborting restart ===` (in red if available), with a short reason (e.g. "smoke harness returned non-zero"), and exit 1.
  6. Trap `INT`/`TERM` so that ctrl-c during the smoke run exits cleanly with code 130.
- **No side effects** beyond what's described. Do NOT:
  - Modify git state.
  - Touch `/opt/`, `/srv/`, or any path outside `hirestream/`.
  - Write to any persistent location other than the script's own stdout/stderr.
- **Make it executable**: `chmod +x scripts/deploy-gate.sh` (the agent's bash session will have a record of this in `git diff`/`ls -l`).
- **Portability**: must work on linux (the staging VM). macOS compatibility is a bonus; don't go out of your way.

### 2.2 — Update `hirestream/tests/DEEP_TESTING.md`

Append (do NOT replace existing content) a section:

```markdown
## Deploy gate

`scripts/deploy-gate.sh <target-url>` wraps `pm2 restart hirestream` with a pre-flight smoke probe. A red smoke harness aborts the restart.

Usage:

    # Standard deploy
    ./scripts/deploy-gate.sh https://hirestream-stg.agentryx.dev

    # Emergency bypass (rarely correct; logs a loud warning):
    ./scripts/deploy-gate.sh https://hirestream-stg.agentryx.dev --force

This is the standard deploy path. Bare `pm2 restart hirestream` should not be invoked.
```

### 2.3 — No `package.json` changes

The script is invoked directly (`./scripts/deploy-gate.sh ...`), not via npm. Resist the temptation to add an npm script alias.

---

## 3. What you must NOT change

- Do **NOT** modify `scripts/deep-smoke.mjs` (sibling task p01_p1_1 owns that).
- Do **NOT** create or modify any `.github/workflows/*.yml` (sibling tasks p01_p1_2 and p01_p1_5).
- Do **NOT** modify `package.json`.
- Do **NOT** modify any product code under `server/` or `client/`.
- Do **NOT** invoke `pm2 restart` from your validation — that's an actual restart of the staging server. Stop and document in QC §7 if you think you need to.
- Do **NOT** commit. Do **NOT** push.

---

## 4. Validation steps (mandatory; paste raw output into QC Section 3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — shellcheck the script (install if missing per OS; if not available, fall back to `bash -n`)
shellcheck scripts/deploy-gate.sh 2>&1 | head -30 || bash -n scripts/deploy-gate.sh && echo "bash -n OK"

# Step 2 — executable bit set
ls -l scripts/deploy-gate.sh | awk '{print $1}'
# Expected: -rwx... (executable for user)

# Step 3 — usage with missing arg → exit 2
./scripts/deploy-gate.sh; echo "exit=$?"
# Expected: usage printed; exit=2

# Step 4 — dry-run the gate against a target that DOES NOT exist (forced fail)
#   But intercept the pm2 restart command so it never actually runs.
#   Stub pm2 by prepending a fake to PATH:
mkdir -p /tmp/gate-test-bin
cat >/tmp/gate-test-bin/pm2 <<'PM2STUB'
#!/usr/bin/env bash
echo "[STUB] pm2 $@"
exit 0
PM2STUB
chmod +x /tmp/gate-test-bin/pm2
PATH=/tmp/gate-test-bin:$PATH ./scripts/deploy-gate.sh https://hirestream-stg.agentryx.dev; echo "exit=$?"
# Expected: PASS banner + STUB pm2 line + exit=0
#   (assuming staging is currently green)

# Step 5 — Forced-fail simulation: point at a URL the harness can't reach
PATH=/tmp/gate-test-bin:$PATH ./scripts/deploy-gate.sh http://127.0.0.1:1; echo "exit=$?"
# Expected: FAIL banner; NO STUB pm2 line (gate aborted); exit=1

# Step 6 — --force bypass simulation
PATH=/tmp/gate-test-bin:$PATH ./scripts/deploy-gate.sh http://127.0.0.1:1 --force; echo "exit=$?"
# Expected: FAIL banner + WARNING + STUB pm2 line (proceeded despite red); exit=0

# Step 7 — DEEP_TESTING.md updated correctly
grep -c '## Deploy gate' tests/DEEP_TESTING.md
# Expected: 1

# Cleanup
rm -rf /tmp/gate-test-bin
```

**Expected outputs**: see expectations inline above. Step 4 requires staging to be currently green; if smoke fails against staging in step 4, STOP and document in QC §7.

---

## 5. QC report — required

Use template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`.

Save to: `PMD-Final wrapup/.../C6_Active_Tasks/QC_Reports/p01_p1_3_pre_deploy_gate.md`. All 9 sections.

In Section 6 (reviewer attention), specifically flag:
- The exit-code mapping (0 = pass-and-restarted; 1 = gate-failed-not-restarted; 2 = bad usage).
- The `--force` flag's behaviour.

---

## 6. After QC report is written, STOP

Do NOT actually invoke `pm2 restart hirestream`. Do NOT commit. Architect will integrate.

---

## 7. Acceptance — done when

> "`scripts/deploy-gate.sh <url>` passes shellcheck, refuses missing-arg usage, aborts on red smoke (exit 1), proceeds on green smoke (exit 0 + restart), and respects `--force` for emergency bypass. The wrapper does NOT itself execute a real restart during validation."
