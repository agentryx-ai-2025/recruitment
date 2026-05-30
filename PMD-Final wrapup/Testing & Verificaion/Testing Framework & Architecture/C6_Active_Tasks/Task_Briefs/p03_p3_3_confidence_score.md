<!--
TASK BRIEF — FLAGSHIP of Phase 3
SLUG: p03_p3_3_confidence_score
PHASE: 03 — Full L4 + L5 confidence score
TIER: 🔴 (architectural — composes every layer's signal output)
AG MODEL: Claude Opus 4.6 (Thinking)
WAVE: 2 (sequential — DO NOT dispatch until Wave 1 — P3.1 / P3.2 / P3.5 — is integrated and Wave 1's signal outputs are observable)
-->

# Task Brief — p03_p3_3_confidence_score

**Assigned tier**: 🔴 — Claude Opus 4.6 (Thinking)
**Effort estimate**: 3-4 h
**Workspace**: DEV only — `hirestream/scripts/confidence.mjs` (NEW), `hirestream/.github/workflows/pr-check.yml` (extend), `hirestream/VERIFICATION.md` (extend with trend table)
**Files NOT in scope**: any product code; any signal-producing tool (deep-smoke / schema-fuzz / digest / triage / synthetic — read their outputs only).
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p03_p3_3_confidence_score.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially the Opus 4.6 Thinking QC-abbreviation pattern confirmed in Phase 2's P2.2b** (4 of 9 sections, the worst of the project). YOUR brief explicitly restates the 9-section requirement; please honour it.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md` §6 — **the confidence-score formula + weights + penalty factors. This is the architectural spec; your implementation is its first incarnation.**
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_03_PRD.md` §2 row P3.3 + §5 (risks) + §8 #1 (open question — weights TBD; document defaults in your script + flag for end-of-phase re-tune).
5. The output formats of every prior signal-producer:
   - `hirestream/scripts/deep-smoke.mjs` (L2 surface — `SUMMARY pass=N warn=M FAIL=K`)
   - `hirestream/scripts/schema-fuzz.mjs` (L3 — same summary shape)
   - `hirestream/tools/log-analyzer/digest.mjs` (L4 Tier 2 — opinionated digest text + cluster JSON)
   - `hirestream/tests/integration/data-isolation.test.ts` (Jest output — `Tests: N passed, N total`)
   - `hirestream/lib/logger.ts` (Winston transports — produce no direct signal, but the structured-log contract is the basis for the digest's anomaly count)
6. `hirestream/.github/workflows/pr-check.yml` — you extend this; understand its existing steps + the `working-directory: hirestream/` convention.
7. `hirestream/VERIFICATION.md` — you append a "Confidence-score trend" section.

**Phase 2 retro lesson — APPLIED RIGOROUSLY HERE because the prior Opus task failed it:** the QC report MUST use the literal template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. ALL 9 SECTIONS. EXACT HEADERS. NO ABBREVIATION. Even if validation feels conceptually obvious. Even if you think the reviewer will infer §2 from `git diff`. The previous Opus QC was 4/9; this brief expects 9/9.

---

## 1. Background — why this task exists

Phase 1-2 produced **6 distinct signal-producing tools**: deep-smoke, schema-fuzz, Jest (unit + integration + data-isolation), the daily digest, the LLM triage, the synthetic monitor. Each emits its own pass/fail / count / cluster. **Today, no single number summarises a PR's quality across all six.** A PR can be "all green" while having 80 L2 calibration FAILs, 80 L3 product gaps, 8 latency regressions in production, 3 novel error classes — and nobody reads all 6 outputs before merging.

**Goal of this task**: a single 0-100 **confidence score** per commit (per PR, per release), with a transparent per-layer breakdown shown in the PR comment so reviewers can spot a "0.0 L4 propping up an otherwise-low score" pattern. The score is **opinionated**: weighted to reward *breadth* (a project at 30/100 because L4 is untouched should NOT crawl up just by adding more L1 tests).

This is Phase 3's flagship deliverable P3.3 (see `Phase_03_PRD.md` §2). It is the test class that ends "all-green-therefore-ship" false comfort, and the foundation for P3.4's pre-merge gate.

---

## 2. What you must change

### 2.1 — Create `hirestream/scripts/confidence.mjs`

A Node ESM script invocable as `npm run confidence` OR programmatically from CI. Specifically:

#### Configuration via env

| Env | Purpose | Default |
|---|---|---|
| `DEEP_URL` | Where to run the surface harness | `https://hirestream-stg.agentryx.dev` |
| `DEEP_SMOKE_TOKEN` | Surface harness auth | (required) |
| `LOG_PATH` | Where to read structured logs | `logs/app.log` |
| `BASELINE_DAYS` | Window for L4 baseline | `7` |
| `CONFIDENCE_THRESHOLD` | The pre-merge gate threshold | `60` |
| `OUTPUT_FORMAT` | `markdown` (default — for PR comment) or `json` (for CI to parse) | `markdown` |

#### Signal collection (per `01 §6.1`)

| Layer | Signal name | Raw inputs | Computation |
|---|---|---|---|
| **L1** | `unit_pass × integration_pass × mutation_kill` | `npm test` exit code + pass-count; later: Stryker score (P4.3 — absent for now → assume 1.0) | `(passed / total)` from Jest output |
| **L1.e2e** | `e2e_pass` | `npm run test:e2e` exit code (or last-run record) | binary (1.0 or 0.0) |
| **L2** | `route_health × authz_integrity` | `npm run smoke` (deep-smoke) — `pass / (pass+fail)` × authz-LEAK count → score | **AUTHZ LEAKS multiply by 0** per `01 §6.1` (zero tolerance) |
| **L3** | `schema_coverage × fuzz_clean` | `npm run schema-fuzz` — `pass / (pass+fail)`; later: schema-coverage % from FUZZ_TARGETS / total endpoints (read from `__routes`) | `fuzz_pass_rate × (FUZZ_TARGETS.length / total_endpoints)` |
| **L4** | `1 − anomaly_score × baseline_drift` | `npm run log:digest --format json` (extend P2.4 if it doesn't emit JSON yet — see §2.3); count of novel error classes; latency-regression count | `1 − min(1.0, novel_count × 0.1 + regression_count × 0.05)` |
| **observed** | `e2e_pass × visual_clean` | `e2e_pass` (above); visual = 1.0 until P4.4 ships | — |

**Weights** (from `01 §6.1`, defaults):
- L1 = 0.30
- L2 = 0.20
- L3 = 0.15
- L4 = 0.20
- observed = 0.15

**Penalty multipliers** (multiplicative on the total):
- Coverage regression (any file dropped >5% in coverage vs main): × 0.9
- Novel error class in last 24 h prod logs: × 0.85
- Flaky test (passed on retry): × 0.95
- Schema-less new endpoint (in P3+ era, this should be rare): × 0.9

#### Computation

```
score = (L1×0.30 + L2×0.20 + L3×0.15 + L4×0.20 + observed×0.15) × Π(penalties)
score = clamp(0, 100, round(score × 100, 1))
```

#### Output — Markdown (default)

```markdown
**Confidence: 87.4 / 100**  ↓ from 89.1 on main (Δ −1.7)

| Layer | Score | Detail |
|---|---|---|
| L1 Contract  | 0.96 | jest 503/503; mutation_kill=1.0 (Stryker pending) |
| L2 Surface   | 1.00 | smoke 381/0/80 (calibration); authz LEAKs = 0 |
| L3 Schema    | 0.71 | schema-fuzz 98/0/80 — see /auth/register gap |
| L4 Runtime   | 0.84 | 2 novel error classes; 1 latency regression (p95 >2× baseline) |
| Observed     | 0.92 | e2e 15/15; visual = 1.0 (P4.4 pending) |

Penalty factors applied: × 0.85 (novel error class) → adjusted 87.4

**Threshold for merge**: 60 — PASS.
[Why this score?](https://github.com/agentryx-ai-2025/recruitment/blob/main/PMD-Final%20wrapup/Testing%20%26%20Verificaion/Testing%20Framework%20%26%20Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md#6-the-per-pr-confidence-score)
```

#### Output — JSON (when `OUTPUT_FORMAT=json`)

```json
{
  "score": 87.4,
  "threshold": 60,
  "passed": true,
  "trend": { "vsMain": -1.7, "vs7d": 0.3 },
  "breakdown": {
    "L1": { "score": 0.96, "detail": "jest 503/503; mutation_kill=1.0" },
    "L2": { "score": 1.00, "detail": "smoke pass-rate; LEAKs=0" },
    "L3": { "score": 0.71, "detail": "schema-fuzz; /auth/register gap" },
    "L4": { "score": 0.84, "detail": "2 novel; 1 regression" },
    "observed": { "score": 0.92, "detail": "e2e 15/15" }
  },
  "penalties": [ { "name": "novel_error_class", "multiplier": 0.85 } ]
}
```

#### Exit codes
- 0 if `score >= threshold`.
- 1 if `score < threshold`.
- 2 if a required signal-producer was unavailable / errored (so CI can distinguish "broken framework" from "low quality").

### 2.2 — Extend `hirestream/.github/workflows/pr-check.yml`

After the existing `Run Jest tests` + `Run smoke` steps, add a new step:

```yaml
      - name: Compute confidence score
        working-directory: hirestream/
        env:
          DEEP_URL: http://localhost:5001
          DEEP_SMOKE_TOKEN: test123
          LOG_PATH: logs/app.log
          OUTPUT_FORMAT: json
        run: |
          npm run confidence > /tmp/confidence.json || CONF_EXIT=$?
          cat /tmp/confidence.json
          # Persist as a job output for the next step's PR-comment poster
          echo "score=$(jq -r .score /tmp/confidence.json)" >> $GITHUB_OUTPUT
          echo "passed=$(jq -r .passed /tmp/confidence.json)" >> $GITHUB_OUTPUT
          # Don't fail the job here — P3.4 will introduce the merge gate
          # in a separate step. This step is reporter-only for now.
        continue-on-error: true

      - name: Post confidence score as PR comment
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: confidence-score
          message: |
            <!-- generated by scripts/confidence.mjs — Phase 3 P3.3 -->
            [confidence comment placeholder — script outputs Markdown to /tmp/confidence.md]
```

**This brief does NOT add the pre-merge gate.** P3.4 owns that. Your step here is reporter-only (`continue-on-error: true`); a failing confidence score appears as a non-blocking comment for now.

### 2.3 — Optional: emit JSON from `digest.mjs` if it doesn't already

If `tools/log-analyzer/digest.mjs` already supports `--format json` or similar, USE it. If not, **STOP and document in QC §7** — a small follow-up brief (`p03_p3_3b_digest_json_output`) will extend digest.mjs. **Do NOT modify digest.mjs from this brief** — sibling P2.4 owns it.

### 2.4 — Append a "Confidence-score trend" section to `hirestream/VERIFICATION.md`

A literal Markdown table the script appends to on each successful run (capped at 90 entries, oldest pruned):

```markdown
## Confidence-score trend (last 90 days)

| Date | buildRef | Score | L1 | L2 | L3 | L4 | observed | Penalties |
|---|---|---|---|---|---|---|---|---|
| 2026-05-30 | v0.6.0.0 | 87.4 | 0.96 | 1.00 | 0.71 | 0.84 | 0.92 | × 0.85 |
| ...
```

The script reads the existing file, appends/prepends a row, prunes >90 rows, writes back. Idempotent on (date, buildRef).

### 2.5 — `npm run confidence` script entry

In `hirestream/package.json` under `"scripts"`, add **exactly one** entry alphabetically near `verify:skeleton`:

```json
"confidence": "node scripts/confidence.mjs"
```

---

## 3. What you must NOT change

- Do **NOT** modify any signal-producing tool (`deep-smoke.mjs`, `schema-fuzz.mjs`, `digest.mjs`, `triage.mjs`, `run-prod-smoke.mjs`, the Jest suites). You **consume** their outputs.
- Do **NOT** modify any product code.
- Do **NOT** modify `lib/logger.ts`.
- Do **NOT** modify `package.json` beyond the one `confidence` script entry.
- Do **NOT** add new npm dependencies. Use `child_process.execSync` to run sibling scripts and capture their outputs.
- Do **NOT** add the pre-merge gate to the workflow — that's P3.4. Your CI step is `continue-on-error: true`.
- Do **NOT** commit, push.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — syntax
node --check scripts/confidence.mjs && echo "syntax OK"

# Step 2 — package.json
node -e "const p=require('./package.json'); console.log('confidence:', p.scripts['confidence']||'MISSING');"

# Step 3 — markdown output (default)
DEEP_URL=https://hirestream-stg.agentryx.dev DEEP_SMOKE_TOKEN=test123 LOG_PATH=logs/app.log npm run confidence 2>&1 | tail -30
# Expected: a Markdown table with L1-L4+observed rows; a Score line; "Threshold: 60 — PASS" or FAIL.

# Step 4 — JSON output
DEEP_URL=https://hirestream-stg.agentryx.dev DEEP_SMOKE_TOKEN=test123 LOG_PATH=logs/app.log OUTPUT_FORMAT=json npm run confidence > /tmp/confidence.json
cat /tmp/confidence.json | python3 -m json.tool | head -30
# Expected: valid JSON with score, threshold, passed, breakdown, penalties

# Step 5 — exit codes
DEEP_URL=https://hirestream-stg.agentryx.dev DEEP_SMOKE_TOKEN=test123 npm run confidence; echo "exit=$?"
# Expected: 0 if >= 60; 1 if < 60; document which path you observed

# Step 6 — VERIFICATION.md trend section appended idempotently
grep -c "## Confidence-score trend" VERIFICATION.md
# Expected: 1 (not 2 — append, don't duplicate)
tail -10 VERIFICATION.md

# Step 7 — workflow YAML still parses
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-check.yml')); print('YAML OK')"

# Step 8 — Jest still 503+1 (any new internal unit tests)
npm test 2>&1 | tail -5
```

**Expected outputs**: see inline.

---

## 5. QC report — required (NON-NEGOTIABLE, 9-SECTION LITERAL TEMPLATE)

**Use this exact template** at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. ALL 9 SECTIONS. EXACT HEADERS. NO ABBREVIATION.

The previous Opus 4.6 Thinking task on this project produced a 4-of-9-sections QC. This brief explicitly invokes that retrospective and asks: do not repeat. If you find yourself thinking "this is obvious, I'll skip §2", that's the failure mode firing — fill it in anyway.

Particularly for this task:
- §3 MUST paste the full Markdown output AND the JSON output from validation Steps 3 + 4.
- §4 MUST list the weights chosen (defaults from `01 §6.1` or your judgment) with reason.
- §6 MUST flag for reviewer: the JSON-output add to `digest.mjs` situation; whether you defaulted L4 to 1.0 because no JSON was available.
- §7 MUST surface any layer where you couldn't compute the signal (e.g. no mutation testing → L1 mutation_kill defaulted to 1.0).

---

## 6. After QC report is written, STOP

Do NOT commit, push, or trigger the workflow against a real PR. Architect integrates.

---

## 7. Acceptance — done when

> "`npm run confidence` against staging produces a 0-100 score with the per-layer breakdown shown in `01 §6.1`, posts as Markdown and JSON, appends an idempotent row to `VERIFICATION.md`'s 90-day trend table, exits 0 on `score >= threshold` and 1 below. The `.github/workflows/pr-check.yml` workflow includes the new step as a non-blocking reporter (P3.4 adds the blocking gate later). All 5 layer signals are real (read from sibling tools' outputs); no signal is fabricated."
