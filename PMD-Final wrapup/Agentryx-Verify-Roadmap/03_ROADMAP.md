# 03 — Roadmap

Phase-by-phase plan from v1.9.1 (today) to a fully expanded multi-module hub.

**Sequence over calendar.** Each phase has rough effort estimates but no hard dates — sequencing matters more than timing. A new business reality (a second customer, a partner integration, a regulatory requirement) can re-order phases at any point. The principles in `02_VISION.md` are the constant.

**Each phase ships visible functionality** even when its main job is foundation work. No "back-end-only" phases — there is always something a stakeholder can see and use after the merge.

---

## Phase 1 — Foundation polish + cross-project visibility

**Effort:** ~1 week · **Risk:** low · **Visible ship:** cross-project dashboard + activity feed + notifications drawer

### What ships (visible)

1. **Cross-project Home** — admin/delivery sees a consolidated dashboard across all projects: total reviewable items, total open defects per project (already on the Home cards via the `needsFix` field), aggregate sprint status, recent activity. Non-admins still see their own filtered list.
2. **Activity feed** — surface the existing `audit_log` as a project-level "recent activity" panel on the project view (signoff changes, sprint deploys, issue status changes, feedback triage). Already-collected data, just rendered.
3. **In-app notifications drawer** — bell icon in header. New signoff on a row I commented on, new comment on a feedback I submitted, new sprint deployed on a project I review. Clears as I read each. No email yet.

### What gets restructured (invisible)

1. **`row_type` discriminator on `requirements`** — add column `row_type varchar(20) NOT NULL DEFAULT 'requirement'`. Sets up Phase 3 (Support tickets become `row_type='ticket'`) without breaking anything today. Existing rows keep `row_type='requirement'`. UI ignores it for now.
2. **`organizations` stub table** — `(id, name, slug, created_at)` with a `null`-able `organization_id` foreign key on `projects`. Not enabled in UI; sets up Phase 8 multi-tenancy without forcing a migration later.
3. **Centralised role/permission helper** — extract the scattered `isAdmin / canTriage / canManage` checks across feedback.ts, sprints.ts, projects.ts into a single `server/lib/policy.ts` module. Same behaviour, one place to audit.
4. **Pagination on list endpoints** — `/api/feedback`, `/api/projects/:slug/issues` get `?page=` and `?limit=` (default 50). Keeps payload bounded as data grows.
5. **Component refactor: matrix is row-type-aware** — `RoleDetail` accepts a `rowTypeFilter` prop. Default is `requirement`. Sets up Phase 3.

### Why now

Everything in Phase 2+ assumes these foundations. Adding them in Phase 1 means later phases ship faster. None of these touch reviewer-visible behaviour today, so risk is low — but the cross-project Home + notifications drawer + activity feed are **immediately useful** and prove the foundations work.

### Acceptance criteria

- All current 5 demo accounts behave identically to v1.9.1 (no regressions)
- Admin sees a new "Across all projects" view at `/dashboard`
- Reviewer sees a notifications bell with at least one populated event
- `row_type` exists in DB; existing rows have value `requirement`; UI does not surface it yet
- Server policy helpers cover every existing role check; no behaviour change

---

## Phase 2 — Public API + Webhooks

**Effort:** ~2 weeks · **Risk:** medium (API contract stability) · **Visible ship:** HireStream's CI auto-pushes deploy events into Verify; partners can subscribe to webhooks

### What ships (visible)

1. **HireStream → Verify integration**: HireStream's CI pipeline calls Verify on every deploy. Verify auto-creates the `projectSprints` row + bumps `buildRef`. The existing sprint UI surfaces it like a manual deploy. **Reviewers stop having to ask "is this build deployed?"** — the matrix knows.
2. **Outbound webhooks** — admin can register a webhook URL per project. Events fire on `signoff.changed`, `sprint.deployed`, `feedback.created`, `issue.status_changed`. Slack / email / partner-portal integrations become trivial.
3. **API tokens UI** — admin generates per-project tokens (`agx_pk_…`) with one-click copy. Token name + creation date + last-used timestamp visible. Revoke button.

### What gets built

1. **Versioned `/api/v1/*` namespace** — every endpoint that's safe to expose externally is mirrored under `/api/v1`. Existing internal `/api` continues to serve the React client (separate concern, separate stability promise).
2. **Token auth middleware** — `Authorization: Bearer agx_pk_<id>_<secret>` resolves to a `(reviewer, project, scopes)` triplet. Tokens are project-scoped by default. Admin tokens have global scope.
3. **`api_tokens` table** — `(id, project_id, name, hashed_secret, scopes[], created_by, last_used_at, revoked_at)`. Bcrypt the secret; never store plaintext.
4. **`event_outbox` table** — every state change writes an event row. A polling dispatcher (no Redis needed at this scale) reads unsent events and POSTs to subscriber URLs with HMAC-signed body. Retries with exponential backoff up to 24h.
5. **`webhook_subscriptions` table** — `(id, project_id, url, secret, event_types[], created_by, last_delivered_at, last_error)`.
6. **OpenAPI spec** — generated from route handlers (or hand-written and lint-checked against actual handlers). Lives at `/api/v1/openapi.json`. See `04_API_AND_INTEGRATION.md` for the contract.

### Why now (right after Phase 1)

The integration story is what makes Verify a **hub** rather than another silo. Without webhooks + ingest, every "feature" we add forces stakeholders to log in, look, and act. With webhooks, Verify becomes part of the rest of their stack.

It's also the cheapest phase to build — the data flows already exist server-side. We're just exposing them with a stable contract.

### Acceptance criteria

- HireStream pushes a deploy event → Verify shows a new sprint with `buildRef` matching the build
- Admin registers a webhook URL → triggers a signoff on a row → the URL receives a POST with the signed event body
- Token auth works: a request with a valid token bypasses session auth; a revoked token returns 401
- OpenAPI spec validates against an external linter (Spectral or similar)

---

## Phase 3 — Support module

**Effort:** ~3 weeks · **Risk:** medium (new entity, new customer-facing intake) · **Visible ship:** end customers can submit support tickets via a public form; support team triages in-product

### What ships (visible)

1. **Customer-facing ticket form** — public URL like `verify.agentryx.dev/support/<project-slug>`. No reviewer login required. Captcha-gated. Captures email, summary, description, screenshots. Triggers a magic link to the submitter so they can follow up.
2. **Support inbox in-product** — list view of all tickets per project, filterable by status (`new` / `in_triage` / `awaiting_customer` / `awaiting_dev` / `resolved` / `closed`). Reuses the matrix UX shape: rows are tickets, the column is the support agent's verdict.
3. **SLA visualisation** — each ticket gets an SLA timer (configurable per project, default 48h response / 5d resolution). Approaching breach lights red on the row. Already-breached lights deeper red with a count of how long.
4. **Customer follow-up via magic link** — when support replies, customer gets an email with a magic link. Clicking opens the ticket in a single-row view (only their own ticket, no rest of the system). They can comment + attach + close-as-resolved.

### What gets built

1. **`tickets` table** — same shape as `requirements` but with ticket-specific fields: `submitter_email`, `submitter_name`, `submitter_organization` (so non-reviewer customers can submit), `sla_response_due_at`, `sla_resolution_due_at`, `priority`, `status`. Reuses `comments` and `attachments` (with `ownerType='ticket'`).
2. **Support-agent role** — new `reviewerRole` enum value `support`. Support agents can see all tickets across all projects, can change ticket status, can post replies. Cannot sign off on requirements.
3. **Public ticket-create endpoint** — `POST /api/v1/projects/:slug/tickets` (no auth required, captcha-gated, rate-limited). Creates the ticket + a magic link tied to the submitter's email.
4. **Magic-link enhancements** — the existing `magicLinks` table extended with `purpose` enum (`reviewer_login` / `ticket_followup`) so a ticket-only link can't accidentally grant reviewer access.
5. **Email integration** — Phase 3 finally wires the SMTP that magic-link infra was already designed for. SendGrid / SES / Mailgun, configurable. Templates for ticket-created, ticket-replied, ticket-resolved.

### Anchor test

✓ Same matrix shape — rows are tickets, columns are support-agent verdicts (status). Reviewers don't have to learn a new UI to triage tickets.
✓ Same comments + attachments model.
✓ Same role-based privacy (customers see only their own ticket; support team sees all).

### Acceptance criteria

- Customer with no Verify account can submit a ticket via the public form
- They receive an email confirmation with a magic link
- Following the link opens a single-row view showing only their ticket
- Support agent triages from the inbox, ticket changes status, customer is emailed
- Ticket count + SLA breach count surface on the project's Home card

---

## Phase 4 — Test management module

**Effort:** ~3 weeks · **Risk:** medium-high (new mental model — "test runs" vs. one-off sign-offs) · **Visible ship:** QA can run structured test cycles per browser/device/build, automated test result ingestion via API

### What ships (visible)

1. **Test plans per project** — admin defines a test plan = a list of test cases (rows) × a list of "environments" (columns: Chrome / Firefox / iOS Safari / Android, or staging / pre-prod / prod, or build numbers). The matrix UX recurs here: rows × columns × pass/fail.
2. **Run history** — each "test run" is a snapshot. Past runs preserved for regression analysis. Compare-runs view shows which tests started failing between v1.4 and v1.5.
3. **Automated test ingestion** — CI pipelines POST test results to `/api/v1/projects/:slug/test-runs`. Junit / TAP / custom JSON formats. The matrix auto-fills from CI results, humans only intervene on failures.

### What gets built

1. **`test_plans` + `test_cases` + `test_runs` + `test_results` tables**. Test cases are essentially `row_type='test_case'` rows on `requirements`, with extra metadata (preconditions, steps).
2. **Test-environments enum on the project** — admin defines `["chrome", "firefox", "ios_safari", "android"]` once; columns derived.
3. **CI ingestion endpoint** — token-authed, accepts streaming junit XML or JSON arrays.
4. **Regression alerts** — when a test that was passing on the previous run fails on this one, surface as an alert in the activity feed + notification drawer.

### Why this phase, not earlier

Test management is genuinely a new mental model — the matrix gets a third dimension (test cases × environments × runs). Doing this earlier risks bloating the matrix UX with concepts not all stakeholders need. Doing it after Support means we have a second module under our belt and know what does and doesn't reuse cleanly.

### Acceptance criteria

- Admin creates a test plan for project FRS with 20 test cases × 4 browsers
- CI POSTs results from a Playwright run; matrix auto-populates
- Failing test from previous build shows up red; reviewer can click to comment
- Compare-runs view shows the regression diff between two builds

---

## Phase 5 — Decision log / standup module

**Effort:** ~2 weeks · **Risk:** low (small surface, fits matrix shape naturally) · **Visible ship:** every project has a "Decisions" tab where each meeting / decision is a row; action items track to closure

### What ships (visible)

1. **Decisions tab on every project** — chronological list. Each row is a decision: title, context (what was the question), decision (what was chosen), rationale (why), date, attendees (reviewers), action items (with assignees + due dates).
2. **Action item tracking** — action items linked to a decision. Each gets a status (`open` / `done` / `dropped`). Notifications when due dates approach.
3. **Standup mode** — a templated daily-standup row: "what I did, what I'll do, blockers". Prefill from yesterday's. Quick-add for distributed teams.
4. **Searchable decisions across projects** — admin can search "what did we decide about X across all projects" and get a results list.

### What gets built

1. **`decisions` table** — `row_type='decision'` on a generalised `rows` table, OR a sibling table mirroring the pattern. Decision-specific fields: `title`, `context`, `decision`, `rationale`, `decided_at`, `attendee_ids[]`.
2. **`action_items` table** — `(decision_id, title, assignee_id, status, due_at, completed_at, completed_by_id)`.
3. **Notifications hook** — uses Phase 1's notification drawer + Phase 2's email integration (if SMTP wired by then).

### Why now

Low-risk, high-value, fits the matrix shape natively. Most teams currently put decisions in Slack messages that vanish in 90 days, or in Confluence pages no one reads. A "decisions row in every project" is a small thing that compounds into institutional memory.

### Acceptance criteria

- Reviewer creates a decision via "+ Decision" button on the Decisions tab
- Action items can be added to any decision; assignees see them in their notification drawer
- Search across all projects returns matching decisions

---

## Phase 6 — Cross-project analytics

**Effort:** ~2 weeks · **Risk:** low (read-only; built from existing data) · **Visible ship:** "Engineering health" dashboard showing velocity, defect leak, time-in-stage, customer SLA breaches across all projects

### What ships (visible)

1. **Engineering health page** — admin-only. Per-project: pass-rate trend over time, defect leak rate (defects found at HPSEDC Final that should have been caught earlier), time-in-stage (how long does a row spend at HTIS before moving), sprint velocity (rows-per-sprint), customer SLA breach rate.
2. **Cross-project comparison** — bar charts comparing FRS vs HTIS-smoke vs Beyond-FRS on the same axes.
3. **Exportable reports** — CSV + PDF "monthly engineering report" template combining all of the above.

### What gets built

1. **No new schema.** All metrics derivable from existing data (`audit_log` for stage transitions, `signoffs` for verdicts, `tickets` for SLA, `sprints` for velocity).
2. **Aggregation queries** — pre-computed daily into a `metrics_daily` table to keep the dashboard responsive. Cron job refreshes overnight.
3. **Chart library** — lightweight, e.g. `recharts` or hand-rolled SVG. No d3 unless an analytics user demands it.

### Acceptance criteria

- Admin opens `/analytics`, sees three charts (pass-rate trend, defect leak, sprint velocity) with a project picker
- All metrics match a manual SQL query against the underlying tables
- Monthly report PDF generates in <5s

---

## Phase 7 — Knowledge base

**Effort:** ~2 weeks · **Risk:** low · **Visible ship:** searchable per-project + cross-project KB; release-notes auto-generated from sprints; customer-facing help articles

### What ships (visible)

1. **KB articles** per project — markdown editor, attachments, tags, public/private flag.
2. **Auto-generated release notes** — when a sprint deploys, optional flag publishes a release-note article with the sprint name + fixed item descriptions.
3. **Customer-facing help portal** — public KB articles render at `verify.agentryx.dev/help/<project-slug>` (no login). Pulls from articles tagged `public`.
4. **Search across modules** — single search bar finds: requirements, tickets, decisions, KB articles, sprints. Returns ranked results with type badges.

### What gets built

1. **`articles` table** — `(id, project_id, title, body_markdown, tags[], visibility, author_id, published_at)`.
2. **Full-text search** — Postgres `tsvector` indexed on requirement description, ticket summary, decision title + body, article body. Single search endpoint queries all.
3. **Markdown rendering** — server-rendered HTML for safety, sanitised, with attachment image references.

### Acceptance criteria

- Admin creates a public help article; URL works without login
- Auto-generated release note appears on sprint deploy
- Search "salary filter" returns matching requirements + decisions + articles, type-tagged

---

## Phase 8 — Multi-tenancy

**Effort:** ~3 weeks · **Risk:** high (cross-cutting; must verify isolation) · **Visible ship:** second agency / customer can use the same instance with full data isolation · **Trigger:** only when a real second customer signs

### What ships (visible)

1. **Organisations management** — admin invites another agency. They get their own subdomain or path prefix. Their projects, reviewers, tickets, KB are completely isolated.
2. **Cross-org admin federation** — Agentryx (the platform owner) can see across all orgs from a super-admin role. Each org's admin sees only their own.
3. **Per-org branding** — logo, colour, custom subdomain.

### What gets built

1. **`organizations` table** activated (stub from Phase 1).
2. **`organization_id` on every project, reviewer, ticket, etc.** — backfilled to a default `agentryx-internal` org for existing data.
3. **Tenant-isolation middleware** — every query filtered by the current request's `organization_id`. Bug here = data leak; this phase needs careful review + tests.
4. **Subdomain routing** — `<org-slug>.verify.agentryx.dev` resolves to that org's data.

### Why this phase deferred

Multi-tenancy is the kind of feature that's "easy to add later" only if you've prepared for it (which Phase 1 does). Building it before a second customer arrives is over-engineering — there's no second customer to validate the design choices against.

### Acceptance criteria

- Two organisations exist; reviewer in org A cannot see project from org B even with direct URL access
- Each org admin manages their own reviewers / projects
- Agentryx super-admin sees both
- Subdomain isolation works

---

## Phase 9 — Mobile / PWA / push notifications

**Effort:** ~3 weeks · **Risk:** medium · **Visible ship:** mobile-friendly PWA install; push notifications on signoff / ticket assignment

### What ships (visible)

1. **PWA manifest + service worker** — installable on iOS / Android home screen. Offline fallback for read views.
2. **Mobile-tuned matrix** — vertical-stacked rows on small screens (the existing one already responsive but not optimised).
3. **Push notifications via Web Push API** — opt-in. Same events as the in-app drawer (signoff on watched row, ticket assigned, sprint deployed).

### Why last

The product is web-first and reviewer-driven. Mobile is genuinely lower priority — most signoff sessions happen at a desk. PWA is the cheap-but-good answer; a native app is over-investment until reviewers ask for it specifically.

### Acceptance criteria

- "Install Verify" prompt on mobile Chrome / Safari
- Read-only project view works offline
- Push notification arrives within 30s of triggering event

---

## Roadmap-as-a-table

| Phase | Theme | Effort | Visible ship | Foundation work |
|---|---|---|---|---|
| 1 | Foundation polish | ~1w | Cross-project dashboard, activity feed, notifications drawer | `row_type` discriminator, organizations stub, policy module, pagination |
| 2 | API + webhooks | ~2w | HireStream → Verify deploy auto-push, partner webhooks | `/api/v1`, token auth, event_outbox, webhook_subscriptions |
| 3 | Support module | ~3w | Customer-facing ticket form + support inbox + SLA + customer reply via magic link | tickets table, support role, SMTP integration |
| 4 | Test management | ~3w | Per-project test plans, browser × test matrix, CI ingestion | test_plans / test_cases / test_runs / test_results |
| 5 | Decisions / standup | ~2w | Decisions tab, action items, standup template | decisions table, action_items |
| 6 | Cross-project analytics | ~2w | Engineering health dashboard, monthly report | metrics_daily aggregation cron |
| 7 | Knowledge base | ~2w | Articles, auto release notes, customer-facing help portal, cross-module search | articles table, full-text search index |
| 8 | Multi-tenancy | ~3w | Second agency onboarded with full isolation | organizations active, tenant middleware, subdomain routing |
| 9 | Mobile / PWA / push | ~3w | Installable PWA, mobile-tuned matrix, push notifications | service worker, web push subscriptions |

**Total notional effort:** ~21 weeks of focused engineering = roughly six months at one engineer, three months at two. Real timeline depends on customer-driven sequencing (Phase 8 jumps if a second customer arrives early; Phase 4 jumps if QA workload demands it; Phase 3 might leapfrog Phase 2 if a customer wants tickets more than HireStream wants webhooks).

---

## What this roadmap explicitly does NOT plan for

These are the temptations to resist when prioritising:

- **Building our own CI** — we ingest CI results in Phase 4, never run builds ourselves
- **Owning the customer's roadmap** — Phase 5 captures decisions; Phase 6 reports on velocity; we don't replicate Linear's roadmap UI
- **A real-time messaging product** — comments are async; chat belongs in Slack; we link out
- **An admin power-tool layer** — bulk-edit, formulas, conditional logic. Each makes power-users happy and breaks the no-training UX
- **Deep workflow / approval chains** — sequential approval rules with conditional escalation. The 4-stage pipeline is enough for the customers we have; deeper workflow lives in tools like ServiceNow

Every "wouldn't it be cool if" feature request gets evaluated against `02_VISION.md`'s three tests. If the answer is no, the answer is no.
