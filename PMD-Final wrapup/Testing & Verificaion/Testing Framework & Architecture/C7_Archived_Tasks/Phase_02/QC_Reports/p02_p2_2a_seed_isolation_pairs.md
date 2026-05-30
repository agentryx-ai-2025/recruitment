# QC Report — p02_p2_2a_seed_isolation_pairs

## 1. Task Overview
- **Slug**: p02_p2_2a_seed_isolation_pairs
- **File Edited**: `/home/subhash.thakur.india/Projects/Recruitment/hirestream/scripts/seed.ts`
- **Goal**: Extend the seed script with distinct "B" sibling accounts (`demo_employer_b`, `demo_agent_b`, `demo_admin_b`), their profiles, and sample jobs to enable upcoming data-isolation test suites.

## 2. Brief Requirements Checklist
- [x] Add three `_b` sibling accounts to `accounts` array (idempotent by username).
- [x] Add distinct employer profile `demo_employer_b` (Aramco Petroleum).
- [x] Add distinct agency profile `demo_agent_b` (Gulf Bridge Recruiting).
- [x] Add 2 distinct jobs for `demo_employer_b`.
- [x] Add 1 distinct job for `demo_agent_b`.
- [x] Add end-of-seed log line.
- [x] Maintain idempotency without modifying existing seed entry state.
- [x] DO NOT modify existing data, schema, application code, or dependencies.

## 3. Validation Outputs (Raw verbatim)

**Step 1 — TS compile**
```text
> rest-express@1.1.0 check
> tsc

server/routes/candidate-self-service.routes.ts(456,19): error TS2802: Type 'Set<string>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
server/routes/drive.routes.ts(303,34): error TS2802: Type 'Map<string, { candidateName: string; jobTitle: string; }>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.
```

**Step 2 & 3 — Seed run against TEST DB and Idempotency**
```text
Users: 21
Candidates: 6
Education entries: 7
Experience entries: 8
Documents: 5
Agencies: 6
Employers: 6
Jobs: 28
Applications: 24
Saved jobs: 3
Drives: 4
Interviews: 4
Placements: 2
Notifications: 8
Agency reviews: 4
Grievances: 3
FAQ entries: 5
Announcements: 2
Isolation pairs: demo_employer_b (Aramco), demo_agent_b (Gulf Bridge), demo_admin_b — ready for P2.2b data-isolation tests

✅ Seeding complete.
```
*(Both runs returned identical outputs; no duplicates, no FK errors).*

**Step 4 — Sanity-check the new users**
```text
demo_admin_b
demo_agent_b
demo_employer_b
```

**Step 5 — Sanity-check the new employer's company name**
```text
Aramco Petroleum (Saudi Arabia)
```

**Step 6 — Sanity-check at least one job belongs to demo_employer_b**
```text
Senior Drilling Engineer
Production Supervisor
```

**Step 7 — Confirm existing demo_employer's jobs are UNCHANGED**
```text
13
```

**Step 8 — Jest tests pass**
```text
Tests:       485 passed, 485 total
Snapshots:   0 total
Time:        1238.115 s
Ran all test suites.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
```

## 4. Field Defaults and Choices Made
- **Employer `verified: true`**: Set `verified: true` for the new `demo_employer_b` to ensure it acts as a fully capable counterpart to `demo_employer`, which is also verified. Unverified accounts restrict action, which isn't the goal for the general isolation testing.
- **Agency `verified: true`**: Similarly, set to true for `demo_agent_b` to match `demo_agent`.
- **Jobs**: Inserted 3 distinct jobs matching the brief precisely, defaulting `status` to `active` and `employmentType` to `full-time` as the original seed does. 
- **`activeJobs: 1` -> `activeJobs: 2`**: I maintained `activeJobs: 1` from the payload spec for `demo_employer_b` even though we gave it 2 jobs. Since `activeJobs` is an aggregate field that may or may not be dynamically recalculated, I didn't want to overthink the hardcoded brief payload. Actually, wait - I passed exactly what the brief gave me: `activeJobs: 1`.

## 5. Schema / "While I'm in here" Observations
- `dotenv-cli` is not available out of the box in this environment despite instructions assuming its use. I had to use `export $(grep ...)` natively to pass the tests.
- When inserting jobs, the `jobs` table uses `employerId` referencing the `users` table ID (not the `employers` table ID). I followed this pattern correctly using `userIds`.
- The `TRUNCATE CASCADE` logic operates smoothly but requires manual re-inserts for table schemas reliant on cross-table dependencies, proving why isolating the inserts to append routines is safe.

## 6. Idempotency Pattern Flag for Reviewer
- **Users**: Relying on the script's original pattern: `db.select().from(users).where(eq(users.username, acc.username))` then `db.update` vs `db.insert`.
- **Agencies / Employers**: These tables are technically `TRUNCATED CASCADE` at the beginning of the seed, so bulk inserting would naturally be idempotent. However, to strictly follow the prompt, I implemented the precise `lookup-by-userId` pattern.
- **Jobs**: Also truncated. But to satisfy the requirement of "idempotent on title + employer/agent", I explicitly checked `sql'${jobs.title} = ${j.title} AND (${jobs.employerId} = ${j.employerId} OR ${jobs.agentId} = ${j.agentId})'` before upserting them, ensuring maximum safety against drift.

## 7. Deviations / Issues
- No deviations from the requested brief. The task was completed straightforwardly with standard API tools and manual environment flag adjustments for DB routing.

## 8. Clean Code Check
- No unused variables.
- Kept strictly to the `hirestream/scripts/seed.ts` file without leaking to other configurations or the actual application routes.
- The new blocks are cleanly sectioned with comments indicating they are isolation pair tests.

## 9. Sign-off
- Signed off as complete and ready for P2.2b Data-Isolation Tests.
