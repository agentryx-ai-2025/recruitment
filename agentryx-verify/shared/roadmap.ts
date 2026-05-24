// Single source of truth for the roadmap dashboard. Hand-synced with
// `PMD-Final wrapup/Agentryx-Verify-Roadmap/Roadmap_Dev_Checklist.md`.
// Future work: parse the markdown directly so there's only one place to
// maintain. For now, every shipped feature gets marked here in the same
// commit that bumps the package version.

export type FeatureStatus = "shipped" | "in_progress" | "planned" | "future";

export interface RoadmapFeature {
  title: string;
  status: FeatureStatus;
  shippedIn?: string;       // e.g. "v1.9.1"
  notes?: string;
}

export interface RoadmapPhase {
  number: number;           // 0 = baseline; 1..9 = future phases
  title: string;
  theme: string;
  effort?: string;          // "~1 week"
  visibleShip?: string;     // headline ship statement
  status: FeatureStatus;    // overall phase status
  features: RoadmapFeature[];
}

export interface RoadmapDoc {
  productName: string;
  currentVersion: string;
  vision: string;
  phases: RoadmapPhase[];
}

export const ROADMAP: RoadmapDoc = {
  productName: "Agentryx Verify",
  currentVersion: "v0.2.1",
  vision: "Single stakeholder-consensus hub for software delivery — sign-off, support, decisions, ideas, and updates in one matrix.",
  phases: [
    // ── Phase 0: baseline (everything live before the new roadmap) ─────
    {
      number: 0,
      title: "Baseline — sign-off matrix and supporting modules",
      theme: "What was already shipped before the new roadmap was written",
      effort: "Years 0-1",
      status: "shipped",
      features: [
        { title: "Multi-stakeholder sign-off matrix (4-stage pipeline)", status: "shipped", shippedIn: "v0.x" },
        { title: "Per-requirement test instructions + expected results", status: "shipped", shippedIn: "v0.x" },
        { title: "Pass / Partial / Fail signoff with comment", status: "shipped", shippedIn: "v0.x" },
        { title: "Screenshot attachments (paste / drag-drop / file picker)", status: "shipped", shippedIn: "v1.6.0" },
        { title: "10 MB upload limit with namespaced disk storage", status: "shipped", shippedIn: "v0.9.7" },
        { title: "Comments thread per requirement", status: "shipped", shippedIn: "v0.x" },
        { title: "Project visibility toggle (admin)", status: "shipped", shippedIn: "v1.x" },
        { title: "Issues log with severity + status + reporter", status: "shipped", shippedIn: "v0.x" },
        { title: "Reporter-or-admin permissions on issue status", status: "shipped", shippedIn: "v0.9.x" },
        { title: "Three-stage role-aware visibility", status: "shipped", shippedIn: "v0.x" },
        { title: "CSV export of full sign-off matrix", status: "shipped", shippedIn: "v0.x" },
        { title: "PDF export of sign-off report", status: "shipped", shippedIn: "v0.x" },
        { title: "Audit log (every login + signoff change)", status: "shipped", shippedIn: "v0.x" },
        { title: "Magic-link auth infrastructure", status: "shipped", shippedIn: "v0.x" },
        { title: "Username + password auth", status: "shipped", shippedIn: "v0.x" },
        { title: "Session persistence in Postgres", status: "shipped", shippedIn: "v0.x" },
        { title: "Reviewer roles enum (7 roles)", status: "shipped", shippedIn: "v0.x" },
        { title: "FRS scope project (155 reqs across 18 sections)", status: "shipped", shippedIn: "v1.4.x" },
        { title: "HTIS QA smoke project (77 reqs)", status: "shipped", shippedIn: "v1.6.x" },
        { title: "Beyond-FRS extras project (206 reqs)", status: "shipped", shippedIn: "v1.5.x" },
        { title: "Sprint Releases module (draft → in_progress → deployed → closed)", status: "shipped", shippedIn: "v1.8.0" },
        { title: "Re-verify chip (deployed-sprint trigger)", status: "shipped", shippedIn: "v1.8.0" },
        { title: "Reverify one-click — chip auto-passes with sprint comment", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Ideas / Feedback inbox (FB-YYYY-NNNN codes)", status: "shipped", shippedIn: "v1.7.0" },
        { title: "Per-project feedback triage", status: "shipped", shippedIn: "v1.7.0" },
        { title: "Polymorphic attachments (signoff / comment / feedback)", status: "shipped", shippedIn: "v1.7.x" },
        { title: "HTIS findings module (5 field defects + 6 clarifications)", status: "shipped", shippedIn: "v1.8.x" },
        { title: "Cross-section deep-link via #row=<itemRef>", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Copy-link icon on each row (hover-visible)", status: "shipped", shippedIn: "v1.9.1" },
        { title: "My pending (N) filter chip", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Reject quick-tags (6 pre-canned reasons)", status: "shipped", shippedIn: "v1.9.1" },
        { title: "All projects pill in header", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Reviewer-name-as-Home-link", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Breadcrumb leads with All projects → Overview → role", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Role-aware Needs fixing / My funnel filter", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Section tabs show fix-count badge", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Per-project Needs fixing pill on Home cards", status: "shipped", shippedIn: "v1.9.1" },
        { title: "Pipeline-aware needs-fix predicate (most-downstream wins)", status: "shipped", shippedIn: "v1.9.1" },
      ],
    },

    // ── Phase 1: foundation polish + cross-project visibility ──────────
    {
      number: 1,
      title: "Foundation polish + cross-project visibility",
      theme: "Foundation for octopus expansion. Cross-project visibility lands now; structural prep enables Phase 2-9.",
      effort: "~1 week",
      visibleShip: "Cross-project dashboard, activity feed, in-app notifications drawer.",
      status: "in_progress",
      features: [
        { title: "Admin Roadmap Dashboard (this page)", status: "shipped", shippedIn: "v0.2.1", notes: "Customer + dev-team scoreboard" },
        { title: "Activity feed on project view", status: "shipped", shippedIn: "v0.2.1", notes: "Surfaces existing audit_log" },
        { title: "Cross-project Home for admin", status: "planned" },
        { title: "In-app notifications drawer (bell icon)", status: "planned" },
        { title: "row_type discriminator on requirements", status: "planned", notes: "Foundation for Phase 3 / 4 / 5" },
        { title: "organizations stub table + nullable FK", status: "planned", notes: "Foundation for Phase 8" },
        { title: "Centralised server/lib/policy.ts", status: "planned" },
        { title: "Pagination on list endpoints", status: "planned" },
        { title: "RoleDetail accepts rowTypeFilter prop", status: "planned" },
      ],
    },

    // ── Phase 2: Public API + Webhooks ─────────────────────────────────
    {
      number: 2,
      title: "Public API + Webhooks",
      theme: "Make Verify a hub by letting external portals push data in and subscribe to events.",
      effort: "~2 weeks",
      visibleShip: "HireStream's CI auto-pushes deploys; partners subscribe to webhooks.",
      status: "planned",
      features: [
        { title: "/api/v1/* versioned namespace", status: "planned" },
        { title: "API token auth (Authorization: Bearer agx_pk_...)", status: "planned" },
        { title: "api_tokens table with bcrypted secret + scopes", status: "planned" },
        { title: "Token management UI (admin)", status: "planned" },
        { title: "event_outbox table + dispatcher worker", status: "planned" },
        { title: "webhook_subscriptions table", status: "planned" },
        { title: "Webhook delivery with HMAC signature + retry", status: "planned" },
        { title: "webhook_deliveries table + admin replay UI", status: "planned" },
        { title: "HireStream → Verify deploy auto-push", status: "planned" },
        { title: "OpenAPI spec at /api/v1/openapi.json", status: "planned" },
        { title: "Per-token + per-project rate limiting", status: "planned" },
        { title: "Standardised JSON error envelope with request_id", status: "planned" },
      ],
    },

    // ── Phase 3: Support module ────────────────────────────────────────
    {
      number: 3,
      title: "Support module",
      theme: "End-customer ticket intake + support team triage in the same matrix UX.",
      effort: "~3 weeks",
      visibleShip: "Customers submit tickets via public form; support team triages in-product; SLA tracking.",
      status: "planned",
      features: [
        { title: "tickets table (with submitter_email + SLA timers)", status: "planned" },
        { title: "support reviewer role", status: "planned" },
        { title: "Public ticket-create endpoint (captcha-gated)", status: "planned" },
        { title: "Customer-facing ticket form at /support/<slug>", status: "planned" },
        { title: "In-product support inbox with status filter chips", status: "planned" },
        { title: "SLA timer visualisation", status: "planned" },
        { title: "SMTP integration", status: "planned" },
        { title: "Ticket follow-up via magic link (single-row view)", status: "planned" },
        { title: "Ticket count + SLA breach pill on Home cards", status: "planned" },
      ],
    },

    // ── Phase 4: Test management ───────────────────────────────────────
    {
      number: 4,
      title: "Test management",
      theme: "Per-project test plans, environments, runs, automated CI ingestion.",
      effort: "~3 weeks",
      visibleShip: "QA runs structured cycles per browser/device/build; CI test results auto-ingest.",
      status: "planned",
      features: [
        { title: "test_plans + test_cases + test_runs + test_results tables", status: "planned" },
        { title: "Test environments enum per project", status: "planned" },
        { title: "CI ingestion endpoint (junit / TAP / JSON)", status: "planned" },
        { title: "Test plan UI: rows × environment columns matrix", status: "planned" },
        { title: "Compare-runs view (regression diff)", status: "planned" },
        { title: "Regression alerts in activity feed + notifications", status: "planned" },
      ],
    },

    // ── Phase 5: Decisions / standup ───────────────────────────────────
    {
      number: 5,
      title: "Decisions / standup",
      theme: "Each project has a Decisions tab; action items track to closure.",
      effort: "~2 weeks",
      visibleShip: "Decisions tab on every project, action-item tracking, standup template.",
      status: "planned",
      features: [
        { title: "decisions table or row_type='decision'", status: "planned" },
        { title: "action_items table linked to decisions", status: "planned" },
        { title: "Decisions tab on every project", status: "planned" },
        { title: "Standup-mode templated row", status: "planned" },
        { title: "Cross-project decision search", status: "planned" },
        { title: "Action-item due-date notifications", status: "planned" },
      ],
    },

    // ── Phase 6: Cross-project analytics ───────────────────────────────
    {
      number: 6,
      title: "Cross-project analytics",
      theme: "Engineering health dashboard across all projects.",
      effort: "~2 weeks",
      visibleShip: "Engineering health dashboard (velocity, defect leak, time-in-stage, SLA breach).",
      status: "planned",
      features: [
        { title: "Pass-rate trend per project", status: "planned" },
        { title: "Defect leak rate", status: "planned" },
        { title: "Time-in-stage per pipeline level", status: "planned" },
        { title: "Sprint velocity (rows-per-sprint)", status: "planned" },
        { title: "Customer SLA breach rate", status: "planned" },
        { title: "metrics_daily aggregation cron", status: "planned" },
        { title: "Monthly engineering report (CSV + PDF)", status: "planned" },
      ],
    },

    // ── Phase 7: Knowledge base ────────────────────────────────────────
    {
      number: 7,
      title: "Knowledge base",
      theme: "Per-project + cross-project searchable KB; auto-generated release notes.",
      effort: "~2 weeks",
      visibleShip: "Articles, auto release notes, customer-facing help portal, cross-module search.",
      status: "planned",
      features: [
        { title: "articles table with markdown + tags + visibility", status: "planned" },
        { title: "Auto-generated release notes from sprint deploys", status: "planned" },
        { title: "Customer-facing help portal at /help/<slug>", status: "planned" },
        { title: "Cross-module Postgres full-text search", status: "planned" },
        { title: "Markdown editor + sanitiser", status: "planned" },
      ],
    },

    // ── Phase 8: Multi-tenancy ─────────────────────────────────────────
    {
      number: 8,
      title: "Multi-tenancy",
      theme: "Triggered when a 2nd customer signs. Full isolation, branded subdomains.",
      effort: "~3 weeks",
      visibleShip: "Second agency / customer onboarded with full data isolation.",
      status: "future",
      features: [
        { title: "organizations table activated", status: "planned" },
        { title: "organization_id FK backfilled across tables", status: "planned" },
        { title: "Tenant-isolation middleware", status: "planned" },
        { title: "Subdomain routing (<org>.verify.agentryx.dev)", status: "planned" },
        { title: "Cross-org admin federation", status: "planned" },
        { title: "Per-org branding (logo / colour / subdomain)", status: "planned" },
      ],
    },

    // ── Phase 9: Mobile / PWA / push ───────────────────────────────────
    {
      number: 9,
      title: "Mobile / PWA / push",
      theme: "Installable PWA with push notifications.",
      effort: "~3 weeks",
      visibleShip: "Installable PWA, push notifications.",
      status: "future",
      features: [
        { title: "PWA manifest + service worker", status: "planned" },
        { title: "Mobile-tuned matrix (vertical-stack on small screens)", status: "planned" },
        { title: "Offline read-only fallback", status: "planned" },
        { title: "Web Push API subscriptions", status: "planned" },
        { title: "Push-notification triggers on watched events", status: "planned" },
      ],
    },
  ],
};

// ── Aggregate roll-up helpers ────────────────────────────────────────
export interface RoadmapStats {
  shipped: number;
  inProgress: number;
  planned: number;
  future: number;
  total: number;
  pctShipped: number;
}

export function statsForPhase(phase: RoadmapPhase): RoadmapStats {
  const count = (s: FeatureStatus) => phase.features.filter((f) => f.status === s).length;
  const total = phase.features.length || 1;
  const shipped = count("shipped");
  return {
    shipped,
    inProgress: count("in_progress"),
    planned: count("planned"),
    future: count("future"),
    total: phase.features.length,
    pctShipped: Math.round((shipped / total) * 100),
  };
}

export function statsAllPhases(doc: RoadmapDoc): RoadmapStats {
  let shipped = 0, inProgress = 0, planned = 0, future = 0;
  for (const p of doc.phases) {
    for (const f of p.features) {
      if (f.status === "shipped") shipped++;
      else if (f.status === "in_progress") inProgress++;
      else if (f.status === "planned") planned++;
      else if (f.status === "future") future++;
    }
  }
  const total = shipped + inProgress + planned + future;
  return {
    shipped, inProgress, planned, future, total,
    pctShipped: total ? Math.round((shipped / total) * 100) : 0,
  };
}
