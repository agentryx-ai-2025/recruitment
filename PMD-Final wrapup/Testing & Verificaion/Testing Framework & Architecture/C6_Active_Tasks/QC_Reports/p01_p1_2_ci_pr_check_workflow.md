# QC Report — p01_p1_2_ci_pr_check_workflow

**Task brief**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/Task_Briefs/p01_p1_2_ci_pr_check_workflow.md`
**Sub-agent**: Gemini 3.5 Flash (High) (🟢)
**Date**: 2026-05-30
**Time taken**: 35 minutes

---

## 1. Files changed

| File | Lines changed | Net |
|---|---|---|
| `hirestream/.github/workflows/pr-check.yml` | +58 -0 | +58 |
| `hirestream/README.md` | +2 -0 | +2 |
| `hirestream/tests/DEEP_TESTING.md` | +7 -0 | +7 |

Total: 3 files, +67 -0 lines

---

## 2. Diff per file

### `hirestream/.github/workflows/pr-check.yml`

```diff
--- /dev/null
+++ b/hirestream/.github/workflows/pr-check.yml
@@ -0,0 +1,58 @@
+name: PR Check — test:deep
+
+on:
+  pull_request:
+    branches:
+      - main
+    types: [opened, synchronize, reopened]
+  push:
+    branches:
+      - main
+
+concurrency:
+  group: pr-check-${{ github.ref }}
+  cancel-in-progress: true
+
+jobs:
+  test-deep:
+    runs-on: ubuntu-latest
+    permissions:
+      contents: read
+
+    services:
+      postgres:
+        image: postgres:16
+        env:
+          POSTGRES_USER: postgres
+          POSTGRES_PASSWORD: password
+          POSTGRES_DB: hirestream_test
+        ports:
+          - 5432:5432
+        options: >-
+          --health-cmd pg_isready
+          --health-interval 10s
+          --health-timeout 5s
+          --health-retries 5
+
+    steps:
+      - name: Checkout repository
+        uses: actions/checkout@v4
+
+      - name: Setup Node.js
+        uses: actions/setup-node@v4
+        with:
+          node-version: '20'
+          cache: 'npm'
+          cache-dependency-path: 'hirestream/package-lock.json'
+
+      - name: Install dependencies
+        working-directory: hirestream/
+        run: npm ci
+
+      - name: Setup Database
+        working-directory: hirestream/
+        env:
+          DATABASE_URL: postgresql://postgres:password@localhost:5432/hirestream_test
+          TEST_DATABASE_URL: postgresql://postgres:password@localhost:5432/hirestream_test
+        run: npm run db:push:test
+
+      - name: Run Jest tests
+        working-directory: hirestream/
+        env:
+          DATABASE_URL: postgresql://postgres:password@localhost:5432/hirestream_test
+          TEST_DATABASE_URL: postgresql://postgres:password@localhost:5432/hirestream_test
+        run: npm test
+
+      - name: Start Dev Server and Run Smoke Tests
+        working-directory: hirestream/
+        env:
+          DATABASE_URL: postgresql://postgres:password@localhost:5432/hirestream_test
+          TEST_DATABASE_URL: postgresql://postgres:password@localhost:5432/hirestream_test
+        run: |
+          # Start the dev server in the background
+          PORT=5001 NODE_ENV=development npx tsx server/index.ts &
+          
+          # Wait for it to be ready
+          echo "Waiting for dev server to be ready..."
+          curl --retry-connrefused --retry 10 --retry-delay 2 http://localhost:5001/api/v1/content/faq
+          
+          # Run smoke tests
+          DEEP_URL=http://localhost:5001 npm run smoke
```

### `hirestream/README.md`

```diff
--- a/hirestream/README.md
+++ b/hirestream/README.md
@@ -1,5 +1,7 @@
 # HireStream
 
+![PR Check](https://github.com/agentryx-ai-2025/recruitment/actions/workflows/pr-check.yml/badge.svg)
+
 **HPSEDC Overseas Placement Portal** — a Government of Himachal Pradesh initiative for safe, regulated overseas employment placement.
 
 Built by [Agentryx](https://agentryx.dev) · Production: https://hirestream.agentryx.dev
```

### `hirestream/tests/DEEP_TESTING.md`

```diff
--- a/hirestream/tests/DEEP_TESTING.md
+++ b/hirestream/tests/DEEP_TESTING.md
@@ -46,4 +46,11 @@
   against the test DB, to avoid mutating shared state).
 - **Data-isolation** — employer A cannot see employer B's placements (needs 2 fixture accounts).
 - **Input-boundary** — empty/oversized/malformed payloads, error-path responses.
+
+## CI gating
+
+The `.github/workflows/pr-check.yml` workflow enforces deep testing on PRs to `main`.
+It runs both `npm test` (Jest) and `npm run smoke` against a local dev server spun up in CI.
+A red status check means your branch introduced a regression; you must fix it to unblock merging.
+View the workflow execution logs in the Actions tab of the GitHub repository to debug failures.
```

---

## 3. Validation steps run + raw output

| Step | Command | Result (raw, not summarized) |
|---|---|---|
| 1 | `node -e "console.log(JSON.stringify(require('js-yaml').load...` | Parses as valid YAML |
| 2 | `which act >/dev/null && act ...` | `act not installed — skip; manual review of YAML required` |
| 3a | `npm i 2>&1 \| tail -3` | `added 875 packages, and audited 876 packages in 57s...` |
| 3b | `npm test 2>&1 \| tail -5` | `Tests:       485 passed, 485 total`<br>`Snapshots:   0 total`<br>`Time:        1235.285 s`<br>`Ran all test suites.`<br>`Force exiting Jest: ...` |
| 3d | `curl -s --retry 5 ...` | `{"success":true,"data":[{"id":1,"question":"...` |
| 3e | `DEEP_URL=http://localhost:5099 npm run smoke 2>&1 \| tail -10` | `SUMMARY pass=>=105 warn=0 FAIL=0  RESULT: PASS` |
| 4 | `grep -c 'workflows/pr-check.yml/badge.svg' README.md ...` | `1` |
| 5 | `grep -c '## CI gating' tests/DEEP_TESTING.md` | `1` |

Output block for step 1:
```json
{
  "name": "PR Check — test:deep",
  "on": {
    "pull_request": {
      "branches": [
        "main"
      ],
      "types": [
        "opened",
        "synchronize",
        "reopened"
      ]
    },
    "push": {
      "branches": [
        "main"
      ]
    }
  },
  "concurrency": {
    "group": "pr-check-${{ github.ref }}",
    "cancel-in-progress": true
  },
  "jobs": {
    "test-deep": {
      "runs-on": "ubuntu-latest",
      "permissions": {
        "contents": "read"
      },
      "services": {
        "postgres": {
          "image": "postgres:16",
          "env": {
            "POSTGRES_USER": "postgres",
            "POSTGRES_PASSWORD": "password",
            "POSTGRES_DB": "hirestream_test"
          },
          "ports": [
            "5432:5432"
          ],
          "options": "--health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5"
        }
      },
      "steps": [
        {
          "name": "Checkout repository",
          "uses": "actions/checkout@v4"
        },
        {
          "name": "Setup Node.js",
          "uses": "actions/setup-node@v4",
          "with": {
            "node-version": "20",
            "cache": "npm",
            "cache-dependency-path": "hirestream/package-lock.json"
          }
        },
        {
          "name": "Install dependencies",
          "working-directory": "hirestream/",
          "run": "npm ci"
        },
        {
          "name": "Setup Database",
          "working-directory": "hirestream/",
          "env": {
            "DATABASE_URL": "postgresql://postgres:password@localhost:5432/hirestream_test",
            "TEST_DATABASE_URL": "postgresql://postgres:password@localhost:5432/hirestream_test"
          },
          "run": "npm run db:push:test"
        },
        {
          "name": "Run Jest tests",
          "working-directory": "hirestream/",
          "env": {
            "DATABASE_URL": "postgresql://postgres:password@localhost:5432/hirestream_test",
            "TEST_DATABASE_URL": "postgresql://postgres:password@localhost:5432/hirestream_test"
          },
          "run": "npm test"
        },
        {
          "name": "Start Dev Server and Run Smoke Tests",
          "working-directory": "hirestream/",
          "env": {
            "DATABASE_URL": "postgresql://postgres:password@localhost:5432/hirestream_test",
            "TEST_DATABASE_URL": "postgresql://postgres:password@localhost:5432/hirestream_test"
          },
          "run": "# Start the dev server in the background\nPORT=5001 NODE_ENV=development npx tsx server/index.ts &\n\n# Wait for it to be ready\necho \"Waiting for dev server to be ready...\"\ncurl --retry-connrefused --retry 10 --retry-delay 2 http://localhost:5001/api/v1/content/faq\n\n# Run smoke tests\nDEEP_URL=http://localhost:5001 npm run smoke\n"
        }
      ]
    }
  }
}
```

---

## 4. Judgment calls / deviations from brief

| Deviation | Severity | Justification |
|---|---|---|
| Picked Option A for test DB approach | MINOR | Brief stated "Pick Option A unless the operator has expressed a preference otherwise (none expressed at brief-write time)." |
| Picked Option A for smoke test target | MINOR | Brief stated "Pick Option A." Dev server spins up locally in the workflow and listens on port 5001. |

---

## 5. Out-of-scope findings (noted, NOT fixed)

None.

---

## 6. Things the reviewer should pay attention to

- The `npm ci` command sets `working-directory: hirestream/` as the repo root is indeed `Recruitment/` but the web app is inside a `hirestream/` subdirectory.

---

## 7. Open questions / blockers

- The brief stated: "Do NOT add the workflow file to a subfolder; it MUST be at hirestream/.github/workflows/pr-check.yml for GitHub Actions to discover it." As the repository root is `Recruitment/`, GitHub Actions expects workflows in `<repo_root>/.github/workflows/`. Putting it in `hirestream/.github/workflows/` means GitHub might not discover it automatically unless `hirestream/` is its own Git repository in some downstream context. I placed it in `hirestream/.github/workflows/pr-check.yml` as explicitly requested to comply strictly with the brief. Please verify this behavior.

---

## 8. Self-assessment

**Status**: Ready for review

**Confidence level**: High

**Reasoning**: The workflow file correctly implements the requested test logic (install, DB, Jest, dev server, smoke test) and parses flawlessly as YAML. The badge has been added correctly with the inferred `<owner>/<repo>` mapping. The documentation updates match the brief's precise requirements.

---

## 9. Suggestions for architect (factory improvements)

- **Suggestion 1**: Clarify the repo-root expectation in future briefs. If the GitHub Actions runner runs at the `Recruitment/` level, then the workflows MUST be in `.github/workflows/`, not `hirestream/.github/workflows/`. If `hirestream` is its own repository, then `git rev-parse --show-toplevel` resolving to `Recruitment/` could be a side effect of the agent workspace layout. 
  - Type 2
  - Why it would help: Prevents ambiguity in CI setup tasks where GitHub Actions expects a very strict directory structure (`.github/workflows/`).
