<!--
TASK BRIEF
SLUG: p03_p3_4_pre_merge_gate
PHASE: 03 — Full L4 + L5 confidence score
TIER: 🟢 (mechanical — CI workflow extension + label-check logic)
AG MODEL: Gemini 3.5 Flash (High)
WAVE: 3 (sequential — DO NOT dispatch until p03_p3_3 confidence-score is integrated and emitting scores on PR comments)
-->

# Task Brief — p03_p3_4_pre_merge_gate

**Assigned tier**: 🟢 — Gemini 3.5 Flash (High)
**Effort estimate**: 30-45 min
**Workspace**: DEV only — `hirestream/.github/workflows/pr-check.yml` (extend), `hirestream/docs/confidence-gate-runbook.md` (NEW), `hirestream/tests/DEEP_TESTING.md` (append a §)
**Files NOT in scope**: any product code; `scripts/confidence.mjs` (P3.3's territory — read its output, do NOT modify); `package.json` (no new scripts).
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p03_p3_4_pre_merge_gate.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **Gemini Flash "under-reads spec" pattern**. This brief has explicit acceptance behaviour for the label-check; read it twice.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_03_PRD.md` §2 row P3.4 + §5 (risks).
4. `hirestream/scripts/confidence.mjs` (P3.3's output — already integrated). Read its JSON output shape so the gate parses it correctly.
5. `hirestream/.github/workflows/pr-check.yml` — currently has the `Compute confidence score` step as `continue-on-error: true`. Your job is to ADD a new gate step that fails on red, with an escape hatch.

**Phase 2 retro lesson applied:** the QC report uses the literal 9-section template. No abbreviation.

---

## 1. Background — why this task exists

P3.3 already posts a confidence score on every PR. But the score is **reporter-only** — a red score (e.g. 47/100) doesn't block merge yet, just sits there as a comment that someone *might* read. Real gating needs:

1. A CI step that explicitly fails if `score < threshold`.
2. An escape hatch — admin-only — for legitimate emergency merges (a security hotfix where a degraded score is acceptable).
3. Documented expectations so engineers know what to do when the gate blocks them.

This is Phase 3 deliverable P3.4 and Phase 3's last brief.

---

## 2. What you must change

### 2.1 — Add a new step to `hirestream/.github/workflows/pr-check.yml`

After the existing `Compute confidence score` step (and after the PR-comment step from P3.3), add:

```yaml
      - name: Confidence-score gate
        if: github.event_name == 'pull_request'
        working-directory: hirestream/
        env:
          BYPASS_LABEL: bypass-confidence
        run: |
          if [ ! -f /tmp/confidence.json ]; then
            echo "::error::confidence.json not produced by previous step — framework issue, not a PR issue"
            exit 1
          fi

          SCORE=$(jq -r .score /tmp/confidence.json)
          PASSED=$(jq -r .passed /tmp/confidence.json)
          THRESHOLD=$(jq -r .threshold /tmp/confidence.json)

          echo "Confidence score: $SCORE / 100  (threshold $THRESHOLD)"

          if [ "$PASSED" = "true" ]; then
            echo "::notice::Confidence gate PASSED ($SCORE >= $THRESHOLD)"
            exit 0
          fi

          # Score below threshold — check for the bypass label
          # GitHub Actions: PR labels live in github.event.pull_request.labels[*].name
          HAS_BYPASS=$(echo '${{ toJSON(github.event.pull_request.labels.*.name) }}' | jq -r ". | index(\"$BYPASS_LABEL\") | not | not")

          if [ "$HAS_BYPASS" = "true" ]; then
            echo "::warning::Confidence gate would have FAILED ($SCORE < $THRESHOLD) but '$BYPASS_LABEL' label is present"
            echo "::warning::This bypass is logged; admin reviewer is responsible."
            exit 0
          fi

          echo "::error::Confidence gate FAILED — score $SCORE < threshold $THRESHOLD"
          echo "::error::See https://github.com/<owner>/<repo>/blob/main/hirestream/docs/confidence-gate-runbook.md"
          echo "::error::To bypass: an admin adds the '$BYPASS_LABEL' label to this PR (logged + audited)."
          exit 1
```

**Important**:
- This step has NO `continue-on-error` — failure here MUST block merge (assuming branch protection requires this check).
- The bypass-label name `bypass-confidence` is intentional and documented in §2.2.
- If `/tmp/confidence.json` doesn't exist, this is a framework issue (P3.3's step failed) — exit 1 with a `::error::` annotation but with a clear distinguishing message.
- Use `::error::` and `::warning::` annotations so GitHub's Files Changed view highlights the gate.

**Also**: revert P3.3's `Compute confidence score` step's `continue-on-error: true` to `continue-on-error: false`. The reporter-only mode was a Wave-2 stopgap; with the gate in place, both steps should fail-loud.

### 2.2 — Create `hirestream/docs/confidence-gate-runbook.md`

≤50 lines. Cover:

- **What this is**: A CI gate that blocks merge if a PR's confidence score is below the project threshold (currently `60`).
- **What the score means**: link to `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md#6-the-per-pr-confidence-score`.
- **What to do if your PR is blocked**:
  1. Read the PR comment from `confidence.mjs` — it shows the per-layer breakdown. Which layer dropped?
  2. Common causes:
     - L1 dropped → a Jest test failed or was removed. Re-run locally; fix.
     - L2 dropped → `deep-smoke` introduced an authz LEAK (zero tolerance). Spot the new endpoint; check its handler scoping.
     - L3 dropped → `schema-fuzz` failed a new endpoint. Apply `validateRequest(<schema>)` middleware.
     - L4 dropped → a novel error class showed up in the last 24 h of staging logs. Check `npm run log:digest`.
  3. Push a fix; the gate re-evaluates on the next CI run.
- **Emergency bypass** (admin-only):
  1. The PR's confidence score is genuinely below threshold but the change is urgent (e.g. security hotfix).
  2. **An admin** (project owners / leads only) adds the `bypass-confidence` label to the PR.
  3. The gate step re-runs as a `::warning::` (visible in CI summary), passes the check, and merge unblocks.
  4. The bypass is **logged** — the workflow's annotations preserve the score that was bypassed, who labelled, when.
  5. **Post-merge follow-up is mandatory**: file a tracking issue for the bypassed gate's underlying cause; resolve in the next sprint.
- **What's not an emergency**: rushing a feature deadline. The gate exists to prevent the "all-green-therefore-ship" pattern that lets real bugs leak through. Bypassing it routinely defeats the framework.

### 2.3 — Append a section to `hirestream/tests/DEEP_TESTING.md`

Append (do NOT replace existing content):

```markdown
## Pre-merge confidence gate

PRs are blocked from merging if their composite **confidence score** (from `scripts/confidence.mjs`) falls below the project threshold (`60`, configurable per `CONFIDENCE_THRESHOLD` env).

The score combines L1 (Jest functional) + L2 (deep-smoke surface) + L3 (schema-fuzz) + L4 (digest anomalies) + observed (e2e). See `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md#6-the-per-pr-confidence-score` for the formula.

Gate runbook: `docs/confidence-gate-runbook.md` — explains what to do when blocked.
Emergency bypass: admin adds the `bypass-confidence` label (logged + audited).
```

### 2.4 — Do NOT modify `scripts/confidence.mjs`

That's P3.3's territory. If the JSON output shape isn't sufficient for your gate logic (e.g. `passed` field is missing), **STOP and document in QC §7** — a sibling micro-brief will adjust.

### 2.5 — Do NOT add the `bypass-confidence` label itself

The label is created in the GitHub repo UI by an admin (operator action). The gate code only *reads* whether it's present. Document the creation step in the runbook (§2.2) as a one-time operator action.

---

## 3. What you must NOT change

- Do **NOT** modify `scripts/confidence.mjs` (P3.3).
- Do **NOT** modify any signal-producing tool.
- Do **NOT** modify any product code.
- Do **NOT** add new npm dependencies or new package.json scripts.
- Do **NOT** create the `bypass-confidence` GitHub label from your script — that's an admin UI action documented in the runbook.
- Do **NOT** modify branch-protection rules (also admin UI).
- Do **NOT** commit, push.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — YAML lint
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/pr-check.yml')); print('YAML OK')"

# Step 2 — workflow structure: confirm the new gate step appears AFTER 'Compute confidence score'
grep -nE "name: (Compute confidence score|Post confidence score|Confidence-score gate)" .github/workflows/pr-check.yml
# Expected: 3 lines in order — Compute (line N), Post (line N+M), Gate (line N+M+L). Pasting line numbers proves the order.

# Step 3 — confirm 'Compute confidence score' continue-on-error was reverted to false
grep -A2 "Compute confidence score" .github/workflows/pr-check.yml | head -10
# Expected: no 'continue-on-error: true' under this step anymore

# Step 4 — runbook present
wc -l docs/confidence-gate-runbook.md
grep -c "bypass-confidence" docs/confidence-gate-runbook.md
# Expected: ≥3 (mentioned in instructions section, "what is not an emergency" mentioned by reference, gate-step env)

# Step 5 — DEEP_TESTING.md updated
grep -c "## Pre-merge confidence gate" tests/DEEP_TESTING.md
# Expected: 1

# Step 6 — simulate the gate behaviour locally
#   Pass path: write a passing JSON
mkdir -p /tmp
echo '{"score": 75.0, "threshold": 60, "passed": true}' > /tmp/confidence.json
HAS_BYPASS=false bash -c '
  SCORE=$(jq -r .score /tmp/confidence.json)
  PASSED=$(jq -r .passed /tmp/confidence.json)
  THRESHOLD=$(jq -r .threshold /tmp/confidence.json)
  echo "score=$SCORE passed=$PASSED threshold=$THRESHOLD"
  [ "$PASSED" = "true" ] && echo "GATE PASS" && exit 0
  [ "$HAS_BYPASS" = "true" ] && echo "GATE PASS (bypassed)" && exit 0
  echo "GATE FAIL" && exit 1
'; echo "exit=$?"
# Expected: exit=0

#   Fail path (no bypass): write a failing JSON
echo '{"score": 47.0, "threshold": 60, "passed": false}' > /tmp/confidence.json
HAS_BYPASS=false bash -c '
  SCORE=$(jq -r .score /tmp/confidence.json)
  PASSED=$(jq -r .passed /tmp/confidence.json)
  [ "$PASSED" = "true" ] && exit 0
  [ "$HAS_BYPASS" = "true" ] && exit 0
  exit 1
'; echo "exit=$?"
# Expected: exit=1

#   Bypass path: same failing JSON, bypass label simulated as present
HAS_BYPASS=true bash -c '
  PASSED=$(jq -r .passed /tmp/confidence.json)
  [ "$PASSED" = "true" ] && exit 0
  [ "$HAS_BYPASS" = "true" ] && exit 0
  exit 1
'; echo "exit=$?"
# Expected: exit=0

rm -f /tmp/confidence.json

# Step 7 — confirm no product/script files were touched
git diff --stat 2>&1 | grep -v "PMD-Final" | head
# Expected: only the workflow + runbook + DEEP_TESTING.md changes
```

**Expected outputs**: see inline.

---

## 5. QC report — required

**Literal 9-section template** from `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. All 9. No abbreviation.

For this brief:
- §4: state whether you successfully reverted P3.3's `continue-on-error: true` (the workflow currently has it; this brief is the right time to flip it).
- §6: flag for reviewer the bypass-label name (`bypass-confidence`) and that creating the label itself is an operator action.
- §7: any GitHub Actions YAML uncertainty (especially the `toJSON(github.event.pull_request.labels.*.name)` expression — this expression may need adapting if the workflow runs on `push` events too).

---

## 6. After QC report is written, STOP

Do NOT commit, push, or open a real PR. Architect integrates; operator creates the `bypass-confidence` label in the GitHub UI as a one-time admin action.

---

## 7. Acceptance — done when

> "The pr-check.yml workflow now has a `Confidence-score gate` step that FAILS the check if `confidence.json`'s `passed` is false, UNLESS the PR has the `bypass-confidence` label. The previous `continue-on-error: true` on the `Compute confidence score` step is flipped to false. Three simulated local runs (pass / fail-no-bypass / fail-with-bypass) produce the right exit codes. `docs/confidence-gate-runbook.md` explains how engineers respond to a block and how admins use the bypass label. `tests/DEEP_TESTING.md` has a `## Pre-merge confidence gate` section. Zero changes to product code, signal-producing tools, or `package.json`."
