<!--
DOC: Phase_PRDs/Phase_03_PRD.md
PURPOSE: Per-phase product requirements for Phase 3 — full L4 (anomaly
         detection + LLM-assisted triage) + L5 (per-PR confidence score)
         + production gating (synthetic monitoring + pre-merge gate).
SOURCE:  Architect-written at the close of Phase 2.
OWNER:   Chief Solution Architect
AUDIENCE: Sub-agents working in Phase 3 (mandatory reading); architect
          during reviews.
-->

# Phase 3 — Full L4 + L5 confidence score · Phase PRD

**Phase**: 03
**Status**: Locked — ready to dispatch
**Maps to**: `03_ROADMAP_AND_INTEGRATION.md` §3 Phase 3; `01_EMBEDDED_TESTING_ARCHITECTURE.md` §3 L4-L5; `02_LOG_MINING_AND_RUNTIME_OBSERVABILITY.md` §4 Tier 1 + Tier 3
**Duration estimate**: ~2 weeks (~10-12 dispatchable agent-hours)
**Owner**: Architect (Claude Opus 4.7 in planning; operator-of-record during execution)

---

## 1. Phase goal

The framework starts *predicting* trouble (not just gating it), and every PR ships with a transparent confidence number.

Phase 2 closed the L3 (input fuzz) + L4 Tier 2 (daily digest) + data-isolation gaps. Phase 3 adds:
1. **L4 Tier 1** — real-time anomaly detection (Loki + Promtail + alertmanager). Catches a regression within minutes of deploy, not 24 h.
2. **L4 Tier 3** — LLM-assisted triage of clusters (Claude API, prompt-cached, PII-redacted). Turns "here's a cluster of 41 errors on /agencies/documents" into "here's a proposed root cause + the lines in code to inspect + a draft issue title".
3. **L5 — Per-PR confidence score reporter** (`scripts/confidence.mjs`) — combines L1+L2+L3+L4 signals into a single composite per commit. Posts to PR as comment; writes to `VERIFICATION.md`'s trend.
4. **Pre-merge gate** based on confidence score threshold.
5. **Synthetic monitoring** — `npm run smoke` on cron against production every 10 min; alert on failure. (L2 in production.)

Target confidence after Phase 3 close: **~95%** (HireStream). The architecture spec's Phase-3 milestone.

---

## 2. Features in scope

| # | Deliverable | Spec ref | Acceptance test |
|---|---|---|---|
| **P3.1** | L4 Tier 1 anomaly detection (Loki + Promtail on staging VM; Grafana dashboards; alertmanager → Slack) | `02` §4 Tier 1; `03` §3 P3.1 | A deliberate burst of 500s on a staging endpoint triggers a Slack alert within 5 min. Grafana dashboard shows error rate, p95 latency, 4xx rate per route × time. |
| **P3.2** | L4 Tier 3 LLM-assisted triage (`tools/log-analyzer/triage.mjs`) | `02` §4 Tier 3; `03` §3 P3.2 | A digest cluster ("41x AgencyDocsNotFound on /agencies/documents") gets a "Proposed root cause" section appended via Claude API. PII-redacted before send. Per-cluster dedup + daily budget cap. Surfaced as a collapsible section in the digest. |
| **P3.3** | L5 confidence-score reporter (`scripts/confidence.mjs`) | `01` §6; `03` §3 P3.3 | Reports a single 0-100 score per commit with the L1/L2/L3/L4/visual breakdown per `01` §6.1. Posts as PR comment via a GitHub bot, writes to `VERIFICATION.md`'s 90-day trend chart. Computed across all 5 signal layers. |
| **P3.4** | Pre-merge gate based on confidence threshold | `01` §4; `03` §3 P3.4 | PR check status fails if `confidence < project_threshold` (start at 60, ratchet). Documented escape hatch (`bypass-confidence` label by admin) for emergency. |
| **P3.5** | Synthetic monitoring — production smoke on cron | `02` §4 Tier 1; `03` §3 P3.5 | `npm run smoke` runs every 10 min against `https://hirestream.agentryx.dev` (prod) via a pm2-managed cron; result writes to a Loki-ingested log; alert on FAIL. |

---

## 3. Features explicitly NOT in scope

Defer:

- **OpenAPI auto-generation + Schemathesis fuzz** → P4.1-P4.2
- **Stryker mutation testing** → P4.3
- **Visual regression** (Playwright snapshots) → P4.4
- **Verify-portal bridge** (signals → matrix as objective evidence) → P5
- **Migration of remaining application logger callsites** to typed wrapper (currently only 1 raw `console.log` existed; Phase 3 doesn't add any either)

---

## 4. Dependencies

**Must be complete before phase start (all from Phase 2):**
- L3 schema-fuzz harness shipped (`v0.5.0.1`). ✅
- Data-isolation suite green (`v0.5.0.4` — 15 tests). ✅
- Typed logger contract + ESLint enforcement (`v0.5.0.3`/`.5`). ✅
- Daily digest reading real Winston logs (`v0.5.0.6`). ✅
- `tests/fixtures/test-cv.pdf` and the seed `_b` siblings committed. ✅

**Provides for Phase 4:**
- A live anomaly-alert channel that the operator trusts (P3.1).
- A confidence score formula tuned by real signal (P3.3 — re-tune weights at Phase-3 retro per `03` §7 open question #1).
- Production-targeted synthetic harness that ratchets in confidence over time (P3.5).

---

## 5. Risk areas specific to this phase

| Risk | Affected task | Mitigation |
|---|---|---|
| **Loki + Promtail infra needs ops setup on staging VM** | P3.1 | Document in the brief: agent provides docker-compose + promtail.yaml; operator deploys. Don't auto-start in CI. |
| Alertmanager noise (false-positive pages on day 1) | P3.1 | Route alerts to a dedicated `#deep-smoke-anomaly` Slack channel for 1 week before promoting to PagerDuty. Tune thresholds based on observed baselines. |
| **Claude API spend on LLM triage** | P3.2 | Per-cluster dedup (don't re-triage the same cluster within 7d). Daily budget cap (env-configured). Prompt-cached to reduce per-call cost (prefix = the source-snippet context). |
| PII leak via LLM triage prompts | P3.2 | The triage script transforms identifiers → hashes BEFORE sending. Never sends raw user content; only route names + error classes + source-code snippets. Validated by a unit test that asserts no raw email/passport/PII patterns in the outgoing prompt. |
| **Confidence score formula gives misleading green** | P3.3 | The score is *opinionated* and *transparent* — every PR comment shows the per-layer breakdown so reviewers can spot a 0.0 L4 weight propping up an otherwise-low score. The threshold starts permissive (60) and ratchets quarterly. |
| **Pre-merge gate blocks legitimate emergency merges** | P3.4 | Escape hatch via `bypass-confidence` PR label (admin-only). Logged loudly in the PR comment. |
| Synthetic monitoring against PROD hits live rate limits | P3.5 | Read-only service-principal account; ≤10-min interval; skip if last run was <8 min ago (state in /tmp). Document the bypass token if used. |
| **Confidence score requires CI to compute on every PR** | P3.3 | Wired into `.github/workflows/pr-check.yml` — extends the existing workflow. No new CI infrastructure. |

---

## 6. Exit criteria

Phase 3 is complete when ALL true:

- [ ] **P3.1** A deliberate burst of 500s on staging triggers a Slack alert within 5 min. Grafana dashboard live and bookmarked.
- [ ] **P3.2** Daily digest now includes a "Proposed root cause" section per cluster (where Claude API was called). Triage prompt-cache hit rate ≥ 60% after first week. Daily API spend ≤ $5 (env-configured cap).
- [ ] **P3.3** Every PR opened on `agentryx-ai-2025/recruitment` since `v0.6.x` has a confidence score posted as a PR comment with the per-layer breakdown. `VERIFICATION.md` has a 90-day trend table.
- [ ] **P3.4** A deliberately-degraded PR (e.g. break a schema-fuzz target) is blocked from merge by the confidence gate. `bypass-confidence` label confirmed to override (admin-only).
- [ ] **P3.5** `npm run smoke` runs on a 10-min cron against production; the cron is pm2-managed; alerting wired to the `#deep-smoke-prod` channel.
- [ ] All sub-agent task artefacts archived to `C7_Archived_Tasks/Phase_03/`.
- [ ] `Phase_03/Retrospective.md` filed.
- [ ] `hirestream/VERSION` bumped to `0.7.0.0`.
- [ ] `04_DEV_CONTEXT_*.md` §3 updated.
- [ ] `Phase_04_PRD.md` drafted (locks Phase 4 before closing Phase 3).

---

## 7. Sub-agent task breakdown — Antigravity dispatch plan

**6 sub-agent tasks** in **3 waves**. P3.1 is infra-heavy (needs operator action mid-task); P3.3 depends on P3.1+P3.2 producing signals; P3.4 depends on P3.3.

### 7.1 — Model picks

| Tier | Model | Used for | Why |
|---|---|---|---|
| 🔴 (architectural) | **Claude Opus 4.6 Thinking** | P3.3 | Confidence-score composer touches every layer's signal output — high cross-system reasoning load. |
| 🟡 (substantial) | **Claude Sonnet 4.6 Thinking** | P3.2 | LLM triage prompt design + PII-redaction safety; reasoning-heavy. |
| 🟡 (infra-rich) | **Gemini 3.1 Pro High** | P3.1, P3.5 | Cross-system (Docker, Loki, Promtail, alertmanager, Grafana, pm2 cron) — Pro's strength. |
| 🟢 (mechanical) | **Gemini 3.5 Flash High** | P3.4 | Wire one new check into `.github/workflows/pr-check.yml`; small condition logic. |

### 7.2 — Wave 1 (3 parallel — infra + triage scaffolding)

| Task slug | Model | Files in scope | Effort |
|---|---|---|---|
| `p03_p3_1_loki_promtail_alerts` | Gemini 3.1 Pro High | New: `infra/docker-compose.loki.yml`, `infra/promtail.yaml`, `infra/alertmanager.yaml`, `docs/anomaly-detection-runbook.md` | 3 h (mostly config + runbook; operator deploys to staging VM separately) |
| `p03_p3_2_llm_triage` | Sonnet 4.6 Thinking | New: `tools/log-analyzer/triage.mjs` + redaction unit test | 2.5 h |
| `p03_p3_5_synthetic_monitoring` | Gemini 3.1 Pro High | New: `tools/synthetic/run-prod-smoke.mjs` (wraps `npm run smoke` with state-tracking + Slack-on-fail); update runbook | 1.5 h |

### 7.3 — Wave 2 (sequential — confidence score depends on Waves 1's signals existing)

| Task slug | Model | Files in scope | Effort |
|---|---|---|---|
| `p03_p3_3_confidence_score` | **Claude Opus 4.6 Thinking** | New: `scripts/confidence.mjs` + GitHub workflow update + `VERIFICATION.md` trend section | 3-4 h — flagship |

### 7.4 — Wave 3 (gate — depends on P3.3 emitting scores)

| Task slug | Model | Files in scope | Effort |
|---|---|---|---|
| `p03_p3_4_pre_merge_gate` | Gemini 3.5 Flash High | Update: `.github/workflows/pr-check.yml` (add confidence check); doc the bypass label | 30-45 min |

### 7.5 — Architect-side workflow

Same pattern as Phases 1 + 2 (DevFactory cycle). Crucial difference: **P3.1's operator deployment** to the staging VM is a *human handoff*, not an agent task. The brief author marks the boundary; the operator deploys; the architect re-verifies the alert fires before signing off P3.1.

### 7.6 — Coordination guard

Files shared across Phase 3 tasks:
- `.github/workflows/pr-check.yml` — P3.3 adds the confidence-score step; P3.4 adds the gate step. **Strict sequencing** through architect-integration.
- `package.json` — P3.2 adds `log:triage`; P3.5 adds `smoke:prod`. Architect serialises.
- `VERIFICATION.md` — P3.3 adds the trend table. Sole owner.

---

## 8. Open architectural decisions

1. **Confidence-score formula weights** — defaults in `01` §6.1 are reasonable but unproven. Re-tune at end of Phase 3 with real PR-comment data. ✓ planned.
2. **PRODUCTION smoke account** — read-only service-principal vs. demo-account. Pick before P3.5.
3. **Loki retention** — 90 days hot, 13 months cold per `02` §8. Confirm storage with operator before P3.1 deploy.
4. **Claude API key for triage** — `ANTHROPIC_API_KEY` env on the digest cron process. Operator-provisioned; don't commit.
5. **GitHub bot identity for PR comments** — use existing `agentryx-bot` GitHub App, or create a dedicated one. Decide before P3.3 dispatch.

---

## 9. Status changelog

| Date | Status | Note | Author |
|---|---|---|---|
| 2026-05-30 | Locked — ready to dispatch | Initial draft at close of Phase 2. 6 tasks in 3 waves, 4 model picks. P3.3 flagship at Opus tier. P3.1 has operator handoff for Loki/Promtail deploy on staging. | Architect (Claude Opus 4.7) |
