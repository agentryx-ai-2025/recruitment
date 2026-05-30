<!--
TASK BRIEF
SLUG: p01_p1_1_route_auto_discovery
PHASE: 01 — Eliminate manual maintenance + wire CI
TIER: 🟡 (substantial, needs reasoning)
AG MODEL: Claude Sonnet 4.6 (Thinking)
WAVE: 1 (parallel with p01_p1_2, p01_p1_3, p01_p1_5)
-->

# Task Brief — p01_p1_1_route_auto_discovery

**Assigned tier**: 🟡 — Claude Sonnet 4.6 (Thinking)
**Effort estimate**: 90-120 min
**Workspace**: DEV only — `hirestream/scripts/deep-smoke.mjs`, optionally `hirestream/server/routes.ts` for a small env-gated diagnostic endpoint
**Single file to edit (primary)**: `/home/subhash.thakur.india/Projects/Recruitment/hirestream/scripts/deep-smoke.mjs`
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_1_route_auto_discovery.md`

**Mandatory pre-reads before you touch any code:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md` — sub-agent rules (do not skim).
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — known failure patterns; **especially the "Sonnet over-builds" patterns** — your tier's known weakness is adding scope that wasn't asked for. Stick to §2 below.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/01_EMBEDDED_TESTING_ARCHITECTURE.md` §3 (L2 Surface layer) — the architectural intent of this task.
4. `hirestream/scripts/deep-smoke.mjs` — the current harness. Read top to bottom before editing.
5. `hirestream/server/routes.ts` — the route mounting (24 routers under `/api/v1/*`). Understand how routes are declared.

---

## 1. Background — why this task exists

Today's harness `hirestream/scripts/deep-smoke.mjs` (committed `v0.4.44.0`) hand-maintains two dicts: `ROUTES` (per-role list of GET endpoints to probe) and `FORBIDDEN` (per-role list of endpoints the role must be denied). When a developer adds a new endpoint, the harness gets no coverage unless someone remembers to update the dicts. That manual step *will* be skipped — and silent coverage gaps are exactly the failure mode that let the route-shadow 404 (`/agencies/documents`) and status-enum drift bugs reach production in `v0.4.43.x`.

**Goal of this task**: make the harness *discover* the running app's routes by itself, so adding a new endpoint requires zero harness edit. The per-role lists shrink from "every endpoint the role can read" to a small **allowlist of which roles** should reach a given path — a much smaller surface to maintain.

This is the Phase 1, deliverable 1 work from `Phase_01_PRD.md` §2 (row P1.1). Read that row's "Acceptance test" — that's your definition of done.

---

## 2. What you must change

### Change 1 — Auto-discover GET routes from the running server

The harness needs a list of all declared GET routes. Two viable approaches; **pick approach A** (it's simpler and more testable):

**Approach A (use this)**: Add a small diagnostic endpoint to the Express app:

- New file or addition: `hirestream/server/routes.ts` (or a sibling module mounted from there)
- Endpoint: `GET /api/v1/__routes` returning JSON `{ success: true, data: [ { method: "GET", path: "/api/v1/agencies/documents" }, ... ] }`
- The endpoint walks `app._router.stack` (and sub-router stacks recursively) and emits every declared route, with its method and full path.
- **Env-gate it**: only mount the endpoint when `process.env.NODE_ENV !== "production"` OR when an explicit `DEEP_ROUTES_DEBUG === "1"` env is set. Staging needs it (so the harness works against staging); production should not expose it without the explicit flag.
- Auth-gate it: require an authenticated session OR a shared secret header (`X-Deep-Smoke-Token`) matching `process.env.DEEP_SMOKE_TOKEN`. Use the secret approach — simpler for harness use.
- The endpoint must be added BEFORE existing routes so it can't be shadowed (the same Express ordering bug that caused the 30-May `/agencies/documents` 404).

### Change 2 — Refactor the harness's coverage model

In `scripts/deep-smoke.mjs`:

- Replace `const ROUTES = {...}` (the hardcoded per-role probe list) with a **per-role allowlist** `const ROLE_ALLOWLIST = { candidate: [ /^\/candidates\/.*/, /^\/jobs\/.*/, ... ], agent: [...], employer: [...], admin: [...], superadmin: [...], common: [/^\/content\/.*/, /^\/matching\/version/, /^\/notifications\/.*/] }`.
  - Patterns are regex matched against the discovered path (after the `/api/v1` prefix is stripped).
  - `common` patterns apply to all authenticated roles.
- After login (existing code), call `GET /api/v1/__routes` with the secret header to fetch the route catalogue.
- For each discovered GET route:
  - Determine which roles' allowlist matches it.
  - For each role in the match set: probe the endpoint as that role; expect 2xx/3xx with `{success:true}` envelope.
  - For each role NOT in the match set: probe the endpoint as that role; expect 401 or 403.
- The existing `FORBIDDEN` dict becomes redundant — drop it. The negative authz checks now come from "any role × any route not in their allowlist".

### Change 3 — Preserve the existing manual-override capability

For edge cases (e.g. an intentionally-cross-role endpoint like `/agent/placements` which is allowed for agent + employer + admin), the allowlist must be expressive enough to handle them. The regex-per-role pattern above is sufficient — the same path can match multiple roles' patterns. **Add a comment-anchored example for `/agent/placements`** showing it appears in both `agent` and `employer` allowlists, with a note explaining why (per the calibration anchored in the current harness's `FORBIDDEN` comment).

### Change 4 — Output format compatibility

The new harness's stdout must be a strict superset of the old harness's stdout — same `[1] AUTH`, `[2] ROUTE HEALTH`, `[3] AUTHZ NEGATIVE` headers, same per-line `[ok|warn|FAIL] STATUS  /path` format, same `SUMMARY pass=X warn=Y FAIL=Z` line. This matters because the CI workflow in P1.2 will grep this output. Don't reformat.

---

## 3. What you must NOT change

- Do **NOT** modify any product endpoint's behaviour (`/api/v1/candidates/*`, `/jobs/*`, etc.). This task is harness-side and one diagnostic endpoint only.
- Do **NOT** modify Jest tests (`tests/unit/`, `tests/integration/`).
- Do **NOT** modify the Playwright e2e specs (`tests/e2e/*.spec.ts`).
- Do **NOT** add the `__routes` endpoint to production routing without an env-gate. If you can't confirm the env-gate works, STOP and ask via QC §7.
- Do **NOT** add any new npm dependency.
- Do **NOT** change the `package.json` scripts (`smoke`, `smoke:local`, `test:deep` stay as-is).
- Do **NOT** commit, do **NOT** push, do **NOT** run `pm2 restart`. Edit files only.
- Do **NOT** touch the video framework (`tests/video/*`) — completely out of scope.

---

## 4. Validation steps (mandatory; paste raw output into QC Section 3)

Run these in order. Each must produce the expected output; deviation = task not done.

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — TypeScript / syntax sanity
npm run check 2>&1 | tail -20

# Step 2 — Build (ensures the new __routes endpoint compiles)
npm run build 2>&1 | tail -10

# Step 3 — Restart the local pm2 instance so the new endpoint is live
#   (DO NOT do this in a production environment; this is the local staging mirror)
pm2 restart hirestream
sleep 3

# Step 4 — Confirm the diagnostic endpoint is reachable and shape-correct
#   Replace <token> with the value of process.env.DEEP_SMOKE_TOKEN you set
curl -sk -H "X-Deep-Smoke-Token: <token>" https://hirestream-stg.agentryx.dev/api/v1/__routes | head -c 400
# Or if testing locally via the e2e dev server on :5001 (non-secure cookies, plain http):
DEEP_SMOKE_TOKEN=test123 curl -s -H "X-Deep-Smoke-Token: test123" http://localhost:5001/api/v1/__routes | head -c 400

# Step 5 — Run the refactored harness; must pass with no regression
DEEP_SMOKE_TOKEN=<token> npm run smoke 2>&1 | tail -30

# Step 6 — Auto-discovery acceptance test
#   Temporarily add a dummy GET route in a feature branch, rebuild, and rerun smoke.
#   The dummy route must be probed automatically (no harness edit).
#   In hirestream/server/routes.ts (TEMP edit, revert before finishing):
#     app.get('/api/v1/__test/dummy', (req,res) => res.json({success:true, data:{dummy:true}}));
#   Then:
npm run build && pm2 restart hirestream && sleep 3
DEEP_SMOKE_TOKEN=<token> npm run smoke 2>&1 | grep -E "dummy|__test"
#   Expected: the dummy route appears in the probe output as either ok or as a warn (depending
#   on which roles it falls into). REVERT the dummy route before completing the task.

# Step 7 — Existing Jest suite still passes
npm test 2>&1 | tail -5
```

**Expected outputs:**
- Step 1: 0 errors
- Step 2: build completes
- Step 4: JSON response with a `data` array containing route objects; at minimum should include `/api/v1/candidates/profile`, `/api/v1/agencies/documents`, etc.
- Step 5: `SUMMARY pass=>=105 warn=0 FAIL=0  RESULT: PASS` (the existing 105-check pass count must hold or grow; FAIL count must be 0)
- Step 6: at least one line containing `dummy` or `__test`, proving auto-discovery picked it up
- Step 7: `Tests: 485 passed, 485 total`

If any step diverges, your task is NOT done — investigate. If you can't resolve, STOP and document in QC §7 (open questions).

---

## 5. QC report — required

Use the template at:
`/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`

Save to:
`/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_1_route_auto_discovery.md`

All 9 sections required (no abbreviation):
1. Files changed (full path list)
2. Diff per file (the actual diff, full — paste from `git diff`)
3. Validation steps + raw output (paste from §4 above, all 7 steps)
4. Judgment calls / deviations (anywhere you departed from this brief, with reason)
5. Out-of-scope findings (do NOT fix; just note — e.g. "while editing routes.ts I noticed X looks suspicious, but X is not in scope")
6. Things reviewer should pay attention to (specific lines worth a second look)
7. Open questions / blockers (anything you weren't sure about — DO NOT invent answers)
8. Self-assessment ("Ready for review" or "Blocked: <reason>")
9. Suggestions for architect (factory improvements; harness improvements for later phases)

---

## 6. After QC report is written, STOP

Do NOT:
- Commit to git
- Push to remote
- Run `pm2 restart` on production (you may run it on the local staging mirror as part of Step 3 validation; do NOT touch any production path)
- Touch `/srv/`, `/opt/`, or any path outside `hirestream/`
- Restart any service other than the local `hirestream` pm2 process for validation
- Edit any file in `PMD-Final wrapup/` or `PMD-DevFactory/` — those are read-only references for you

Architect (operator + Claude Code session) will spot-check the diff, run `npm run test:deep` themselves, and integrate.

---

## 7. Acceptance — done when

> "A new GET endpoint added to `hirestream/server/` is probed by `npm run smoke` on the next run, **with no harness edit**, against the correct set of roles per `ROLE_ALLOWLIST`, and the existing 105-check pass count holds or grows."
