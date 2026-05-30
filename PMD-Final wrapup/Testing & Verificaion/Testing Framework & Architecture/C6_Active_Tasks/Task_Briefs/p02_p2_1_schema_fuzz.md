<!--
TASK BRIEF
SLUG: p02_p2_1_schema_fuzz
PHASE: 02 — Close L3 + start L4 + data-isolation
TIER: 🟡 (substantial — schema-walking design judgment)
AG MODEL: Claude Sonnet 4.6 (Thinking)
WAVE: 1 (parallel with p02_p2_2a, p02_p2_3)
-->

# Task Brief — p02_p2_1_schema_fuzz

**Assigned tier**: 🟡 — Claude Sonnet 4.6 (Thinking)
**Effort estimate**: 2-3 h
**Workspace**: DEV only — `hirestream/scripts/schema-fuzz.mjs` (NEW), `hirestream/package.json` (+1 script)
**Files NOT in scope**: anything in `server/`, `client/`, `shared/` (read-only references)
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p02_p2_1_schema_fuzz.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially the Sonnet over-builds + Sonnet QC-under-report patterns from Phase 1**. Future Sonnet failure mode 4 was logged from Phase 1's retro: Sonnet abbreviated its QC when validation felt "conceptually obvious". Don't repeat. Use the explicit 9-section checklist in §5 below.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md` §3 L3 (Schema & Contract layer) — the architectural intent.
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_02_PRD.md` §2 row P2.1 — the acceptance criterion.
5. `hirestream/scripts/deep-smoke.mjs` — the canonical pattern for env-agnostic harness scripts. Match its style (BASE/DEEP_URL, login helper, throttle, structured pass/warn/fail accumulators, 9-section console output, `process.exit(fail.length ? 1 : 0)`).
6. `hirestream/shared/schema.ts` (and any other files in `shared/` that export Zod schemas) — the source of truth for the validators you'll be fuzzing.
7. `hirestream/server/routes/*.routes.ts` — to see how Zod schemas are wired into endpoints (look for `validateRequest(<schema>)` or `schema.parse(req.body)`).

---

## 1. Background — why this task exists

The v0.4.43.4 status-enum-drift bug (seed wrote `status:"interview"`; client expected `"interview_scheduled"`) passed all 485 Jest tests cleanly. It was caught only by eyeballing a video frame. That bug class lives in **Layer 3 — Schema & Contract** of the architecture (`01_EMBEDDED_TESTING_ARCHITECTURE.md` §3 L3). Today, HireStream has no automated check that:

- Boundary inputs (empty, oversized, wrong type, out-of-range numeric, disallowed enum, SQL-injection-ish patterns) are rejected cleanly with structured 4xx.
- Server returns a structured `{success:false, error:{...}}` envelope on bad input, not a 5xx or — worse — a silent 200.
- Enum values are enforced on input — e.g. `status:"interview"` (not in the enum) should be rejected, not accepted-and-stored.

**Goal of this task**: a Node ESM harness `scripts/schema-fuzz.mjs` that probes a curated set of high-value HireStream endpoints with boundary/invalid payloads derived from their Zod schemas, asserts clean rejection, and reports pass/fail with a transparent breakdown.

This is Phase 2 deliverable P2.1 (see `Phase_02_PRD.md` §2).

---

## 2. What you must change

### 2.1 — Create `hirestream/scripts/schema-fuzz.mjs`

A Node ESM script that:

#### Configuration

- `BASE = process.env.DEEP_URL || "https://hirestream-stg.agentryx.dev"` (mirror deep-smoke's pattern)
- Credentials from env (`DEEP_PW_<ROLE>`) with seed defaults — same as deep-smoke.mjs.
- `THROTTLE_MS = parseInt(process.env.SCHEMA_FUZZ_THROTTLE_MS || "50", 10)` — pace requests to avoid rate-limit (see Phase 1 retro §4).

#### A curated endpoint registry

Hand-write the list (don't try to auto-derive from routes — Phase 1 retro §4 logged that runtime route-discovery is the right level; *schema*-to-*endpoint* mapping needs the human-readable Zod context). Each entry:

```javascript
const FUZZ_TARGETS = [
  {
    name: "candidate registration",
    role: "anon",                                // "anon" or one of the 5 roles
    method: "POST",
    path: "/auth/register",                      // under /api/v1
    schema: "registerSchema",                    // the named Zod schema in shared/
    knownFields: {                               // fields you'll mutate; rest stays valid
      username: { kind: "string", required: true, min: 3, max: 50 },
      email: { kind: "email", required: true },
      password: { kind: "string", required: true, min: 8 },
      role: { kind: "enum", required: true, allowed: ["candidate", "agent", "employer"] },
    },
    validPayload: () => ({ username: "fuzz_user_<RAND>", email: "fuzz<RAND>@example.com", password: "Test@1234", role: "candidate" }),
  },
  // … repeat for ~8-12 high-value endpoints. AT MINIMUM include:
  //   - candidate profile PATCH (Issue #4 fields — father/mother/passport)
  //   - employer KYB submit-for-review
  //   - agency document upload (POST /agencies/documents — note: multipart; can skip or handle)
  //   - job creation (POST /jobs by agent/employer)
  //   - application creation (POST /jobs/:id/apply by candidate)
  //   - interview scheduling (POST /agent/applications/:id/schedule-interview) — this is where the v0.4.43.4 enum bug class lives
];
```

**Discovery first, coding second.** Spend 20-30 min reading `server/routes/*.routes.ts` to find ~8-12 endpoints that:
- Have a Zod schema in `shared/`
- Are reachable as one of the standard 5 roles (or anon for register)
- Are non-destructive when fuzzed (POST with a boundary value should reject; no side-effect on success)

If an endpoint is destructive (e.g. successful POST mutates state), **skip it** — document in QC §5 (out-of-scope).

#### Boundary-case generator

For each `knownFields` entry, generate the boundary cases that match the field's `kind`:

| kind | Cases generated |
|---|---|
| `string` (with `min`/`max`) | empty `""`, single-char (when `min > 1`), `"x".repeat(max+1)`, null, undefined, number `42`, object `{}`, array `[]` |
| `email` | `""`, `"not-an-email"`, `"a@"`, `"@b"`, `"a@b"` (no TLD), oversized local-part `"x".repeat(300)+"@example.com"`, null |
| `enum` (with `allowed`) | each disallowed value the agent invents (e.g. `"interview"` if `interview_scheduled` is canonical), empty `""`, null, the canonical-but-wrong-case (`"INTERVIEW_SCHEDULED"`) |
| `number` (with `min`/`max`) | `min - 1`, `max + 1`, `NaN`, `Infinity`, `"123"` (string), negative when min ≥ 0, null |
| `boolean` | `"true"` (string), `1`, `0`, null |
| `date` | `""`, `"2026-13-99"` (impossible), past date when future required, far-future (`"9999-01-01"`), null |

For each case:
- Build a payload that's `validPayload()` **with one field replaced** by the boundary value.
- POST to the endpoint (with the role's cookie if not anon).
- Capture status + body.
- Classify:
  - `pass` if status is 4xx (400 / 422) AND body has `{success: false}` shape (Zod's structured error).
  - `warn` if status is 4xx but body shape isn't the standard envelope (acceptable but worth noting).
  - **`fail` if status is 5xx OR 200 (server didn't reject the malformed input).**

#### Output (mirror deep-smoke.mjs's format)

```
SCHEMA FUZZ — https://hirestream-stg.agentryx.dev
============================================================

[1] AUTH
  ok    login candidate
  …

[2] PER-ENDPOINT FUZZ
  ok    candidate registration / role / "interview" → 400 (Zod rejected)
  ok    candidate registration / password / "" → 400
  FAIL  job creation / salaryMax / NaN → 200 (server accepted NaN!)
  …

============================================================
SUMMARY  pass=N  warn=M  FAIL=K
RESULT: PASS | FAIL
```

Exit code 1 on any FAIL (per L3 contract).

### 2.2 — Add `npm run schema-fuzz` script

In `hirestream/package.json`, under `"scripts"`, add **exactly one** entry alphabetically near `smoke`:

```json
"schema-fuzz": "node scripts/schema-fuzz.mjs"
```

Do not modify any other field.

### 2.3 — No README / no DEEP_TESTING.md edits in this brief

Doc updates are a separate concern — leave them out. The script is self-documenting via the top-of-file comment block (write ~10 lines explaining purpose, env vars, exit codes, how to extend `FUZZ_TARGETS`).

---

## 3. What you must NOT change

- Do **NOT** modify any product code in `server/`, `client/`, `shared/`.
- Do **NOT** modify any existing Zod schema — even if you spot a "while I'm here" bug, log it in QC §5.
- Do **NOT** modify `scripts/deep-smoke.mjs` (sibling). Read it for the pattern only.
- Do **NOT** edit Jest tests.
- Do **NOT** edit the test DB or run any actual seed mutation in validation.
- Do **NOT** add new npm dependencies.
- Do **NOT** modify `tests/DEEP_TESTING.md` or any architecture doc.
- Do **NOT** commit. Do **NOT** push. Do **NOT** restart any service.
- **Do NOT auto-derive the endpoint registry from route files.** Hand-curate (per §2.1). Phase 1's first staging smoke run showed auto-derivation produces lots of calibration noise; for L3 the curated approach gives signal-to-noise that's actually useful.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — syntax check
node --check scripts/schema-fuzz.mjs && echo "syntax OK"

# Step 2 — confirm package.json has the new script and only the new script changed
node -e "const p=require('./package.json'); console.log('schema-fuzz:', p.scripts['schema-fuzz']||'MISSING'); console.log('total scripts:', Object.keys(p.scripts).length);"
# Expected: `schema-fuzz: node scripts/schema-fuzz.mjs`

# Step 3 — run against a LOCAL dev server first (do NOT hammer staging during dev)
DEEP_ROUTES_DEBUG=1 DEEP_SMOKE_TOKEN=test123 PORT=5001 NODE_ENV=development npx tsx server/index.ts > /tmp/dev-fuzz.log 2>&1 &
DEV_PID=$!
sleep 8
curl -s --retry 5 --retry-delay 1 http://localhost:5001/api/v1/content/faq > /dev/null && echo "dev server up"
DEEP_URL=http://localhost:5001 npm run schema-fuzz 2>&1 | tail -40
echo "exit=$?"
kill $DEV_PID 2>/dev/null
# Expected: a SUMMARY line with non-zero pass count; exit code reflects FAIL count.
#   If your local dev has no DB (likely), auth/POSTs may fail uniformly — that's
#   OK as long as the harness itself doesn't crash; document in QC §3.

# Step 4 — re-introduce the v0.4.43.4 enum bug class (simulated) — confirm the fuzzer catches it
# (Without modifying server code: assert that POSTing `{status: "interview"}` to the
#  schedule-interview endpoint (or any endpoint with a status enum) is in your
#  FUZZ_TARGETS as a generated case. Show the test row in your output.)
DEEP_URL=http://localhost:5001 npm run schema-fuzz 2>&1 | grep -i "interview" | head -10
# Expected: at least one row of the form `… status / "interview" → 400 (Zod rejected)`
#   demonstrating the enum-drift bug class IS covered.

# Step 5 — confirm deep-smoke still passes (no regression on Phase 1)
DEEP_URL=http://localhost:5001 DEEP_SMOKE_TOKEN=test123 npm run smoke 2>&1 | grep -E "SUMMARY|RESULT"
# Expected: SUMMARY line + RESULT — exit code may be non-zero (P1's known calibration
#   noise) but the harness should not have NEW failures.
```

**Expected outputs**: see inline. If any step diverges, STOP and document in QC §7.

---

## 5. QC report — required (mandatory 9-section checklist)

Use template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. Save to `C6_Active_Tasks/QC_Reports/p02_p2_1_schema_fuzz.md`.

**You MUST write all 9 sections.** Phase 1's retro logged Sonnet's tendency to abbreviate when validation feels obvious; treat this checklist as the binding contract:

- [ ] §1 Files changed (full path list)
- [ ] §2 Full diff per file (paste from `git diff`)
- [ ] §3 Validation steps + raw output (all 5 steps from §4 above)
- [ ] §4 Judgment calls / deviations (which endpoints chosen for `FUZZ_TARGETS` + why; any boundary cases skipped)
- [ ] §5 Out-of-scope findings (e.g. "noticed `server/X.ts` has no Zod schema; flagged for future")
- [ ] §6 Things reviewer should pay attention to (the endpoints list, the boundary-case generator, the rate-limit pacing)
- [ ] §7 Open questions / blockers (DO NOT invent answers)
- [ ] §8 Self-assessment (`Ready for review` or `Blocked: <reason>`)
- [ ] §9 Suggestions for architect (factory improvements; better boundary kinds; possible auto-discovery for later)

---

## 6. After QC report is written, STOP

Do NOT commit, push, run pm2 restart, or touch production paths. Architect integrates.

---

## 7. Acceptance — done when

> "`scripts/schema-fuzz.mjs` runs end-to-end against a dev server, exits 0 with `RESULT: PASS` when all configured endpoints reject their boundary cases cleanly (4xx + structured envelope), exits 1 with a clear FAIL row when any endpoint silently accepts a malformed value. The `FUZZ_TARGETS` list covers ≥8 high-value endpoints. The enum-drift bug class (POST `status:\"interview\"`-style payload) is explicitly in the case set."
