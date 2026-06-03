<!--
DOC: Phase_PRDs/Phase_04_PRD.md
PURPOSE: Per-phase product requirements for Phase 4 — Operator Console
         (unified status dashboard + system_config UI for Phase 3 features).
SOURCE:  Architect-written at the close of Phase 3, after the scope-trim
         decision (configurable everywhere, no PROD notifications until
         customer-approved, UI-driven configuration matching the DMS Admin
         Console pattern).
OWNER:   Chief Solution Architect (Claude Opus 4.7 in planning).
AUDIENCE: Architect during implementation; future sub-agents if any UI
          work is dispatched.
-->

# Phase 4 — Operator Console · Phase PRD

**Phase**: 04
**Status**: Locked — ready to start
**Maps to**: `03_ROADMAP_AND_INTEGRATION.md` Phase 4; the v0.6.0.x scope-trim decision recorded at the close of Phase 3
**Duration estimate**: ~10-12 hours focused work (architect-direct, no agent dispatch)
**Owner**: Architect (Claude Opus 4.7)

---

## 1. Phase goal

Surface every Phase 3 signal (synthetic monitor health, daily log digest, LLM-triage hypotheses, live Loki log search) and put **every feature toggle and config field into a UI** that superadmin can edit without touching env vars or shell.

Pattern reference: the DMS Admin Console at `dms.osipl.dev/ask/admin` — LLM endpoint fields, "Save settings", "Run test" button, webhook configuration, hold-for-review toggle. HireStream gets the same UX, scoped to HireStream's feature set.

The result: HPSEDC operators have **one screen** to monitor health, see proposed root causes for incidents, search logs, and turn features on/off — without engineer intervention.

---

## 2. Features in scope

| # | Deliverable | Spec ref | Acceptance test |
|---|---|---|---|
| **P4.1** | `system_config` table + drizzle schema + migration | `01_EMBEDDED_TESTING_ARCHITECTURE.md` §6 | `drizzle-kit push` creates the table; row per feature with `enabled`, `config jsonb`, `updatedBy`, `updatedAt`. Seed with 6 default rows (synthetic, triage, digest, loki, documind, notifications) |
| **P4.2** | Server-side config API | new — Phase 4 spec | `GET /api/v1/admin/system-config` returns all features; `PUT /api/v1/admin/system-config/:feature` updates one (Zod-validated per feature); `POST /api/v1/admin/system-config/:feature/test` runs a connectivity check and returns the result |
| **P4.3** | Tools read config from DB (env-var fallback retained) | new | `tools/synthetic/run-prod-smoke.mjs`, `tools/triage/triage.mjs`, `tools/log-analyzer/digest.mjs` each consult the DB at startup; fall back to env vars if DB unreachable (preserves CI / cron host scenarios). Same defaults if neither |
| **P4.4** | Operator Console React page — Status tab | new | `/admin/operator-console` (superadmin-only) displays: synthetic-monitor card (PASS/FAIL/SKIP, last run, failures), digest summary (top errors, regressions, novel classes), triage hypotheses card (one row per cluster, "Re-triage" button), Loki log search box (calls Loki HTTP API, returns top 50 lines with one-click filters) |
| **P4.5** | Operator Console React page — System Config tab | new | Same page, second tab. Per-feature card with: enable toggle, edit form (URL, model, API key masked, schedule, etc.), Save button, "Test connection" button. Mirrors DMS Admin Console UX |
| **P4.6** | Operator runbook | new | `docs/operator-console-runbook.md` covers: how to access (superadmin login), how each tab works, what to do when the synthetic monitor goes red, how to enable triage (one-click + URL + test), how the Loki search syntax maps to LogQL |

---

## 3. Features explicitly NOT in scope

Defer to a later phase or out entirely:

- **Audit log of config changes** — `updatedBy/updatedAt` columns capture the basics; a separate audit-events table is Phase 5 if anyone needs it.
- **Dashboard customization** (per-user widget layout) — single canonical layout in Phase 4; per-user customization is unnecessary at HPSEDC team size.
- **Alert-rule editor UI** — LogQL alert rules live in `infra/loki/rules/*.yaml` (operator edits files + reloads Loki) until enough rules exist to justify a UI.
- **In-app DocuMind chat surface** — DocuMind URL field exists in System Config (so it can be configured when ready) but the in-app chat/Q&A integration is Phase 5+.
- **Mobile-app surface for the Operator Console** — desktop-first; mobile is Phase 6+ once the mobile app exists and superadmin role is wired into it.
- **Multi-tenant config** (per-environment overrides in the UI) — for HireStream there's only one PROD; per-env config lives in the env layer.
- **OpenAPI / Schemathesis / Stryker / Visual-regression** — original Phase 4 roadmap items, all cut. Real coverage benefit for a 6-person team is marginal; the operational risk (CI slowdown, review burden, flake) is real. Defer to Phase 5+ only if PR velocity dramatically changes.

---

## 4. Dependencies

**Must be complete before phase start (all from Phase 3):**

- P3.5 synthetic monitor shipping `logs/synthetic-latest.json` (✅ v0.6.0.1 / 4efb8da)
- P3.2 LLM triage shipping `logs/triage-latest.json` (✅ v0.6.0.2 / f6b67af)
- P2.4 digest writing `logs/digest-latest.json` (✅ v0.6.0.2 / f6b67af)
- P3.1 Loki + Promtail config in `infra/loki/` (✅ v0.6.0.3 / 11c4f39)

**Provides for Phase 5+:**

- A live operator surface that the customer can demo to HPSEDC stakeholders.
- A DB-backed config layer that any future feature (alert rules, DocuMind chat, mobile-app sync, etc.) can hook into.
- A pattern that propagates to every Agentryx product — same UX, same table shape, same connectivity-test contract.

---

## 5. Risk areas specific to this phase

| Risk | Affected task | Mitigation |
|---|---|---|
| **Scope creep on the System Config form** | P4.5 | Hard cap: 6 features in v1. Each gets a fixed-shape form. Add new features by extending the Zod schema, not by re-architecting the page |
| **Connectivity-test endpoints (`POST /test`) execute outbound calls — security review** | P4.2 | Superadmin-only; rate-limit per feature (e.g., 1 test/30s); never echo back secrets from request body in response; log the test attempt to audit log (when that exists) |
| **DB migration on staging/prod is operator action** | P4.1 | `drizzle-kit push` is idempotent. Document the exact command in the runbook. Migration is additive (new table, no existing data) — zero-downtime |
| **Tools running in CI / cron host without DB access** | P4.3 | Env-var fallback is mandatory, not optional. Order: try DB → if connection fails OR feature row absent → use env vars → if env vars absent → use code defaults |
| **Secrets in `config jsonb` column** | P4.1, P4.2 | API keys etc. stored as plaintext in DB v1 (Postgres-side encryption planned for Phase 5 if/when HPSEDC compliance team flags it). Masked in API responses (`***`) by default; full value only shown on explicit "reveal" click + audit log entry. DO NOT log the config column anywhere |
| **Loki query box becomes a free-form SQL-injection surface** | P4.4 | LogQL is read-only; queries are URL-encoded and passed verbatim to Loki HTTP API. Loki itself has no write endpoint. No injection vector |
| **Operator Console breaks if Loki / triage / synthetic outputs are missing or stale** | P4.4 | Every card handles "no data yet" gracefully. Stale-data badge ("digest is N hours old") prevents misleading green |

---

## 6. Exit criteria

Phase 4 is complete when ALL true:

- [ ] **P4.1** `system_config` table exists with 6 seeded rows (synthetic, triage, digest, loki, documind, notifications). `drizzle-kit push` applied locally + on staging.
- [ ] **P4.2** All three API endpoints respond per spec. Superadmin-only. Zod validation per feature. Connectivity-test endpoint works for synthetic + triage + loki (returns latency + status).
- [ ] **P4.3** Each of the three tool scripts reads from DB when available, falls back to env. Single Jest test per script proves the fallback path.
- [ ] **P4.4** Status tab on `/admin/operator-console`:
  - Synthetic card shows latest result + first failures + "Run now" button
  - Digest summary card shows top errors + regressions + novel classes
  - Triage card shows one hypothesis per cluster + "Re-triage" button
  - Loki search box runs a query against Loki and renders top 50 lines
- [ ] **P4.5** System Config tab:
  - 6 feature cards (or however many features exist by then)
  - Each: enable toggle, edit form, Save, Test
  - All changes write to `system_config` row, take effect on next script run
- [ ] **P4.6** Operator Console runbook published (`docs/operator-console-runbook.md`)
- [ ] All routes, queries, and components have data-isolation suite coverage (superadmin-only enforcement)
- [ ] `hirestream/VERSION` bumped to `0.7.0.0`
- [ ] `04_DEV_CONTEXT_*.md` §3 updated to reflect Phase 4 close
- [ ] `Phase_05_PRD.md` drafted (locks Phase 5 before closing Phase 4)

---

## 7. Sub-deliverable order — architect-direct implementation plan

Architect implements directly (no Antigravity dispatch). Phase 3 retro showed that brief-against-actual-codebase correctness was the bottleneck for sub-agents on this project; direct implementation eliminates the spec gap.

### Wave 1 — backend (~5 hours)

1. **P4.1** `system_config` table — drizzle schema (`shared/schema.ts` addition), migration generated, seed inserted on first boot. ~1 hr.
2. **P4.2** Server-side API — three handlers under `server/routes/admin.routes.ts`, Zod schema per feature, superadmin guard via existing middleware. ~2 hr.
3. **P4.3** Tools updated — small `lib/config.mjs` helper that reads DB-first, env-fallback. Each of the 3 scripts imports it. Jest test per script. ~2 hr.

### Wave 2 — frontend (~5 hours)

4. **P4.4** Status tab — single React page, 4 cards (synthetic / digest / triage / Loki search). Reuses existing admin layout components. ~3 hr.
5. **P4.5** System Config tab — 6 feature cards, shared form component, "Test" button per card. ~2 hr.

### Wave 3 — close-out (~2 hours)

6. **P4.6** Operator runbook + Phase 4 retro + Phase 5 PRD draft + VERSION bump.

Total: ~12 hours focused work. Splittable across 2-3 sessions if desired.

---

## 8. Open architectural decisions

1. **Encryption-at-rest for `config jsonb` column** — plaintext in v1; column-level encryption in Phase 5 if HPSEDC compliance flags it. Mitigated by masked API responses + superadmin-only access.
2. **Connectivity-test rate-limiting** — per-feature, per-user, per-N-seconds? Start with 1/30s per feature (anyone can hit "Test" again after 30s). Tune if abused.
3. **Loki search depth from the UI** — bounded at 50 lines / 5-minute lookback by default; "Open in Grafana" button (visible only when Grafana profile is up) for deeper inspection.
4. **System Config audit log** — Phase 5 spec item. Phase 4 captures `updatedBy/updatedAt` columns only.
5. **DocuMind integration shape** — Phase 4 just has the URL field. Whether the in-app surface is a chat box / Q&A side panel / inline tooltips is Phase 5 product-design work.

---

## 9. Configurability rule (carried forward from Phase 3)

Every Phase 4 deliverable must:

1. **Have a master enable/disable** (via `system_config.enabled`) defaulting to safe-off when the feature does anything observable to users / operators / external systems.
2. **Have configurable URLs + credentials** in `system_config.config` JSONB. No hardcoded hostnames in the script layer.
3. **Write outputs to JSON files in `logs/`** for dashboard consumption (continues the Phase 3 pattern).
4. **Have a connectivity-test endpoint** at `POST /api/v1/admin/system-config/:feature/test` that returns `{ok: boolean, latencyMs, details}`.
5. **Have ≤60-line operator runbook** at `docs/<feature>-runbook.md`.
6. **Have env-var fallback** so CI / cron / standalone runs work without DB access.

---

## 10. Phase 4 maps to broader product strategy

The Operator Console is the first product surface where **AI becomes operator-visible** — the triage card displays the Mistral 7B hypothesis next to each error cluster, the connectivity-test button calls the LLM endpoint, and the System Config tab exposes the LLM configuration. This is the bridge between:

- **Phase 1-3**: testing framework as developer infrastructure
- **Phase 5+**: AI in core HireStream features (candidate profile summarization, agent CV review assist, employer search assist, admin anomaly explanation)

The same configuration pattern (`system_config` table + UI + connectivity test) generalizes to any future AI-backed feature. The DocuMind URL field in Phase 4 is the placeholder hook for that future expansion.

---

## 11. Status changelog

| Date | Status | Note | Author |
|---|---|---|---|
| 2026-06-03 | Locked — ready to start | Phase 3 closed at v0.6.0.3 with 3 deliverables (P3.5 synthetic + P3.2 triage + P3.1 Loki). P3.3 + P3.4 deferred indefinitely. Phase 4 re-scoped from original 4-item testing-tool list to a single unified Operator Console deliverable, motivated by the customer-side need for UI-driven config + the operational reality that the original Phase 4 items were overkill for HPSEDC's team size. | Architect (Claude Opus 4.7) |
