<!--
TASK BRIEF
SLUG: p03_p3_2_llm_triage
PHASE: 03 — Full L4 + L5 confidence score
TIER: 🟡 (substantial — prompt design + PII redaction safety)
AG MODEL: Claude Sonnet 4.6 (Thinking)
WAVE: 1 (parallel with p03_p3_1 and p03_p3_5)
-->

# Task Brief — p03_p3_2_llm_triage

**Assigned tier**: 🟡 — Claude Sonnet 4.6 (Thinking)
**Effort estimate**: 2.5 h
**Workspace**: DEV only — `hirestream/tools/log-analyzer/triage.mjs` (NEW), `hirestream/tests/unit/triage.redact.test.ts` (NEW), `hirestream/package.json` (+1 script), `hirestream/docs/log-digest-runbook.md` (append a §)
**Files NOT in scope**: any product code (`server/`, `client/`, `shared/`); `tools/log-analyzer/digest.mjs` (P2.4's territory — call from your script, do NOT modify).
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p03_p3_2_llm_triage.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially Sonnet patterns**: (a) over-builds — don't add features beyond the brief; (b) QC abbreviation under "this is conceptually obvious" — Phase 2 confirmed this even at higher Sonnet tiers. Use the literal QC template.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` §4 Tier 3 — the architectural spec. The triage proposes; humans confirm. Per-cluster dedup. Daily budget cap. Prompt cached.
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_03_PRD.md` §2 row P3.2 + §5 (risks).
5. `hirestream/tools/log-analyzer/digest.mjs` (P2.4) — read its cluster-output shape; your script consumes a cluster as input.
6. **Anthropic API docs** — the Messages API + prompt caching feature. Use `claude-sonnet-4-5` model (latest non-thinking). Prompt cache: source-snippet context = static prefix; cluster summary = variable suffix.

**Phase 2 retro lesson applied:** the QC report must use the literal 9-section template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. Do not abbreviate.

---

## 1. Background — why this task exists

P2.4's daily digest catches issues within 24 h, surfacing clusters like "41x AgencyDocsNotFound on /agencies/documents". The hard job — clustering + spotting the pattern — is now automated. The *next* hard job — figuring out **what's actually wrong and which code to inspect** — is still 30-minute human triage per cluster.

`02 §4 Tier 3` describes the LLM-assisted layer: given a cluster + the relevant source files, an LLM proposes a ranked list of root-cause hypotheses, the specific lines in code to inspect, and a draft issue title. Humans confirm; the LLM never auto-merges. The 6-hour incident timeline (from `02 §1`) compresses to ~30 minutes.

This is Phase 3 deliverable P3.2.

---

## 2. What you must change

### 2.1 — Create `hirestream/tools/log-analyzer/triage.mjs`

A Node ESM script invocable as `npm run log:triage` OR programmatically from `digest.mjs`. Specifically:

#### CLI Contract
```
node tools/log-analyzer/triage.mjs --cluster '<cluster-json>' [--dry-run]
```

Where `<cluster-json>` is a JSON object of the shape P2.4's digest produces per cluster:
```json
{
  "errorClass": "AgencyDocsNotFound",
  "route": "/api/v1/agencies/documents",
  "count": 41,
  "sampleMessages": ["Agency documents not found", "Agency documents not found", ...],
  "firstSeen": "2026-05-30T07:14:32Z",
  "userRoles": { "agent": 38, "admin": 3 }
}
```

#### Pipeline

1. **PII-redact the cluster summary** (defence in depth — input may have slipped fields). Use the same `REDACT_KEYS` list as `lib/logger.ts`; recursively strip from `sampleMessages`. **Critical**: the redacted prompt is what goes to the Anthropic API. Never the raw cluster.

2. **Pull source-code context** for the route. Grep `server/routes/*.routes.ts` for the route's handler. Include the handler function body + ~20 lines of surrounding context. Limit total context to 8000 tokens (rough heuristic: ~32 KB UTF-8). Use `node:child_process execSync` with `grep -nE` + `sed -n 'X,Yp'`.

3. **Call the Anthropic API** (Claude Sonnet 4.5 model) with:
   - **Cached system prompt** (large, stable): the structured-log schema from `02 §3.1`, the triage convention ("propose 1-3 root-cause hypotheses, ranked; for each, name the specific lines in the included source files; output JSON in the schema below"), and the source-code snippets.
   - **Variable user prompt** (small): the redacted cluster summary.
   - Use `cache_control: { type: "ephemeral" }` on the system prompt + source snippets to hit the prompt cache (60-90% cost reduction on repeated triages of nearby clusters).
4. **Parse the response** as JSON of this shape:
   ```json
   {
     "rootCauseHypotheses": [
       { "rank": 1, "summary": "Route X always 404s because the lookup filters by req.user.id but role agents don't own agencies — they own users that own agencies. Likely missing a JOIN.", "linesToInspect": ["server/routes/agency.routes.ts:472-485", "shared/schema.ts:agencies"], "confidence": "high" }
     ],
     "draftIssue": {
       "title": "Agency document list 404s for all agent role calls",
       "body": "## Symptom\nGET /api/v1/agencies/documents returns 404 for 100% of agent requests (41 occurrences in last 24h).\n\n## Hypothesis\n…"
     }
   }
   ```

5. **Output**:
   - If `--dry-run`: print the prompt that would have been sent (post-redaction) + estimated token cost. NO API call.
   - Otherwise: print the proposal as a Markdown block suitable for appending to the daily digest's Slack message. Save the raw response to `logs/triage-cache/<cluster-hash>.json` for the dedup cache (see §2.2).
6. **Exit codes**: 0 on success or skipped-due-to-budget; 1 on API error; 2 on bad input.

#### Per-cluster dedup
Compute `clusterHash = sha256(errorClass + route).slice(0,16)`. Look in `logs/triage-cache/<clusterHash>.json`. If a triage exists with `triagedAt < 7 days ago`, **skip** (return the cached proposal — don't re-call the API). Document the dedup in the runbook.

#### Daily budget cap
Env: `TRIAGE_DAILY_BUDGET_USD` (default `5.00`). Track today's spend in `logs/triage-spend.json` (`{date: "2026-05-30", spentUsd: 1.23}`). If a new triage would exceed budget, return a "Budget cap reached" message (no API call). Reset at midnight UTC.

### 2.2 — Wire triage into the daily digest

Update **DOCUMENTATION ONLY** in `hirestream/docs/log-digest-runbook.md` — append a section "## LLM-assisted triage" explaining how the operator invokes `npm run log:triage --cluster '<json>'` per cluster, or how to enable auto-triage from `digest.mjs` in a future iteration.

**Do NOT modify `digest.mjs` from this brief** — a future micro-brief (`p03_p3_2b_digest_triage_integration`) wires the auto-call after `triage.mjs` is reviewed. This brief is the standalone tool.

### 2.3 — Add the npm script

In `hirestream/package.json` under `"scripts"`, add **exactly one** entry near `log:digest`:

```json
"log:triage": "node tools/log-analyzer/triage.mjs"
```

### 2.4 — Add the PII-redaction unit test — `tests/unit/triage.redact.test.ts`

A Jest unit test (30-60 lines) that:
1. Constructs a fake cluster with PII-shaped fields in `sampleMessages` (e.g. `"User john@example.com couldn't access doc"`, `"Passport M1234567 rejected"`).
2. Calls the redact function the triage script uses.
3. Asserts:
   - No email patterns (`/\w+@\w+\.\w+/`) in the output.
   - No passport-shaped patterns (`/[A-Z]\d{7}/`) in the output.
   - No fields named `password / token / secret / aadhaar / phone` survive.
   - Source code (route names, error classes) DOES survive (those are non-PII).

**This unit test is non-negotiable** — it's the contract that PII never reaches the Anthropic API.

---

## 3. What you must NOT change

- Do **NOT** modify `tools/log-analyzer/digest.mjs` (sibling).
- Do **NOT** modify `lib/logger.ts` or `server/config/logger.config.ts`.
- Do **NOT** modify any product code.
- Do **NOT** add new npm dependencies. Use the **`@anthropic-ai/sdk`** if it's already in package.json; otherwise use `fetch` to `https://api.anthropic.com/v1/messages` directly. (Check before adding.)
- Do **NOT** commit any API key, prompt cache, or response artifact.
- Do **NOT** make real API calls in validation — use `--dry-run` mode.
- Do **NOT** modify `package.json` beyond adding the one `log:triage` script.
- Do **NOT** commit, push.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — syntax check
node --check tools/log-analyzer/triage.mjs && echo "syntax OK"
node --check tests/unit/triage.redact.test.ts && echo "test syntax OK"

# Step 2 — package.json script added
node -e "const p=require('./package.json'); console.log('log:triage:', p.scripts['log:triage']||'MISSING');"

# Step 3 — redact unit test passes
npm test -- tests/unit/triage.redact.test.ts 2>&1 | tail -10
# Expected: all redact assertions pass

# Step 4 — dry-run with a fake cluster — NO real API call
cat > /tmp/fake-cluster.json <<'EOF'
{
  "errorClass": "AgencyDocsNotFound",
  "route": "/api/v1/agencies/documents",
  "count": 41,
  "sampleMessages": ["Agency documents not found for user john@example.com"],
  "firstSeen": "2026-05-30T07:14:32Z",
  "userRoles": { "agent": 38, "admin": 3 }
}
EOF
node tools/log-analyzer/triage.mjs --cluster "$(cat /tmp/fake-cluster.json)" --dry-run 2>&1 | tail -30
# Expected: prints the prompt that WOULD be sent. Crucially:
#   - "john@example.com" is NOT in the printed prompt (redacted).
#   - Source snippets from server/routes/agency.routes.ts ARE in the prompt.
#   - Estimated token count + dollar cost printed.

# Step 5 — dedup cache behaviour
mkdir -p logs/triage-cache
echo '{"triagedAt": "2026-05-30T01:00:00Z", "cluster": "fake", "proposal": {"cached":true}}' > logs/triage-cache/$(echo -n "AgencyDocsNotFound/api/v1/agencies/documents" | sha256sum | cut -c1-16).json
node tools/log-analyzer/triage.mjs --cluster "$(cat /tmp/fake-cluster.json)" 2>&1 | head -10
# Expected: "Cluster recently triaged — using cached proposal" (or similar); no API call attempted.
rm logs/triage-cache/*.json

# Step 6 — budget cap behaviour
echo '{"date":"'$(date -u +%Y-%m-%d)'","spentUsd":99.99}' > logs/triage-spend.json
node tools/log-analyzer/triage.mjs --cluster "$(cat /tmp/fake-cluster.json)" 2>&1 | head -10
# Expected: "Daily budget cap reached" (or similar); exit 0; no API call.
rm logs/triage-spend.json

# Step 7 — invalid input
echo '{}' | node tools/log-analyzer/triage.mjs --cluster '{}'; echo "exit=$?"
# Expected: exit=2 with a clear error message about missing required fields.

# Step 8 — Jest 503+1 (your redact test adds 1)
npm test 2>&1 | tail -5
# Expected: 504/504 passed (was 503; +1 from your redact test)
```

**Expected outputs**: see inline.

---

## 5. QC report — required

**Use the literal 9-section template at** `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. All 9 sections. No abbreviation. No invented headings.

Particularly for this task:
- §6 (reviewer attention) MUST include: (a) the `REDACT_KEYS` list used; (b) the prompt-cache key partitioning; (c) the dedup-cache invalidation policy.
- §7 MUST surface any uncertainty about the Anthropic SDK vs. raw fetch decision.

---

## 6. After QC report is written, STOP

Do NOT commit, push, or invoke the live API. Architect integrates.

---

## 7. Acceptance — done when

> "`npm run log:triage --cluster '<json>' --dry-run` produces a redacted prompt that would have been sent to the Anthropic API, with source-code context from the matching route handler, prompt-cache headers in place, and an estimated dollar cost. PII patterns (email, passport, aadhaar, token, password) are NEVER in the printed prompt — proven by the redact unit test (≥4 assertions, all pass). Per-cluster dedup + daily budget cap behaviours are exercised by validation steps 5+6. Zero existing code modified outside the new files and the one package.json entry."
