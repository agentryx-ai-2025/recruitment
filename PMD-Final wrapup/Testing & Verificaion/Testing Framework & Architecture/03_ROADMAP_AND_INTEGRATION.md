# 03 · Roadmap & Integration with Verify Portal

How we build the embedded framework out from where we are today, in phases that each deliver standalone value, and how its signals plug into the external Agentryx Verify portal as objective evidence alongside human stakeholder verdicts.

---

## 1. Where we are today (Phase 0 — live)

The anchor implementation is already committed to HireStream:

- **L1 contract layer** — Jest integration + unit, 485 tests passing. `npm test`.
- **L1 e2e** — Playwright journey specs (candidate / agent / admin / auth), 15 passing. `npm run test:e2e`.
- **L2 surface layer** — `scripts/deep-smoke.mjs`, env-agnostic, 105 checks: auth all roles + per-role GET route-health sweep + authorization negative matrix. `npm run smoke`.
- **L1+L2 combined gate** — `npm run test:deep`.
- **Structured logs** — Pino, partially mandatory-field compliant.
- **Per-PR confidence score** — not yet computed.
- **Routes auto-discovery** — not yet (manual `ROUTES`/`FORBIDDEN` dicts).
- **L3, L4, L5** — not yet built.
- **Documentation** — `tests/DEEP_TESTING.md` in the HireStream repo.
- **Bugs surfaced & fixed** — agency `/documents` 404 route-shadow, interview status enum typo.

This is the floor every Agentryx app starts from. The phases below build up from here.

---

## 2. Phase summary

Each phase ships *standalone value*. None of them is "infrastructure work that benefits nothing until phase N+2". This is deliberate — long invisible build-outs lose budget and momentum.

| Phase | Theme | Calendar weight | Standalone payoff |
|---|---|---|---|
| **0** | Anchor implementation (HireStream) — done | — | Two real bugs caught & fixed; repeatable harness committed |
| **1** | Eliminate manual maintenance + wire CI | ~1 week | Framework is hands-off; every PR is gated automatically |
| **2** | Close the L3 gap (schema/contract) + start L4 (logs) | ~2 weeks | Input-validation regressions surface; daily log digest replaces manual log-reading |
| **3** | Full L4 (anomaly detection + LLM triage) + L5 (confidence score) | ~2 weeks | 30-80% of production-visible issues caught before users report them; PRs land with a confidence number |
| **4** | Mature L3 (OpenAPI + Schemathesis) + mutation testing + visual regression | ~2 weeks | Coverage *quality* measurable; UI regressions caught |
| **5** | Bridge to external Verify portal; cross-app rollup | ~1 week | Embedded signals appear in the Verify matrix as objective evidence |

Total to mature: ~8 weeks of focused work, spread across calendar as the team can afford. Every phase is shippable.

---

## 3. Phase-by-phase detail

### Phase 1 · Eliminate manual maintenance + wire CI

**Goal:** the framework runs itself. No human has to remember to extend dicts or re-run harnesses.

**Deliverables:**
1. **Route auto-discovery** — `deep-smoke.mjs` walks the Express router tree at startup (`app._router.stack`) and probes every declared GET endpoint. Manual `ROUTES` dict shrinks to a per-role-allowed-list (which roles *should* reach each path); `FORBIDDEN` is auto-derived as the complement.
2. **CI on every push** — `.github/workflows/pr-check.yml` runs `npm run test:deep` against the PR's preview environment (or local dev container). PR check red blocks merge.
3. **Pre-deploy gate** — `.github/workflows/pre-deploy.yml` runs `npm run test:deep` against the *target* environment before any deploy script runs. A failed check aborts the deploy (and aborts the `pm2 restart`).
4. **Embed the same framework in Verify itself** — Verify is an Agentryx app; it must run the same harness. This proves the framework is portable and not HireStream-bespoke.
5. **Day-1 checklist enforcement** — a `verify-skeleton` script that validates the project structure (`tests/`, `scripts/deep-smoke.mjs`, etc.) matches the Day-1 checklist; runs in CI.

**Exit criteria:** every PR on HireStream and Verify shows a green/red `test:deep` check; auto-discovery catches a route a human forgot to add to the dict.

---

### Phase 2 · Close the L3 gap, start L4

**Goal:** add the missing dimension that the 30 May status-enum bug lived in; start replacing manual log-reading.

**Deliverables:**
1. **L3 — Zod-derived input fuzz** — `scripts/schema-fuzz.mjs`: walks Zod schemas in `shared/`, generates boundary cases (empty, oversized, wrong-type, out-of-range numeric, common injection patterns), POSTs them, asserts the server rejects cleanly (4xx with structured error, not 5xx or 200).
2. **L3 — mutation smoke harness** — adds POST/PATCH/DELETE happy paths to the smoke runner, against the test DB (so mutations are reversible). Pair with a data-isolation suite ("employer A cannot see employer B's placements", "agent X cannot edit agent Y's KYB docs") — the class of bug authz negative matrix alone won't catch.
3. **L4 — structured-log contract enforced** — `lib/logger.ts` wrapper in HireStream + Verify; CI lint rule rejecting raw `console.log` outside `tests/scripts/`; Pino redact config blocking PII.
4. **L4 Tier 2 — daily digest (file-based)** — `tools/log-analyzer/digest.mjs` tails the day's logs, clusters errors by class+route, prints the opinionated digest (`02` §4 Tier 2), posts to a Slack channel via webhook. Runs on a daily cron.

**Exit criteria:** the same status-enum bug, re-introduced into a test branch, is caught by the schema-fuzz; the digest catches a manually-introduced 4xx pattern within 24 hours.

---

### Phase 3 · Full L4 + L5 confidence score

**Goal:** the framework starts *predicting* trouble, and every PR ships with a number.

**Deliverables:**
1. **L4 Tier 1 — real-time anomaly detection** — Loki + Promtail on the staging VM; Grafana dashboards (errors/route, p95/route, error-class novelty); alertmanager → Slack on threshold breach (`02` §4 Tier 1).
2. **L4 Tier 3 — LLM-assisted triage** — `tools/log-analyzer/triage.mjs` (Claude API, prompt-cached, PII-redacted): cluster summary + source snippets → proposed root cause + draft issue. Appended to the daily digest as a collapsible section.
3. **L5 — confidence score reporter** — `scripts/confidence.mjs` computes the composite (`01` §6.1), posts a PR comment with the breakdown, and writes the score to `VERIFICATION.md`'s 90-day trend chart.
4. **Pre-merge gate based on score** — PR check fails if `confidence < project_threshold` (start permissive at 60, ratchet over time).
5. **Synthetic monitoring** — `npm run smoke` on cron against production every 10 min; alert on any failure (effectively L2 in production).

**Exit criteria:** a regression introduced and shipped triggers an L4 alert within 5 minutes of deploy; the same regression's PR shows a confidence drop of ≥10 points in its retrospective trend.

---

### Phase 4 · Mature L3 + coverage *quality*

**Goal:** stop measuring coverage by lines; start measuring it by surviving mutation.

**Deliverables:**
1. **OpenAPI auto-generation** — emit an OpenAPI spec from the Express routes (`express-openapi` or hand-curated, depending on route style) on every build. Spec lives at `/api/v1/openapi.json` (auth-gated for non-public envs).
2. **Schemathesis fuzz** — fed the OpenAPI spec, runs property-based API tests as part of CI. Generates dozens of edge cases per endpoint, none hand-written.
3. **Mutation testing (Stryker)** — runs on the L1 suite, weekly on main. Score becomes the `mutation_kill` component of the L1 confidence signal. Aim for ≥70% kill rate as the bar.
4. **Visual regression** — Playwright snapshots on key screens (login, candidate dashboard, agent dashboard, employer dashboard, admin dashboard). Snapshot diff in PR comments; an opt-in "approve diff" workflow.

**Exit criteria:** a one-character bug introduced into a critical function is killed by either mutation testing or schema fuzz within the PR check.

---

### Phase 5 · Bridge to external Verify portal + cross-app rollup

**Goal:** the embedded signals appear in the Verify portal as the *objective evidence* column, alongside human stakeholder verdicts. Stakeholders see a unified picture.

**Deliverables:** see §4 below — this is the integration design.

---

## 4. The bridge to the external Verify portal

This section defines the integration contract between the embedded framework (per app) and the external Verify portal (`verify-stg.agentryx.dev`, roadmap in the parent folder).

### 4.1 · Direction of flow

```
   embedded framework (per Agentryx app)
   ──────────────────────────────────────
            │
            │   per release: confidence score + breakdown
            │   per day: digest summary + open anomalies
            │   per anomaly: alert event
            ▼
   ┌────────────────────────────────────────────────┐
   │  POST /api/v1/verify/objective-evidence        │  ← Verify portal ingestion API
   │  (defined in parent folder 04_API_…)           │
   └────────────────────────────────────────────────┘
            │
            ▼
   Verify portal → matrix UX → human stakeholders see
   each row's *objective evidence* alongside their own
   human verdicts (Agentryx → contractor → end-customer)
```

The embedded framework produces; Verify consumes. There is **no reverse data flow** in the bridge — the embedded framework does not subscribe to Verify state. This keeps the contract narrow and prevents the embedded framework from becoming a tail-wagging-the-dog dependency.

### 4.2 · What the embedded framework publishes

Per **release** of any Agentryx app, the embedded framework POSTs:

```json
{
  "app": "hirestream",
  "buildRef": "v0.4.44.0",
  "publishedAt": "2026-05-30T07:14:32Z",
  "confidence": {
    "score": 87.4,
    "threshold": 85,
    "breakdown": { "L1": 0.96, "L2": 1.00, "L3": 0.71, "L4": 0.84, "visual": 0.92 },
    "trend": { "vsMain": -1.7, "vs7d": +0.3 }
  },
  "smoke": { "passed": 105, "failed": 0, "warned": 0 },
  "knownAnomalies": [],
  "openHighSeverityErrors": 0,
  "evidenceUrl": "https://hirestream-stg.agentryx.dev/__verify/evidence/v0.4.44.0"
}
```

Per **anomaly event** (Tier 1 L4 alert), a smaller event:

```json
{
  "app": "hirestream",
  "kind": "anomaly",
  "severity": "warn",
  "errorClass": "AgencyDocsNotFound",
  "route": "/api/v1/agencies/documents",
  "firstSeen": "2026-05-30T07:14:32Z",
  "count60s": 41,
  "evidenceUrl": "https://…/__verify/anomaly/abc123"
}
```

### 4.3 · What Verify displays

In the matrix view (Verify's anchor UX), the **objective evidence column** for each row shows:

- A pill with the confidence score (colour by threshold)
- A tooltip with the breakdown
- An icon if any open high-severity anomalies exist
- A link to the per-release evidence page (snapshot of all signals at release time)

Critically: **objective evidence does not replace human verdicts.** Stakeholders still sign off (or don't). The score is informational, sitting alongside their decision. A high score with a "rejected" human verdict is *valid* — the humans saw something the framework didn't.

### 4.4 · API contract location

The endpoint shape (`POST /api/v1/verify/objective-evidence`) is the responsibility of the Verify portal's API design — see parent folder `04_API_AND_INTEGRATION.md` for the canonical spec. This doc captures only the *payload* the embedded framework publishes.

### 4.5 · Cross-app rollup

Once two or more Agentryx apps publish to Verify, Verify can compute a **portfolio confidence**: a weighted average across apps, with portfolio-level anomaly correlation (e.g. "all three apps' confidence dropped this week — common dependency change?").

This is where the "Agentryx Verify" product becomes *strategically* more than a sign-off matrix — it becomes the single pane that answers "what is the state of every Agentryx product right now?" for stakeholders, executives, and prospective customers.

---

## 5. Cross-cutting concerns

Things every phase touches.

### 5.1 · Secrets & credentials

The deep-smoke harness needs role credentials. Defaults come from seeded demo accounts; per-environment overrides via env vars (`DEEP_PW_<ROLE>`). **Never** commit production credentials. CI uses GitHub Actions secrets. Production sweeps use a dedicated low-privilege account where possible.

### 5.2 · Environment configuration

The framework is environment-agnostic via `DEEP_URL`. The same harness binary runs against local dev, CI, staging, production. This is intentional — one source of truth for "verified" across environments. The per-environment risk profile (e.g. "production cannot tolerate any L2 fail") is set via thresholds, not via different harnesses.

### 5.3 · Performance impact on production

L4 (runtime observability) is the only layer that runs continuously in production. Its overhead must be < 1% CPU and < 50 MB RAM per app. Achievable with Pino + Promtail; not achievable with verbose SaaS APMs without budget. Where this conflicts, choose Pino + Loki self-hosted over Datadog by default — the cost trade-off is significant at Agentryx scale.

### 5.4 · Failure modes of the framework itself

The framework is code. Code has bugs. Mitigations:

- The framework's own tests live in `tests/framework/` and run in CI.
- A framework regression that produces *false negatives* (silently passes broken code) is the worst case; mitigated by mutation testing of the framework code itself.
- A framework outage (CI flake) blocking merge is annoying but safe. We err on the side of false-positive flakiness, not false-negative silence.

### 5.5 · Versioning the framework

Each Agentryx app pins a version of the embedded framework template (e.g. `verification-template@2.0.0`). Upgrades are explicit, per-app, with a migration note. This prevents framework changes from causing simultaneous "why did all our apps go red?" events.

---

## 6. What this is NOT (re-stated)

- It is **not** a one-time project. It is the *standard* for every Agentryx app from now on.
- It is **not** a substitute for the external Verify portal. It produces signals; Verify aggregates human verdicts that consume those signals as evidence.
- It is **not** a guarantee of correctness. It is a *prior* — a high confidence score is a strong-but-not-perfect signal. Low score is a strong warning.
- It is **not** static. The score weights and thresholds will be tuned over time based on what the framework misses (every false negative is a calibration opportunity).

---

## 7. Open questions / to-decide

Honest list of things this doc does not yet resolve. Each is a decision that should be made before the relevant phase starts.

1. **Confidence-score formula weights.** §6.1 of `01` has reasonable defaults, but the right weights depend on lived experience. Re-tune at end of Phase 3.
2. **Production credentials for production sweeps.** Read-only synthetic account vs. SSO service principal vs. mTLS — pick before Phase 3.
3. **Log-store choice (Loki vs ELK vs hosted).** Defer until Phase 2 deliverable 4 — pick based on the scale at that point.
4. **OpenAPI spec authoring approach (auto-extract vs hand-curated).** Defer until Phase 4; Express's loose typing makes auto-extract imperfect.
5. **Verify portal API readiness.** Bridge in §4 depends on the Verify portal accepting these payloads. Coordinate with the Verify roadmap (parent folder `03_ROADMAP.md`) — likely Phase 3-4 of that roadmap.
6. **Cost of LLM triage at scale.** Phase 3 deliverable 2 — budget cap and per-cluster dedup are the controls; revisit if costs surprise.

---

## 8. Glossary cross-link

Repeated terms (*layer / signal / gate / confidence score / Day-1 checklist / bridge*) are defined in `00_README.md` §Glossary.
