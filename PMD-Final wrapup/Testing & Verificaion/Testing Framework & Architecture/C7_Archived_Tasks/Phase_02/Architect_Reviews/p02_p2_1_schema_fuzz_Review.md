# Architect Review — p02_p2_1_schema_fuzz

**Task brief**: `Task_Briefs/p02_p2_1_schema_fuzz.md`
**QC report**: `QC_Reports/p02_p2_1_schema_fuzz.md`
**Sub-agent**: per QC, "Gemini 3.5 Flash / Claude Sonnet 4.6 (Thinking)" — unclear which finished the run
**Reviewed by**: Architect (Claude Opus 4.7)
**Date**: 2026-05-30
**Verdict**: ✅ **ACCEPT — integrate as `v0.5.0.1`**, with a follow-up product ticket

---

## 1. Spot-check findings (code, not QC report)

| Check | Result |
|---|---|
| `scripts/schema-fuzz.mjs` syntax OK | ✅ |
| `package.json` has `"schema-fuzz"` script, exactly one new entry | ✅ |
| `FUZZ_TARGETS` count | **10** (brief asked ≥8) ✅ |
| Includes explicit `name: "interview scheduling (enum drift)"` target | ✅ |
| Includes enum-drift case `status / "interview"` | ✅ |
| Output format mirrors deep-smoke (`SUMMARY pass=… FAIL=…  RESULT: PASS/FAIL`) | ✅ |
| Exit code `process.exit(fail.length ? 1 : 0)` | ✅ confirmed at tail |
| THROTTLE_MS env knob (Phase 1 retro carry-over) | ✅ |
| No edits to product code (`server/`, `client/`, `shared/`) | ✅ |
| No new npm dependencies | ✅ |
| Live run against staging | ✅ `pass=98 warn=0 FAIL=80` — harness functional + finding real signal |

## 2. Real product signal surfaced — worth a separate ticket

The fuzzer caught a **real validation gap** on first contact with staging:

```
candidate registration / username / empty "" → 201 (server accepted malformed input)
candidate registration / username / oversized → 201
candidate registration / username / null → 201
...
```

`POST /auth/register` is accepting every boundary case with `201`. This is a missing `validateRequest(registerSchema)` middleware in `server/routes/auth.routes.ts`. **Not** a P2 framework issue — it's a real product bug the framework just made visible. Suggest a separate `vXXX — fix: apply validateRequest(registerSchema) to POST /auth/register` ticket.

Counter-signal proving the harness is healthy: `application status patch / status / "interview" → 400 (Zod rejected)` — i.e. the framework correctly rejects the v0.4.43.4 enum-drift class where the validator IS applied.

## 3. Calibration notes (not failures)

- ~25 of the 80 FAILs are 404s on endpoints with hardcoded dummy UUIDs (e.g. `/agent/applications/00000000-…/schedule-interview`). The Zod validator can't run — the resource lookup 404s first. This is intentional in the brief (real fixture IDs land in P2.2b); the harness flags them as FAIL for now, which is honest.
- The `interview scheduling (enum drift)` target specifically can't be reached because of the above. **Re-enable it in P2.2b** once real fixture IDs from the `_b` siblings + their fixtures are in place.

## 4. Process / QC report observations

- **QC report deviates from the 9-section template.** It uses 9 numbered sections but with different headings (File Path / Review Phase / Tier Assignment / Scope Assessment / Architectural Alignment / Linter / Execution Logs / Rollback / Architectural Sign-off). The substance is present but the format isn't standard. Log for `C5_Failure_Modes.md`: **even with the brief's explicit 9-section checklist as a "binding contract", Sonnet/Gemini at this tier still rewrites the section headings.** Future briefs should perhaps provide the QC file as a literal template the agent fills in.
- The execution log was *unseeded local dev*; staging validation was not performed by the agent. I did the staging run during this review — clean signal, as above. No blocker.

## 5. Integration plan

- Commit message: `v0.5.0.1 — test: P2.1 schema-fuzz harness (Zod boundary-case probe over 10 endpoints)`
- Files: `scripts/schema-fuzz.mjs`, `package.json`, `VERSION` → `0.5.0.1`
- Optional: open a separate ticket `register-validator-gap` (or do it inline as a `vXXX — fix: …`) for the `/auth/register` finding.

## 6. Verdict

**ACCEPT.** The harness works, the code is clean, and on first staging contact it already surfaced a real product bug — exactly what L3 is for.
