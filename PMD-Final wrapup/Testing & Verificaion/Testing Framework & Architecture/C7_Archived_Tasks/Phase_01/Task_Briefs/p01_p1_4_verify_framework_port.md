<!--
TASK BRIEF
SLUG: p01_p1_4_verify_framework_port
PHASE: 01 — Eliminate manual maintenance + wire CI
TIER: 🟡 (substantial, cross-repo)
AG MODEL: Gemini 3.1 Pro (High)
WAVE: 2 — DO NOT DISPATCH until Wave 1 is integrated and `v0.4.45.x` is on main.
         Specifically: p01_p1_1 (route auto-discovery) must be landed in HireStream
         before this brief is given to the agent — its design is this task's input.
-->

# Task Brief — p01_p1_4_verify_framework_port

**Assigned tier**: 🟡 — Gemini 3.1 Pro (High)
**Effort estimate**: 90-120 min
**Workspace**: DEV only — the **Verify** application repo (sibling to HireStream)
**Expected Verify repo path**: `/home/subhash.thakur.india/Projects/Recruitment/agentryx-verify/` — **VERIFY THIS WITH THE OPERATOR BEFORE STARTING.** If the path differs, STOP and ask. Do NOT guess.
**Files to create**:
- `<verify-root>/scripts/deep-smoke.mjs` (NEW — adapted from HireStream's)
- `<verify-root>/tests/DEEP_TESTING.md` (NEW — adapted from HireStream's)
- `<verify-root>/VERIFICATION.md` (NEW — adapted from HireStream's; same pattern as `p01_p1_5`)
- `<verify-root>/scripts/verify-skeleton.mjs` (NEW — copy of HireStream's `p01_p1_5` script)
**Files to edit**: `<verify-root>/package.json` — add scripts: `smoke`, `smoke:local`, `test:deep`, `verify:skeleton`.
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_4_verify_framework_port.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **"Gemini Pro: solid generalist, occasional over-confidence on unfamiliar codebases"** — your tier's known weakness is *not asking enough questions* when porting between unfamiliar codebases. Default to STOP in QC §7 over invention.
3. `PMD-Final wrapup/Testing & Verificaion/Agentryx-Verify-Roadmap/00_README.md` through `05_MODULE_PLAYBOOK.md` — the Verify product overview (lives in the sibling folder; mandatory for understanding Verify's role model + auth).
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md` §3 (L2 Surface layer) — the architectural intent.
5. **The integrated `v0.4.45.x` version** of `hirestream/scripts/deep-smoke.mjs` — the auto-discovery-enabled harness. This is your **canonical source pattern**. If it isn't landed yet, STOP — this task must not start until P1.1 ships.
6. `hirestream/tests/DEEP_TESTING.md` — the entry-point doc you're porting.

---

## 1. Background — why this task exists

The deep-smoke harness, today, exists only in HireStream. That tells us nothing about whether the **pattern** is portable — it might be HireStream-bespoke in ways we can't see until we try to install it elsewhere. The Verify portal (`verify-stg.agentryx.dev`, separate codebase) is the second Agentryx app — porting the harness to it is the cheapest possible test of portability, **and** delivers real coverage for Verify, **and** sets the precedent that every Agentryx app inherits this framework from day one.

**Goal of this task**: install the same surface-layer harness in the Verify repo. Same patterns, same conventions, same `npm run smoke` / `npm run test:deep` UX. Different role inventory (Verify's roles are not HireStream's roles — see §2.2). When done, `npm run smoke` against `verify-stg.agentryx.dev` passes.

This is Phase 1, deliverable 4 from `Phase_01_PRD.md` §2 (row P1.4) — explicitly Wave 2 (sequential, after Wave 1 lands).

---

## 2. What you must change

### 2.1 — Discovery pass FIRST (do not skip)

Before writing any code, read the Verify codebase enough to answer:

| Question | Why it matters |
|---|---|
| What's the repo's directory layout? (`server/`, `client/`, `tests/`, `scripts/`?) | Where to put new files. |
| What's the auth endpoint? Is it `POST /api/v1/auth/login` like HireStream? Or different? | The harness's `login()` function must match. |
| What roles exist? (HireStream has candidate/agent/employer/admin/superadmin; Verify is different — likely Agentryx-internal roles like `agentryx_admin`, `htis_reviewer`, `hpsedc_staging_reviewer`, `hpsedc_final_reviewer`, etc. — read `Agentryx-Verify-Roadmap/01_CURRENT_STATE.md` for the canonical list.) | Drives `ROLES` + `ROLE_ALLOWLIST`. |
| What demo accounts exist? Where are they seeded? What are their passwords? | Drives the harness's credential defaults. |
| What's the cookie / auth header behaviour? Does Verify also use Secure cookies over HTTPS like HireStream? | Drives the harness's HTTPS-vs-HTTP behaviour. |
| What's the `npm` script convention in Verify? (`pnpm`? `yarn`? Different test command?) | Drives the `package.json` edits. |
| Does Verify have an existing `tests/` directory? An existing CI setup? An existing `package.json` scripts block? | Drives whether you're adding-to vs. creating-from-scratch. |

Document the answers in QC §3 (you'll have raw output from running `ls -la`, `cat package.json`, `grep -rn "login" server/` etc.). If any answer is unclear, STOP and document in QC §7. Do NOT proceed to coding until all 7 questions are answered.

### 2.2 — Author `<verify-root>/scripts/deep-smoke.mjs`

Port from `hirestream/scripts/deep-smoke.mjs` (`v0.4.45.x` — the auto-discovery-enabled version). Specifically:

- Same three-layer structure: AUTH / ROUTE HEALTH / AUTHZ NEGATIVE.
- Same auto-discovery pattern (calls `GET /api/v1/__routes` on the running server with `X-Deep-Smoke-Token` — **assumes Verify will adopt the same diagnostic endpoint pattern; if Verify doesn't have one yet, see §2.5**).
- Same per-role `ROLE_ALLOWLIST` model — but populated for **Verify's roles**, not HireStream's.
- Same envelope check (`{success:true}`) — if Verify uses a different envelope shape, adapt; document in QC §4 with rationale.
- Same `DEEP_URL` env-agnostic default (default to `https://verify-stg.agentryx.dev`).
- Same exit-code convention (non-zero on FAIL).

**Do NOT copy HireStream-specific things**:
- HireStream's role names (candidate/agent/etc.) must be replaced with Verify's.
- HireStream's `ROLE_ALLOWLIST` regex patterns must be replaced with Verify-appropriate ones.
- Any HireStream-domain references (`/candidates/`, `/agencies/`, `/employer/`) must be replaced with Verify-domain references.

### 2.3 — Author `<verify-root>/tests/DEEP_TESTING.md`

Port from `hirestream/tests/DEEP_TESTING.md`. Adjust:
- Project name (HireStream → Verify).
- Confidence-score threshold (start at 60 like HireStream).
- Anchor file paths.
- Role inventory mentioned in the doc.
- Any cross-references (point to Verify-internal docs if any; otherwise point to the shared `Testing & Verification Architecture/` folder).

### 2.4 — Author `<verify-root>/VERIFICATION.md`

Same pattern as `p01_p1_5` produced for HireStream — see that brief's §2.3. Adapt to Verify.

### 2.5 — RESOLVE: Verify needs a `__routes` diagnostic endpoint too

The auto-discovered harness from `p01_p1_1` depends on `GET /api/v1/__routes` returning the route catalogue. Verify doesn't have this yet. **Two paths:**

- **Option A (preferred)**: This brief adds the same env-gated `/__routes` endpoint to Verify's server, mirroring `p01_p1_1`'s implementation. Use the **same** secret-token gating, the **same** env variable name (`DEEP_SMOKE_TOKEN`), the **same** response shape. Verify the env-gate works for Verify's NODE_ENV setup.
- **Option B (fallback)**: If Verify's server code is too unfamiliar to safely modify in 90 min, STOP and document in QC §7. The architect will dispatch a follow-up brief specifically for the Verify-side `__routes` endpoint.

**Prefer Option A**, but use judgment. Gemini Pro's failure mode is over-confidence on unfamiliar codebases — if you're not sure, take Option B.

### 2.6 — Port `<verify-root>/scripts/verify-skeleton.mjs`

Direct copy from `hirestream/scripts/verify-skeleton.mjs` (the `p01_p1_5` output). Identical checks — the Day-1 checklist applies to every Agentryx app, including Verify.

### 2.7 — Update `<verify-root>/package.json`

Add the same scripts that HireStream has (post-Wave-1):
- `"smoke": "node scripts/deep-smoke.mjs"`
- `"smoke:local": "DEEP_URL=http://localhost:<port> node scripts/deep-smoke.mjs"` (port from §2.1 discovery — Verify's local dev port; do NOT guess)
- `"test:deep": "npm test && npm run smoke"`
- `"verify:skeleton": "node scripts/verify-skeleton.mjs"`

Place alphabetically. Do not touch any other field.

---

## 3. What you must NOT change

- Do **NOT** modify Verify's product code beyond §2.5's diagnostic endpoint addition (if you take Option A).
- Do **NOT** modify Verify's auth code.
- Do **NOT** modify Verify's database schema or migrations.
- Do **NOT** modify Verify's existing test files (`tests/` if they exist).
- Do **NOT** add HireStream-specific code paths.
- Do **NOT** commit, do **NOT** push, do **NOT** deploy.
- Do **NOT** alter HireStream's code from this brief. HireStream is read-only context for you.

---

## 4. Validation steps (mandatory; paste raw output into QC Section 3)

```bash
# Set this to the actual confirmed Verify path before running
VERIFY_ROOT=/home/subhash.thakur.india/Projects/Recruitment/agentryx-verify  # CONFIRM THIS
cd $VERIFY_ROOT

# Step 1 — TypeScript/JS syntax sanity
node --check scripts/deep-smoke.mjs && echo "deep-smoke syntax OK"
node --check scripts/verify-skeleton.mjs && echo "verify-skeleton syntax OK"

# Step 2 — package.json validates and has the 4 new scripts
node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); ['smoke','smoke:local','test:deep','verify:skeleton'].forEach(s => console.log(s+': '+(p.scripts[s]||'MISSING')));"

# Step 3 — Day-1 skeleton check passes against Verify
npm run verify:skeleton
# Expected: "Day-1 skeleton: OK (11/11 checks)" exit 0

# Step 4 — If you took Option A in §2.5: build + restart Verify and probe the new endpoint
#   (commands depend on Verify's build/restart; from your §2.1 discovery)
# <verify-build-command>
# <verify-restart-command>
sleep 3
curl -sk -H "X-Deep-Smoke-Token: <token>" https://verify-stg.agentryx.dev/api/v1/__routes | head -c 400
# Expected: JSON with a `data` array of route objects

# Step 5 — Run smoke against staging
DEEP_SMOKE_TOKEN=<token> npm run smoke 2>&1 | tail -25
# Expected: "RESULT: PASS" with all expected Verify roles authing and all
#   listed routes returning 2xx. Acceptable for some pass count > 0 and FAIL=0.

# Step 6 — Existing Verify tests (if any) still pass
npm test 2>&1 | tail -10
```

**Expected outputs**: see inline.

If you took Option B in §2.5 (deferred the `__routes` endpoint), Steps 4 and 5 will fail with "endpoint not found" — that's expected; document this in QC §3 and note Option B was taken in QC §4.

---

## 5. QC report — required

Use template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`.

Save to: `PMD-Final wrapup/.../C6_Active_Tasks/QC_Reports/p01_p1_4_verify_framework_port.md`. All 9 sections required.

**Critical sections for this task:**
- Section 3: include the raw output of all 7 §2.1 discovery questions PLUS the validation steps.
- Section 4: state which option you took in §2.5 (A or B) with rationale.
- Section 7: list every assumption you couldn't verify (Verify's role names, auth shape, demo passwords, etc.). The architect needs these to know what to re-verify before merging.

---

## 6. After QC report is written, STOP

Do NOT commit. Do NOT push. Do NOT restart Verify in production. Validation may restart a local Verify dev instance only; document this clearly.

---

## 7. Acceptance — done when

> "The Verify repo has `scripts/deep-smoke.mjs`, `scripts/verify-skeleton.mjs`, `tests/DEEP_TESTING.md`, `VERIFICATION.md`, and 4 new `package.json` scripts following the same patterns as HireStream's `v0.4.45.x`. `npm run verify:skeleton` passes 11/11. `npm run smoke` against `verify-stg.agentryx.dev` returns `RESULT: PASS` with at least the roles documented in `Agentryx-Verify-Roadmap/01_CURRENT_STATE.md` authenticating cleanly. The harness is structurally identical to HireStream's; only role inventory and domain-specific patterns differ."
