# Delta — v0.4.7.0 → v0.4.8.0 (2026-05-25)

> Read `01_Baseline_Context_v0.4.7.md` for full project state. This file only records **what changed** since.
>
> Convention: deltas are smaller incremental files. When deltas accumulate or architecture shifts meaningfully, fold them into a new full baseline (`03_Baseline_Context_vX.Y.Z.md`).

---

## What changed in v0.4.8.0

**Grievance routing overhaul** — every complaint now lands in front of the right responder instead of all piling into the admin queue.

### The decision

Categories drive who the first-responder is:

| Category | First-responder | Auto-route source |
|---|---|---|
| `application_issue` (with `metadata.applicationId`) | The **agent** who owns the application's job | DB lookup `applications → jobs → agent_id` |
| `technical_problem` | Whichever user is set in `grievance.technical_owner_user_id` (typically an Agentryx delivery contact) | system_settings → falls back to admin queue if unset |
| `fraud_report` · `agency_complaint` · `policy_inquiry` · `other` | HPSEDC Admin (queue, no specific user pinned) | n/a |

If routing can't resolve a specific user (e.g. `application_issue` with no `applicationId`, or `technical_problem` with no configured owner) → admin queue.

### Code map

| File | Change |
|---|---|
| **NEW** `server/services/grievance-router.service.ts` | `autoRouteGrievance(category, metadata)` + `slaDaysForCategory(category)` helpers |
| `server/services/settings.service.ts` | Added 5 new keys under category `access`: `grievance.technical_owner_user_id`, `grievance.sla_days_default` (7), `grievance.sla_days_application_issue` (3), `grievance.sla_days_technical` (3), `grievance.sla_days_fraud` (2) |
| `server/routes/grievance.routes.ts` | (a) POST runs the router before insert, stamps `assigned_to` + a one-line routing reason on `admin_notes`. (b) `requireRole(["admin"])` widened to `["admin", "superadmin"]` everywhere. (c) PATCH gate now allows the assigned owner OR admin/superadmin (was admin-only). (d) NEW `GET /grievances/assigned-to-me` for any role. (e) PATCH supports `assignedTo` field (admin-only — reassign + notify new owner). (f) Every status change + reassign writes to `audit_log` via `logTransition()`. (g) Admin list response hydrated with `submitter` + `owner` (username + role) so UI shows attribution without a second round-trip. (h) Added `applicationId` to the metadata whitelist (was silently dropped, broke application_issue routing). |
| `client/src/pages/admin-dashboard.tsx` | `GrievanceCard` shows "From: priya_verma (candidate)" + "Assigned to: europe_careers (agent)" or "Unassigned — admin queue" badges. Routing-reason rendered in italic small print. |

### Verify portal additions

Three new items in the `hirestream-v1.4` FRS project, Section 10 (Grievances & Support):

- **10.6** — Auto-route grievance on submit based on category + metadata
- **10.7** — Non-admin owner can action assigned grievance (status, notes)
- **10.8** — Superadmin god-view of all grievances

Project build_ref bumped: `v0.4.5.0` → `v0.4.8.0`.

### How to configure the technical-grievance owner

Right now there is no fixed Agentryx-delivery user in the DB, so technical_problem grievances fall through to admin. Once an Agentryx delivery contact is set up as a user, set the system_settings key:

```sql
UPDATE system_settings SET value = '"<that-users-user_id>"'
WHERE key = 'grievance.technical_owner_user_id';
```

…or via the existing System Settings admin UI (the new keys live under category "access"). After the next request, autoRouteGrievance picks it up — no restart needed.

### Smoke summary (live on staging)

| Test | Result |
|---|---|
| fraud_report → admin queue (assignedTo null) | ✓ |
| technical_problem → admin queue with hint to configure setting | ✓ |
| application_issue + applicationId → routed to europe_careers agent | ✓ |
| agency_complaint → admin queue | ✓ |
| Agent sees their assigned grievance via `/grievances/assigned-to-me` | ✓ |
| Agent can PATCH status to under_review | ✓ |
| Non-owner, non-admin candidate gets 403 on PATCH | ✓ |
| Admin list shows submitter + owner badges | ✓ |
| audit_log captures grievance.create + grievance.status_change | ✓ |
| Superadmin god-view | _untested — admin/superadmin password drifted; once set, role gate already widened_ |

### What this doesn't do (deferred)

- **No SLA-aging badge on the cards** (yet) — settings + `slaDaysForCategory()` are in place but not rendered yet. Easy follow-up.
- **No cron escalation** — grievances don't auto-escalate to admin when an agent ignores them past SLA. Cron design is "every hour scan for stale unresolved grievances assigned to non-admin, status=submitted+>SLA → status=escalated, reassign to admin, notify both". Ship when first agent ignores a real complaint.
- **No agent-dashboard widget** — agents must visit a (yet to-be-built) "My grievances" page to see assigned items. Endpoint exists (`/grievances/assigned-to-me`); UI is a future visit.
- **No `application_issue` flow from candidate UI** — the `/grievances` page doesn't pre-fill `metadata.applicationId` when a candidate clicks "Report a problem" on an application. Until that wiring lands, application_issue grievances will keep falling through to admin (router can't route without the applicationId).

### Net effect on a normal day

A candidate's "agent hasn't responded in 2 weeks" complaint now pings the agent directly within seconds of submission, with a 3-day SLA hint and a notification. Admin still sees everything in the god-view but is no longer the single bottleneck.

---

## Nothing else changed

Architecture, credentials, URLs, infra, mobile state, backup module, security audit posture — all per 01_Baseline_Context_v0.4.7.md.
