# 01 · Embedded Testing & Verification Architecture

The standard, layered, in-application testing & verification module that ships inside every Agentryx app. Designed from day one. Runs on every change. Produces a confidence signal, not just a green light.

---

## 1. The problem this solves

A modern app has a wide *surface* (routes, schemas, UI, data, integrations) and a narrow *test focus* (the unit a developer just wrote). Bugs hide in the gap: things that are individually fine but composed wrong. Three concrete failure modes we have observed:

| Failure mode | Example we hit (30 May 2026) | Why standard testing missed it |
|---|---|---|
| **Route shadow** — Express matches `/:id` before a literal sibling | `GET /api/v1/agencies/documents` returned 404 (captured as id="documents"). KYB doc list silently broken for agency Issue #3. | No standing check that *every* declared GET endpoint actually resolves. |
| **Status enum drift** — DB / API uses a value the client doesn't recognise | Seed wrote `status:"interview"`; client grouped by `"interview_scheduled"` → interview-stage apps invisible. | No standing check that API outputs match the client's enum vocabulary. |
| **Late-bound bolt-on testing** | (not a bug — a pattern) | When testing grows reactively, it grows around the *parts* developers thought about; the gaps stay invisible until production. |

The 485 functional tests passing didn't prevent any of these. The lesson is not "write more functional tests" — it's "**cover more dimensions**". This architecture is how we cover them, consistently, on every Agentryx app.

---

## 2. Principles

These show up throughout the doc. They're the constraints that prevent the framework from becoming theatre.

1. **Designed in from commit #1.** The Day-1 checklist (§7) is a prerequisite for any new Agentryx app, not an afterthought.
2. **Signals beat gates.** A confidence score with components is more informative than a green light. Gates compose *from* signals; signals don't compose from gates.
3. **Coverage breadth > test count.** Adding a 1000th test in an already-covered dimension does not raise true confidence. New tests must add a *dimension*.
4. **Automation must replace manual work, not duplicate it.** If a human is doing the same probing every release, automate it; if automation duplicates what humans already do well, drop it.
5. **Observability and assertions are equal investments.** Assertions catch what you predicted; observability catches what you didn't.
6. **Calibrate the framework openly.** When the framework raises a false positive (as the harness did on 30 May with `/agent/placements`), record the calibration in the code (with a comment explaining why) — don't silently mute it.

---

## 3. The 5-layer model

The framework is a vertical stack of five layers. Each layer answers a distinct question. Each layer produces a signal that feeds the per-PR confidence score (§6).

```
                              ┌─────────────────────────────────────┐
                  ▲           │  L5: CONFIDENCE — composite score   │
                  │           │      per commit / PR / release      │
                  │           └──────────────▲──────────────────────┘
                  │                          │
   composes a     │           ┌──────────────┴──────────────────────┐
   signal up      │           │  L4: RUNTIME — log anomalies,       │  ◄── doc 02
                  │           │      synthetic monitoring, traces   │
                  │           └──────────────▲──────────────────────┘
                  │                          │
                  │           ┌──────────────┴──────────────────────┐
                  │           │  L3: SCHEMA & CONTRACT — Zod        │
                  │           │      boundary fuzz, OpenAPI fuzz    │
                  │           └──────────────▲──────────────────────┘
                  │                          │
                  │           ┌──────────────┴──────────────────────┐
                  │           │  L2: SURFACE — route health (all    │  ◄── deep-smoke today
                  │           │      GETs probed) + authz matrix    │
                  │           └──────────────▲──────────────────────┘
                  │                          │
                  │           ┌──────────────┴──────────────────────┐
                  │           │  L1: CONTRACT — Jest unit + integ.  │
                                  │      "the function does what it claims"  │
                              └─────────────────────────────────────┘
```

Each layer in detail:

### L1 · Contract layer
**Question:** *Does this function / module do what it claims for its inputs?*
**Tool today:** Jest (unit + integration), against a dedicated test DB. ~485 tests on HireStream.
**Catches:** business-logic bugs in a module's own happy and unhappy paths.
**Misses:** anything outside the module's known input space; integration between modules; surface-level mistakes.
**Signal:** pass count, fail count, **mutation-kill rate** (added at Phase 4).
**Mature stack:** Jest + Stryker (mutation testing — measures suite *quality*, not just coverage %).

### L2 · Surface layer
**Question:** *Does every endpoint actually respond, and is the role boundary enforced?*
**Tool today:** `scripts/deep-smoke.mjs` — 105 checks on HireStream: auth for 5 roles, per-role GET route-health sweep with `{success:true}` envelope check, authorization negative matrix. Environment-agnostic (`DEEP_URL`).
**Catches:** route shadowing (the bug class from 30 May), missing role guards, privilege escalation, 5xx regressions on routes.
**Misses:** anything beyond GET; combinatorial inputs; data isolation.
**Signal:** pass count, fail count, novel-failure count vs baseline.
**Mature stack:** auto-discovered routes (walk the Express router at boot — Phase 1) + mutation/data-isolation suite (Phase 2).

### L3 · Schema & contract layer
**Question:** *Does the system handle malformed / boundary / unexpected inputs the way it claims?*
**Tool today:** none — this is the largest current gap.
**Catches:** input-validation regressions, schema drift, the second bug class above (enum drift).
**Plan:** because Agentryx apps already use Zod, the schemas double as input generators — derive boundary cases from them (empty / oversized / wrong-type / boundary numeric / SQL-injection patterns). For the API surface, auto-generate an OpenAPI spec from the routes and feed [schemathesis](https://schemathesis.readthedocs.io/) for property-based fuzzing.
**Signal:** schema-coverage %, fuzz-iteration count, fuzz-failure count.

### L4 · Runtime layer
**Question:** *Is the running system, right now, behaving the way it did yesterday?*
**Tool today:** structured logs to stdout (Pino-style). No automated analysis.
**Catches:** silent degradation, novel error classes, latency regressions, "I shipped at 4pm and at 7pm support tickets started" — the class of issue that doesn't trip any pre-deploy gate.
**Plan:** see `02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` — structured-log contract, anomaly detection, daily digest, LLM-assisted triage. This is the *30-80% already-visible-in-logs* layer.
**Signal:** anomaly score vs rolling baseline, novel-error-class count, synthetic-monitor pass/fail.

### L5 · Confidence layer
**Question:** *How confident are we that this commit / PR / release works, all-in?*
**Tool today:** none — this is the headline output the framework will produce.
**Catches:** the false comfort of "all green" — by surfacing *which* dimensions contributed to the score and which are weak.
**Plan:** §6 below defines the composite score and its inputs. Reported on every PR; required to clear a threshold before merge; published into the external Verify portal as objective evidence (see `03_ROADMAP_AND_INTEGRATION.md` for the bridge).

---

## 4. Dev-lifecycle integration

Each layer runs at the appropriate stage. The goal: signals are tight (immediate where possible), and gates fire before damage is durable.

| Trigger | What runs | Latency target | Action on red |
|---|---|---|---|
| **File save (IDE)** | Affected unit tests (jest --findRelatedTests) | < 5 s | red squiggle / problem panel |
| **Pre-commit hook** | Lint + type-check + affected unit tests | < 30 s | block commit; auto-fix where possible |
| **Pre-push hook** | Affected integration tests + L2 smoke against local dev | < 2 min | block push |
| **PR opened (CI)** | Full L1 + L2 + L3 + mutation slice + confidence score | < 10 min | PR check: red |
| **PR review** | Confidence score posted as a PR comment, broken down by layer | n/a | reviewer signal |
| **Pre-merge gate** | Confidence score ≥ project threshold (default 85) + zero L1/L2 fails | n/a | merge button disabled |
| **Pre-deploy** | Full L1 + L2 + L3 against the *target* environment | < 15 min | block deploy |
| **Post-deploy** | L4 synthetic monitor every N min; anomaly detection on live logs | continuous | page on-call on threshold breach |
| **Daily** | L4 digest emailed to channel: top errors, slow routes, anomalies vs baseline | n/a | digest read; triage queue |
| **Per release** | Full L1+L2+L3+L4 sweep + confidence score published to Verify portal | < 30 min | release blocked on red |

The same harness binary runs at multiple stages — only the *target environment* changes (local dev / CI / staging / prod). This is intentional: one source of truth for what "verified" means.

---

## 5. Standard project structure

Every new Agentryx app starts with this skeleton. Existing apps are migrated incrementally — but the structure is identical.

```
<project-root>/
├── tests/
│   ├── unit/                    # L1: pure function tests, no I/O
│   ├── integration/             # L1: against test DB; full request → response
│   ├── e2e/                     # L1+L2: Playwright UI journeys
│   ├── fixtures/                # shared test data
│   ├── DEEP_TESTING.md          # entry-point doc — what runs, what to extend
│   └── setup.ts                 # global setup / teardown
├── scripts/
│   ├── deep-smoke.mjs           # L2: route health + authz matrix (env-agnostic)
│   ├── schema-fuzz.mjs          # L3: Zod-derived boundary tests  (Phase 2)
│   └── confidence.mjs           # L5: composite score reporter    (Phase 4)
├── tools/
│   └── log-analyzer/            # L4: structured-log anomaly detection (Phase 2-3)
│       ├── ingest.mjs
│       ├── baseline.json
│       └── digest.mjs
├── .github/workflows/
│   ├── pr-check.yml             # CI: L1 + L2 + L3 slice + confidence
│   └── pre-deploy.yml           # CI: full sweep against target before pm2 restart
├── docs/
│   └── observability.md         # L4: log schema, anomaly thresholds, on-call runbook
└── VERIFICATION.md              # links to all the above + project's current score
```

Every new app commits this skeleton **before** the first feature commit. The skeleton runs immediately even with zero features — proving the framework is wired.

---

## 6. The per-PR confidence score

The headline output. A single number 0-100 attached to each commit / PR / release, with a transparent breakdown.

### 6.1 · The score

```
confidence = Σ (layer_signal × weight × penalty_factor)
```

Component signals (each normalised 0-1):

| Layer | Signal | Weight | How computed |
|---|---|---|---|
| **L1** | `unit_pass × integration_pass × mutation_kill` | 0.30 | %-pass on affected tests × Stryker score (1.0 if no mutation suite yet) |
| **L2** | `route_health × authz_integrity` | 0.20 | deep-smoke pass-rate, **zero tolerance** for authz LEAK (multiplies by 0 if any) |
| **L3** | `schema_coverage × fuzz_clean` | 0.15 | % of endpoints with Zod schemas × % of fuzz runs without uncaught error |
| **L4** | `1 − anomaly_score × baseline_drift` | 0.20 | inverse of rolling-window error/latency anomaly score |
| **observed** | `e2e_pass × visual_clean` | 0.15 | Playwright + visual-regression (Phase 3) |

Penalty factors (multiplicative, applied to total):

- **Coverage regression** (covered file dropped below 80%): × 0.9
- **Novel error class in last 24 h prod logs**: × 0.85
- **Flaky test (passed on retry)**: × 0.95
- **Schema-less new endpoint**: × 0.9

The score is *opinionated*: low ceilings until breadth is high. A project with brilliant unit tests but no L2-L4 coverage tops out at ~30. This is intentional — it makes investment in breadth visible and rewarded.

### 6.2 · How it shows up

- **PR comment** (bot): `Confidence: 87.4 / 100  ↓ from 89.1 on main  · L1 0.96 · L2 1.00 · L3 0.71 · L4 0.84 · Visual 0.92`
- **Threshold gate**: PR blocked from merge if `< project_threshold` (default 85; new projects start at 60 and ratchet).
- **Trend chart** in `VERIFICATION.md`: score per commit, last 90 days. Catches slow drift.
- **External Verify portal**: published as the objective-evidence column alongside human stakeholder verdicts (see `03`).

### 6.3 · What the score is NOT

- **Not** a perfect predictor of bugs. It's a *prior* — high score doesn't prove correctness, low score is a strong warning.
- **Not** comparable across projects with different weights. A project may tune the weights for its risk profile (e.g. a payments app weights L2/L4 higher than weights L3).
- **Not** a substitute for human review. It informs the reviewer; it does not replace them.

---

## 7. The Day-1 checklist

Before the first user-visible feature commits to a new Agentryx app, all of the following must be in place. This is the single most important practical artefact of this architecture.

- [ ] `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/fixtures/` directories exist with at least one running example test.
- [ ] `npm test` runs and passes (even if only smoke tests).
- [ ] `scripts/deep-smoke.mjs` exists, configured for `DEEP_URL` env, with the project's role inventory.
- [ ] `npm run smoke` runs against local dev and passes.
- [ ] `npm run test:deep` defined and runs `npm test && npm run smoke`.
- [ ] `tests/DEEP_TESTING.md` exists, documenting the three layers.
- [ ] Structured logging configured (Pino or equivalent) with the mandatory fields from `02`.
- [ ] CI workflow on PR runs `npm run test:deep` and blocks on red.
- [ ] CI workflow on deploy runs `npm run test:deep` against the target *before* restart.
- [ ] `VERIFICATION.md` exists at repo root, linking to the above and stating the project's confidence threshold.

A new app that does not pass this checklist is not ready for feature work. It is faster to add 30 minutes of skeleton up-front than to retrofit a year of test debt later.

---

## 8. Tooling stack (current opinionated picks)

These are the specific tools chosen per layer. Substitutable when the project's stack demands, but the defaults reduce per-project decision overhead.

| Layer | Default tool | Why | Alternatives |
|---|---|---|---|
| L1 unit | **Jest** | already standard across Agentryx; ecosystem fit | Vitest (faster, but ecosystem still maturing) |
| L1 integration | **Jest + supertest + test Postgres** | already in use; deterministic | — |
| L1 mutation | **Stryker** | most mature mutation tester for JS/TS | — |
| L1 e2e | **Playwright** | already in use; multi-browser; trace viewer | Cypress (single-browser) |
| L2 route+authz | **`scripts/deep-smoke.mjs`** | bespoke; env-agnostic; today's anchor | — |
| L3 schema fuzz | **Zod schemas + fast-check** | leverages existing Zod; property-based | — |
| L3 API fuzz | **Schemathesis** (driven by auto-generated OpenAPI) | best-in-class API property tester | Dredd, RestSharp |
| L4 logging | **Pino** | already standard; JSON-native; fast | Winston |
| L4 aggregation | start: jq + ripgrep · graduate: **Loki** or **ELK** | progressive complexity | Datadog (paid) |
| L4 anomaly detection | bespoke initially (rolling Z-score); graduate to **Prometheus alertmanager** | start simple | — |
| L4 LLM triage | **Anthropic Claude API** with prompt caching for log clustering / root-cause hypothesis | matches Agentryx stack; high signal-to-noise | OpenAI |
| L5 confidence | bespoke `scripts/confidence.mjs` | thin composer; no SaaS lock-in | — |
| Visual regression | **Playwright snapshots** initially; **Percy** if cross-browser parity matters | leverages existing Playwright | Chromatic |
| Security/auth fuzz | **OWASP ZAP** baseline scan in CI | free, well-maintained | Burp Suite (paid) |

---

## 9. Anti-patterns (do not do these)

Concrete things we have seen burn other projects. The framework is explicitly designed to make these hard.

- **"Add a test when you fix a bug."** Yes — and also: ask which *dimension* the bug lived in, and check the framework actually covers that dimension. The 30 May route-shadow bug came back as a *layer* (L2 surface), not just a regression test on `/agencies/documents`.
- **"100% coverage."** Coverage % measures lines exercised, not assertions made. A test that calls a function and asserts nothing achieves 100% coverage of that function and verifies nothing. Mutation testing (L1 Stryker) is the actual quality measure.
- **"All green, ship it."** Without a confidence score that exposes *which dimensions* are green and which are unmeasured, "all green" is misleading. The score in §6 makes the un-measured dimensions visible.
- **Silent calibration / muted tests.** When the framework raises a false positive, the fix is a *commented calibration in code* — not a config that mutes the check silently. Future engineers must be able to read why the calibration exists.
- **Skipping the Day-1 checklist "just this once".** It's never just this once.
- **Treating the embedded framework as competing with the external Verify portal.** It doesn't. It produces signals the portal consumes. See `03`.

---

## 10. Glossary cross-link

Repeated terms — *layer / signal / gate / confidence score / Day-1 checklist / bridge* — are defined in `00_README.md` §Glossary.
