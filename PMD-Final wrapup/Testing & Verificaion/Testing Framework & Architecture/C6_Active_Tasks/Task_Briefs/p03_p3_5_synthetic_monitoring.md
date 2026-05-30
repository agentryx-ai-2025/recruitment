<!--
TASK BRIEF
SLUG: p03_p3_5_synthetic_monitoring
PHASE: 03 — Full L4 + L5 confidence score
TIER: 🟢/🟡 (small but cross-system — pm2 cron + Slack + state tracking)
AG MODEL: Gemini 3.1 Pro (High)
WAVE: 1 (parallel with p03_p3_1 and p03_p3_2)
-->

# Task Brief — p03_p3_5_synthetic_monitoring

**Assigned tier**: 🟡 — Gemini 3.1 Pro (High)
**Effort estimate**: 1.5 h
**Workspace**: DEV only — `hirestream/tools/synthetic/` (NEW directory), `hirestream/package.json` (+1 script), `hirestream/docs/synthetic-monitoring-runbook.md` (NEW)
**Files NOT in scope**: any product code (`server/`, `client/`, `shared/`); `scripts/deep-smoke.mjs` (read-only reference).
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p03_p3_5_synthetic_monitoring.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — Gemini Pro "over-confidence on unfamiliar codebases" pattern.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_03_PRD.md` §2 row P3.5 + §5 (risks).
4. `hirestream/scripts/deep-smoke.mjs` — your wrapper invokes this. Read its env-knobs (`DEEP_URL`, `DEEP_SMOKE_TOKEN`, `DEEP_SMOKE_THROTTLE_MS`).
5. `hirestream/tools/log-analyzer/digest.mjs` (P2.4) — Slack-on-failure pattern. Match its webhook usage.

**Phase 2 retro lesson applied:** the QC report uses the literal 9-section template. No abbreviation.

---

## 1. Background — why this task exists

`scripts/deep-smoke.mjs` is the surface-layer harness — runs on demand or in CI per PR. It is NOT yet *running in production*, scheduled, with alerting on failure. P3.5 closes that gap: a small wrapper that runs `npm run smoke` against **production** every 10 min via a pm2-managed cron, with state-tracking to skip duplicate runs and Slack-on-fail.

If production silently degrades — a deploy regression slips through, a network partition cuts a downstream — the synthetic monitor catches it within 10 min, not 24 h.

This is Phase 3 deliverable P3.5.

---

## 2. What you must change

### 2.1 — Discovery first

Answer in QC §3:

1. **What's HireStream's production URL?** Likely `https://hirestream.agentryx.dev` but confirm in `docs/` or `tests/DEEP_TESTING.md`. If a `hirestream.agentryx.dev` doesn't exist yet (and `hirestream-stg.agentryx.dev` is what we have), default to staging and flag in QC §7.
2. **Is there a production demo-account or service-principal?** Demo accounts (`demo_candidate`, etc.) may NOT exist in prod. Confirm with the operator (flag in QC §7 — this is an operator-action open question per `Phase_03_PRD.md` §8 #2).
3. **What's the existing pm2 process layout?** `pm2 list` — see `hirestream`, `agentryx-verify`. The new cron will be a third process. Document the naming convention.
4. **Does `tools/log-analyzer/digest.mjs` use a Slack webhook URL env var the same way?** Reuse the exact same `SLACK_WEBHOOK_URL` env, but route to a NEW channel — `#deep-smoke-prod` (per `Phase_03_PRD.md` §5).

### 2.2 — Create `hirestream/tools/synthetic/run-prod-smoke.mjs`

A Node ESM script that:

#### Configuration
- `DEEP_URL` env (default `https://hirestream.agentryx.dev` — confirm in §2.1).
- `DEEP_SMOKE_TOKEN` env (required; matches what pm2 has set on prod's hirestream instance).
- `SLACK_WEBHOOK_URL` env (optional; if unset, log to stdout only).
- `SLACK_CHANNEL` env (default `#deep-smoke-prod`).
- `MIN_INTERVAL_SECONDS` env (default `480` — refuse to run if last run was <8 min ago; safety against operator clicking the cron's enable button rapidly).
- `STATE_FILE` env (default `/tmp/hirestream-synthetic-state.json`).

#### Pipeline
1. **State check**: read `STATE_FILE`. If `lastRunAt` is within `MIN_INTERVAL_SECONDS`, exit 0 with a "Skipping — last run was Ns ago" log line. (No Slack message.)
2. **Run** `DEEP_URL=<env> DEEP_SMOKE_TOKEN=<env> node scripts/deep-smoke.mjs`. Capture stdout + stderr + exit code.
3. **Update state**: write `{lastRunAt: <ISO>, lastExitCode: N, lastSummary: "..." }` to `STATE_FILE`.
4. **On failure** (exit ≠ 0):
   - If `SLACK_WEBHOOK_URL` set: POST a Slack message with the SUMMARY line + the first 5 FAILURES lines from smoke's output + a link to the deploy-gate.sh runbook (Phase 1's pre-deploy gate). Use a code block for the smoke output.
   - Otherwise: print the same to stdout.
5. **On novel failure** (failure with a NEW exit code or NEW failure pattern vs previous state): post even if duplicate-suppression is on (which we deliberately don't implement — failures are valuable signal).
6. **Exit**: 0 if smoke passed; 1 if smoke failed AND Slack was either notified OR offline (the cron itself succeeded at its job — reporting the failure).

#### Output (stdout — pm2 captures this to its log)

```
[synthetic 2026-05-30T07:14:32Z] smoke against https://hirestream.agentryx.dev
  Result: PASS  (pass=381 warn=11 FAIL=80)
  Last run: 2026-05-30T07:04:30Z (10m02s ago) — within threshold
```

or on fail:

```
[synthetic 2026-05-30T07:14:32Z] smoke against https://hirestream.agentryx.dev
  Result: FAIL  (pass=350 warn=12 FAIL=111)
  Slack: notified #deep-smoke-prod
```

### 2.3 — Add the npm script

In `hirestream/package.json` under `"scripts"`, add **exactly one** entry near `smoke`:

```json
"smoke:prod": "node tools/synthetic/run-prod-smoke.mjs"
```

### 2.4 — Create `hirestream/docs/synthetic-monitoring-runbook.md`

≤60 lines. Cover:
- **What this is** — short paragraph: production smoke on cron, alerts on red.
- **Operator deploy step** (NOT done by this brief): `pm2 start tools/synthetic/run-prod-smoke.mjs --name hirestream-synthetic --cron "*/10 * * * *" --no-autorestart`. Set `DEEP_SMOKE_TOKEN` and `SLACK_WEBHOOK_URL` envs on the cron via `pm2 set hirestream-synthetic:DEEP_SMOKE_TOKEN <token>` or via an ecosystem file. `pm2 save` to persist across daemon restarts.
- **Manual invocation**: `npm run smoke:prod` (uses default env from .env or shell).
- **State file**: `/tmp/hirestream-synthetic-state.json` (volatile; survives within a boot only — intentional, so a long pm2 daemon restart doesn't suppress real failures).
- **Channel routing**: `#deep-smoke-prod` (NOT `#deep-smoke-anomaly` from P3.1 — different channels so prod-incidents are distinguishable from staging-anomalies).
- **What to do when it pages you**: read the SUMMARY, check `docs/log-digest-runbook.md` for the digest, follow the runbook for the broken endpoint(s).
- **Disabling temporarily** (during a planned outage): `pm2 stop hirestream-synthetic`; remember to start it again.

### 2.5 — Do NOT auto-register the pm2 cron

The agent writes the script + runbook. The operator runs the `pm2 start … --cron …` command from the runbook. **This is the operator handoff for P3.5.**

---

## 3. What you must NOT change

- Do **NOT** modify `scripts/deep-smoke.mjs` (sibling).
- Do **NOT** modify any product code.
- Do **NOT** modify `lib/logger.ts` or `server/config/logger.config.ts`.
- Do **NOT** add new npm dependencies. Use native `fetch`, `fs/promises`, `child_process`.
- Do **NOT** auto-start the pm2 cron from this script.
- Do **NOT** modify `package.json` beyond the one `smoke:prod` entry.
- Do **NOT** point the production URL at anything except what the operator confirms in §2.1. If unconfirmed, default to staging and clearly flag in QC §7.
- Do **NOT** commit, push, or run against production from validation. Validation uses staging or local.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — syntax check
node --check tools/synthetic/run-prod-smoke.mjs && echo "syntax OK"

# Step 2 — package.json script entry
node -e "const p=require('./package.json'); console.log('smoke:prod:', p.scripts['smoke:prod']||'MISSING');"

# Step 3 — run against STAGING (NOT prod) to exercise the wrapper end-to-end
rm -f /tmp/hirestream-synthetic-state.json
DEEP_URL=https://hirestream-stg.agentryx.dev DEEP_SMOKE_TOKEN=test123 STATE_FILE=/tmp/hirestream-synthetic-state.json SLACK_WEBHOOK_URL="" npm run smoke:prod 2>&1 | tail -15
echo "exit=$?"
# Expected: invokes deep-smoke, captures output, prints the synthetic-monitor banner,
#   writes state file. Smoke against staging will likely FAIL (calibration noise) — that's
#   the "failed-and-reported" path. exit should be 1 from the wrapper.

# Step 4 — verify state file written
cat /tmp/hirestream-synthetic-state.json 2>&1

# Step 5 — re-run immediately — must skip due to min-interval
DEEP_URL=https://hirestream-stg.agentryx.dev DEEP_SMOKE_TOKEN=test123 STATE_FILE=/tmp/hirestream-synthetic-state.json npm run smoke:prod 2>&1 | tail -5
# Expected: "Skipping — last run was <N>s ago" with N < 480; exit 0.

# Step 6 — confirm runbook is present and references the right channel
wc -l docs/synthetic-monitoring-runbook.md
grep -c "deep-smoke-prod" docs/synthetic-monitoring-runbook.md

# Step 7 — Jest still 503/503
npm test 2>&1 | tail -5

# Cleanup
rm -f /tmp/hirestream-synthetic-state.json
```

**Expected outputs**: see inline.

---

## 5. QC report — required

**Literal 9-section template** from `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. No abbreviation.

For this brief specifically:
- §3 MUST include the §2.1 discovery answers (4 of them).
- §4 MUST flag if you defaulted to staging in absence of a confirmed prod URL.
- §6 MUST note the channel-routing decision (`#deep-smoke-prod` vs `#deep-smoke-anomaly` from P3.1).

---

## 6. After QC report is written, STOP

Do NOT commit. Do NOT push. Do NOT pm2 start. Architect integrates; operator runs the cron registration command.

---

## 7. Acceptance — done when

> "`npm run smoke:prod` invokes `scripts/deep-smoke.mjs` against the configured target, writes state to `/tmp/hirestream-synthetic-state.json`, respects the min-interval throttle, posts to Slack via `SLACK_WEBHOOK_URL` on failure (channel `#deep-smoke-prod`), and exits with the smoke's own pass/fail intent. The runbook documents the pm2 cron registration as an operator step; the script does NOT auto-register."
