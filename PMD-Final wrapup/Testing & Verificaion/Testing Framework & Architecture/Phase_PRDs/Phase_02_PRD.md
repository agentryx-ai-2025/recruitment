<!--
DOC: Phase_PRDs/Phase_02_PRD.md
PURPOSE: Per-phase product requirements for Phase 2 of the embedded
         testing & verification framework dev — close the L3 gap, start
         L4 (log mining), AND deliver the data-isolation suite that
         Phase 1's smoke run revealed is the critical-path coverage.
SOURCE:  Architect-written at the close of Phase 1.
UPDATE:  Locked at phase start; changes during execution require an entry
         in this doc's §Status changelog.
OWNER:   Chief Solution Architect
AUDIENCE: Sub-agents working in Phase 2 (mandatory reading);
          architect during reviews.
-->

# Phase 2 — Close L3 + start L4 + data-isolation · Phase PRD

**Phase**: 02
**Status**: Locked — ready to dispatch
**Maps to**: `03_ROADMAP_AND_INTEGRATION.md` §3 Phase 2; `01_EMBEDDED_TESTING_ARCHITECTURE.md` §3 L3 + L4; `02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md`
**Duration estimate**: ~2 weeks (~7-9 dispatchable agent-hours + architect review/integrate)
**Owner**: Architect (Claude Opus 4.7 in planning; operator-of-record during execution)

---

## 1. Phase goal

Close the two gaps that Phase 1 exposed and could not close itself:

1. **L3 Schema/Contract layer** — the dimension that the v0.4.43.4 status-enum drift bug lived in. Catch input-validation regressions, schema drift, and enum mismatches automatically using Zod-derived boundary tests.
2. **Data-isolation testing** — the dominant authz pattern in HireStream. Phase 1's L2 authz-negative matrix flagged ~70 "LEAK" lines that are actually correct handler-scoped behaviour. The proper test is *content-level*: assert "employer A cannot see employer B's placements", not "employer cannot reach /candidates/*".
3. **L4 runtime observability — Tier 1 + Tier 2** — replace manual log-reading with structured logs + a daily opinionated digest. Recovers the 30-80% of issues already visible in logs that humans currently surface 6+ hours late.

Target confidence after Phase 2 close: **~92-93%** (HireStream). The architecture spec's milestone for this phase.

---

## 2. Features in scope

| # | Deliverable | Spec ref | Acceptance test |
|---|---|---|---|
| **P2.1** | Zod-derived input fuzz harness (`scripts/schema-fuzz.mjs`) | `01` §3 L3 · `03` §3 P2.1 | Walks Zod schemas in `shared/`; generates boundary/invalid/oversized/wrong-type cases; POSTs each to the matching endpoint; asserts server rejects cleanly with structured 4xx (not 5xx, not 200). Re-introducing the `"interview"` enum typo (or any equivalent) is caught in <60s. |
| **P2.2** | Mutation smoke + data-isolation suite (Jest integration) | `01` §3 L3 · `03` §3 P2.2 · Phase 1 retro §2 | New tests under `tests/integration/`. Covers (a) POST/PATCH/DELETE happy paths for every primary entity; (b) data-isolation pairs: employer A creates a placement → employer B logged in cannot read or mutate it. Same pattern for agency↔agency and candidate↔candidate. All paths must pass; a deliberately broken handler that returns A's data to B fails the suite. |
| **P2.3** | Structured-log contract enforced (`lib/logger.ts` + lint rule) | `02` §3 | `lib/logger.ts` exposes typed methods (`log.requestEnd({route, statusCode, ...})`) that *make it easier to include all mandatory fields than to omit them*. CI lint rule rejects raw `console.log` outside `tests/` and `scripts/`. Pino `redact` config strips forbidden fields (raw email, passport, etc.). Existing ~50-100 callsites migrated in small PRs. |
| **P2.4** | L4 Tier 2 daily digest (`tools/log-analyzer/digest.mjs`) | `02` §4 Tier 2 | Runs on a cron (daily 07:00 UTC). Tails the day's structured logs from `pm2-logs/`. Clusters errors by `errorClass × route`. Posts an opinionated digest (per `02` §4 Tier 2 template) to a Slack channel via webhook. A manually-introduced 4xx pattern is caught in <24 h. |

---

## 3. Features explicitly NOT in scope

Defer to later phases:

- **L4 Tier 1** (real-time anomaly detection, Loki + Promtail + alertmanager) → P3.1
- **L4 Tier 3** (LLM-assisted triage via Claude API, prompt-cached) → P3.2
- **L5 confidence-score reporter** + PR comments + trend chart → P3.3
- **Pre-merge gate based on confidence score** → P3.4
- **Synthetic monitoring on cron against production** → P3.5
- **OpenAPI auto-generation + Schemathesis fuzz** → P4.1-P4.2
- **Stryker mutation testing** → P4.3
- **Visual regression** → P4.4
- **Verify-portal bridge (signals → matrix)** → P5

This list is the safety rail against scope creep. If a sub-agent's QC report includes any of these as "while you're in there", it's an out-of-scope finding (§7), not an addition.

---

## 4. Dependencies

**Must be complete before phase start:**
- Phase 1 closed — `npm run test:deep` returning clean signal (calibration noise documented). ✅
- `__routes` endpoint live on staging + Verify with `DEEP_ROUTES_DEBUG=1` + `DEEP_SMOKE_TOKEN`. ✅
- `scripts/deploy-gate.sh` in standard use (operator habit shifted from bare `pm2 restart`). ✅
- `Phase_02_PRD.md` (this doc) reviewed by architect. — about to lock.

**Provides for Phase 3:**
- Structured-log contract (enforced) — required for P3.1 anomaly detection + P3.2 LLM triage.
- A working mutation/data-isolation harness — feeds P3.3's confidence-score `L3` signal.
- A daily digest pattern — extended in P3.2 with LLM-augmented root-cause hypotheses.

---

## 5. Risk areas specific to this phase

| Risk | Affected task | Mitigation |
|---|---|---|
| Zod schemas in `shared/` not exhaustive (some endpoints use ad-hoc validation) | P2.1 | First sub-task: inventory the gap. Skip schema-less endpoints with a warning, not a fail. Track gap closure as a separate cleanup. |
| Mutation tests pollute the test DB / leak state between cases | P2.2 | All mutation tests run inside transactions that roll back at teardown. The Jest `setup.ts` enforces this via a custom helper. |
| Data-isolation tests require **2 of each role** (employer A + employer B, etc.) | P2.2 | Extend `scripts/seed.ts` to add `_b`-suffixed siblings for each non-candidate role. Idempotent seed by `username` per existing pattern. |
| `lib/logger.ts` migration breaks production logging silently | **P2.3 — moderate** | Smallest possible PRs (10-15 callsites at a time); `test:deep` + spot-check `pm2 logs` after each. Pino `redact` covered by a unit test. Don't migrate all in one go. |
| Daily digest webhook spam | P2.4 | First week routes to a dedicated `#deep-smoke-digest` channel, not the team-wide channel. Promotion after tuning. |
| Phase 2 work breaks Phase 1's harness (regression on L2) | All | Every Phase-2 PR runs the existing `test:deep` gate. If L2 regresses, Phase 2 PR blocked. |

---

## 6. Exit criteria

Phase 2 is complete when ALL of the following are true:

- [ ] **P2.1** `npm run schema-fuzz` against staging passes; deliberately re-introducing the `"interview"`-vs-`"interview_scheduled"` enum bug is caught in <60s with a clear error pointing at the seed source.
- [ ] **P2.2** `tests/integration/data-isolation.test.ts` (and siblings) green; 100% of data-isolation pairs return 403/404 when the wrong tenant requests another tenant's row; a deliberately broken handler returning A's data to B fails the suite.
- [ ] **P2.3** Zero raw `console.log` outside `tests/scripts/` (CI lint rule active); all callsites in `server/` use the typed `lib/logger.ts`; Pino `redact` confirmed blocks an injected PII test payload.
- [ ] **P2.4** A 24-hour staging window's digest delivered to the Slack channel; manual visual review confirms the opinionated format from `02` §4 Tier 2 matches.
- [ ] All sub-agent task artefacts (Task_Brief, QC_Report, Architect_Review) archived to `C7_Archived_Tasks/Phase_02/`.
- [ ] `Phase_02/Retrospective.md` written.
- [ ] `hirestream/VERSION` bumped to `v0.5.0.0` (minor — Phase 2 close is a meaningful milestone).
- [ ] `04_DEV_CONTEXT_*.md` §3 (Current technical state) updated; Phase 1's "calibration noise" footnote replaced with "addressed by P2.2 data-isolation suite".
- [ ] `Phase_03_PRD.md` drafted (locks Phase 3 before closing Phase 2).

---

## 7. Sub-agent task breakdown — Antigravity dispatch plan

**5 sub-agent tasks** in **2 waves**. Pattern mirrors Phase 1: parallel where files are disjoint, sequential where one task's output feeds another.

### 7.1 — Model picks

| Tier | Model | Used for | Why |
|---|---|---|---|
| 🔴 (architectural / domain-rich) | **Claude Opus 4.6 Thinking** | P2.2 | Data-isolation requires domain understanding — knowing what "employer A's data" actually means across the schema. Higher tier than P1. |
| 🟡 (substantial) | **Claude Sonnet 4.6 Thinking** | P2.1, P2.3 | Zod-schema walking + boundary generation has design judgment; logger migration touches ~50-100 callsites with semantic care. |
| 🟡 (infra integration) | **Gemini 3.1 Pro High** | P2.4 | Webhook + cron + log-parsing — heavy on integration work; Pro handles cross-system coordination well. |
| 🟢 (mechanical) | **Gemini 3.5 Flash High** | P2.2's seed-extension follow-up | Idempotent seed additions for the `_b` siblings. |

### 7.2 — Wave 1 (parallel; ~3 agents)

| Task slug | Model | Files in scope | Effort |
|---|---|---|---|
| `p02_p2_1_schema_fuzz` | Claude Sonnet 4.6 Thinking | New: `hirestream/scripts/schema-fuzz.mjs`; reads existing `shared/*` Zod schemas | 2-3 h |
| `p02_p2_2a_seed_isolation_pairs` | Gemini 3.5 Flash High | `hirestream/scripts/seed.ts` (extend to `_b` siblings); idempotent | 45-60 min |
| `p02_p2_3_logger_wrapper_scaffold` | Claude Sonnet 4.6 Thinking | New: `hirestream/lib/logger.ts`; new ESLint rule config; Pino `redact` config. **Migration of callsites is deferred to a separate Wave-2 micro-set so this brief stays bounded.** | 2 h |

### 7.3 — Wave 2 (sequential after Wave 1 architect-reviewed)

| Task slug | Model | Files in scope | Effort |
|---|---|---|---|
| `p02_p2_2b_data_isolation_suite` | **Claude Opus 4.6 Thinking** (🔴) | New: `hirestream/tests/integration/data-isolation.test.ts` (+ siblings per entity); uses the `_b` seed siblings from P2.2a | 3-4 h — flagship deliverable of the phase |
| `p02_p2_3b_logger_migration_batch_1` | Claude Sonnet 4.6 Thinking | 10-15 callsites in `server/routes/` to the new `lib/logger.ts`; further batches dispatched after each lands clean | 45 min per batch; ~4-5 batches |
| `p02_p2_4_daily_digest` | Gemini 3.1 Pro High | New: `hirestream/tools/log-analyzer/digest.mjs`; Slack webhook env config; pm2-managed cron registration | 2 h |

### 7.4 — Architect-side workflow

Same pattern as Phase 1 (see Phase_01_PRD.md §7.4):
- Each agent edits HireStream-only paths.
- QC Report into `C6_Active_Tasks/QC_Reports/<slug>.md` (all 9 sections).
- Architect spot-checks diff (the v0.4.43.4 / v0.4.45.0 lessons hold — Sonnet under-reports QC structure; Flash under-reads spec; Pro over-confidence on unfamiliar code).
- Integration commits per task, vX.Y.Z.W convention.
- On phase close: artefacts move C6 → `C7_Archived_Tasks/Phase_02/`; this PRD is also archived as `Phase_02_PRD.md.locked`.

### 7.5 — Coordination guard

Files at risk of conflict across the 5 tasks:
- `scripts/seed.ts` — P2.2a only. Subsequent tasks must NOT edit it.
- `hirestream/lib/logger.ts` — P2.3 scaffold creates; P2.3b migration consumes. Strict sequencing.
- `package.json` — at most ONE new script per task (`schema-fuzz`, `log:digest`). Architect serialises during integration.

---

## 8. Open architectural decisions to resolve before relevant task

Carried forward (none of these block Wave 1 dispatch; each is flagged at the wave's start):

1. **Pino vs Winston** in `lib/logger.ts`. Default: Pino (already in use). Confirm before P2.3 scaffold.
2. **Slack webhook URL** for digest. Operator provides before P2.4 dispatch.
3. **Test-DB strategy for CI** — Phase 1 picked postgres:16-as-service for `pr-check.yml`. P2.2's data-isolation suite reuses that approach; no new decision needed.
4. **Log retention** — for the digest to find yesterday's logs, `pm2-logs/` must be kept at least 7 days. Default pm2 log-rotation: 10MB / 30 days. Acceptable; no action.
5. **Branch protection on `agentryx-ai-2025/recruitment`** — operator action; should land before any Phase-2 PR opens.

---

## 9. Status changelog

| Date | Status | Note | Author |
|---|---|---|---|
| 2026-05-30 | Locked — ready to dispatch | Initial draft. Phase 1 closed cleanly; the L2 / handler-scoped finding drove P2.2's elevated priority. 5 tasks in 2 waves, 4 model picks. | Architect (Claude Opus 4.7) |
