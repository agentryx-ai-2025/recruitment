<!--
TASK BRIEF
SLUG: p02_p2_2a_seed_isolation_pairs
PHASE: 02 — Close L3 + start L4 + data-isolation
TIER: 🟢 (mechanical — idempotent seed additions)
AG MODEL: Gemini 3.5 Flash (High)
WAVE: 1 (parallel with p02_p2_1, p02_p2_3)
-->

# Task Brief — p02_p2_2a_seed_isolation_pairs

**Assigned tier**: 🟢 — Gemini 3.5 Flash (High)
**Effort estimate**: 45-60 min
**Workspace**: DEV only — `hirestream/scripts/seed.ts` (existing file; extended)
**Single file to edit**: `/home/subhash.thakur.india/Projects/Recruitment/hirestream/scripts/seed.ts`
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p02_p2_2a_seed_isolation_pairs.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially "Gemini Flash under-reads spec"**. Read §2 below twice. Item 2.3 (idempotency) is the contract; missing it would mutate live demo data and break the existing role walkthrough videos.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_02_PRD.md` §5 (Risk areas) — note that this brief is the *prerequisite* for the flagship P2.2b data-isolation suite.
4. `hirestream/scripts/seed.ts` — the existing seed. Read it top-to-bottom before editing.

---

## 1. Background — why this task exists

Phase 1's first staging smoke run exposed that HireStream uses **handler-level data scoping** (anyone authenticated can call most routes; the handler returns only data scoped to the caller). The proper test for this class of authz risk is **data-isolation**: can employer A see employer B's data? That test needs **two of each non-candidate role** in the seed:

- `demo_employer` already exists. Need `demo_employer_b` with their own jobs, requisitions.
- `demo_agent` already exists. Need `demo_agent_b` with their own agency, jobs.
- `demo_admin` already exists. Need `demo_admin_b` (admin scoping is mostly read-everything, but the pair lets us assert symmetry).

(Candidate isolation is per-`candidateId`, which the existing 6 seed candidates already cover — `priya_verma`, `rohan_mehta` etc. are themselves an isolation pair from `demo_candidate`'s perspective. No new candidates needed.)

**Goal of this task**: extend `scripts/seed.ts` with the three `_b` siblings, each with their own ring of data, idempotently. The data-isolation test suite (P2.2b, Wave 2) will then assert that role A never sees role B's data.

This is Phase 2 deliverable P2.2a (see `Phase_02_PRD.md` §7.2 row 2).

---

## 2. What you must change

### 2.1 — Add three `_b` user accounts to `scripts/seed.ts`'s `accounts` array

The existing accounts (per the file's current `accounts` const) include entries like `demo_admin`, `demo_employer`, `demo_agent`, `demo_candidate`, `superadmin`. Append (do not modify existing entries):

```
{ username: "demo_employer_b", email: "demo_employer_b@hirestream.dev", role: "employer",  password: "test123" }
{ username: "demo_agent_b",    email: "demo_agent_b@hirestream.dev",    role: "agent",     password: "test123" }
{ username: "demo_admin_b",    email: "demo_admin_b@hirestream.dev",    role: "admin",     password: "test123" }
```

The seed's existing user-upsert logic must already be idempotent on `username` (verify this is true; if not, STOP and document in QC §7 — do NOT modify the upsert logic from this brief).

### 2.2 — Add a sibling employer profile

After the existing `employers` insert block (find it by searching for the existing `demo_employer` employer profile), add an upsert for `demo_employer_b` with **distinct, recognisable data** so a test can assert "this is _b's data, not _a's":

```
{ userId: userIds.demo_employer_b,
  companyName: "Aramco Petroleum (Saudi Arabia)",      // distinct from existing _a employer
  industry: "Oil & Gas",
  location: "Riyadh, Saudi Arabia",
  registeredCountry: "Saudi Arabia",
  verified: true,
  activeJobs: 1 }
```

**Idempotent**: same pattern as existing — look up by `userId` first; insert only if missing; update other fields on conflict.

### 2.3 — Add a sibling agency

After the existing agency insert block, add a `demo_agent_b` agency:

```
{ userId: userIds.demo_agent_b,
  agencyName: "Gulf Bridge Recruiting Pvt Ltd",        // distinct name
  licenseNumber: "HP-OPA-2022-0588",
  specializations: ["Oil & Gas", "Engineering"],
  verified: true,
  rating: 4,
  placements: 28 }
```

Same idempotency pattern.

### 2.4 — Add **1-2 jobs** owned by `demo_employer_b` AND **1-2 jobs** owned by `demo_agent_b`

These are the "data" that A must not see when querying as B (and vice versa). Pick recognisable titles so test assertions can be readable:

- `demo_employer_b` posts a job: `"Senior Drilling Engineer"` for Aramco, Saudi Arabia. Status `"active"`.
- `demo_employer_b` posts a job: `"Production Supervisor"` for Aramco. Status `"active"`.
- `demo_agent_b` posts a job: `"Petrochemical Operator"` (owned by the agent_b agency). Status `"active"`.

(Use the existing `jobs` table inserts as the pattern. Idempotent on something like `title + employerId` or `title + agentId`.)

### 2.5 — Idempotency: end-of-seed log line

After the new inserts, add a log line confirming the isolation pairs are present:

```typescript
console.log("Isolation pairs: demo_employer_b (Aramco), demo_agent_b (Gulf Bridge), demo_admin_b — ready for P2.2b data-isolation tests");
```

### 2.6 — No other changes

This brief is strictly about adding the three `_b` siblings + their immediate data. **Do NOT** add applications, placements, interviews, or anything else for them — the test suite (P2.2b, Wave 2) will create those as test fixtures inside transactions.

---

## 3. What you must NOT change

- Do **NOT** modify any existing seed entry (`demo_candidate`'s data, `demo_employer`'s jobs, etc.). The Phase 1 video walkthroughs depend on the existing data state; breaking it would invalidate the videos.
- Do **NOT** modify the seed's upsert/idempotency logic. If you suspect a bug there, STOP and document in QC §7.
- Do **NOT** modify any product code under `server/` or `client/`.
- Do **NOT** add new npm dependencies.
- Do **NOT** modify migrations or `shared/schema.ts`. The new accounts use existing columns.
- Do **NOT** modify `tsconfig.json`, `package.json`, or any infrastructure file.
- Do **NOT** run the seed against staging or production from your validation. **Only run against `hirestream_test`** (the test DB) — see §4.
- Do **NOT** commit. Do **NOT** push.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — TS compile (the existing two pre-existing TS errors in unrelated files are OK; flag any NEW error)
npm run check 2>&1 | tail -10
# Expected: the same 2 pre-existing errors only (candidate-self-service.routes.ts:456, drive.routes.ts:303).
# Any new error in your edits = FAIL the task; investigate.

# Step 2 — run seed against the TEST DB (idempotent, repeatable, safe)
#   The seed targets DATABASE_URL when run; force it to TEST_DATABASE_URL:
NODE_ENV=test dotenv -- bash -c 'DATABASE_URL=${TEST_DATABASE_URL} npx tsx scripts/seed.ts 2>&1 | tail -30'
# Expected: console output including:
#   - existing Candidates/Education/Experience counts
#   - new "Isolation pairs: demo_employer_b (Aramco), demo_agent_b (Gulf Bridge), demo_admin_b — ready for P2.2b data-isolation tests"
#   - no errors / exceptions

# Step 3 — idempotency: run seed AGAIN; results must be identical (no duplicate inserts, no errors)
NODE_ENV=test dotenv -- bash -c 'DATABASE_URL=${TEST_DATABASE_URL} npx tsx scripts/seed.ts 2>&1 | tail -10'
# Expected: same output as Step 2; no FK violations; no duplicate-key errors.

# Step 4 — sanity-check the new rows exist in the test DB
NODE_ENV=test dotenv -- bash -c 'PGPASSWORD=$(echo $TEST_DATABASE_URL | sed "s/.*:\/\/[^:]*:\([^@]*\)@.*/\1/") psql "$TEST_DATABASE_URL" -tAc "SELECT username FROM users WHERE username IN ('"'"'demo_employer_b'"'"','"'"'demo_agent_b'"'"','"'"'demo_admin_b'"'"') ORDER BY username;"' 2>&1
# Expected (3 lines):
#   demo_admin_b
#   demo_agent_b
#   demo_employer_b

# Step 5 — sanity-check the new employer's company name
NODE_ENV=test dotenv -- bash -c 'psql "$TEST_DATABASE_URL" -tAc "SELECT company_name FROM employers e JOIN users u ON e.user_id = u.id WHERE u.username = '"'"'demo_employer_b'"'"';"' 2>&1
# Expected: `Aramco Petroleum (Saudi Arabia)`

# Step 6 — sanity-check at least one job belongs to demo_employer_b
NODE_ENV=test dotenv -- bash -c 'psql "$TEST_DATABASE_URL" -tAc "SELECT title FROM jobs j JOIN users u ON j.employer_id = u.id WHERE u.username = '"'"'demo_employer_b'"'"';"' 2>&1
# Expected: at least one row, e.g. `Senior Drilling Engineer`

# Step 7 — confirm existing demo_employer's jobs are UNCHANGED (count is same as before this brief)
#   (compare against your local baseline; document the count in QC §3)
NODE_ENV=test dotenv -- bash -c 'psql "$TEST_DATABASE_URL" -tAc "SELECT count(*) FROM jobs j JOIN users u ON j.employer_id = u.id WHERE u.username = '"'"'demo_employer'"'"';"' 2>&1

# Step 8 — Jest tests still pass (no regression on the 485)
npm test 2>&1 | tail -5
# Expected: 485/485 passed (or whatever baseline was when you started)
```

**Expected outputs**: see inline. If any step diverges, STOP and document in QC §7.

---

## 5. QC report — required (mandatory 9-section checklist)

Save to: `C6_Active_Tasks/QC_Reports/p02_p2_2a_seed_isolation_pairs.md`. All 9 sections required.

Particularly important sections for this brief:
- §3: include the row-count outputs from Steps 4-7 verbatim.
- §4: state any field-default choices you had to make (e.g. `verified: true` for the new employer — yes/no, with reason).
- §5: if you noticed missing schema indices or other "while I'm in here" findings, log here. **Do NOT fix.**
- §6: flag for reviewer the **idempotency pattern** you adopted (lookup-by-userId vs upsert-by-username, etc.). The reviewer will verify it matches the existing seed's pattern.

---

## 6. After QC report is written, STOP

Do NOT commit. Do NOT push. Architect integrates as part of the Phase 2 Wave 1 integration commits.

---

## 7. Acceptance — done when

> "Running `npx tsx scripts/seed.ts` against the test DB twice in a row produces no errors, no duplicates, and creates the three `_b` siblings (`demo_employer_b` → Aramco employer, `demo_agent_b` → Gulf Bridge agency, `demo_admin_b` → admin) plus at least 3 jobs distributed across `demo_employer_b` and `demo_agent_b`. Existing `demo_*` data is untouched. Jest 485/485 still passes."
