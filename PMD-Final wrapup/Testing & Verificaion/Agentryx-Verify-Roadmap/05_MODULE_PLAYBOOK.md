# 05 — Module Playbook

How to add a new module without breaking the anchor. This is the practical recipe — every Phase 3+ module follows it.

The playbook came out of how Feedback, Sprint Releases, and Issues were actually built in 2026. They share a structure not because someone planned it but because the schema and UX rewarded that structure. Codify it now so future modules don't drift.

---

## What counts as a module

A module is a coherent body of work that:

1. Has its own primary entity (rows, tickets, test cases, decisions, articles)
2. Reuses the existing matrix-shape UX or a documented variant
3. Reuses comments + attachments + audit log
4. Reuses the existing reviewer / role / permission model

If a proposed feature can't reuse all four, it's either a UI surface (banner, drawer, toast — fine) or it's the wrong shape and shouldn't be a module.

---

## The seven steps

### 1. Decide if it's a `row_type` or a sibling table

The Phase 1 `row_type` discriminator on the `requirements` table lets new "row in a matrix" entities live alongside requirements without a new table. Start there.

| Entity | Recommendation |
|---|---|
| Test case | `row_type='test_case'` on the same table. Has steps + expected, like requirements. |
| Decision | `row_type='decision'` on the same table. Description + rationale. |
| Help article | Sibling table — articles are markdown bodies, very different shape. |
| Support ticket | Sibling table — has customer-facing fields (`submitter_email`, SLA timers). |
| Incident | Sibling table — incidents have time-bounded life and severity escalation. |

**Heuristic:** if the entity is "a row in the same matrix that the user clicks to act on", same table. If the entity has fields no other row needs (SLA timers, customer email, escalation paths), sibling table.

### 2. Define the schema additions

Always:

- One main table for the entity
- Optional sibling table for the entity's own comments thread (`feedback_comments` is the precedent). Or reuse the generic `comments` table with a polymorphic `requirementId` → `entityId` fix (Phase 1 cleanup work).
- Reuse `attachments` polymorphically — add a new `ownerType` value
- Add the entity's status to a new pgEnum
- Add an `id varchar(21) primary key` with `nanoid()` default
- Add `createdAt` and `updatedAt` columns
- Add a `projectId` FK if the entity is project-scoped (most are)
- Add a unique reference code where users will quote it (`FB-2026-NNNN`, `TKT-2026-NNNN`)

**Don't:**

- Add a `metadata jsonb` field as a catch-all. JSON columns become schema drift in disguise. Define explicit columns.
- Add status as a free-text field. Use pgEnum.
- Re-implement what the existing entities already do (file attachment storage, audit logging).

### 3. Design the route module

Mirror the `feedback.ts` shape:

```
const moduleRouter = Router();

moduleRouter.post("/", requireAuth, async (req, res) => { … });        // create
moduleRouter.get("/", requireAuth, async (req, res) => { … });         // list (filterable)
moduleRouter.get("/stats", requireAuth, async (req, res) => { … });    // aggregate counts
moduleRouter.get("/:id", requireAuth, async (req, res) => { … });      // detail
moduleRouter.patch("/:id", requireAuth, async (req, res) => { … });    // triage / status
moduleRouter.post("/:id/comments", requireAuth, async (req, res) => { … });
moduleRouter.post("/:id/attachments", requireAuth, uploader, async (req, res) => { … });
```

Handler conventions:

- Validate request body inline (matches the UI form rules)
- Return 201 for new resource creation
- Use `requireAuth` even on read endpoints unless the resource is genuinely public (Phase 3 ticket form)
- Add audit-log entries for every state change: `db.insert(auditLog).values({ action: "ticket.status_changed", meta: { from, to } })`
- Apply role-based permission via the policy module (Phase 1) — never hard-code role checks in route handlers if there's a generic predicate

### 4. Design the UI surface

Three placements for module entry:

| Placement | Used by | When to use |
|---|---|---|
| **Top-level route** (e.g. `/p/:slug/feedback`) | Feedback inbox, Sprint detail | When the module needs its own filterable list view |
| **Tab inside ProjectView** | Decisions (Phase 5) | When the module is project-scoped and reviewers move between it and the matrix |
| **Card on ProjectView overview** | FeedbackCard, SprintSection | Summary + link to full module view |

Pick one as primary, one as the summary card on Overview. Don't add three.

UI conventions:

- First-time visitor sees an amber "How to use this module" banner like Home's "How to review"
- Empty state explains what the module is and shows a clear "+" button
- Filter chips at the top match the matrix style (status / type / mine / search)
- Row click opens an inline expandable view (not a modal — modals break the matrix shape)
- Comments + attachments use the same pattern as the requirement comments

### 5. Wire up cross-cutting plumbing

Every module gets these for free if you follow the pattern:

| Plumbing | How |
|---|---|
| Audit log | Insert into `audit_log` on every state change with `action: "<module>.<verb>"` |
| Notifications (Phase 1) | Subscribe the right reviewers to the right events; the notification service routes to the drawer + email |
| Webhooks (Phase 2) | Register new event types in `event_types[]` enum; `event_outbox` does the rest |
| Activity feed (Phase 1) | Already pulled from `audit_log`; if you logged it, it shows up |
| Cross-module search (Phase 7) | Define a `search_index` view that includes the module's text fields |

**Plumbing you should NOT roll yourself** — the temptation is to "just write a quick logger" or "just send the email directly". Resist. Every quick-fix here is technical debt. Use the cross-cutting service or upgrade it.

### 6. Define the export shape

Every module's data is exportable to CSV and PDF. The existing `export.ts` is hard-coded for requirements + signoffs; Phase 1 should generalise it to a registry pattern:

```ts
const exporters: Record<string, ExportFn> = {
  requirements: exportRequirementsMatrix,
  feedback: exportFeedbackInbox,
  tickets: exportTicketsList,        // Phase 3
  decisions: exportDecisionLog,      // Phase 5
};
```

The export endpoint takes a `?include=` query: `?include=requirements,feedback,decisions` exports a multi-section PDF. Customers want the consolidated report.

### 7. Add a Verify module-of-the-product item

Verify is its own customer. Every new feature in HireStream has been getting a Verify entry. New modules in Verify itself need an internal sign-off too — define the acceptance criteria as Verify rows and have the test team go through them.

(This is recursive but useful: Agentryx eats its own dog food, and the discipline catches gaps the engineer missed.)

---

## Anti-patterns to avoid

These have all come up and should never be repeated:

### Anti-pattern 1 — A new modal for every module

A modal pulls focus, breaks browser-back, and forces yet another UI to learn. The matrix uses inline expansion (click a row, the row expands into the row below). Every module follows the same pattern. The only modals in v1.9.1 are the FeedbackDialog and the SignoffCell popover, and the dialog is on its way out — once Phase 5 ships we'll replace the dialog with an expandable row in the inbox.

### Anti-pattern 2 — A new role for every module

The reviewer role enum has seven values. New modules should reuse them. If a new module truly needs a new role (Phase 3 adds `support`), that's allowed but rare. Adding `feedback_admin` and `sprint_admin` and `kb_editor` would be a permissions sprawl.

### Anti-pattern 3 — Per-module attachment storage

Every module reuses `attachments` with a new `ownerType`. We do NOT add `feedback_attachments` or `ticket_attachments` tables. Polymorphic ownership keeps the file lookup, namespace, and quota logic in one place.

### Anti-pattern 4 — Per-module session / auth

There is one auth system: `req.session.reviewerId` on the cookie path, `Authorization: Bearer …` on the API path (Phase 2), magic links for email-based one-shot access. New modules don't invent new auth mechanisms.

### Anti-pattern 5 — Re-defining "status" with overlapping enums

Every module gets its own status enum with the right vocabulary. But the meanings should align. `submitted → triaged → planned → in_progress → shipped → declined` (feedback) and `new → in_triage → awaiting_customer → awaiting_dev → resolved → closed` (tickets) follow the same general shape: incoming → being-worked-on → terminal-states. The cross-module dashboard (Phase 6) reduces to `pending / active / done`. Keep the granular states inside the module; align the abstract states across.

### Anti-pattern 6 — Real-time everything

WebSockets + live updates feel modern but cost a lot. Verify is async-collaboration-friendly: a reviewer signs off, refresh shows it. Phase 2's webhook system will push events to subscribers but the UI itself is poll-on-action (refresh after the user clicks). Real-time updates are a v3+ project once we have evidence reviewers actually sit on the page waiting.

### Anti-pattern 7 — Custom workflow engines

Customers will eventually ask for "if HTIS rejects, auto-create a ticket assigned to engineer X with priority Y based on conditions". This is the ServiceNow rabbit hole. Don't go there. The 4-stage pipeline + manual triage covers 95% of needs. The 5% who need conditional automation can integrate via webhooks with Zapier / their existing rule engine.

---

## Worked example — Phase 3 Support module skeleton

To make the playbook concrete, here is the skeleton of how Support is built using the playbook above:

### Schema

```ts
// New enum
export const ticketStatusEnum = pgEnum("ticket_status", [
  "new", "in_triage", "awaiting_customer", "awaiting_dev", "resolved", "closed",
]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low", "normal", "high", "urgent",
]);

// New table — sibling, because tickets have submitter (non-reviewer) fields
export const tickets = pgTable("tickets", {
  id: id(),
  projectId: varchar("project_id", { length: 21 }).notNull().references(() => projects.id),
  referenceCode: varchar("reference_code", { length: 24 }).notNull(),
  submitterEmail: varchar("submitter_email", { length: 200 }).notNull(),
  submitterName: text("submitter_name").notNull(),
  submitterOrganization: text("submitter_organization"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").notNull().default("new"),
  priority: ticketPriorityEnum("priority").notNull().default("normal"),
  assignedToId: varchar("assigned_to_id", { length: 21 }).references(() => reviewers.id),
  slaResponseDueAt: timestamp("sla_response_due_at"),
  slaResolutionDueAt: timestamp("sla_resolution_due_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: now(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  codeIdx: uniqueIndex("tickets_code_idx").on(t.referenceCode),
  projectIdx: index("tickets_project_idx").on(t.projectId),
  statusIdx: index("tickets_status_idx").on(t.status),
}));

// Comments — generic comments table with polymorphic owner (Phase 1 cleanup)
// or sibling table mirroring feedback_comments. Either is fine.

// Attachments — reuse existing `attachments` with ownerType="ticket"

// New role
// Add 'support' to reviewerRoleEnum
```

### Routes

```
POST   /api/v1/projects/:slug/tickets             public, captcha-gated, no auth
GET    /api/v1/projects/:slug/tickets             requireAuth + (admin | support)
GET    /api/v1/projects/:slug/tickets/stats       same
GET    /api/v1/projects/:slug/tickets/:id         requireAuth + (admin | support | submitter via magic link)
PATCH  /api/v1/projects/:slug/tickets/:id         requireAuth + (admin | support)
POST   /api/v1/projects/:slug/tickets/:id/comments   requireAuth or magic-link
POST   /api/v1/projects/:slug/tickets/:id/attachments
```

### UI

- New route `/p/:slug/support` — list view with status filter chips matching feedback inbox
- New project-overview card "Support" — matches the FeedbackCard pattern
- New customer-facing route `/support/:slug` — minimal, no header chrome, captcha + submit form
- Magic-link consume route `/auth/consume` already exists; extend to handle ticket-follow-up purpose

### Cross-cutting

- Audit log: `ticket.created`, `ticket.status_changed`, `ticket.assigned`, `ticket.resolved`
- Notifications: assignee on `ticket.created` + `ticket.replied`, customer on `ticket.replied` + `ticket.resolved`
- Webhooks: same event names exposed in the public API
- Export: tickets export shape added to the export registry

### Acceptance

This is the same checklist as `03_ROADMAP.md` Phase 3:

- Customer with no Verify account can submit a ticket via the public form
- They receive an email confirmation with a magic link
- Following the link opens a single-row view showing only their ticket
- Support agent triages from the inbox, ticket changes status, customer is emailed
- Ticket count + SLA breach count surface on the project's Home card

That's the whole module — about 2 weeks of work, every step covered by patterns the codebase already has.

---

## When the playbook fails

If you find yourself fighting the playbook, that's a signal. The most likely reasons:

1. **The new module isn't matrix-shaped.** If the user's mental model is "a graph of dependencies" or "a real-time stream of events" or "a hierarchical tree", it's not a module. It's either out of scope, or it's a different surface that links out.

2. **The new module's role is genuinely new.** New roles deserve scrutiny: do existing reviewers REALLY not cover this? If you genuinely need it (e.g. `support` for Phase 3), add it deliberately, not as an escape hatch.

3. **The new module needs writes from non-Verify users.** That's the Phase 3 problem (customers without reviewer accounts). Solve it with magic links + project-scoped public endpoints. Don't carve out a parallel auth system.

4. **The new module's status needs more than 6-7 states.** That's a workflow-engine smell. Push back; figure out which states are necessary. ServiceNow has 47 states for a reason and that reason is that it's a bad product.

When in doubt: re-read `02_VISION.md`. The principles there are the constraint that keeps the product coherent.
