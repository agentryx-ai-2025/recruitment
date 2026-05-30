<!--
TASK BRIEF
SLUG: p02_p2_4_daily_digest
PHASE: 02 — Close L3 + start L4 + data-isolation
TIER: 🟡 (substantial — log parsing + Slack integration + cron wiring)
AG MODEL: Gemini 3.1 Pro (High)
WAVE: 2 (independent of p02_p2_2b and p02_p2_3b; could be dispatched in parallel)
-->

# Task Brief — p02_p2_4_daily_digest

**Assigned tier**: 🟡 — Gemini 3.1 Pro (High)
**Effort estimate**: 2 h
**Workspace**: DEV only — `hirestream/tools/log-analyzer/` (NEW directory), `hirestream/package.json` (+1 script), optionally `hirestream/docs/log-digest-runbook.md` (NEW, brief)
**Files NOT in scope**: anything in `server/`, `client/`, `shared/`, `scripts/`. The actual logger is `lib/logger.ts` from p02_p2_3 (Winston-based — see §2 discovery).
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p02_p2_4_daily_digest.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially the "Gemini Pro: solid generalist but over-confidence on unfamiliar codebases" warning** from Phase 1 retro. Your tier's failure mode is making assumptions about the existing log format without checking; §2.1 below makes that explicit.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` — **especially §4 Tier 2 (the digest spec) and §3 (structured-log contract)**. The digest is the OPINIONATED morning summary that recovers the 30-80% of issues already visible in logs.
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_02_PRD.md` §2 row P2.4 — acceptance criterion.
5. `hirestream/lib/logger.ts` — the Winston-based wrapper from p02_p2_3. The digest reads logs produced by this wrapper.
6. `hirestream/server/config/logger.config.ts` — the underlying Winston transport config. **Critical**: confirm where logs are actually written. pm2 captures stdout/stderr to `~/.pm2/logs/hirestream-out.log` and `hirestream-error.log` by default; Winston may also write to a file directly. Discover before assuming.

---

## 1. Background — why this task exists

`02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` §1 makes the argument: in every Agentryx incident retro so far, the error was visible in logs 5-6 hours before a user reported it. That delay is a *human attention* problem, not a data problem. **A morning digest that pre-triages the day's logs by error class × route × novelty recovers most of that time.**

**Goal of this task**: a Node ESM script `tools/log-analyzer/digest.mjs` that reads the last 24 h of HireStream's logs, clusters errors by `errorClass × route`, surfaces novel patterns, and posts an opinionated digest to a Slack channel via webhook. Runs daily on a pm2 cron. The exact digest format is specified in `02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` §4 Tier 2 — match it.

This is Phase 2 deliverable P2.4 (see `Phase_02_PRD.md` §2).

---

## 2. What you must change

### 2.1 — Discovery first (do NOT skip; logged failure mode for this tier)

Before writing any code, answer in QC §3:

1. **Where are HireStream's logs actually written?**
   - Read `server/config/logger.config.ts` — does Winston write to a file directly? If yes, where?
   - Run `pm2 describe hirestream` — what are `pm_out_log_path` and `pm_err_log_path`?
   - Look at `~/.pm2/logs/` — what files exist for `hirestream`?
   - **The answer goes in QC §3.** Don't assume.

2. **What's the actual on-disk line format?**
   - Cat a few lines: `tail -20 <the-actual-log-path>`. Is it JSON? Plain text? Mixed?
   - Are the mandatory `02 §3.1` fields present (`t/level/route/statusCode/errorClass`)? If the log format is text not JSON, the digest needs a regex-based parser, not JSON.parse.
   - **The answer goes in QC §3.** This drives the parser design.

3. **What does an existing error line look like for the digest to cluster?**
   - Find a recent 500 or 4xx in the logs: `grep -E '\b(500|503|429)\b' <log-path> | tail -5`
   - Paste a sample line into QC §3.

**Do not start writing the parser until you can paste 3-5 real log lines into QC §3.** If you cannot find/read the logs, STOP and document in QC §7.

### 2.2 — Create `hirestream/tools/log-analyzer/digest.mjs`

A Node ESM script that:

#### Inputs
- `LOG_PATH` env (with sensible default like `~/.pm2/logs/hirestream-out.log` — verified in §2.1).
- `SLACK_WEBHOOK_URL` env (operator-provided; document fallback "log to stdout if unset" so dev runs work).
- `WINDOW_HOURS` env (default `24`).
- `BASELINE_DAYS` env (default `7` — how far back to look to determine "novel" patterns).

#### Processing
1. Read the log file. Filter to lines within the last `WINDOW_HOURS`. Parse each line per the format you discovered in §2.1.
2. Per parsed line, extract: `timestamp, level, route, statusCode, durationMs, errorClass, userRole, msg`.
3. Compute aggregates:
   - **Top routes by error rate** — count of `statusCode >= 500` per `route`, divided by total request count for that route.
   - **Slowest p95 routes** — `route → p95(durationMs)` (limit to routes with ≥ 10 requests in window).
   - **Novel error classes** — `errorClass` values that appeared in the last `WINDOW_HOURS` but NOT in the prior `BASELINE_DAYS - WINDOW_HOURS` window. Flag with ⚠.
   - **Latency regressions** — for each route, compare current p95 vs the prior `BASELINE_DAYS` median; flag if current is ≥ 1.5× baseline.
   - **Total errors** with arrow (▼/▲) vs prior `BASELINE_DAYS` average.

#### Output (opinionated digest format from doc §4 Tier 2)

```
HireStream · <env> · 24h digest · <YYYY-MM-DD>
─────────────────────────────────────────────
  Errors: <N> (<▼/▲> X% vs <BASELINE> avg)        Top routes by error rate:
  Slowest p95: /jobs/saved/my (1.8s)                1. /agencies/documents  4.1%   ← NEW
  Novel error classes: <N> (↑)                       2. /candidates/profile  0.9%

  ⚠ <PATTERN-NAME>  /agencies/documents 404 — N hits, ...

  Latency regressions vs <BASELINE>d:
    /candidates/applications   p95 158ms ▲ from 84ms (+88%)

  New errorClass seen first time:
    1. <ClassName>  (Nx, /route)
```

Annotated examples in `02 §4 Tier 2` should be your reference. **Match the spirit, not necessarily byte-for-byte.**

#### Delivery
- If `SLACK_WEBHOOK_URL` is set, POST the digest as a Slack message. Use a code block for the monospace digest.
- Otherwise (or in addition), print to stdout. Always print to stdout — Slack post is the secondary delivery.

#### Exit code
- 0 if the digest was generated successfully (regardless of whether Slack post succeeded — log a warning on Slack failure, don't fail the script).
- 1 if logs couldn't be read at all (filesystem error, no file).

### 2.3 — Add npm script

In `hirestream/package.json`, under `"scripts"`, add **exactly one** entry near `smoke`:

```json
"log:digest": "node tools/log-analyzer/digest.mjs"
```

### 2.4 — Add a brief runbook

`hirestream/docs/log-digest-runbook.md` (NEW, ≤30 lines):
- How to run manually: `LOG_PATH=… SLACK_WEBHOOK_URL=… npm run log:digest`
- How to schedule via pm2 cron (e.g. `pm2 start tools/log-analyzer/digest.mjs --name hirestream-digest --cron "0 2 * * *"` — adapt to operator preferences)
- What "novel error class" means and how to investigate a flagged one
- Where to update the `BASELINE_DAYS` window if needed

### 2.5 — Do NOT actually register the pm2 cron from this brief

The pm2 cron registration is an operator action (it's a deploy-side change). Document the command in the runbook (§2.4); don't run it.

---

## 3. What you must NOT change

- Do **NOT** modify any product code (`server/`, `client/`, `shared/`, `scripts/seed.ts`, `scripts/deep-smoke.mjs`).
- Do **NOT** modify `lib/logger.ts` (sibling p02_p2_3's territory). Read it for the format; don't write to it.
- Do **NOT** modify `server/config/logger.config.ts`.
- Do **NOT** add new npm dependencies. Use native Node `fs/promises`, `readline` (for streaming large files), and global `fetch` for Slack.
- Do **NOT** modify `package.json` beyond adding the ONE script entry in §2.3.
- Do **NOT** register the pm2 cron from the script itself (operator action only — §2.5).
- Do **NOT** post to a real Slack channel during validation. Set `SLACK_WEBHOOK_URL` empty in validation runs; verify stdout output.
- Do **NOT** commit, push, or restart any service.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 0 — discovery (§2.1)
echo "=== where are logs? ==="
ls -la ~/.pm2/logs/hirestream* 2>&1 | head
echo "=== sample lines ==="
tail -5 ~/.pm2/logs/hirestream-out.log 2>&1 | head -20

# Step 1 — syntax check
node --check tools/log-analyzer/digest.mjs && echo "syntax OK"

# Step 2 — package.json has the new script
node -e "const p=require('./package.json'); console.log('log:digest:', p.scripts['log:digest']||'MISSING');"

# Step 3 — run with SLACK unset (stdout-only mode)
LOG_PATH=~/.pm2/logs/hirestream-out.log SLACK_WEBHOOK_URL="" npm run log:digest 2>&1 | head -40
# Expected: a digest printed to stdout in the doc-§4-Tier-2 format. No Slack POST attempted.

# Step 4 — point at a non-existent log file → exit 1
LOG_PATH=/tmp/nonexistent.log npm run log:digest; echo "exit=$?"
# Expected: clean error message, exit=1

# Step 5 — point at an EMPTY file → exit 0, "no events in window" digest
touch /tmp/empty.log
LOG_PATH=/tmp/empty.log npm run log:digest; echo "exit=$?"
# Expected: digest with "No events in last 24h" or similar; exit=0

# Step 6 — TS compile + Jest still green
npm run check 2>&1 | tail -5
npm test 2>&1 | tail -5
```

**Expected outputs**: see inline.

---

## 5. QC report — required (mandatory 9-section format)

Save to `C6_Active_Tasks/QC_Reports/p02_p2_4_daily_digest.md`. All 9 sections required.

Particularly important sections for this brief:
- §3: MUST include the §2.1 discovery answers (log path, format, sample lines) verbatim. Without these, the architect can't review.
- §4: any deviation from the spec format in `02 §4 Tier 2` (with reason).
- §6: flag for reviewer the parser robustness — what happens if a log line is malformed JSON? truncated? wrong year? The script should not crash on bad input.

---

## 6. After QC report is written, STOP

Do NOT commit. Do NOT push. Do NOT register the pm2 cron. Architect integrates.

---

## 7. Acceptance — done when

> "`npm run log:digest` reads HireStream's actual log file, produces a digest in the `02_LOG_MINING §4 Tier 2` format printed to stdout (≤90 seconds to read), clusters errors by class × route, flags novel error classes vs the baseline window, posts to Slack when `SLACK_WEBHOOK_URL` is set (gracefully degrades to stdout-only when unset). Discovery answers (log path, line format, sample lines) are documented in QC §3."
