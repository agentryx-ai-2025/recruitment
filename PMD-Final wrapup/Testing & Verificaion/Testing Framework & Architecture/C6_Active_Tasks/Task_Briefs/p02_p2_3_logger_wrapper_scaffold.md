<!--
TASK BRIEF
SLUG: p02_p2_3_logger_wrapper_scaffold
PHASE: 02 — Close L3 + start L4 + data-isolation
TIER: 🟡 (substantial — design judgment + redact rules)
AG MODEL: Claude Sonnet 4.6 (Thinking)
WAVE: 1 (parallel with p02_p2_1, p02_p2_2a)

NOTE: This brief is SCAFFOLD ONLY. Migration of existing ~50-100 callsites is
      explicitly out of scope here — that lands in p02_p2_3b later in Wave 2,
      in small batches. Do NOT migrate callsites in this task.
-->

# Task Brief — p02_p2_3_logger_wrapper_scaffold

**Assigned tier**: 🟡 — Claude Sonnet 4.6 (Thinking)
**Effort estimate**: 2 h
**Workspace**: DEV only — `hirestream/lib/logger.ts` (NEW), `hirestream/eslint.config.*` (existing or new ESLint config), `hirestream/tests/unit/logger.redact.test.ts` (NEW small test)
**Files NOT in scope** (this brief): any existing `console.log` / `logger.X` callsites in `server/` or `client/` — DO NOT TOUCH. Migration is a separate Wave-2 brief (`p02_p2_3b`).
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p02_p2_3_logger_wrapper_scaffold.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C5_Failure_Modes.md` — **especially the Sonnet over-builds + QC-under-report patterns from Phase 1 retro**. The temptation here is to "while I'm in there, migrate a few callsites". RESIST IT — that's the next brief's scope. Stay bounded to the scaffold.
3. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` — **especially §3 (the structured-log contract)** and §3.3 (forbidden in logs). The wrapper's job is to make §3.1 + §3.2 cheaper than ad-hoc; the redact config makes §3.3 enforced.
4. `PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/Phase_PRDs/Phase_02_PRD.md` §2 row P2.3 — the acceptance criterion.
5. The repo's current Pino setup — search `hirestream/server/` for `import pino` and `from "pino"` to find the existing baseline. Match its style; don't fork it.
6. The existing ESLint config (if present) — search for `eslint.config.*`, `.eslintrc*`. Add the new rule alongside the existing config, don't replace it.

---

## 1. Background — why this task exists

`02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` §3 defines a **mandatory-field structured-log contract** (every log line must carry `t/level/app/env/buildRef/requestId/route/statusCode/durationMs/userRole/userIdHash/msg`, plus conditional `errorClass/errorStack/targetId/dbQueryMs/cacheHit`). The premise of Layer 4 (anomaly detection, daily digest, LLM triage in Phase 3) is that *every line conforms to that schema*. Today, HireStream emits Pino JSON with most fields but is missing several mandatory ones and inconsistently includes others. Worse, raw email/password/PII fields can leak into logs from ad-hoc `console.log` calls.

**Goal of this task**: scaffold a thin typed wrapper `lib/logger.ts` that:
1. Makes the mandatory-field contract **easier to satisfy than to omit** (the typed methods take the schema's shape, with defaults that fill in app/env/buildRef from a single import).
2. Configures Pino's `redact` to **strip forbidden fields** (raw email, password, token, passport, etc.) as a defence-in-depth — even if a callsite forgets, the redactor catches it.
3. Adds a CI lint rule that **rejects raw `console.log` outside `tests/` and `scripts/`**, so the wrapper is the only path.

**Migration of the ~50-100 existing callsites is NOT in this brief** — `p02_p2_3b` will do that in small batches of 10-15 callsites each, with the deep-smoke gate green between each batch.

This is Phase 2 deliverable P2.3 (see `Phase_02_PRD.md` §2).

---

## 2. What you must change

### 2.1 — Create `hirestream/lib/logger.ts`

A TypeScript module that exposes the typed wrapper. Shape (illustrative — adapt to actual codebase conventions you find):

```typescript
// hirestream/lib/logger.ts
//
// Typed wrapper around Pino enforcing the structured-log contract from
// 02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md §3. Every log call carries the
// mandatory schema; PII is redact-protected at the Pino layer (defence in
// depth even if a callsite mis-shapes a field).
//
// Use ONLY this module — raw `console.log` is rejected by the ESLint rule
// at hirestream/eslint.config.* (rule no-restricted-syntax / no-console).

import pino from "pino";
import { createHash } from "node:crypto";

// ── Build-time + env-time anchors ─────────────────────────────────────
const APP = "hirestream";
const ENV = (process.env.NODE_ENV === "production" ? "prod"
            : process.env.NODE_ENV === "test"       ? "ci"
            : process.env.NODE_ENV === "staging"    ? "stg"
            : "local") as "local" | "ci" | "stg" | "prod";
const BUILD_REF = process.env.BUILD_REF
  || (() => { try { return require("../VERSION") || "v0.0.0"; } catch { return "v0.0.0"; } })();
//   ^ adapt this to actually read hirestream/VERSION at module load.

// ── Pino redact paths (forbidden-in-logs from doc §3.3) ──────────────
const REDACT_PATHS = [
  // Auth / secrets
  "password", "*.password", "**.password",
  "token", "*.token", "**.token", "*.accessToken", "*.refreshToken",
  "secret", "*.secret",
  // PII (hash these instead, never raw)
  "email", "*.email", "**.email",
  "passportNumber", "*.passportNumber", "**.passportNumber",
  "aadhaar", "*.aadhaar", "**.aadhaar",
  "phone", "*.phone", "**.phone",
  // Request internals that shouldn't leak
  "req.headers.cookie", "req.headers.authorization",
  "res.headers.\"set-cookie\"",
];

// ── Base Pino instance ────────────────────────────────────────────────
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: { app: APP, env: ENV, buildRef: BUILD_REF },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: { paths: REDACT_PATHS, censor: "<REDACTED>" },
  // formatters etc. — adopt what the existing Pino setup already configures.
});

// ── Helpers ───────────────────────────────────────────────────────────
export function hashUserId(userId: string | null | undefined): string {
  if (!userId) return "sha-anon";
  return "sha-" + createHash("sha256").update(userId).digest("hex").slice(0, 4);
}
export function hashEmail(email: string | null | undefined): string {
  if (!email) return "email:none";
  return "email:sha-" + createHash("sha256").update(email.toLowerCase().trim()).digest("hex").slice(0, 8);
}

// ── Typed log shapes ──────────────────────────────────────────────────
// Mandatory + conditional fields per doc §3.
export type RequestEndFields = {
  requestId: string;
  route: string;
  statusCode: number;
  durationMs: number;
  userRole: "candidate" | "agent" | "employer" | "admin" | "superadmin" | "anon";
  userIdHash?: string;        // helper hashUserId() if you have the raw id
  msg?: string;
  // Conditional:
  errorClass?: string;
  errorStack?: string;
  targetId?: string;
  dbQueryMs?: number;
  cacheHit?: boolean;
};

// ── Typed methods (the public API) ────────────────────────────────────
export const log = {
  /** A finished HTTP request. The canonical Pino "request log" line. */
  requestEnd(f: RequestEndFields): void {
    const level = f.statusCode >= 500 ? "error"
                : f.statusCode >= 400 ? "warn"
                : "info";
    pinoLogger[level](f, f.msg);
  },

  /** A subsystem startup / shutdown / cron event. */
  lifecycle(msg: string, extra: Record<string, unknown> = {}): void {
    pinoLogger.info(extra, msg);
  },

  /** An error not tied to an HTTP request (e.g. cron failure, queue worker). */
  error(msg: string, err: unknown, extra: Record<string, unknown> = {}): void {
    const e = err instanceof Error ? { errorClass: err.name, errorStack: err.stack } : { errorClass: String(err) };
    pinoLogger.error({ ...e, ...extra }, msg);
  },

  /** Generic warn — use sparingly. */
  warn(msg: string, extra: Record<string, unknown> = {}): void {
    pinoLogger.warn(extra, msg);
  },

  /** Generic info — for things that are neither request-end nor lifecycle. */
  info(msg: string, extra: Record<string, unknown> = {}): void {
    pinoLogger.info(extra, msg);
  },
};

// Default export so callsites can `import log from "@/lib/logger"`.
export default log;
```

**Notes for the agent**:
- Don't blindly paste the shape above — adapt to whatever Pino instance HireStream already uses. Read it first.
- If HireStream uses `req.log` (Pino's express middleware), the wrapper should still co-exist; don't replace the middleware in this brief.
- `hashUserId` truncated to 4 hex chars is deliberately short for log readability — that's fine; PII protection is provided by the hash, not by length.

### 2.2 — Add a CI lint rule rejecting raw `console.log` outside test/script paths

Find the existing ESLint config (`eslint.config.*`, `.eslintrc.*`, or similar). Add a rule:

```javascript
// In the existing ESLint config — append to rules (or files-overrides):
{
  files: ["server/**/*.ts", "client/**/*.ts", "client/**/*.tsx"],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
  },
},
{
  files: ["tests/**/*.ts", "scripts/**/*", "lib/logger.ts"],
  rules: {
    "no-console": "off",
  },
},
```

Adapt to the existing config style (flat vs legacy). **If no ESLint config exists**, create a minimal flat config (`eslint.config.js`) with just this rule — don't add unrelated rules in this brief.

### 2.3 — Add a unit test proving redact works

Create `hirestream/tests/unit/logger.redact.test.ts`:

```typescript
import { describe, it, expect, vi } from "@jest/globals";
// ... import the logger module
// Assert that emitting a log with { password: "secret", email: "a@b.com" }
// results in the JSON output containing "<REDACTED>" for password and email
// (not the raw values). Use a pino transport that captures into a string
// stream, OR redirect pino to a temp file and read it.
//
// The test must verify BOTH paths:
//   - password / token / passportNumber → "<REDACTED>"
//   - emails passed to log.requestEnd via the typed wrapper (where emails
//     shouldn't appear anyway) — but if someone slipped one into `extra`,
//     redact catches it.
```

A 30-50 line test. Make it deterministic and fast (< 100ms).

### 2.4 — No migrations, no callsite changes, no docs

This brief is SCAFFOLD ONLY. Do NOT:
- Migrate any existing `console.log` to the new wrapper.
- Add `npm run logger:migrate` or similar.
- Update `tests/DEEP_TESTING.md` or any architecture doc.
- Touch `server/` or `client/` callsites in any way.

---

## 3. What you must NOT change

- Do **NOT** modify any callsite in `server/` or `client/`. Migration is the next brief's job (`p02_p2_3b`).
- Do **NOT** modify the existing Pino setup beyond importing it into your wrapper. If the existing setup conflicts with your wrapper, STOP and document in QC §7.
- Do **NOT** modify `package.json` scripts (the wrapper doesn't need a script entry).
- Do **NOT** add new npm dependencies — Pino + crypto + jest are already present.
- Do **NOT** modify `tsconfig.json`, `jest.config.*`, or any infrastructure file.
- Do **NOT** modify `scripts/deep-smoke.mjs` or `scripts/schema-fuzz.mjs` (sibling brief P2.1).
- Do **NOT** modify `scripts/seed.ts` (sibling brief P2.2a).
- Do **NOT** commit. Do **NOT** push.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — TS compile clean (2 pre-existing errors only; no new errors from your edits)
npm run check 2>&1 | tail -10

# Step 2 — your unit test passes
npm test -- tests/unit/logger.redact.test.ts 2>&1 | tail -10
# Expected: 1 test passes; redact assertions hold.

# Step 3 — full Jest suite still 485/485 (or current baseline) — no regression
npm test 2>&1 | tail -5

# Step 4 — ESLint rule fires on a deliberate `console.log` violation
#   Create a temp file that violates the rule, lint it, expect the rule to fire:
echo "console.log('bad');" > /tmp/lint-test.ts
npx eslint /tmp/lint-test.ts --no-config-lookup --config ./eslint.config.js 2>&1 | tail -10 || true
rm /tmp/lint-test.ts
#   Easier alternative: lint the whole repo and confirm zero NEW errors introduced
#   by your scaffold (you didn't migrate callsites, so existing console.logs will
#   still fire — DO NOT FIX, just note the count for the reviewer).
npx eslint server/ 2>&1 | tail -5

# Step 5 — Build succeeds
npm run build 2>&1 | tail -5

# Step 6 — Confirm logger.ts is importable from the build (sanity)
node -e "import('./dist/lib/logger.js').then(m => console.log('keys:', Object.keys(m.default || m))).catch(e => console.log('err:', e.message))" 2>&1 | head
#   This may fail depending on the build's bundling — if so, document in QC §7.
#   Not a blocker; bundling will be exercised when callsites migrate.
```

**Expected outputs**: see inline. If any step diverges, STOP and document in QC §7.

---

## 5. QC report — required (mandatory 9-section checklist)

Save to: `C6_Active_Tasks/QC_Reports/p02_p2_3_logger_wrapper_scaffold.md`. All 9 sections required.

Particularly important sections for this brief:
- §4: which existing Pino instance did you wrap? Did the wrapper REPLACE it, or sit alongside? (Should be alongside — wrapper imports the existing instance.)
- §5: counts of existing `console.log` in `server/` and `client/` so P2.3b's migration scope is known up front. (Run `grep -rE "console\.(log|info|debug)\(" server/ client/src/ --include="*.ts" --include="*.tsx" | wc -l` and report.)
- §6: the redact path list — reviewer will sanity-check that nothing critical is missing.
- §7: any tension between the existing Pino setup and the new wrapper.

---

## 6. After QC report is written, STOP

Do NOT commit, push, or migrate any callsites. The architect integrates the scaffold. Migration begins in `p02_p2_3b_logger_migration_batch_1` (Wave 2, dispatched after this brief's architect review).

---

## 7. Acceptance — done when

> "`hirestream/lib/logger.ts` exists, exports the typed `log` API (requestEnd / lifecycle / error / warn / info), wraps the existing Pino instance, configures redact paths covering passwords / tokens / emails / passport / phone / cookies. A unit test confirms redact strips a known PII field. ESLint rule rejects `console.log` outside `tests/scripts/lib/logger.ts`. Jest 485/485 still passes. Zero existing callsites modified."
