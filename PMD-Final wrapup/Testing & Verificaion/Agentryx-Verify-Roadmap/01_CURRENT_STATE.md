# 01 — Current State Inventory

**Snapshot:** v1.9.1 · 2026-05-06 · Live at https://verify-stg.agentryx.dev

This is a structural inventory of what exists today. Treat it as the "as-built" reference: every module, every entity, every route, every UI surface that ships when you `npm run build`.

---

## 1. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 20 + TypeScript (strict) | Modern, single language client/server |
| Server | Express 4 | Boring on purpose; we own the request lifecycle, no framework magic |
| Sessions | `express-session` + `connect-pg-simple` | Sessions in Postgres so multi-instance scaling is trivial |
| Auth | `bcryptjs` for passwords, `nanoid` for tokens | Magic-link infra is already built (table + endpoints) but SMTP not wired |
| ORM | Drizzle | Type-safe schema definitions; migrations are explicit SQL via custom scripts |
| Database | PostgreSQL 14+ | Local Postgres on staging VM; no managed DB cost at this stage |
| Frontend | React 18 + Vite + Tailwind CSS | Fast build, no over-engineering |
| Routing | wouter | 3 KB instead of React Router's 50 KB |
| Server-state | manual fetch + local state | TanStack Query was scoped out — current data volume doesn't warrant it yet |
| File uploads | multer with namespaced disk storage | Keeps Verify-namespaced under `uploads/verify/` so other apps' files can't collide |
| PDF / CSV export | PDFKit + manual CSV builder | Self-contained; no external dependency for sign-off reports |
| Process | PM2 + nginx + Let's Encrypt | Single VM, two pm2 processes (`hirestream` + `agentryx-verify`) |
| Hosting | Single staging VM (34.180.25.44) | Production deployment not yet split out |

**Total source size:** ~5,500 lines TypeScript + React. Small enough that one engineer can hold the whole product in their head — that's the discipline to maintain.

---

## 2. Data model (Drizzle schema)

All tables live in [shared/schema.ts](../../agentryx-verify/shared/schema.ts). Listed in dependency order:

### Core entities

| Table | Purpose | Notable columns |
|---|---|---|
| `projects` | One row per separately-sign-offable scope (e.g. `hirestream-v1.4`, `hirestream-htis-smoke`) | `slug` (URL-safe), `buildRef`, `contractor`, `client`, `sortOrder`, `visibleToNonAdmin` |
| `reviewers` | People who can sign in, sign off, comment, raise issues | `username` + `email` both unique, `role`, `passwordHash`, `organization` |
| `projectReviewers` | Many-to-many: which reviewers belong to which projects | Composite PK `(projectId, reviewerId)` |
| `requirements` | Rows in the compliance matrix — the central entity | `itemRef` (e.g. `1.18`), `section`, `sectionTitle`, `description`, `status`, `evidence`, `testSteps`, `expectedResult`, `externalRefs[]`, `source` (`frs` / `htis_new` / `htis_smoke`), `sortOrder` |

### Workflow entities

| Table | Purpose | Notable columns |
|---|---|---|
| `signoffs` | One row per (`requirement` × `level`). The Pass / Fail / Partial decision | `level` (one of 4 pipeline stages), `decision`, `comment`, `signedAt` |
| `comments` | Free-form discussion thread per requirement | Polymorphic — see `attachments` |
| `attachments` | Polymorphic file attachments | `ownerType` (`signoff` / `comment` / `feedback`) + `ownerId`. **This is the critical extension point** — new modules add new ownerType values, no schema change. |
| `issues` | Defect log per project | `shortId` (e.g. `HS-001`), `severity`, `status`, `itemRef` (optional link to requirement) |

### Module entities (added v1.6 — v1.8)

| Table | Purpose | Notable columns |
|---|---|---|
| `feedbackItems` | Ideas / enhancement / bug suggestions | `referenceCode` (`FB-2026-NNNN`), `type`, `area`, `status`, `priority`, `assignedToId`, `linkedToItemRef` |
| `feedbackComments` | Discussion thread on each feedback item | Mirror of the `comments` pattern, scoped by feedback |
| `projectSprints` | Delivery-side sprint releases — closes the loop with re-verify | `name`, `buildRef`, `fixedItemRefs[]`, `status` (draft → in_progress → deployed → closed), `startedAt` / `deployedAt` / `closedAt` |

### Auth + audit

| Table | Purpose | Notable columns |
|---|---|---|
| `magicLinks` | Email-link login (infra ready, SMTP not yet wired) | `token`, `reviewerId`, `expiresAt`, `consumedAt` |
| `auditLog` | Every login + sign-off + status change | `projectId`, `reviewerId`, `action`, `meta` (jsonb) |
| `verify_session` | Postgres-backed session store (created automatically by `connect-pg-simple`) | — |

### Enums (the workflow vocabulary)

```
reviewerRole       admin | delivery | agentryx | htis | hpsedc_staging | hpsedc_final | observer
signoffLevel       agentryx | htis | hpsedc_staging | hpsedc_final
signoffDecision    accepted | rejected | waived
issueStatus        open | in_progress | needs_info | resolved | closed | wont_fix
issueSeverity      blocker | major | minor | trivial
requirementStatus  delivered | partial | not_delivered | deferred | n_a
feedbackType       new_feature | enhancement | bug | ux | similar_sw | other
feedbackStatus     submitted | triaged | planned | in_progress | shipped | declined | duplicate
sprintStatus       draft | in_progress | deployed | closed
```

These are stable. New modules will introduce new enums; the existing ones don't need migration.

---

## 3. Server (Express + Drizzle)

### Entry point — [server/index.ts](../../agentryx-verify/server/index.ts) (97 lines)

- Helmet CSP enforced in production (`'self'` defaults; relaxed for inline styles where Tailwind needs them)
- Postgres-backed sessions with `secure` / `httpOnly` / `sameSite=lax` cookies, 8h max age
- JSON error handler under `/api` so multer errors (size limit, unsupported MIME) return parseable JSON instead of HTML 500
- Static client served from `dist/public`
- Magic-link consume URL is exposed at the clean path `/auth/consume` (not `/api`) so emailed links look right

### Route modules

| File | Endpoints | Lines |
|---|---|---|
| [server/routes/auth.ts](../../agentryx-verify/server/routes/auth.ts) | `POST /api/auth/login`, `POST /api/auth/request-link`, `GET /auth/consume`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/dev-login` | 107 |
| [server/routes/projects.ts](../../agentryx-verify/server/routes/projects.ts) | `GET /api/projects` (role-aware needsFix counts), `GET /api/projects/:slug`, `GET /api/projects/attachments/:id`, `POST /api/projects/:slug/requirements/:reqId/signoff`, `DELETE` same, `PATCH /api/projects/:slug/requirements/:reqId`, `PATCH /api/projects/:slug/visibility`, `GET/POST /api/projects/:slug/requirements/:reqId/comments`, `GET/POST/PATCH /api/projects/:slug/issues` | 379 |
| [server/routes/feedback.ts](../../agentryx-verify/server/routes/feedback.ts) | `POST /api/feedback`, `GET /api/feedback` (list), `GET /api/feedback/stats`, `GET /api/feedback/:id`, `PATCH /api/feedback/:id`, `POST /api/feedback/:id/comments`, `POST /api/feedback/:id/attachments` | 246 |
| [server/routes/sprints.ts](../../agentryx-verify/server/routes/sprints.ts) | `GET /api/projects/:slug/sprints`, `POST` same, `GET /api/sprints/:id`, `PATCH` same, `POST /api/sprints/:id/deploy`, `POST /api/sprints/:id/close`, `DELETE /api/sprints/:id` | 185 |
| [server/routes/export.ts](../../agentryx-verify/server/routes/export.ts) | `GET /api/export/projects/:slug/csv`, `GET /api/export/projects/:slug/pdf` | 118 |

### Middleware

| File | Purpose |
|---|---|
| [server/middleware/auth.ts](../../agentryx-verify/server/middleware/auth.ts) | `requireAuth` — gate any route that needs a session (15 lines) |
| [server/middleware/upload.ts](../../agentryx-verify/server/middleware/upload.ts) | Two multer instances pre-bound to namespaced upload dirs (`uploads/verify/signoff/` and `uploads/verify/feedback/`). 10 MB / 5 files limit. PNG / JPG / WEBP / GIF only. (68 lines) |

### Authorisation rules (enforced server-side)

- **Sign-off:** reviewers can only sign off at their own pipeline level; admin and delivery bypass the level check
- **Issue status:** only the reporter or admin/delivery can change an issue's status (prevents one tester closing another's bug)
- **Feedback triage:** only `admin` / `delivery` / `agentryx` can change status, priority, assignment; submitters see their own items, triagers see all
- **Sprint management:** only `admin` / `delivery` / `agentryx` can create / deploy / close sprints
- **Project visibility:** only `admin` / `delivery` can flip the `visibleToNonAdmin` flag
- **Cross-stage privacy:** non-admin reviewers see only their own pipeline column (the matrix UI hides other levels)

These rules are explicit in each route handler. Centralising them into a policy layer is on the Phase 1 wishlist but not strictly required.

---

## 4. Frontend (React + Vite + wouter)

### Pages

| Page | Lines | Role |
|---|---|---|
| [client/src/pages/Home.tsx](../../agentryx-verify/client/src/pages/Home.tsx) | 170 | Project list. Three-step "How to review" amber banner, project cards with `START HERE / STEP 2 / STEP 3` badges, admin visibility toggle, role-aware needsFix pills. |
| [client/src/pages/Login.tsx](../../agentryx-verify/client/src/pages/Login.tsx) | 62 | Username + password form. Magic-link request stub. |
| [client/src/pages/ProjectView.tsx](../../agentryx-verify/client/src/pages/ProjectView.tsx) | ~1,500 | The matrix surface. ContextStrip + role chips + role detail + issues panel + sprint section + feedback card. **This is the anchor.** Contains: SignoffCell, RoleDetail, RoleDashboard, RequirementInstructions, CommentThread, IssuesPanel, ContextStrip, ReviewerBadge, SignInBanner. |
| [client/src/pages/FeedbackInbox.tsx](../../agentryx-verify/client/src/pages/FeedbackInbox.tsx) | 257 | Per-project feedback inbox. Filters (status / type / mine), expandable rows, comment thread, admin triage controls. |

### Components

| Component | Purpose |
|---|---|
| [Header.tsx](../../agentryx-verify/client/src/components/Header.tsx) | Top bar. Logo + "All projects" pill (added v1.9.1) + reviewer name link to home + sign-out |
| [FeedbackDialog.tsx](../../agentryx-verify/client/src/components/FeedbackDialog.tsx) | "Suggest an idea" modal — captures title, description, type, area, similar-software reference |
| [FeedbackCard.tsx](../../agentryx-verify/client/src/components/FeedbackCard.tsx) | Per-project feedback summary on ProjectView (counts, link to inbox) |
| [SprintSection.tsx](../../agentryx-verify/client/src/components/SprintSection.tsx) | Sprint releases UI — admin creates / deploys / closes sprints; reviewers see deployed list and re-verify chips |

### API client — [client/src/lib/api.ts](../../agentryx-verify/client/src/lib/api.ts) (131 lines)

Single `api` object exporting one function per endpoint. Uses `fetch` with `credentials: "include"` for session cookies. Throws `Error("status: text")` on non-2xx so callers can `try/catch` and surface real reasons. FormData paths (signoff, comment, feedback attachment) use raw `fetch` rather than the typed `req<T>` helper.

---

## 5. Modules currently shipped

### 5.1 — Sign-off matrix (the original product)

The compliance matrix view is the heart of the product. For each requirement row, four columns of decisions: Agentryx Internal, HTIS, HPSEDC Staging, HPSEDC Final. Reviewers click their column to record Pass / Partial / Fail with optional comment + screenshot attachments (paste from clipboard, drag-drop, or file picker — all three work).

Sub-features:
- Sectioned tabs inside each role view
- Section + role aging badges (per v0.9.1)
- Cross-section deep links via `#row=<itemRef>` URL hash (added v1.9.1)
- "My pending" filter chip (added v1.9.1)
- Role-aware "Needs fixing / My funnel" filter (added v1.9.1)
- Reverify one-click chip — appears when a deployed sprint covered the row, lets the reviewer flip rejection to Pass with auto-comment naming the sprint + buildRef (added v1.9.1)
- Reject quick-tags — six pre-canned reasons reviewers can prepend to comments (added v1.9.1)
- Copy-link icon on each row (added v1.9.1)

### 5.2 — Issues log

Per-project defect tracker. Severity (blocker / major / minor / trivial), status (open / in_progress / needs_info / resolved / closed / wont_fix), short ID per project (e.g. `HS-001`). Optional link to a requirement `itemRef`. Inline status dropdown with save indicators.

### 5.3 — Ideas / Feedback inbox (v1.7.0)

Forward-looking suggestions distinct from the defect log. Auto-generated reference codes (`FB-2026-NNNN`). Six types (new feature / enhancement / bug / UX / similar software / other). Per-project scope. Admin/delivery/agentryx triage states (submitted → triaged → planned → in_progress → shipped, plus declined / duplicate). Submitters see only their own items; triagers see all. Attachments via the polymorphic `attachments` table with `ownerType="feedback"`.

### 5.4 — Sprint releases (v1.8.0)

Delivery-cycle tracking. Admin creates a draft sprint, lists `fixedItemRefs[]` (requirement IDs that the sprint resolves), deploys (which bumps the project `buildRef`) and eventually closes. Reviewers whose previous Fail / Partial signoffs predate a deploy that fixed their row see a `🔁 re-verify` chip — clickable in v1.9.1, auto-passes with sprint-naming comment.

### 5.5 — Cross-cutting features

- **CSV / PDF export** of the full sign-off matrix per project
- **Audit log** records every login + signoff change in `audit_log`
- **Project visibility** toggle (admin can hide projects from non-admins)
- **Three-project seed system** — FRS contracted scope (155 reqs), HTIS QA smoke (77 reqs), Beyond-FRS enhancements (206 reqs)
- **Magic-link infrastructure** — table + endpoint exists; SMTP not wired so links return as JSON in dev mode

---

## 6. Live deployment

| | |
|---|---|
| URL | https://verify-stg.agentryx.dev |
| Process manager | PM2 (id 1, name `agentryx-verify`) |
| Reverse proxy | nginx, vhost `verify-stg.agentryx.dev` (`client_max_body_size 20m`) |
| TLS | Let's Encrypt |
| Database | Local Postgres (`agentryx_verify` DB, user `hirestream`) |
| Working directory | `/home/subhash.thakur.india/Projects/Recruitment/agentryx-verify` |
| Restart command | `npm run build && pm2 restart agentryx-verify --update-env` |
| Companion app | HireStream at https://hirestream-stg.agentryx.dev (pm2 id 0) — same VM |

### Live data (as of 2026-05-06)

| | |
|---|---|
| Projects | 3 (FRS v1.4, HTIS smoke, Beyond-FRS extras) |
| Requirements | 155 + 77 + 206 = 438 total rows |
| Reviewers | 5 demo accounts seeded (admin, agentryx, htis, hpsedc, uat) |
| Signoffs recorded | 295 across 4 levels |
| Sprints deployed | 2 |
| Feedback items | 5 (all `submitted` state) |
| Attachments | 10 |
| Issues raised | 3 |

---

## 7. Conventions worth knowing

- **Re-seeding is idempotent.** `seed.ts` and `seed-v15-extras.ts` use UPSERT on `(projectId, itemRef)` — re-running them does not wipe reviewer signoffs. (This was a hard-learned lesson; the original seeds did `db.delete(...)` and accidentally nuked ~56 reviewer decisions during a development session.)
- **Drizzle `sql` template tag with arrays is dangerous.** Prefer `inArray(col, jsArray)`. The pattern `` sql`... = ANY(${arr}::text[])` `` mis-serializes JS arrays and throws Postgres `22P02`.
- **Upload directories are namespaced.** Verify writes to `uploads/verify/signoff/` and `uploads/verify/feedback/`. The bare `uploads/` root is intentionally empty. Constants are exported from middleware so route code never builds disk paths from raw strings.
- **nginx `client_max_body_size`** is per-vhost. Any new subdomain needs `client_max_body_size 20m;` or it defaults to 1 MB.
- **Cross-stage decision privacy** is by design. Non-admin reviewers see only their own pipeline column to prevent bias. The "Needs fixing" filter respects this — for testers it scopes to their own funnel.

---

## 8. What this inventory makes obvious

A few patterns recur — they are the leverage points for adding new modules:

1. **Polymorphic `attachments`** — `ownerType` + `ownerId` already supports `signoff` / `comment` / `feedback`. Adding `ticket` or `decision` is a one-line change.
2. **Reusable `comments` thread pattern** — every entity that wants discussion gets a `comments` mirror table (currently `comments` for requirements, `feedback_comments` for feedback). Future modules duplicate this.
3. **Reviewers + roles + projectReviewers** is generic — the same auth model serves any module.
4. **`audit_log` is generic** — `projectId` + `action` string + `meta` jsonb. New modules write events here; nothing schema-side to change.
5. **`requirements` table is row-shaped** — a "row in a matrix" can naturally model tickets, test cases, decisions, etc., if we add a `row_type` discriminator. (Phase 1 work.)

These are not accidents. The original schema design anticipated growth in this shape, even if not by name.
