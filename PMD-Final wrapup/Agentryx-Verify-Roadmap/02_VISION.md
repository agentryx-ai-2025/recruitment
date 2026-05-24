# 02 — Vision and Principles

The product hypothesis, the discipline, and what does and does not belong in Agentryx Verify.

---

## The product hypothesis

Every software project — from a startup to a state government — fragments stakeholder coordination across 10+ tools:

- **Code** lives in GitHub / GitLab
- **Engineering tickets** live in Jira / Linear
- **Customer support** lives in Zendesk / Freshdesk / Intercom
- **Product feedback** lives in Notion / spreadsheets / email
- **Test results** live in TestRail / spreadsheets / "QA's local laptop"
- **Compliance and sign-off** lives in Excel + email
- **Decisions and meeting notes** live in Confluence / Slack / nowhere
- **Incidents and uptime** live in PagerDuty / Statuspage
- **Releases and changelogs** live in GitHub Releases / nowhere

Each tool optimises for one persona — the developer, the customer, the QA engineer, the project manager — and **nothing aligns the contractor, sub-contractor, end-customer, and dev team on a single pane**.

Verify's hypothesis is that there is a missing layer above all of this: a **stakeholder consensus hub**. Not a system of record for any one specialty, but the place where every party — internal team, contractor, end-customer, support team, dev team — sees the same answer to the same three questions:

1. What is done?
2. What is broken?
3. What is promised next?

When a customer-facing portal flags a partial delivery, when a tester rejects a build, when a sprint ships a fix — all of those events flow into the same matrix. Every stakeholder sees the row of truth.

That is the product. Everything else is mechanics.

---

## The octopus model

The matrix view is the **head of the octopus**. The arms — modules — radiate out from the head:

```
                       Public API
                  ┌──────────────────────┐
                  │   External portals   │
                  │  (HireStream + others)│
                  └──────────┬────────────┘
                             │ webhooks ⇄ ingest
                             │
                    ┌────────▼────────┐
       Sign-off ◄───┤                 ├───► Support tickets
                    │                 │
       Sprint   ◄───┤   THE MATRIX    ├───► Test runs
       releases     │   (the anchor)  │
                    │                 │
       Ideas    ◄───┤                 ├───► Decision log
       inbox        └────────┬────────┘     / standup
                             │
                    ┌────────▼────────┐
                    │  Knowledge base │
                    │  (cross-module  │
                    │  searchable)    │
                    └─────────────────┘
```

Every arm shares:
- The same auth and role model
- The same comments / attachment pattern
- The same audit log
- The same matrix UX shape (rows × columns, click cell to act)

What differs per arm is only the row entity: requirements, tickets, test cases, decisions, articles. The user always reads the same UI shape, even when the data underneath changes.

---

## System of record vs. consensus hub — the critical distinction

This single distinction decides whether the product becomes a category leader or another forgettable enterprise tool.

| Verify is | Verify is NOT |
|---|---|
| A consensus layer ABOVE existing tools | A replacement for Jira, GitHub, Zendesk, Datadog |
| A place for stakeholder verdicts on shared work | A place for engineering operations |
| The home of "what's promised, what's done, what's broken" | The home of code, telemetry, infrastructure |
| Pull data IN from systems of record (deploy events, ticket counts, test results) for visibility | The system of record for any of those |
| Stakeholder-facing, low-jargon, no-training | Engineer-facing power tooling |

**Why this distinction matters:** every product that has tried to be both a consensus hub AND a system of record has bloated and lost. Atlassian, ServiceNow, Salesforce, even Linear at its scale — they accumulate features for the system-of-record use case and the consensus use case suffers. The matrix UX that a contractor's QA team can use without training is incompatible with the depth a power-user developer needs from their issue tracker. They are different products with different aesthetics.

Verify's bet is to **stay above the fray**. Be the layer where every stakeholder agrees on outcomes. Let the systems of record stay where engineers want them.

---

## Design principles

These principles bind every Phase 1+ decision. When in doubt, fall back to them.

### Principle 1 — Protect the anchor

The matrix-as-the-UI is the source of the product's no-training UX. Every new feature must answer: *does this fit on the matrix or does it need a new surface?* If it can fit, it should fit. If it cannot, it goes elsewhere — sidebar, separate page, separate module — but not as a column or row that bloats the matrix beyond comprehension.

A reviewer's whole-screen mental model is: *rows are work items, columns are stakeholders, cells are verdicts*. Anything that breaks that shape breaks the product.

### Principle 2 — One entity shape: rows in a matrix

Whether the row is a sign-off requirement, a customer ticket, a test case, a decision, or an article, it always has the same logical shape:

- An identifier (`itemRef`-like or auto-generated)
- A category / section
- A description
- A current verdict-or-status
- Optional comments thread
- Optional attachments
- An audit history

Adding a new module = adding a new `row_type` that conforms to this shape, plus the workflow specifics. Modules that do NOT fit this shape (e.g. a real-time chat, a continuous-data dashboard) belong elsewhere — link out to them, don't build them in.

### Principle 3 — Stakeholder columns, not user columns

The matrix's columns represent **organisational stakeholders**, not individual users. "HTIS" is a column, not "Rajesh from HTIS". Multiple people in HTIS sign off into the same column; their identity shows up in the audit log + signoff metadata, not as a column of their own.

This scales: a 50-person customer org and a 2-person contractor are both single columns. The product never needs UI for "show me Rajesh's view" because Rajesh's view is just "the HTIS column".

### Principle 4 — Pull data in, don't be the system of record

The product is most powerful when external systems (HireStream's CI, GitHub's deploy events, Zendesk's open ticket count) push their truth into Verify. Verify shows that truth in the matrix. Reviewers act on it.

Implication: **build a strong public API and webhook system early** (Phase 2). It is cheaper to make Verify pluggable than to keep replicating data manually.

### Principle 5 — Cross-stage privacy by default

Each stakeholder sees their own column. Cross-stage visibility (admin sees all four, tester sees only their own) is intentional bias-prevention. Any new feature that exposes one stakeholder's verdicts to another non-admin must be opt-in by the data owner.

This came up concretely in v1.9.1: the "Needs fixing" filter could have shown HTIS rejections to HPSEDC Staging reviewers, breaking the bias-prevention design. Instead it scopes to the viewer's own funnel and reveals cross-stage only for admin/delivery.

### Principle 6 — Never wipe the data

Sign-offs, comments, attachments, and audit-log entries are sacred. Re-seeding scripts UPSERT, never DELETE. Schema migrations preserve history (no destructive `DROP COLUMN`). When in doubt, log to audit_log.

### Principle 7 — Boring tech beats clever tech

Express, Postgres, Drizzle, React, Tailwind. No Redis cache layer until measured contention. No background job system until a real workload demands one. No GraphQL until REST genuinely fails. Every layer added is a layer that can break. The goal is for one engineer to hold the whole product in their head — that means saying no to most "but this would be cleaner" temptations.

### Principle 8 — Stakeholder-facing aesthetics, not engineer-facing

Copy is plain English. No "deferred parent epic" jargon. No three-letter status codes the user has to learn. The amber "How to review" banner on Home is the standard — every new module needs an equivalent for first-time visitors. If a feature requires a docs link to use, it is not done.

---

## What does NOT belong in Verify

Saying no is half the discipline. These are explicit non-goals:

| Adjacent space | Why we don't go there |
|---|---|
| Source-code repository | Git, GitHub, GitLab. Not our problem. |
| Real-time pull-request review | GitHub PRs, Linear, Reviewable. Heavy DAG model, not row-shaped. |
| Continuous integration / build orchestration | GitHub Actions, CircleCI. We ingest results, we don't run builds. |
| Infrastructure monitoring / log search | Grafana, Datadog, ELK. Continuous-data UX, not matrix UX. |
| Real-time chat / video meetings | Slack, Teams, Zoom. We capture decisions FROM meetings, we don't host them. |
| Time-tracking / billing | Harvest, Toggl. Different mental model and stakeholder. |
| HR / payroll / org chart | BambooHR, Personio. Out of scope. |
| Sales CRM | Salesforce, HubSpot. Customer-facing but pre-contract. |
| Marketing / analytics | Amplitude, Mixpanel. Continuous-data, not matrix. |
| Social / community features (forums, voting) | Discourse, Canny. Public-facing, different design constraints. |

When a customer asks for any of the above, the answer is *"we integrate with the system of record for that — point us at your existing tool"*, not *"we'll build it".*

---

## What this means for the roadmap

The phases in `03_ROADMAP.md` are constrained by these principles. Every phase passes three tests:

1. **Anchor test** — does it preserve or reuse the matrix UX? If it adds a new surface, is the surface justified?
2. **Hub test** — does it pull stakeholder data into a single source of truth, or does it duplicate work that's already in another tool?
3. **No-training test** — can a new reviewer understand it without onboarding? If not, what's the amber banner that makes it self-explanatory?

A phase that fails any of these tests is wrong, no matter how technically clean.
