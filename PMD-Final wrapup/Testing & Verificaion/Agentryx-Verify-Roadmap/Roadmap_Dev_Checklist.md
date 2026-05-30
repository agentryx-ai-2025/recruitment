# Roadmap Dev Checklist

**Last updated:** 2026-05-06 (post-v0.2.1) · **Snapshot version:** v0.2.1 (live)

This is the single source of truth for what is shipped, what is in flight, and what is still future. Mirror it in the in-product admin Roadmap dashboard (Phase 1 starter, ships in v0.2.1).

Status legend:
- ✅ **shipped** — live, in production
- 🟡 **in progress** — actively being built
- ⚪ **planned** — committed in roadmap, not started
- 🔵 **future** — beyond current roadmap scope

---

## Phase 0 — Baseline (everything live before the new roadmap was written)

This is the foundation. v1.9.1 = end of Phase 0. Future work builds on top.

| Feature | Status | Shipped in |
|---|---|---|
| Multi-stakeholder sign-off matrix (4-stage pipeline) | ✅ | v0.x baseline |
| Per-requirement test instructions + expected results | ✅ | v0.x baseline |
| Pass / Partial / Fail signoff with comment | ✅ | v0.x baseline |
| Screenshot attachments (paste / drag-drop / file picker) | ✅ | v1.6.0 |
| 10 MB upload limit with namespaced disk storage | ✅ | v0.9.7 |
| Comments thread per requirement | ✅ | v0.x baseline |
| Project visibility toggle (admin) | ✅ | v1.x |
| Issues log with severity + status + reporter | ✅ | v0.x baseline |
| Reporter-or-admin permissions on issue status | ✅ | v0.9.x |
| Three-stage role-aware visibility (admin sees all, tester sees own column) | ✅ | v0.x baseline |
| CSV export of full sign-off matrix | ✅ | v0.x baseline |
| PDF export of sign-off report | ✅ | v0.x baseline |
| Audit log (every login + signoff change) | ✅ | v0.x baseline |
| Magic-link auth infrastructure (table + endpoints) | ✅ | v0.x baseline |
| Username + password auth | ✅ | v0.x baseline |
| Session persistence in Postgres | ✅ | v0.x baseline |
| Reviewer roles enum (admin, delivery, agentryx, htis, hpsedc_staging, hpsedc_final, observer) | ✅ | v0.x baseline |
| FRS scope project (155 reqs across 18 sections) | ✅ | v1.4.x seed |
| HTIS QA smoke project (77 reqs from Apr 2026 workbook) | ✅ | v1.6.x seed |
| Beyond-FRS extras project (206 reqs) | ✅ | v1.5.x seed |
| Sprint Releases module (draft → in_progress → deployed → closed) | ✅ | v1.8.0 |
| Re-verify chip (when deployed sprint covers a previously rejected row) | ✅ | v1.8.0 |
| Reverify one-click — chip auto-passes with sprint-naming auto-comment | ✅ | v1.9.1 |
| Ideas / Feedback inbox (`FB-YYYY-NNNN` codes, 6 types, 7 statuses) | ✅ | v1.7.0 |
| Per-project feedback triage by admin / delivery / agentryx | ✅ | v1.7.0 |
| Polymorphic `attachments` table (signoff / comment / feedback) | ✅ | v1.7.x |
| HTIS findings module (5 field defects in section 18 + 6 clarifications) | ✅ | v1.8.x |
| Cross-section deep-link via `#row=<itemRef>` URL hash | ✅ | v1.9.1 |
| Copy-link icon on each row (hover-visible) | ✅ | v1.9.1 |
| "My pending (N)" filter chip in role detail | ✅ | v1.9.1 |
| Reject quick-tags (6 pre-canned reasons) | ✅ | v1.9.1 |
| "All projects" pill in header | ✅ | v1.9.1 |
| Reviewer-name-as-Home-link in header | ✅ | v1.9.1 |
| Breadcrumb leads with "All projects" → "Overview" → role | ✅ | v1.9.1 |
| Role-aware "Needs fixing / My funnel" filter | ✅ | v1.9.1 |
| Section tabs show fix-count badge | ✅ | v1.9.1 |
| Per-project "Needs fixing N" pill on Home cards | ✅ | v1.9.1 |
| `needsFix` count in `/api/projects` response (role-aware) | ✅ | v1.9.1 |
| Pipeline-aware needs-fix predicate (most-downstream signoff wins) | ✅ | v1.9.1 |
| Per-tester scoping vs admin cross-stage scoping | ✅ | v1.9.1 |

**Phase 0 totals: 38 / 38 shipped.**

---

## Phase 1 — Foundation polish + cross-project visibility

**Theme:** Foundation for the octopus expansion. Visible cross-project value lands now; structural prep enables Phase 2-9.

**Visible ship target:** cross-project dashboard, activity feed, in-app notifications drawer.

| Feature | Status | Notes |
|---|---|---|
| **Admin Roadmap Dashboard** (live page at `/admin/roadmap`) | ✅ v0.2.1 | Customer + dev-team scoreboard. Admin/delivery only. |
| **Activity feed on project view** (surfaces existing audit_log) | ✅ v0.2.1 | Last 20 events per project, with filter chips (All / Sign-offs / Sprints / Feedback / Issues / Logins) |
| Audit-log instrumentation on signoff create/update/clear paths | ✅ v0.2.1 | Activity feed populates as reviewers act |
| `/api/auth/me` no longer leaks `passwordHash` to client | ✅ v0.2.1 | Hardening; pre-existing v0.2.0 leak |
| Cross-project Home for admin (consolidated dashboard across all projects) | ⚪ | Phase 1 main visible ship |
| In-app notifications drawer (bell icon in header) | ⚪ | Phase 1 main visible ship |
| `row_type` discriminator on `requirements` table | ⚪ | Phase 1 foundation |
| `organizations` stub table + nullable FK on projects | ⚪ | Phase 1 foundation (prep for Phase 8) |
| Centralised `server/lib/policy.ts` module | ⚪ | Phase 1 foundation (refactor scattered role checks) |
| Pagination on list endpoints (`?page=`, `?limit=`) | ⚪ | Phase 1 foundation |
| `RoleDetail` accepts `rowTypeFilter` prop | ⚪ | Phase 1 foundation (prep for Phase 3 tickets, Phase 4 test cases) |

**Phase 1 totals: 4 shipped (in v0.2.1), 0 in progress, 7 planned (of 11).**

---

## Phase 2 — Public API + Webhooks

**Theme:** Make Verify a hub by letting external portals push data in and subscribe to events.

| Feature | Status |
|---|---|
| `/api/v1/*` versioned namespace | ⚪ |
| API token auth (`Authorization: Bearer agx_pk_…`) | ⚪ |
| `api_tokens` table with bcrypted secret + scopes | ⚪ |
| Token management UI (admin) | ⚪ |
| `event_outbox` table + dispatcher worker | ⚪ |
| `webhook_subscriptions` table | ⚪ |
| Webhook delivery with HMAC signature + exponential backoff | ⚪ |
| `webhook_deliveries` table + admin replay UI | ⚪ |
| HireStream → Verify deploy auto-push reference integration | ⚪ |
| OpenAPI spec at `/api/v1/openapi.json` | ⚪ |
| Per-token + per-project rate limiting | ⚪ |
| Standardised JSON error envelope with `request_id` | ⚪ |

**Phase 2 totals: 0 shipped, 0 in progress, 12 planned.**

---

## Phase 3 — Support module

**Theme:** End-customer ticket intake + support team triage in the same matrix UX.

| Feature | Status |
|---|---|
| `tickets` table (sibling, with submitter_email + SLA timers) | ⚪ |
| `support` reviewer role | ⚪ |
| Public ticket-create endpoint (captcha-gated, rate-limited) | ⚪ |
| Customer-facing ticket form at `/support/<slug>` (no login) | ⚪ |
| In-product support inbox with status filter chips | ⚪ |
| SLA timer visualisation (response + resolution due) | ⚪ |
| SMTP integration (SendGrid / SES / Mailgun) | ⚪ |
| Ticket follow-up via magic link (single-row customer view) | ⚪ |
| Ticket count + SLA breach pill on Home cards | ⚪ |

**Phase 3 totals: 0 shipped, 0 in progress, 9 planned.**

---

## Phase 4 — Test management

**Theme:** Per-project test plans, environments, runs, automated CI ingestion.

| Feature | Status |
|---|---|
| `test_plans` + `test_cases` + `test_runs` + `test_results` tables | ⚪ |
| Test environments enum per project | ⚪ |
| CI ingestion endpoint (junit XML / TAP / JSON) | ⚪ |
| Test plan UI: rows × environment columns matrix | ⚪ |
| Compare-runs view (regression diff between two builds) | ⚪ |
| Regression alerts in activity feed + notifications | ⚪ |

**Phase 4 totals: 0 shipped, 0 in progress, 6 planned.**

---

## Phase 5 — Decisions / standup

**Theme:** Each project has a Decisions tab; action items track to closure.

| Feature | Status |
|---|---|
| `decisions` table or `row_type='decision'` rows | ⚪ |
| `action_items` table linked to decisions | ⚪ |
| Decisions tab on every project | ⚪ |
| Standup-mode templated row (yesterday / today / blockers) | ⚪ |
| Cross-project decision search | ⚪ |
| Action-item due-date notifications | ⚪ |

**Phase 5 totals: 0 shipped, 0 in progress, 6 planned.**

---

## Phase 6 — Cross-project analytics

**Theme:** Engineering health dashboard across all projects.

| Feature | Status |
|---|---|
| Pass-rate trend per project | ⚪ |
| Defect leak rate (final-stage rejections that should have been caught earlier) | ⚪ |
| Time-in-stage per pipeline level | ⚪ |
| Sprint velocity (rows-per-sprint) | ⚪ |
| Customer SLA breach rate | ⚪ |
| `metrics_daily` aggregation cron | ⚪ |
| Monthly engineering report (CSV + PDF) | ⚪ |

**Phase 6 totals: 0 shipped, 0 in progress, 7 planned.**

---

## Phase 7 — Knowledge base

**Theme:** Per-project + cross-project searchable KB; auto-generated release notes.

| Feature | Status |
|---|---|
| `articles` table with markdown body + tags + visibility | ⚪ |
| Auto-generated release notes from sprint deploys | ⚪ |
| Customer-facing help portal at `/help/<slug>` | ⚪ |
| Cross-module Postgres full-text search (requirements + tickets + decisions + articles) | ⚪ |
| Markdown editor + sanitiser | ⚪ |

**Phase 7 totals: 0 shipped, 0 in progress, 5 planned.**

---

## Phase 8 — Multi-tenancy

**Theme:** Triggered when a 2nd customer signs. Full data isolation, branded subdomains.

| Feature | Status |
|---|---|
| `organizations` table activated (Phase 1 stub becomes live) | ⚪ |
| `organization_id` foreign key backfilled on projects + reviewers + tickets etc. | ⚪ |
| Tenant-isolation middleware on every query | ⚪ |
| Subdomain routing (`<org>.verify.agentryx.dev`) | ⚪ |
| Cross-org admin federation (Agentryx super-admin sees across all orgs) | ⚪ |
| Per-org branding (logo, colour, custom subdomain) | ⚪ |

**Phase 8 totals: 0 shipped, 0 in progress, 6 planned.**

---

## Phase 9 — Mobile / PWA / push

**Theme:** Installable PWA with push notifications.

| Feature | Status |
|---|---|
| PWA manifest + service worker | ⚪ |
| Mobile-tuned matrix (vertical-stack on small screens) | ⚪ |
| Offline read-only fallback | ⚪ |
| Web Push API subscriptions | ⚪ |
| Push-notification triggers on watched events | ⚪ |

**Phase 9 totals: 0 shipped, 0 in progress, 5 planned.**

---

## Roll-up across all phases

| Phase | Theme | Shipped | In-progress | Planned | Total |
|---|---|---|---|---|---|
| 0 | Baseline | 38 | 0 | 0 | 38 |
| 1 | Foundation polish | 4 | 0 | 7 | 11 |
| 2 | API + webhooks | 0 | 0 | 12 | 12 |
| 3 | Support module | 0 | 0 | 9 | 9 |
| 4 | Test management | 0 | 0 | 6 | 6 |
| 5 | Decisions / standup | 0 | 0 | 6 | 6 |
| 6 | Cross-project analytics | 0 | 0 | 7 | 7 |
| 7 | Knowledge base | 0 | 0 | 5 | 5 |
| 8 | Multi-tenancy | 0 | 0 | 6 | 6 |
| 9 | Mobile / PWA / push | 0 | 0 | 5 | 5 |
| **Total** | | **42** | **0** | **63** | **105** |

**Overall completion: 42 / 105 = 40.0% shipped, 0% in flight, 60.0% planned.**

(These percentages will recompute live in the in-product admin dashboard from this same data file.)

---

## How this file is used

- **Manual update.** Each version's dev plan in `Verify-Updates & Ver. Control/` lists what shipped; reflect those status changes here.
- **Authoritative for the in-product dashboard.** The roadmap data file (`agentryx-verify/shared/roadmap.ts`) is hand-synced with this checklist. Future work: parse this markdown directly so the admin dashboard reads from a single source.
- **Customer-facing transparency.** Show this (or its in-product mirror) to potential customers — proves the product is actively maturing on a documented path.
- **Dev-team alignment.** Engineers always know what's on deck and what's deferred. No "is this on the roadmap?" Slack threads.
