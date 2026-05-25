import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { storage } from "../storage";
import { grievances, users } from "@shared/schema";
import { eq, and, desc, count, ne } from "drizzle-orm";
import { notify } from "../services/notification.service";
import { logger } from "../config/logger.config";
import { autoRouteGrievance, slaDaysForCategory } from "../services/grievance-router.service";
import { logTransition } from "../services/audit-transitions.service";

const router = Router();

// admin + superadmin both get the god-view of grievances. Used in every
// list/edit endpoint below.
const ADMIN_ROLES = ["admin", "superadmin"];

// ── Submit Grievance (candidate or agent) ───────────────────────────
router.post("/", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const category = String(req.body?.category ?? "");
    const subject = String(req.body?.subject ?? "").trim();
    const description = String(req.body?.description ?? "").trim();

    const validCategories = ["agency_complaint", "application_issue", "technical_problem", "policy_inquiry", "fraud_report", "other"];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: { code: 400, message: `category must be: ${validCategories.join(", ")}` } });
    }
    if (subject.length < 3 || subject.length > 200) {
      return res.status(400).json({ success: false, error: { code: 400, message: "subject must be 3–200 characters" } });
    }
    if (description.length < 10 || description.length > 3000) {
      return res.status(400).json({ success: false, error: { code: 400, message: "description must be 10–3000 characters" } });
    }

    // Structured context — drives the auto-router + the admin watchlist.
    // applicationId is REQUIRED for application_issue auto-routing to the
    // agent; jobId/agencyId let the fraud watchlist show the offending
    // record inline; reason/url are free-text breadcrumbs.
    const metadata: Record<string, any> = {};
    const rawMeta = req.body?.metadata;
    if (rawMeta && typeof rawMeta === "object") {
      if (typeof rawMeta.applicationId === "string") metadata.applicationId = rawMeta.applicationId;
      if (typeof rawMeta.jobId === "string") metadata.jobId = rawMeta.jobId;
      if (typeof rawMeta.agencyId === "string") metadata.agencyId = rawMeta.agencyId;
      if (typeof rawMeta.reason === "string") metadata.reason = rawMeta.reason.slice(0, 60);
      if (typeof rawMeta.url === "string") metadata.url = rawMeta.url.slice(0, 400);
    }

    // Auto-routing — pick an owner based on category + metadata. Keeps the
    // "where does this go" decision in one place (grievance-router.service)
    // instead of leaving everything in the admin's queue. Returns null when
    // we can't pick a specific user (then the admin queue picks it up).
    const route = await autoRouteGrievance(category as any, metadata);

    const result = await db.insert(grievances).values({
      userId: user.id,
      category,
      subject,
      description,
      status: "submitted",
      assignedTo: route.assignedToUserId,
      adminNotes: route.reason,   // stamps the routing decision so any operator can see why
      metadata,
    }).returning();
    const grievance = result[0];

    // Audit-log the create + the auto-route as a single transition so the
    // who/why is recoverable later.
    logTransition({
      actorUserId: user.id,
      actorRole: user.role,
      entityType: "grievance",
      entityId: grievance.id,
      action: "create",
      fromState: null,
      toState: "submitted",
      reason: `category=${category}; ${route.reason}`,
      ipAddress: req.ip,
    }).catch(() => {});

    // Notify the owner (if any) so they don't have to refresh the dashboard
    // to discover new work. Falls back gracefully — fire-and-forget.
    if (route.assignedToUserId) {
      const slaDays = await slaDaysForCategory(category).catch(() => 7);
      notify({
        userId: route.assignedToUserId,
        type: "system",
        title: `New grievance assigned: ${subject.slice(0, 80)}`,
        message: `Category: ${category}. ${route.reason}. SLA target: ${slaDays} day${slaDays === 1 ? "" : "s"}.`,
        metadata: { grievanceId: grievance.id, category, slaDays },
      }).catch(() => {});
    }

    logger.info(`Grievance ${grievance.id} (${category}) → ${route.assignedToUserId || "admin queue"}`);
    res.status(201).json({ success: true, data: grievance });
  } catch (error) {
    next(error);
  }
});

// ── Grievances assigned to me (any role — agent / tech-owner / etc.) ────
// Lets a non-admin user see grievances they need to action. Agents will see
// application_issue grievances on jobs they own; the technical-owner user
// will see all technical_problem grievances; etc.
router.get("/assigned-to-me", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(grievances)
      .where(eq(grievances.assignedTo, (req.user as any).id))
      .orderBy(desc(grievances.createdAt));

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ── My Grievances ───────────────────────────────────────────────────
router.get("/my", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(grievances)
      .where(eq(grievances.userId, (req.user as any).id))
      .orderBy(desc(grievances.createdAt));

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ── Admin / Superadmin: List All Grievances ─────────────────────────
// Superadmin gets the god-view (same data as admin). Both roles see every
// grievance regardless of assignment; filters narrow the view.
router.get("/", protect, requireRole(ADMIN_ROLES), async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const { status, category, assigned } = req.query;
    const conditions: any[] = [];
    if (status && typeof status === "string") conditions.push(eq(grievances.status, status));
    if (category && typeof category === "string") conditions.push(eq(grievances.category, category));
    // ?assigned=unassigned filters to the admin-queue bucket; ?assigned=me
    // (in the future) could narrow to "things I personally own"; ?assigned=
    // any other user_id matches that owner exactly.
    if (assigned === "unassigned") {
      const { isNull } = await import("drizzle-orm");
      conditions.push(isNull(grievances.assignedTo));
    } else if (typeof assigned === "string" && assigned !== "all") {
      conditions.push(eq(grievances.assignedTo, assigned));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db.select().from(grievances).where(whereClause).orderBy(desc(grievances.createdAt));

    // Hydrate with submitter + owner (username + role) so the admin UI can
    // render "Assigned to: priya_verma (candidate)" without a second round-trip.
    const userIds = new Set<string>();
    for (const r of rows) {
      if (r.userId) userIds.add(r.userId);
      if (r.assignedTo) userIds.add(r.assignedTo);
    }
    const userMap: Record<string, { username: string; role: string }> = {};
    if (userIds.size > 0) {
      const { inArray } = await import("drizzle-orm");
      const ur = await db.select({ id: users.id, username: users.username, role: users.role })
        .from(users).where(inArray(users.id, Array.from(userIds)));
      for (const u of ur) userMap[u.id] = { username: u.username, role: u.role };
    }
    const enriched = rows.map((r: any) => ({
      ...r,
      submitter: r.userId ? userMap[r.userId] : null,
      owner: r.assignedTo ? userMap[r.assignedTo] : null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Get Single Grievance ─────────────────────────────────────
router.get("/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(grievances).where(eq(grievances.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Grievance not found" } });

    // User can only see their own, admin can see all
    const user = req.user as any;
    if (user.role !== "admin" && user.role !== "superadmin" && rows[0].userId !== user.id) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Not authorized" } });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ── Update Grievance (status, notes, reassign, resolve) ─────────────
// Admin / superadmin always; otherwise the assigned owner (so the agent
// who owns an application_issue grievance, or the technical owner, can
// act on it without admin-roundtrip).
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(grievances).where(eq(grievances.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Grievance not found" } });
    const grievance = rows[0];

    const user = req.user as any;
    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const isOwner = grievance.assignedTo === user.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Only the assigned owner or an admin can update this grievance." } });
    }

    const { status, adminNotes, resolutionNotes, assignedTo } = req.body;
    const updates: any = {};
    const fromStatus = grievance.status || "submitted";

    if (status) {
      const validStatuses = ["submitted", "under_review", "action_taken", "resolved", "escalated"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: { code: 400, message: `status must be: ${validStatuses.join(", ")}` } });
      }
      updates.status = status;
      if (status === "resolved") updates.resolvedAt = new Date();
      // When the owner first moves it to under_review, stamp them as the
      // current owner so the audit trail clearly attributes who took
      // action. Skip this for admin who may be acting on someone else's queue.
      if (status === "under_review" && !grievance.assignedTo) updates.assignedTo = user.id;
    }
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;
    // Reassignment — admin/superadmin only. Pass assignedTo:null to push back
    // to the admin queue. Validate the target user exists.
    let reassignedFrom: string | null = null;
    if (assignedTo !== undefined && isAdmin) {
      if (assignedTo === null || assignedTo === "") {
        updates.assignedTo = null;
        reassignedFrom = grievance.assignedTo;
      } else if (typeof assignedTo === "string") {
        const [u] = await db.select().from(users).where(eq(users.id, assignedTo)).limit(1);
        if (!u) return res.status(400).json({ success: false, error: { code: 400, message: "assignedTo user_id does not exist" } });
        updates.assignedTo = u.id;
        reassignedFrom = grievance.assignedTo;
      }
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: { code: 400, message: "No updatable fields supplied" } });
    }

    const result = await db.update(grievances).set(updates).where(eq(grievances.id, req.params.id)).returning();
    const updated = result[0];

    // Audit-log: status change is the most useful row to capture. Reassign is
    // tracked too so an admin can see the chain of ownership later.
    if (status && status !== fromStatus) {
      logTransition({
        actorUserId: user.id, actorRole: user.role,
        entityType: "grievance", entityId: grievance.id, action: "status_change",
        fromState: fromStatus, toState: status,
        reason: resolutionNotes || adminNotes,
        ipAddress: req.ip,
      }).catch(() => {});
    }
    if (reassignedFrom !== null || (assignedTo !== undefined && isAdmin)) {
      logTransition({
        actorUserId: user.id, actorRole: user.role,
        entityType: "grievance", entityId: grievance.id, action: "reassigned",
        fromState: reassignedFrom || "(unassigned)",
        toState: updates.assignedTo || "(unassigned)",
        ipAddress: req.ip,
      }).catch(() => {});
    }

    // Notify the grievance submitter on status change so they know the
    // state of their complaint without polling. Also notify the NEW owner
    // on reassign so they pick up the work.
    if (status && status !== fromStatus) {
      notify({
        userId: grievance.userId,
        type: "system",
        title: `Grievance Update: ${grievance.subject}`,
        message: `Your grievance status has been updated to "${status}".${resolutionNotes ? ' Resolution: ' + resolutionNotes : ''}`,
        metadata: { grievanceId: grievance.id },
      }).catch(() => {});
    }
    if (updates.assignedTo && updates.assignedTo !== grievance.assignedTo) {
      notify({
        userId: updates.assignedTo,
        type: "system",
        title: `Grievance assigned to you: ${grievance.subject.slice(0, 80)}`,
        message: `Reassigned by ${user.username || user.role}. Category: ${grievance.category}.`,
        metadata: { grievanceId: grievance.id, category: grievance.category },
      }).catch(() => {});
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
