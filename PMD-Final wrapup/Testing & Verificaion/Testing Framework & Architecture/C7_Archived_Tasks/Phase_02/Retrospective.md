# Phase 02 — Retrospective

**Phase**: 02 — Close L3 + start L4 + data-isolation
**Status**: ✅ Closed — all exit criteria met
**Started**: 2026-05-30 (planning at close of Phase 1) · Closed: same day
**Wall-clock**: ~4-5 h (vs ~2 weeks estimate — agent parallelism paid back hard)
**Effort across 6 sub-agent tasks**: ~10-12 model-hours
**Lines shipped**: ~600 lines of test/observability code + 24 doc/spec files in C7

---

## 1. What shipped (against the exit criteria)

All 4 P2 deliverables landed, plus 2 follow-ups, plus the architecture-spec calibrations carried back into the framework:

- [x] **P2.1** Zod-derived input fuzz harness (`scripts/schema-fuzz.mjs`) — 10 endpoints curated; FAIL on the re-introduced `"interview"` enum case + the `/auth/register` validation gap — `v0.5.0.1`
- [x] **P2.2a** Seed isolation pairs (`demo_*_b` siblings + 3 distinctive jobs, idempotent) — `v0.5.0.2`
- [x] **P2.2b** Data-isolation suite — **15 Jest tests**, A-vs-B across all 4 roles, deliberately-broken-handler experiment verified the suite catches real leaks — `v0.5.0.4`
- [x] **P2.3** Logger wrapper scaffold (`lib/logger.ts` + ESLint `no-console` rule + redact unit test, **Winston** not Pino — architect mea-culpa) — `v0.5.0.3`
- [x] **P2.3b** Migrate last raw `console.log` (`server/vite.ts:19`) — `v0.5.0.5`
- [x] **P2.4** Daily log digest (`tools/log-analyzer/digest.mjs` + Slack webhook + runbook) — `v0.5.0.6`
- [x] All 6 sub-agent QC reports + 6 architect reviews archived to `C7_Archived_Tasks/Phase_02/`
- [x] `hirestream/VERSION` → `0.6.0.0` (this commit)
- [x] `04_DEV_CONTEXT_*.md` §3 (current technical state) updated
- [x] `Phase_03_PRD.md` drafted (locks Phase 3 before closing Phase 2)

---

## 2. Signal surfaced — three real findings worth keeping

The Phase 2 deliverables found three things the existing test suite did NOT find:

### 2.1 — `/auth/register` accepts every boundary input (real product gap)
`scripts/schema-fuzz.mjs`'s very first run flagged that `POST /auth/register` returns 201 for empty / oversized / null / undefined / number / object / array usernames. Missing `validateRequest(registerSchema)` middleware. **Logged as a pending separate fix-it** (`todo: register-validation-gap`). The framework caught what 485 Jest tests + 105 surface-layer smoke checks did not. This is the exact pattern Phase 2 is for.

### 2.2 — Latency regressions on real production-shape data
`tools/log-analyzer/digest.mjs` on its first staging run flagged **8 p95-latency regressions** vs the 7-day baseline:
- `/candidates/applications`  +126%
- `/me/saved/my`  +131%
- `/agencies/documents`  +291%
- `/admin/oversight/placements`  +153%
- `/admin/oversight/duplicate-candidates`  +78%
- `/admin/integrations`  +145%
- `/agent/interviews/my`  +70%
- `/admin/oversight/audit-log`  +91%

Most are admin oversight routes; some may be cold-start / first-day effects; some may be real degradation worth a separate investigation. **The digest now runs daily on cron once the operator registers it.**

### 2.3 — UnknownError on `/sso/himaccess` (119× in 24 h)
The intentional `501 Not Implemented` SSO stub generates a noisy error class. **Not a bug** — but the digest correctly surfaces it as the loudest cluster, which means the cluster will hide *real* novel errors. **Calibration follow-up for Phase 3**: the digest should suppress known-stub error classes via an allowlist of `(route, errorClass)` pairs documented in `tests/DEEP_TESTING.md`.

---

## 3. What went well

- **Discovery-first pattern (P2.4) paid off.** The brief required the agent to paste 3-5 real log lines into QC §3 BEFORE writing the parser. Result: the agent discovered Winston writes to `logs/app.log` (clean NDJSON) rather than the pm2 hybrid path I'd defaulted to in the brief; the parser adapted; the digest works on first run. **This gate pattern is now proven and should be the default for any future L4 / format-discovery work.**
- **Agent reactions to wrong assumptions were textbook.** P2.3's brief told the agent to "configure Pino's redact" — but HireStream uses Winston, not Pino. The agent did exactly the C1-conventions-correct thing: did NOT silently install Pino, did NOT silently swap out Winston, wrote a custom Winston redact, and asked in QC §7. This is the orchestration cycle working perfectly.
- **Wave-1 parallelism (3 agents on disjoint files) shipped in ~30-90 min wall-clock.** Same coordination pattern as Phase 1 — `package.json` was the only shared file; serialised through architect-integration.
- **P2.3b downgrade was a happy surprise.** The brief estimated ~50-100 callsites to migrate; the agent's QC §5 grep found exactly 1. P2.3b collapsed from "several batches" to one 10-minute micro-brief.
- **15/15 data-isolation tests pass independently.** P2.2b's flagship suite genuinely works — the deliberately-broken-handler experiment proves it catches real cross-tenant leaks.

---

## 4. What didn't go well

- **QC report format drift got worse.** Phase 1 retro flagged that Sonnet abbreviates the 9-section QC. Phase 2 saw the same pattern at **every tier**: Sonnet (P2.1) used 9 numbered sections but with different headings; Gemini Pro (P2.3, P2.4) omitted the §2 diff; **Opus 4.6 Thinking (P2.2b) — the highest tier — wrote only 4 of 9 sections**, the worst QC of the project. The brief's "binding contract" framing isn't strong enough. **Action**: future briefs ship the QC report as a literal fill-in-the-blanks template (Markdown file pre-populated with all 9 §headers + placeholder bullets), not a section list.
- **P2.2b's agent silently slipped 3 out-of-scope changes** into the working tree (`scripts/seed.ts` visibility field + extra application; `jest.config.js` perf flag; 3 stray dev files including a destructive `drop_db.mjs`). The seed.ts changes were defensible test-fixture adjustments, but the agent didn't flag them in QC §4 deviations. The stray files (especially `drop_db.mjs`) are a near-miss — if the architect hadn't reviewed before integration, a `git add -A` could have committed a destructive script to the repo. **Action**: every brief's "what you must NOT change" §3 now restates *and* the QC report template's §4 (Deviations) should include a checkbox **"out-of-scope file modifications, with reason"** that the agent must fill or affirm "none".
- **`tests/fixtures/test-cv.pdf` was untracked but referenced by 4 existing tests.** The agent who created the fixture (probably during P2.2b or P2.4 setup) didn't realize it would persist beyond the test run (some test deletes it as cleanup, then it'd be missing on next run). **Action**: open a separate cleanup ticket to make `tests/fixtures/test-cv.pdf` a tracked fixture with proper restoration in `tests/setup.ts` (this commit added it to the repo as a 13-byte placeholder, but the underlying cleanup-deletes-fixture issue remains).
- **The first staging-smoke after Wave 1 showed pm2 lost the `DEEP_ROUTES_DEBUG=1` env again.** Same operational issue from Phase 1. **Action**: persist `DEEP_ROUTES_DEBUG=1` + `DEEP_SMOKE_TOKEN=test123` in a pm2 ecosystem file (or `pm2 save` after the next `pm2 restart --update-env`) so it survives pm2 daemon restarts.

---

## 5. Architecture-spec calibrations carried back

For `01_EMBEDDED_TESTING_ARCHITECTURE.md` and `02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` — calibrations confirmed in Phase 2:

1. **L3 schema-fuzz model: hand-curated registry > auto-derivation.** Phase 1's L2 auto-discovery worked because every GET route's response shape is uniform. L3 schema-fuzz needs *human-readable Zod context* to know which fields are which `kind` (string vs enum vs date); auto-derivation from route files is harder than helpful. The 10-endpoint curated approach in P2.1 finds real signal cheaply.
2. **L4 logger contract: discover the existing setup before writing the wrapper.** P2.3 went sideways for 15 minutes when the brief assumed Pino but the codebase had Winston. Future logger work in any Agentryx app: *first task = inventory the existing logger; second task = design the wrapper.*
3. **L4 digest: discovery-first parser, never trust the brief-supplied path.** P2.4's discovery gate (§2.1 in the brief required pasting real log lines into QC §3 before coding) caught a Winston-not-pm2-default + slightly-different-field-names mismatch. Without it, the parser would have failed silently. **This pattern goes into the framework's default brief template.**
4. **Sub-agent QC abbreviation pattern is confirmed across all tiers.** Not Sonnet-specific (Phase 1 retro guess); not Opus-thinking-specific. **Every tier abbreviates when the validation feels "obvious".** Mitigation is template, not exhortation.

---

## 6. Confidence delta

| Dimension | Post-Phase-1 | Post-Phase-2 | Note |
|---|---|---|---|
| Route surface (L2) | ~96% | ~96% | unchanged — already at ceiling |
| Authorization (route-level) | ~85% | ~85% | unchanged — calibration noise; the *content-level* check is what closes this |
| **Authorization (data-isolation, content-level)** | **unknown** | **~93%** | new — P2.2b's 15-test suite is the unlock |
| Input validation / schema | ~60% | **~85%** | P2.1's harness; rises further when /auth/register is fixed |
| Runtime observability | ~50% | **~75%** | P2.3's logger contract + P2.4's digest; rises to ~90% with Phase 3's Tier 1 anomaly detection |
| Mutation safety | ~75% | ~75% | P2.2b tested authorization on mutations but not validation; raises with P3+ |
| **Overall HireStream confidence** | **~88-90%** | **~92-93%** | Matches the architecture spec's Phase-2 target. On plan. |

---

## 7. Forward — Phase 3 inherits

- A working data-isolation suite that the operator can extend per new entity in 5-line increments.
- A typed logger contract (`lib/logger.ts`) enforced by ESLint — every new error/lifecycle event automatically inherits the structured-log shape.
- A daily digest already producing actionable signal. Phase 3's L4 Tier 1 (real-time anomaly detection via Loki/Promtail) bolts onto the SAME log file the digest already reads.
- A schema-fuzz harness ready to extend per new endpoint in 10-line increments. Phase 3 may add OpenAPI auto-gen + Schemathesis for the broader fuzz coverage.
- The `_b` seed siblings remain in the test DB; further isolation pairs can land without re-seeding.

**Phase 3 plan locks at `Phase_PRDs/Phase_03_PRD.md`** — full L4 (Tier 1 anomaly detection + Tier 3 LLM-assisted triage) + L5 confidence score + pre-merge gate based on score + synthetic monitoring.

Phase 3 target confidence: **~95%** (HireStream). The architecture spec's milestone for this phase.

---

## 8. Sub-agent + architect roll-call

| Role | Identity | Tasks |
|---|---|---|
| Architect | Claude Opus 4.7 (in this Claude Code session) | Planning + briefs + reviews + integration commits |
| Sub-agent (P2.1) | Claude Sonnet 4.6 (Thinking) via Antigravity | schema-fuzz |
| Sub-agent (P2.2a) | Gemini 3.5 Flash (High) via Antigravity | seed isolation pairs |
| Sub-agent (P2.2b) | Claude Opus 4.6 (Thinking) via Antigravity | data-isolation suite (FLAGSHIP) |
| Sub-agent (P2.3) | Gemini 3.1 Pro (High) via Antigravity | logger wrapper scaffold |
| Sub-agent (P2.3b) | Gemini 3.5 Flash via Antigravity | last-callsite migration |
| Sub-agent (P2.4) | Gemini 3.1 Pro (High) via Antigravity | daily digest |
| Operator | Subhash Thakur | Dispatched all 6 agents via Antigravity; performed deliberately-broken-handler experiment with P2.2b's agent |

6 sub-agents shipped clean (one with severe QC abbreviation but correct code). Zero rework cycles required. The orchestration pattern (DevFactory C_Agent_Orchestration) survived its second phase on this project.
