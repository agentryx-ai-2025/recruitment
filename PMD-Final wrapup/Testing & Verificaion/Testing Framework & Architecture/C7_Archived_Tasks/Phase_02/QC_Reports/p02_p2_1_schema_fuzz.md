# QC Report — p02_p2_1_schema_fuzz

## 1. File Path & Module
`hirestream/scripts/schema-fuzz.mjs`
`hirestream/package.json`

## 2. Review Phase
Phase 02 — Close L3 + start L4 + data-isolation

## 3. Tier Assignment
🟡 — Gemini 3.5 Flash / Claude Sonnet 4.6 (Thinking)

## 4. Scope Assessment
The task implements a standalone environment-agnostic Node.js script (`schema-fuzz.mjs`) to aggressively probe backend endpoints using boundary payloads derived from Zod schemas. 
All constraints in the brief were adhered to:
- No product code in `server/`, `client/`, or `shared/` was modified.
- No new NPM packages were introduced (only native Node `fetch`).
- 10 total endpoints covering the core 5 standard roles were included.

## 5. Architectural Alignment & Skipped Items
- The script follows the conventions set out in L3 (Contract / Edge Fuzzing) of `01_EMBEDDED_TESTING_ARCHITECTURE.md`, running independently of the underlying persistence layer.
- **Skipped endpoints**: 
  - `POST /employer/submit-for-review` (Employer KYB): Skipped because this endpoint lacks a request body payload validating against a shared Zod schema and simply toggles a state flag. It is inherently non-fuzzable via schema boundary testing.
  - `POST /agencies/documents`: Skipped because it uses `multipart/form-data` uploads handled by `multer`. Generating raw multipart boundary values exceeds the simple JSON payload structure intended for this schema-fuzzing harness.
  - These omissions are intentional to prevent side-effect pollution and to keep the harness focused on strict Zod JSON parsing.

## 6. Linter / Type Check Results
No TypeScript compiler or linter errors introduced. The script is an ESM (`.mjs`) file. `node --check scripts/schema-fuzz.mjs` returned clean syntax.

## 7. Execution Logs
Local Dev Server Execution (Unseeded DB):
```
===========
SUMMARY  pass=20  warn=0  FAIL=158

FAILURES:
  - candidate registration / username / empty "" -> 201 (server accepted malformed input)
  - candidate registration / username / single-char -> 201 (server accepted malformed input)
  - candidate registration / username / oversized ("x".repeat(51)) -> 201 (server accepted malformed input)
  - candidate registration / username / null -> 201 (server accepted malformed input)
  - candidate registration / username / undefined -> 201 (server accepted malformed input)
  - candidate registration / username / number 42 -> 201 (server accepted malformed input)
  - candidate registration / username / object {} -> 201 (server accepted malformed input)
  - candidate registration / username / array [] -> 201 (server accepted malformed input)
  - candidate profile PATCH / experience / min - 1 (-1) -> 401 (unexpected response)
...
```
*(Note: 401 responses on dev server are due to missing seeded test accounts. The script successfully catches actual missing validation logic such as `POST /auth/register` silently accepting malformed input with a `201`).*

## 8. Rollback Instructions
If this causes CI issues:
1. `git rm hirestream/scripts/schema-fuzz.mjs`
2. Remove the `"schema-fuzz"` entry from the `"scripts"` block in `hirestream/package.json`.

## 9. Architectural Sign-off / Next Steps
- The test harness successfully proves that `POST /auth/register` and other critical endpoints currently accept malformed inputs due to missing `validateRequest(schema)` middleware in their respective route files. 
- The schema drift bug for interview scheduling status updates (`POST /agent/applications/:id/schedule-interview`) has also been wired into the harness.
- **Architectural Recommendation**: The engineering team must now retroactively apply `validateRequest` middleware using the Zod schemas in `shared/schema.ts` to all routes flagged as failures by this script.
