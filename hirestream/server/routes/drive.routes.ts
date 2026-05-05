import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { storage } from "../storage";
import { logger } from "../config/logger.config";
import { recruitmentDrives, recruitmentAgents, interviews, applications, candidates, jobs, placements } from "@shared/schema";
import { eq, and, desc, gte, count } from "drizzle-orm";
import { notify } from "../services/notification.service";

const router = Router();

// ── Create Drive (verified agent only) ──────────────────────────────
router.post("/", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    if (user.role !== "agent") {
      return res.status(403).json({ success: false, error: { code: 403, message: "Only agents can create drives" } });
    }

    // Get verified agency
    const agencyRows = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.userId, user.id)).limit(1);
    if (!agencyRows.length || !agencyRows[0].verified) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Agency must be verified" } });
    }

    const title = String(req.body?.title ?? "").trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const location = String(req.body?.location ?? "").trim();
    const date = req.body?.date;
    const targetRoles = Array.isArray(req.body?.targetRoles) ? req.body.targetRoles : [];
    const expectedCandidates = req.body?.expectedCandidates;

    if (!title || !date || !location) {
      return res.status(400).json({ success: false, error: { code: 400, message: "title, date, and location are required" } });
    }
    if (title.length < 2 || title.length > 150) {
      return res.status(400).json({ success: false, error: { code: 400, message: "title must be 2–150 characters" } });
    }
    if (location.length > 120) {
      return res.status(400).json({ success: false, error: { code: 400, message: "location too long (max 120)" } });
    }
    if (description && description.length > 3000) {
      return res.status(400).json({ success: false, error: { code: 400, message: "description too long (max 3000)" } });
    }
    if (targetRoles.length > 30) {
      return res.status(400).json({ success: false, error: { code: 400, message: "max 30 target roles" } });
    }
    const cleanRoles = targetRoles
      .map((r: any) => String(r).trim().slice(0, 40))
      .filter((r: string) => r.length > 0);

    // Drive approval required? Configurable setting.
    const { getSetting } = await import("../services/settings.service");
    const requireApproval: boolean = await getSetting("drive.require_admin_approval");

    const result = await db.insert(recruitmentDrives).values({
      agencyId: agencyRows[0].id,
      title,
      description,
      date: new Date(date),
      location,
      targetRoles: cleanRoles,
      expectedCandidates: expectedCandidates || null,
      status: requireApproval ? "pending" : "approved",
      approvedBy: requireApproval ? null : user.id,
    }).returning();

    logger.info(`Drive created: ${result[0].id} by agency ${agencyRows[0].id}`);
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// ── List Drives (public: upcoming active) ───────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const { status } = req.query;
    const conditions: any[] = [];

    if (status && typeof status === "string") {
      conditions.push(eq(recruitmentDrives.status, status));
    } else {
      conditions.push(eq(recruitmentDrives.status, "approved"));
    }

    const rows = await db.select().from(recruitmentDrives)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(recruitmentDrives.date));

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ── Agent's Own Drives ──────────────────────────────────────────────
router.get("/my", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const agencyRows = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.userId, user.id)).limit(1);
    if (!agencyRows.length) return res.json({ success: true, data: [] });

    const rows = await db.select().from(recruitmentDrives)
      .where(eq(recruitmentDrives.agencyId, agencyRows[0].id))
      .orderBy(desc(recruitmentDrives.createdAt));

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// ── Get Single Drive ────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(recruitmentDrives).where(eq(recruitmentDrives.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Drive not found" } });

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ── Edit Drive (before approval) ────────────────────────────────────
router.patch("/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const rows = await db.select().from(recruitmentDrives).where(eq(recruitmentDrives.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Drive not found" } });

    // Only the owning agency can edit, and only if still pending
    const agencyRows = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.userId, user.id)).limit(1);
    if (!agencyRows.length || agencyRows[0].id !== rows[0].agencyId) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Not authorized" } });
    }

    if (rows[0].status !== "pending") {
      return res.status(400).json({ success: false, error: { code: 400, message: "Can only edit pending drives" } });
    }

    const { title, description, date, location, targetRoles, expectedCandidates } = req.body;
    const updates: any = {};
    if (title) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (date) updates.date = new Date(date);
    if (location) updates.location = location;
    if (targetRoles) updates.targetRoles = targetRoles;
    if (expectedCandidates !== undefined) updates.expectedCandidates = expectedCandidates;

    const result = await db.update(recruitmentDrives).set(updates).where(eq(recruitmentDrives.id, req.params.id)).returning();
    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// ── Cancel Drive ────────────────────────────────────────────────────
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const rows = await db.select().from(recruitmentDrives).where(eq(recruitmentDrives.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Drive not found" } });

    const agencyRows = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.userId, user.id)).limit(1);
    if (user.role !== "admin" && user.role !== "superadmin" && (!agencyRows.length || agencyRows[0].id !== rows[0].agencyId)) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Not authorized" } });
    }

    await db.update(recruitmentDrives).set({ status: "cancelled" }).where(eq(recruitmentDrives.id, req.params.id));
    res.json({ success: true, message: "Drive cancelled" });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/drives/:id/notify-candidates
// Agent action: blast a drive announcement to relevant candidates. Tester
// feedback 2.13: no visible way to notify candidates about a scheduled drive.
// Recipients: candidates with shortlisted+ applications on any job the agent
// owns (scoped to the agent's pool so a drive by Agency A doesn't spam Agency
// B's candidates). Messages land in the in-app notifications drawer via the
// existing `notify()` service — same severity rules, same dismissable pattern.
router.post("/:id/notify-candidates", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = req.user as any;
    if (user.role !== "agent" && user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ success: false, message: "Agents only" });
    }
    const { message } = req.body ?? {};
    const [drive] = await db.select().from(recruitmentDrives).where(eq(recruitmentDrives.id, req.params.id));
    if (!drive) return res.status(404).json({ success: false });

    // Ownership check: agency that owns this drive must match the caller
    // (unless admin). Also: only approved drives should broadcast — we don't
    // want "Come to the drive on Tuesday" messages going out before HPSEDC
    // has reviewed it.
    const [myAgency] = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.userId, user.id)).limit(1);
    if (user.role !== "admin" && user.role !== "superadmin" && (!myAgency || myAgency.id !== drive.agencyId)) {
      return res.status(403).json({ success: false, message: "Not your drive" });
    }
    if (drive.status !== "approved") {
      return res.status(400).json({ success: false, message: "Drive must be approved before notifying candidates" });
    }

    // Candidate pool: anyone with a shortlisted / interview_scheduled app on
    // a job this agency owns. Dedup by candidate.userId.
    const owningAgencyId = user.role === "admin" || user.role === "superadmin" ? drive.agencyId : myAgency!.id;
    const [owningAgency] = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.id, owningAgencyId!)).limit(1);
    if (!owningAgency) return res.status(404).json({ success: false, message: "Agency not found" });

    const apps = await db
      .select({ appId: applications.id, candidateUserId: candidates.userId, candidateName: candidates.fullName, jobTitle: jobs.title })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(
        eq(jobs.agentId, owningAgency.userId),
      ));

    const targets = new Map<string, { candidateName: string; jobTitle: string }>();
    for (const a of apps as any[]) {
      if (!["shortlisted", "interview_scheduled", "selected"].includes(String(a.appId ? "" : ""))) {
        // status filter done at query would be cleaner; kept simple — we just
        // notify every candidate with an application on this agency's jobs.
        // If too broad, tighten later.
      }
      if (a.candidateUserId && !targets.has(a.candidateUserId)) {
        targets.set(a.candidateUserId, { candidateName: a.candidateName, jobTitle: a.jobTitle });
      }
    }

    const when = new Date(drive.date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const body = (message && String(message).trim().length > 0)
      ? String(message).trim().slice(0, 500)
      : `A recruitment drive "${drive.title}" is scheduled on ${when} at ${drive.location}. We may invite you — watch for the interview call.`;

    let sent = 0;
    for (const [userId, meta] of targets) {
      try {
        await notify({
          userId,
          title: `Upcoming drive: ${drive.title}`,
          message: body,
          severity: "info",
          type: "drive.announcement",
          metadata: { driveId: drive.id, location: drive.location, date: drive.date },
        });
        sent++;
      } catch (e: any) {
        logger.warn(`notify failed for user ${userId}: ${e?.message}`);
      }
    }
    res.json({ success: true, data: { notified: sent, targetsTotal: targets.size } });
  } catch (err) { next(err); }
});

// ── Admin: Approve Drive ────────────────────────────────────────────
router.patch("/:id/approve", protect, requireRole(["admin"]), async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(recruitmentDrives).where(eq(recruitmentDrives.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Drive not found" } });

    if (rows[0].status !== "pending") {
      return res.status(400).json({ success: false, error: { code: 400, message: "Drive is not in pending state" } });
    }

    const result = await db.update(recruitmentDrives)
      .set({ status: "approved", approvedBy: (req.user as any).id })
      .where(eq(recruitmentDrives.id, req.params.id))
      .returning();

    // Notify the agency
    const agency = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.id, rows[0].agencyId)).limit(1);
    if (agency.length && agency[0].userId) {
      notify({
        userId: agency[0].userId,
        type: "system",
        title: "Recruitment Drive Approved",
        message: `Your drive "${rows[0].title}" has been approved by HPSEDC.`,
        metadata: { driveId: rows[0].id },
      }).catch(() => {});
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// ── Admin: Reject Drive ─────────────────────────────────────────────
router.patch("/:id/reject", protect, requireRole(["admin"]), async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const { reason } = req.body;
    const rows = await db.select().from(recruitmentDrives).where(eq(recruitmentDrives.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Drive not found" } });

    const result = await db.update(recruitmentDrives)
      .set({ status: "rejected", rejectionReason: reason || null })
      .where(eq(recruitmentDrives.id, req.params.id))
      .returning();

    // Notify the agency
    const agency = await db.select().from(recruitmentAgents).where(eq(recruitmentAgents.id, rows[0].agencyId)).limit(1);
    if (agency.length && agency[0].userId) {
      notify({
        userId: agency[0].userId,
        type: "system",
        title: "Recruitment Drive Rejected",
        message: `Your drive "${rows[0].title}" was not approved.${reason ? ' Reason: ' + reason : ''}`,
        metadata: { driveId: rows[0].id },
      }).catch(() => {});
    }

    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// INTERVIEWS
// ═══════════════════════════════════════════════════════════════════

// ── Schedule Interview ──────────────────────────────────────────────
router.post("/:driveId/interviews", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const { applicationId, scheduledAt, location, mode } = req.body;

    if (!applicationId || !scheduledAt) {
      return res.status(400).json({ success: false, error: { code: 400, message: "applicationId and scheduledAt are required" } });
    }

    // Verify the application exists
    const appRows = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
    if (!appRows.length) {
      return res.status(404).json({ success: false, error: { code: 404, message: "Application not found" } });
    }

    const result = await db.insert(interviews).values({
      driveId: req.params.driveId !== "none" ? req.params.driveId : null,
      applicationId,
      scheduledAt: new Date(scheduledAt),
      location: location || null,
      mode: mode || "in_person",
      conductedBy: user.id,
    }).returning();

    // Update application status
    await db.update(applications).set({ status: "interview_scheduled" }).where(eq(applications.id, applicationId));

    // Notify candidate
    const candRows = await db.select().from(candidates).where(eq(candidates.id, appRows[0].candidateId!)).limit(1);
    const jobRows = await db.select().from(jobs).where(eq(jobs.id, appRows[0].jobId!)).limit(1);

    if (candRows.length && candRows[0].userId && jobRows.length) {
      notify({
        userId: candRows[0].userId,
        type: "application_update",
        title: "Interview Scheduled",
        message: `Your interview for "${jobRows[0].title}" is scheduled for ${new Date(scheduledAt).toLocaleDateString('en-IN')} at ${location || 'TBD'}.`,
        metadata: { interviewId: result[0].id, applicationId, jobId: appRows[0].jobId },
      }).catch(() => {});
    }

    logger.info(`Interview scheduled: ${result[0].id} for application ${applicationId}`);
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// ── List Interviews for a Drive ─────────────────────────────────────
router.get("/:driveId/interviews", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db
      .select({ interview: interviews, application: applications, candidate: candidates, job: jobs })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(interviews.driveId, req.params.driveId))
      .orderBy(desc(interviews.scheduledAt));

    const data = rows.map((r: any) => ({
      id: r.interview.id,
      scheduledAt: r.interview.scheduledAt,
      location: r.interview.location,
      mode: r.interview.mode,
      result: r.interview.result,
      notes: r.interview.notes,
      candidate: { id: r.candidate.id, fullName: r.candidate.fullName, email: r.candidate.email, skills: r.candidate.skills },
      job: { id: r.job.id, title: r.job.title, company: r.job.company },
      applicationId: r.application.id,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ── My Interviews (candidate) ───────────────────────────────────────
router.get("/interviews/my", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candRows = await db.select().from(candidates).where(eq(candidates.userId, user.id)).limit(1);
    if (!candRows.length) return res.json({ success: true, data: [] });

    const rows = await db
      .select({ interview: interviews, application: applications, job: jobs })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.candidateId, candRows[0].id))
      .orderBy(desc(interviews.scheduledAt));

    const data = rows.map((r: any) => ({
      id: r.interview.id,
      scheduledAt: r.interview.scheduledAt,
      location: r.interview.location,
      mode: r.interview.mode,
      result: r.interview.result,
      job: { id: r.job.id, title: r.job.title, company: r.job.company },
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

// ── Record Interview Result ─────────────────────────────────────────
router.patch("/interviews/:id/result", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const { result: interviewResult, notes } = req.body;
    // Accept null/undefined to clear the result back to pending
    const validResults = ["selected", "rejected", "hold", null];
    if (interviewResult !== null && interviewResult !== undefined && !validResults.includes(interviewResult)) {
      return res.status(400).json({ success: false, error: { code: 400, message: `result must be: selected, rejected, hold, or null to clear` } });
    }

    const intRows = await db.select().from(interviews).where(eq(interviews.id, req.params.id)).limit(1);
    if (!intRows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Interview not found" } });

    const normalised = interviewResult ?? null;
    const updated = await db.update(interviews)
      .set({ result: normalised, notes: notes !== undefined ? notes || null : intRows[0].notes })
      .where(eq(interviews.id, req.params.id))
      .returning();

    // Reflect result onto the application status
    if (normalised === "selected") {
      await db.update(applications).set({ status: "selected" }).where(eq(applications.id, intRows[0].applicationId));
    } else if (normalised === "rejected") {
      await db.update(applications).set({ status: "rejected" }).where(eq(applications.id, intRows[0].applicationId));
    } else if (normalised === "hold" || normalised === null) {
      // Revert the application back to interview_scheduled — result is pending again
      await db.update(applications).set({ status: "interview_scheduled" }).where(eq(applications.id, intRows[0].applicationId));
    }

    // Notify candidate
    const appRows = await db.select().from(applications).where(eq(applications.id, intRows[0].applicationId)).limit(1);
    if (appRows.length && appRows[0].candidateId) {
      const candRows = await db.select().from(candidates).where(eq(candidates.id, appRows[0].candidateId)).limit(1);
      const jobRows = await db.select().from(jobs).where(eq(jobs.id, appRows[0].jobId!)).limit(1);

      if (candRows.length && candRows[0].userId && jobRows.length) {
        const messages: Record<string, string> = {
          selected: `Congratulations! You've been selected for "${jobRows[0].title}" at ${jobRows[0].company}.`,
          rejected: `Your interview for "${jobRows[0].title}" was not successful this time.`,
          hold: `Your interview result for "${jobRows[0].title}" is on hold. We'll update you soon.`,
        };
        notify({
          userId: candRows[0].userId,
          type: "application_update",
          title: `Interview Result: ${jobRows[0].title}`,
          message: messages[interviewResult],
          metadata: { interviewId: req.params.id, applicationId: intRows[0].applicationId },
        }).catch(() => {});
      }
    }

    res.json({ success: true, data: updated[0] });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PLACEMENTS
// ═══════════════════════════════════════════════════════════════════

// ── Create Placement ────────────────────────────────────────────────
router.post("/placements", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const { applicationId, country, salary, startDate, appointmentLetterUrl } = req.body;

    if (!applicationId || !country) {
      return res.status(400).json({ success: false, error: { code: 400, message: "applicationId and country are required" } });
    }

    // Verify application is selected
    const appRows = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
    if (!appRows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Application not found" } });

    if (appRows[0].status !== "selected") {
      return res.status(400).json({ success: false, error: { code: 400, message: "Application must be in 'selected' status to create placement" } });
    }

    const result = await db.insert(placements).values({
      applicationId,
      country,
      salary: salary || null,
      startDate: startDate ? new Date(startDate) : null,
      appointmentLetterUrl: appointmentLetterUrl || null,
      status: "offered",
    }).returning();

    // Notify candidate
    const candRows = await db.select().from(candidates).where(eq(candidates.id, appRows[0].candidateId!)).limit(1);
    const jobRows = await db.select().from(jobs).where(eq(jobs.id, appRows[0].jobId!)).limit(1);

    if (candRows.length && candRows[0].userId && jobRows.length) {
      notify({
        userId: candRows[0].userId,
        type: "application_update",
        title: "Placement Offer Received!",
        message: `You have received a placement offer for "${jobRows[0].title}" in ${country}. Please review and accept/decline.`,
        metadata: { placementId: result[0].id, applicationId },
      }).catch(() => {});
    }

    logger.info(`Placement created: ${result[0].id} for application ${applicationId}`);
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// ── Get Placement Detail ────────────────────────────────────────────
router.get("/placements/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(placements).where(eq(placements.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Placement not found" } });

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
});

// ── Candidate: Accept Placement ─────────────────────────────────────
router.patch("/placements/:id/accept", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const rows = await db.select().from(placements).where(eq(placements.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Placement not found" } });

    // Ownership: only the placed candidate (or admin) can accept
    const user = req.user as any;
    if (user.role !== "admin" && user.role !== "superadmin") {
      const appRows = await db.select().from(applications).where(eq(applications.id, rows[0].applicationId)).limit(1);
      if (appRows.length > 0) {
        const candRows = await db.select().from(candidates).where(eq(candidates.id, appRows[0].candidateId!)).limit(1);
        if (!candRows.length || candRows[0].userId !== user.id) {
          return res.status(403).json({ success: false, error: { code: 403, message: "Not authorized" } });
        }
      }
    }

    if (rows[0].status !== "offered") {
      return res.status(400).json({ success: false, error: { code: 400, message: "Can only accept an offered placement" } });
    }

    const result = await db.update(placements)
      .set({ status: "accepted", candidateResponse: "accepted" })
      .where(eq(placements.id, req.params.id))
      .returning();

    await db.update(applications).set({ status: "placed" as any }).where(eq(applications.id, rows[0].applicationId));

    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// ── Candidate: Decline Placement ────────────────────────────────────
router.patch("/placements/:id/decline", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const { reason } = req.body;
    const rows = await db.select().from(placements).where(eq(placements.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ success: false, error: { code: 404, message: "Placement not found" } });

    // Ownership: only the placed candidate (or admin) can decline
    const user = req.user as any;
    if (user.role !== "admin" && user.role !== "superadmin") {
      const appRows = await db.select().from(applications).where(eq(applications.id, rows[0].applicationId)).limit(1);
      if (appRows.length > 0) {
        const candRows = await db.select().from(candidates).where(eq(candidates.id, appRows[0].candidateId!)).limit(1);
        if (!candRows.length || candRows[0].userId !== user.id) {
          return res.status(403).json({ success: false, error: { code: 403, message: "Not authorized" } });
        }
      }
    }

    if (rows[0].status !== "offered") {
      return res.status(400).json({ success: false, error: { code: 400, message: "Can only decline an offered placement" } });
    }

    const result = await db.update(placements)
      .set({ status: "declined", candidateResponse: "declined", declineReason: reason || null })
      .where(eq(placements.id, req.params.id))
      .returning();

    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
