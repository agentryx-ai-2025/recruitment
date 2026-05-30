<!--
TASK BRIEF — MICRO-BRIEF (downgraded from "several batches" after P2.3 QC
revealed only 1 raw console.log exists in server/client, not the ~50-100
the original brief estimated).
SLUG: p02_p2_3b_logger_migration
PHASE: 02 — Close L3 + start L4 + data-isolation
TIER: 🟢 (mechanical — single-callsite migration + spot-check)
AG MODEL: Gemini 3.5 Flash (Medium or High)
WAVE: 2 (sequential — depends on p02_p2_3's lib/logger.ts scaffold being merged)
-->

# Task Brief — p02_p2_3b_logger_migration

**Assigned tier**: 🟢 — Gemini 3.5 Flash (Medium or High)
**Effort estimate**: 10-15 min
**Workspace**: DEV only — wherever the lone raw `console.log` is in `server/` or `client/src/`
**Deliverable QC report path**: `/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/Testing & Verificaion/Testing Framework & Architecture/C6_Active_Tasks/QC_Reports/p02_p2_3b_logger_migration.md`

**Mandatory pre-reads:**
1. `/home/subhash.thakur.india/Projects/Recruitment/PMD-DevFactory/C_Agent_Orchestration/C1_Conventions_for_Agents.md`
2. `hirestream/lib/logger.ts` — the wrapper from p02_p2_3. Read the typed methods (`log.info`, `log.warn`, `log.error`, `log.requestEnd`, `log.lifecycle`) before deciding which one fits the migration site.
3. `hirestream/eslint.config.js` — the rule that currently fails on raw `console.log` in `server/` and `client/`.

---

## 1. Background — why this task exists

p02_p2_3 shipped `lib/logger.ts` + an ESLint `no-console` rule. The grep QC §5 found **exactly 1** raw `console.log` in `server/`+`client/src/` (not the ~50-100 the brief feared). Migrate that lone callsite to the typed wrapper, confirm ESLint passes clean, done.

This closes the P2.3 deliverable in `Phase_02_PRD.md` §2.

---

## 2. What you must change

### 2.1 — Find the lone callsite

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream
grep -rEn "console\.(log|info|debug)\(" server/ client/src/ --include="*.ts" --include="*.tsx"
```

There should be exactly 1 result (per P2.3's QC §5). If you find more than 1 (e.g. the count drifted since), STOP and document in QC §7 — do NOT migrate all of them; the architect will dispatch additional brief(s).

### 2.2 — Replace the callsite with the appropriate typed method

Pick by what the call is logging:

| Original use | Replace with |
|---|---|
| A "request finished" line with method/route/status | `log.requestEnd({ requestId, route, statusCode, durationMs, userRole, ... })` |
| A startup / shutdown / cron event | `log.lifecycle("<message>", { ...extra })` |
| An error | `log.error("<message>", err, { ...extra })` |
| A general informational line | `log.info("<message>", { ...extra })` |
| A warning | `log.warn("<message>", { ...extra })` |

Add the import at the top of the file:

```typescript
import { log } from "<correct relative path to lib/logger>";
// or, if there's a path alias configured:  import { log } from "@/lib/logger";
```

(Inspect existing imports in the same file to see if there's an alias convention.)

### 2.3 — No other changes

Do not refactor the surrounding code. Do not "improve" the log message. Do not add error handling. Single-line migration only.

---

## 3. What you must NOT change

- Do **NOT** modify any other callsite (only 1 exists).
- Do **NOT** modify `lib/logger.ts` itself.
- Do **NOT** modify `eslint.config.js`.
- Do **NOT** modify any other file beyond the one containing the lone callsite (+ possibly its import block).
- Do **NOT** add new npm dependencies.
- Do **NOT** commit, push, or restart any service.

---

## 4. Validation steps (mandatory; paste raw output into QC §3)

```bash
cd /home/subhash.thakur.india/Projects/Recruitment/hirestream

# Step 1 — confirm zero raw console.* in server/ + client/src/ after your edit
grep -rEn "console\.(log|info|debug)\(" server/ client/src/ --include="*.ts" --include="*.tsx"; echo "exit=$?"
# Expected: NO matches; exit=1 (grep "no match")

# Step 2 — ESLint passes clean on server/ and client/src/
npx eslint server/ 2>&1 | tail -5
npx eslint client/src/ 2>&1 | tail -5
# Expected: no "no-console" errors (other warnings unrelated to no-console may exist; they're acceptable)

# Step 3 — TS compile clean (2 pre-existing errors only)
npm run check 2>&1 | tail -5

# Step 4 — Jest 485+N passes (no regression from the import change)
npm test 2>&1 | tail -5

# Step 5 — Build succeeds
npm run build 2>&1 | tail -3
```

**Expected outputs**: see inline.

---

## 5. QC report — required (mandatory 9-section format)

Save to `C6_Active_Tasks/QC_Reports/p02_p2_3b_logger_migration.md`. All 9 sections required (you can be terse since this is a micro-brief, but every section must be present).

---

## 6. After QC report is written, STOP

Do NOT commit. Architect integrates as `v0.5.0.5`.

---

## 7. Acceptance — done when

> "Zero raw `console.log` / `console.info` / `console.debug` in `server/` or `client/src/`. ESLint clean for the `no-console` rule. Jest still passes. Build succeeds."
