<!--
TASK BRIEF — FLAGSHIP of Phase 2
SLUG: p02_p2_2b_data_isolation_suite
PHASE: 02 — Close L3 + start L4 + data-isolation
TIER: 🔴 (architectural / domain-rich)
AG MODEL: Claude Opus 4.6 (Thinking)
WAVE: 2 (sequential — depends on p02_p2_2a's _b fixtures being seeded)
-->

# Task Brief — p02_p2_2b_data_isolation_suite

**Assigned tier**: 🔴 — Claude Opus 4.6 (Thinking)
**Effort estimate**: 3-4 h
**Workspace**: DEV only — `hirestream/tests/integration/` (NEW test files), optionally `hirestream/tests/integration/_helpers.ts`
**Files to create**: `hirestream/tests/integration/data-isolation.test.ts` (the main suite), optionally split into sibling files per entity (e.g. `data-isolation.jobs.test.ts`, `data-isolation.placements.test.ts`) if the suite grows >300 lines
**Files NOT in scope**: anything in `server/`, `client/`, `shared/`, `scripts/`. The seed siblings are already in place via P2.2a.
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p02_p2_2b_data_isolation_suite.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md`
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_01/Retrospective.md` §2 — **the headline finding**: HireStream uses handler-level data scoping, NOT route-level role gates. This brief is the response. The test isn't "can role X reach route Y" — it's "can tenant A see tenant B's data via that route."
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_02_PRD.md` §2 row P2.2 — the acceptance criterion. §5 — risks.
5. `hirestream/tests/integration/` — read 2-3 existing test files to learn the patterns (supertest? Jest globals? how is the test DB set up? how do per-test sessions work?). Match the existing style; don't fork it.
6. `hirestream/tests/setup.ts` — the global setup/teardown.
7. `hirestream/scripts/seed.ts` — confirm the `_b` siblings exist (P2.2a, already seeded in the test DB).
8. `hirestream/server/routes/employer.routes.ts`, `agency.routes.ts`, `application.routes.ts`, `drive.routes.ts` — to see how data is scoped per caller (the handler-level filtering is the thing your tests verify).

---

## 1. Background — why this task exists

Phase 1's first staging smoke run flagged ~70 "authz LEAK" lines that turned out to be **calibration noise** — HireStream uses handler-level data scoping, not route-level role gates. The proper test is *content-level*: "employer A cannot see employer B's placements", not "employer cannot reach /candidates/*". The route is fine to reach; the data must be filtered.

**This is the flagship deliverable of Phase 2** because:
- It's the test class that catches the dominant authz pattern in HireStream.
- It's the test class that, when green, materially raises confidence past ~90%.
- It's the test class that, when it fails, surfaces real cross-tenant data leaks (the worst class of bug a multi-tenant app can ship).

P2.2a already seeded the `_b` siblings (demo_employer_b → Aramco, demo_agent_b → Gulf Bridge, demo_admin_b) with their own jobs. Your job is to write the assertion suite.

This is Phase 2 deliverable P2.2 (see `Phase_02_PRD.md` §2).

---

## 2. What you must change

### 2.1 — Create `hirestream/tests/integration/data-isolation.test.ts` (and siblings if needed)

A Jest integration test suite that runs against the test DB. Structure (illustrative — adapt to existing Jest+supertest patterns you find in §pre-reads-5):

```typescript
import request from "supertest";
import { app } from "<adapt to actual app import path used in existing integration tests>";

// Login helper — adapt to existing patterns
async function loginAs(username: string, password = "test123"): Promise<string> {
  const r = await request(app)
    .post("/api/v1/auth/login")
    .send({ username, password });
  return r.headers["set-cookie"]?.[0] || "";
}

describe("Data isolation — employer A vs employer B", () => {
  let aCookie: string;
  let bCookie: string;
  beforeAll(async () => {
    aCookie = await loginAs("demo_employer");
    bCookie = await loginAs("demo_employer_b");
  });

  // ────────────────────────────────────────────────────────────────────
  // PAIR 1: GET-list endpoints — each tenant sees ONLY their rows
  // ────────────────────────────────────────────────────────────────────
  test("GET /employer/requisitions — A's response does NOT include B's jobs", async () => {
    const r = await request(app).get("/api/v1/employer/requisitions").set("Cookie", aCookie);
    expect(r.status).toBe(200);
    const titles = (r.body.data || []).map((row: any) => row.title);
    expect(titles).not.toContain("Senior Drilling Engineer");      // B's job
    expect(titles).not.toContain("Production Supervisor");          // B's job
    // Sanity — A still sees A's own jobs
    expect(titles).toContain("Senior Plant Technician");            // example A job from existing seed
  });

  test("GET /employer/requisitions — B's response does NOT include A's jobs", async () => {
    const r = await request(app).get("/api/v1/employer/requisitions").set("Cookie", bCookie);
    expect(r.status).toBe(200);
    const titles = (r.body.data || []).map((row: any) => row.title);
    expect(titles).toContain("Senior Drilling Engineer");           // B's own
    expect(titles).not.toContain("Senior Plant Technician");        // A's; must not appear
  });

  // ────────────────────────────────────────────────────────────────────
  // PAIR 2: GET-by-id — fetching the OTHER tenant's row returns 403/404
  // ────────────────────────────────────────────────────────────────────
  test("A cannot GET an individual job that belongs to B", async () => {
    // Get B's job id (via B's session, then test A trying to fetch it)
    const bJobs = await request(app).get("/api/v1/employer/requisitions").set("Cookie", bCookie);
    const drillingJob = bJobs.body.data.find((j: any) => j.title === "Senior Drilling Engineer");
    expect(drillingJob).toBeDefined();
    const r = await request(app).get(`/api/v1/jobs/${drillingJob.id}`).set("Cookie", aCookie);
    // Acceptable: 403 (explicit forbidden), 404 (filtered-out, not found from A's view).
    // NOT acceptable: 200 with B's data.
    expect([403, 404]).toContain(r.status);
  });

  // ────────────────────────────────────────────────────────────────────
  // PAIR 3: Mutations — PATCH/DELETE on the other tenant's row → 403/404
  // ────────────────────────────────────────────────────────────────────
  test("A cannot PATCH a job owned by B", async () => {
    const bJobs = await request(app).get("/api/v1/employer/requisitions").set("Cookie", bCookie);
    const drillingJob = bJobs.body.data.find((j: any) => j.title === "Senior Drilling Engineer");
    const r = await request(app)
      .patch(`/api/v1/jobs/${drillingJob.id}`)
      .set("Cookie", aCookie)
      .send({ title: "HACKED" });
    expect([403, 404]).toContain(r.status);
    // CRITICAL: verify B's job is unchanged
    const bRecheck = await request(app).get(`/api/v1/jobs/${drillingJob.id}`).set("Cookie", bCookie);
    expect(bRecheck.body.data.title).toBe("Senior Drilling Engineer");
  });

  // … delete attempt analogously
});

describe("Data isolation — agent A vs agent B", () => {
  // Similar shape, using demo_agent vs demo_agent_b
  //   - /agent/requisitions, /agent/applicants, /agent/placements, /agencies/me
  //   - GET-list, GET-by-id, PATCH each
});

describe("Data isolation — admin A vs admin B (sanity / symmetry)", () => {
  // Admins have broad cross-tenant access by design — but the same admin
  // role across two accounts should see the same data (this is a sanity
  // test for the admin scope, not an isolation test). If symmetry breaks,
  // the admin scope itself has a bug.
});

describe("Data isolation — candidate (Arjun) vs candidate (Priya)", () => {
  // Two existing seeded candidates (no _b siblings needed; the existing 6
  // candidates are themselves an isolation set).
  //   - GET /candidates/profile returns ONLY the caller's profile
  //   - GET /candidates/applications returns ONLY the caller's apps
  //   - PATCH another candidate's profile → 403/404
});
```

### 2.2 — Coverage matrix to achieve

At minimum, write **isolation pairs for these entity classes** (each pair = list-test + by-id-test + mutation-test, so 3 tests minimum per row):

| Entity | A side | B side | Endpoints to test |
|---|---|---|---|
| Employer's jobs | demo_employer | demo_employer_b | /employer/requisitions, /jobs/:id, /jobs/:id (PATCH) |
| Employer's review queue | demo_employer | demo_employer_b | /employer/review-queue |
| Agent's placements | demo_agent | demo_agent_b | /agent/placements, /agent/placements/:id, /agent/placements/:id (PATCH) |
| Agency profile | demo_agent | demo_agent_b | /agencies/me (must return caller's own only) |
| Agent's requisitions / applicants | demo_agent | demo_agent_b | /agent/requisitions, /agent/applicants |
| Candidate profile | demo_candidate | priya_verma | /candidates/profile, /me/profile.pdf, /candidates/applications |

Aim for ~15-20 tests total. Use `describe` blocks per pair-class for readability. **Skip mutations where the entity is read-only via API** (document in QC §5).

### 2.3 — Use the existing Jest patterns; do not invent

If existing integration tests use a `helpers.ts` for login, reuse it. If they use a transactional rollback wrapper, reuse it. **The single biggest failure mode here is inventing new patterns when reusable ones exist.** If you can't find a pattern, STOP and document in QC §7.

### 2.4 — No new dependencies, no new scripts in package.json

The new tests are picked up by the existing `npm test` invocation (Jest globs `tests/**/*.test.ts`). No package.json change needed.

### 2.5 — Required edge case: deliberately-broken handler proves the suite catches it

In the QC report's §6 (reviewer attention), include a step where you:
1. Manually edit ONE handler (e.g. `server/routes/employer.routes.ts`'s `/employer/requisitions`) to return ALL employer rows (remove the `WHERE employer_id = req.user.id` clause).
2. Run the suite — expect it to FAIL with a clear assertion (something like "A's response unexpectedly contained 'Senior Drilling Engineer'").
3. Revert the handler.
4. Re-run — expect green.

This proves the suite would CATCH a real handler-level data leak if one ever shipped. **Do NOT commit the deliberately-broken handler; the QC report is the only place this step is documented.**

---

## 3. What you must NOT change

- Do **NOT** modify any product code in `server/`, `client/`, `shared/` (except the temporary deliberately-broken handler in §2.5, which you REVERT before finishing).
- Do **NOT** modify `scripts/seed.ts` (P2.2a's territory — already shipped).
- Do **NOT** modify `scripts/deep-smoke.mjs` or `scripts/schema-fuzz.mjs` (sibling concerns).
- Do **NOT** modify `lib/logger.ts` (P2.3's territory — separate Wave 2 brief handles migration).
- Do **NOT** add new npm dependencies.
- Do **NOT** modify `jest.config.*`, `package.json`, `tsconfig.json`.
- Do **NOT** commit, push, or restart any service.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — TS compile clean (2 pre-existing errors only)
npm run check 2>&1 | tail -10

# Step 2 — your new suite runs in isolation, all green
npm test -- tests/integration/data-isolation 2>&1 | tail -30
# Expected: ALL tests pass; SUMMARY line shows the new test count added to the
#   Jest total.

# Step 3 — confirm full Jest still passes (no regression on the 485 + your new ones)
npm test 2>&1 | tail -10
# Expected: e.g. `Tests: 500 passed, 500 total` (485 + your new count)

# Step 4 — DELIBERATELY break a handler (per §2.5) to prove the suite catches leaks
#   Edit server/routes/employer.routes.ts: in /employer/requisitions handler,
#   remove the where-clause that scopes by req.user.id. Rebuild ONLY IF the
#   server needs rebuild (Jest tests usually exec source directly via tsx/ts-jest).
npm test -- tests/integration/data-isolation 2>&1 | tail -20
# Expected: at least 2 tests FAIL with a clear assertion message naming the
#   leaked row title (e.g. "Senior Drilling Engineer"). Paste the raw output.

# Step 5 — REVERT the handler change (use git checkout)
git checkout server/routes/employer.routes.ts
# Confirm the file is back to its committed state:
git diff server/routes/employer.routes.ts | head -5
# Expected: no output (file matches HEAD)

# Step 6 — Re-run the suite, confirm green again
npm test -- tests/integration/data-isolation 2>&1 | tail -10
# Expected: all green.

# Step 7 — deep-smoke regression
DEEP_SMOKE_TOKEN=test123 npm run smoke 2>&1 | grep -E "SUMMARY|RESULT"
# Expected: SUMMARY pass=>=381 (Phase 1 baseline holds; new tests don't affect smoke).
```

**Expected outputs**: see inline. If any step diverges, STOP and document in QC §7.

---

## 5. QC report — required (mandatory 9-section format, no abbreviation)

Use template at `PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`. Save to `C6_Active_Tasks/QC_Reports/p02_p2_2b_data_isolation_suite.md`.

**All 9 sections required.** Phase 1 + Phase 2 Wave 1 both saw QC section drift at this tier; this brief restates the binding contract:

- [ ] §1 Files changed (full path list)
- [ ] §2 Full diff per file (paste from `git diff`)
- [ ] §3 Validation steps + raw output (all 7 steps from §4)
- [ ] §4 Judgment calls / deviations (e.g. which existing helpers you reused; any tests skipped with reason)
- [ ] §5 Out-of-scope findings (e.g. "while writing the agent tests I noticed /agent/X has no per-tenant scoping at all — flagged for future")
- [ ] §6 Things reviewer should pay attention to — **MUST include the deliberately-broken-handler experiment with raw output** (the "did the suite catch it" proof)
- [ ] §7 Open questions / blockers
- [ ] §8 Self-assessment (`Ready for review` or `Blocked: <reason>`)
- [ ] §9 Suggestions for architect

---

## 6. After QC report is written, STOP

Do NOT commit. Do NOT push. The deliberately-broken handler MUST be reverted before stopping (per §4 Step 5). Architect integrates.

---

## 7. Acceptance — done when

> "`npm test -- tests/integration/data-isolation` runs ≥15 tests across employer/agent/admin/candidate isolation pairs, all green. Jest 485+N passes. The QC report's §6 demonstrates the suite CATCHES a deliberately-broken handler with a clear, actionable assertion message. The deliberately-broken handler is reverted to HEAD before the task stops. No new dependencies."
