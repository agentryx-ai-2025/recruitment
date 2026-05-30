<!--
TASK BRIEF
SLUG: p01_p1_2_ci_pr_check_workflow
PHASE: 01 — Eliminate manual maintenance + wire CI
TIER: 🟢 (mechanical, well-bounded)
AG MODEL: Gemini 3.5 Flash (High)
WAVE: 1 (parallel with p01_p1_1, p01_p1_3, p01_p1_5)
-->

# Task Brief — p01_p1_2_ci_pr_check_workflow

**Assigned tier**: 🟢 — Gemini 3.5 Flash (High)
**Effort estimate**: 30-45 min
**Workspace**: DEV only — `hirestream/.github/workflows/`
**Files to create**: `hirestream/.github/workflows/pr-check.yml` (NEW)
**Files to edit**: `hirestream/.github/workflows/` may not exist yet — create directories as needed. Do NOT edit `hirestream/package.json` (the `test:deep` script already exists).
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_2_ci_pr_check_workflow.md`

**Mandatory pre-reads before you touch any code:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially the "Gemini Flash under-reads spec" patterns** — your tier's known weakness is skipping over specific requirements in this brief. Read §2 below twice.
3. `hirestream/package.json` (current scripts: `test`, `test:e2e`, `smoke`, `smoke:local`, `test:deep`).
4. `hirestream/tests/DEEP_TESTING.md` — entry-point doc.
5. `Phase_01_PRD.md` §9 — there's an **OPEN DECISION** about the CI test-DB approach. **READ THIS** and pick the path before authoring the workflow (see §2.3 below).

---

## 1. Background — why this task exists

`npm run test:deep` exists (Jest 485 tests + deep-smoke harness 105 checks) but is run manually by the architect. PRs land on `main` without an automated check, so a regression introduced in a PR can merge before anyone notices. The two real bugs fixed in `v0.4.43.4` were caught during a manual audit — they could just as easily have lived on `main` for days.

**Goal of this task**: every PR opened against `main` automatically runs `npm test` and `npm run smoke`, with red status checks blocking merge (when branch protection is configured by the operator separately — outside this brief).

This is the Phase 1, deliverable 2 work from `Phase_01_PRD.md` §2 (row P1.2).

---

## 2. What you must change

### 2.1 — Create `.github/workflows/pr-check.yml`

A GitHub Actions workflow with:

- **Name**: `PR Check — test:deep`
- **Triggers**:
  - `pull_request` on `main`: events `opened`, `synchronize`, `reopened`
  - `push` on `main` (catches direct commits if any)
- **Jobs**: one job, `test-deep`, running on `ubuntu-latest`.
- **Steps**:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`
  3. `npm ci` (working-directory: `hirestream/` since the git root is `Recruitment/` and the app is in a subdir — **VERIFY this with `git rev-parse --show-toplevel` before assuming**; if the repo root IS `hirestream/`, drop the working-directory flag and adapt)
  4. Database setup — see §2.3 for the decision.
  5. `npm test` (Jest 485 — must complete and report 485 passed).
  6. **Smoke step** — run `npm run smoke` against a target URL. See §2.4 for the decision (against a deployed preview vs. spinning up a local server in CI).
  7. On failure: the step exits non-zero; the PR check is marked failed.
- **Concurrency**: cancel in-progress runs on the same PR when a new commit lands (`concurrency: { group: pr-check-${{ github.ref }}, cancel-in-progress: true }`).
- **Permissions**: minimal — `contents: read`. No write permissions.

### 2.2 — Add a status-check badge (optional, but include it)

In `hirestream/README.md` (if it exists; if not, skip this — do NOT create a README), add a single-line GitHub Actions status badge at the top:

```markdown
![PR Check](https://github.com/<owner>/<repo>/actions/workflows/pr-check.yml/badge.svg)
```

If you can't determine `<owner>/<repo>` from `git remote -v` (the repo may not have a remote configured — see ground rules in this project: commits are local-only), STOP this sub-task and document in QC §7. Do not invent values.

### 2.3 — RESOLVE THE OPEN DECISION: CI test-DB approach

`Phase_01_PRD.md` §9 flags this as an open decision. **You are authorised to pick one** of the following — the simplest viable approach for now (Phase 1) — and document the choice in QC §4:

- **Option A (use this if uncertain)**: Spin up `postgres:16` as a `services:` block in the workflow (free, instant, no external dependency). Pre-create the test database; set `DATABASE_URL` and `TEST_DATABASE_URL` env in the job. Run `npm run db:push:test` to migrate. This is the most portable choice and adds ~30 s to CI runtime.
- **Option B**: Neon free-tier branch per CI run via the Neon GitHub Action. More complex setup; skip for now.
- **Option C**: Self-hosted runner with the local Postgres. Requires operator setup outside this brief; skip for now.

**Pick Option A unless the operator has expressed a preference otherwise** (none expressed at brief-write time). Document your choice in QC §4.

### 2.4 — RESOLVE: how does smoke run in CI?

The deep-smoke harness needs a running server. Pick:

- **Option A (use this)**: In the workflow, after `npm test` and `npm run db:push:test`, start the dev server in the background (`tsx server/index.ts &`), wait for it to be ready (`curl --retry-connrefused --retry 10 --retry-delay 2 http://localhost:5001/api/v1/content/faq`), then run `DEEP_URL=http://localhost:5001 npm run smoke`. The dev server uses non-secure cookies, so http is fine.
- **Option B**: Run smoke against the live staging URL. Risky — every CI run hits production-adjacent infra; skip.

**Pick Option A.** Document in QC §4.

### 2.5 — Document the workflow

Update `hirestream/tests/DEEP_TESTING.md` to add a short section (≤ 10 lines) titled **"## CI gating"** that documents:

- The workflow file location.
- What it runs (jest + smoke against local dev server in CI).
- How to interpret a red check.
- Where to find the workflow's logs (Actions tab).

---

## 3. What you must NOT change

- Do **NOT** modify `package.json` scripts. `npm test`, `npm run smoke`, and `npm run test:deep` already exist and must be used unchanged.
- Do **NOT** modify any product code under `hirestream/server/` or `hirestream/client/`.
- Do **NOT** modify Jest configs (`jest.config.*`).
- Do **NOT** modify Playwright configs (`playwright.config.ts`, `playwright.video.config.ts`).
- Do **NOT** create a `.github/workflows/pre-deploy.yml` — that's a sibling task (p01_p1_3); do not touch it.
- Do **NOT** create a `.github/workflows/verify-skeleton.yml` — that's a sibling task (p01_p1_5); do not touch it.
- Do **NOT** add the workflow file to a subfolder; it MUST be at `hirestream/.github/workflows/pr-check.yml` for GitHub Actions to discover it.
- Do **NOT** add branch-protection-rules JSON or any admin-action artifacts — that's an operator action outside this brief.
- Do **NOT** commit. Do **NOT** push. Do **NOT** open a real PR to test.

---

## 4. Validation steps (mandatory; paste raw output into QC Section 3)

You cannot fully test a GitHub Actions workflow without pushing to a remote (which is forbidden). Validate the workflow as far as locally possible:

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — YAML lint
#   Verify the workflow file parses as valid YAML.
node -e "console.log(JSON.stringify(require('js-yaml').load(require('fs').readFileSync('.github/workflows/pr-check.yml','utf8')), null, 2))" 2>&1 | head -40 || \
  python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/pr-check.yml')); print('YAML OK')"

# Step 2 — Workflow schema sanity (act dry-run if available; otherwise skip with note)
which act >/dev/null && act --list -W .github/workflows/pr-check.yml 2>&1 | head -20 || echo "act not installed — skip; manual review of YAML required"

# Step 3 — Manual simulate the in-CI sequence locally:
#   a. Install deps (npm ci — but you may already be on node_modules; npm i is fine for local)
npm i 2>&1 | tail -3

#   b. Run jest
npm test 2>&1 | tail -5
#   Expected: "Tests: 485 passed, 485 total"

#   c. Start a temp dev server on a non-standard port
PORT=5099 NODE_ENV=development tsx server/index.ts >/tmp/dev-server.log 2>&1 &
DEV_PID=$!
sleep 8

#   d. Probe it
curl -s --retry 5 --retry-delay 1 http://localhost:5099/api/v1/content/faq | head -c 100

#   e. Run smoke against it
DEEP_URL=http://localhost:5099 npm run smoke 2>&1 | tail -10

#   f. Tear down
kill $DEV_PID
sleep 2

# Step 4 — README badge sanity (if you added it)
grep -c 'workflows/pr-check.yml/badge.svg' README.md 2>&1 || echo "no README change"

# Step 5 — DEEP_TESTING.md updated
grep -c '## CI gating' tests/DEEP_TESTING.md
```

**Expected outputs:**
- Step 1: parses without error (either node js-yaml or python yaml prints OK)
- Step 2: act lists the workflow OR notes act not installed
- Step 3b: `Tests: 485 passed`
- Step 3d: JSON response (faq array)
- Step 3e: `SUMMARY pass=>=105 warn=0 FAIL=0  RESULT: PASS`
- Step 4: `1` (if README badge added) or "no README change"
- Step 5: `1`

If any step diverges, your task is NOT done — investigate. If you can't resolve, STOP and document in QC §7.

---

## 5. QC report — required

Use the template at:
`/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C3_Templates/QC_Report_template.md`

Save to:
`/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p01_p1_2_ci_pr_check_workflow.md`

All 9 sections required. Specifically:
- Section 4: state which Option you picked in §2.3 (test DB) and §2.4 (smoke target) with rationale.
- Section 7: any uncertainty about the repo's git-root structure (`hirestream/` as subdir vs root) MUST be raised here.

---

## 6. After QC report is written, STOP

Do NOT commit, push, or open a PR. The architect will integrate the workflow file and push to the remote on a proper feature branch.

---

## 7. Acceptance — done when

> "A `.github/workflows/pr-check.yml` exists at the correct path, parses as valid YAML, locally simulates green for `npm test` + `npm run smoke` against a dev server, and `tests/DEEP_TESTING.md` documents the new CI gating. Branch-protection wire-up is an operator action outside this brief."
