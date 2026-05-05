import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { storage } from "../storage";
import { grievances } from "@shared/schema";
import { eq, and, desc, count, ne } from "drizzle-orm";
import { notify } from "../services/notification.service";
import { logger } from "../config/logger.config";

const router = Router();

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

    // Structured context for fraud reports (job id, agency id, reason code).
    // Admin watchlist uses these to show the offending record inline.
    const metadata: Record<string, any> = {};
    const rawMeta = req.body?.metadata;
    if (rawMeta && typeof rawMeta === "object") {
      if (typeof rawMeta.jobId === "string") metadata.jobId = rawMeta.jobId;
      if (typeof rawMeta.agencyId === "string") metadata.agencyId = rawMeta.agencyId;
      if (typeof rawMeta.reason === "string") metadata.reason = rawMeta.reason.slice(0, 60);
      if (typeof rawMeta.url === "string") metadata.url = rawMeta.url.slice(0, 400);
    }

    const result = await db.insert(grievances).values({
      userId: user.id,
      category,
      subject,
      description,
      status: "submitted",
      metadata,
    }).returning();

    logger.info(`Grievance submitted: ${result[0].id} by ${user.id}`);
    res.status(201).json({ success: true, data: result[0] });
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

// ── Admin: List All Grievances ──────────────────────────────────────
router.get("/", protect, requireRole(["admin"]), async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const { status, category } = req.query;
    const conditions: any[] = [];
    if (status && typeof status === "string") conditions.push(eq(grievances.status, status));
    if (category && typeof category === "string") conditions.push(eq(grievances.category, category));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db.select().from(grievances).where(whereClause).orderBy(desc(grievances.createdAt));

    res.json({ success: true, data: rows });
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

// ── Admin: Update Grievance (status, notes, resolve) ────────────────
router.patch("/:id", protect, requireRole(["admin"]), async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(grievances).where(eq(grievances.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Grievance not found" } });

    const { status, adminNotes, resolutionNotes } = req.body;
    const updates: any = {};

    if (status) {
      const validStatuses = ["submitted", "under_review", "action_taken", "resolved", "escalated"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, error: { code: 400, message: `status must be: ${validStatuses.join(", ")}` } });
      }
      updates.status = status;
      if (status === "resolved") updates.resolvedAt = new Date();
      if (status === "under_review") updates.assignedTo = (req.user as any).id;
    }
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;

    const result = await db.update(grievances).set(updates).where(eq(grievances.id, req.params.id)).returning();

    // Notify the grievance submitter
    if (status) {
      notify({
        userId: rows[0].userId,
        type: "system",
        title: `Grievance Update: ${rows[0].subject}`,
        message: `Your grievance status has been updated to "${status}".${resolutionNotes ? ' Resolution: ' + resolutionNotes : ''}`,
        metadata: { grievanceId: rows[0].id },
      }).catch(() => {});
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
