import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { storage } from "../storage";
import { logger } from "../config/logger.config";
import { applications, candidates, jobs } from "@shared/schema";
import { eq, and, desc, inArray, ne } from "drizzle-orm";
import { notify } from "../services/notification.service";
import { getSetting } from "../services/settings.service";

const router = Router();

const STATUS_ORDER = ["submitted", "reviewed", "shortlisted", "interview_scheduled", "selected", "placed"] as const;
function isBackward(from: string, to: string): boolean {
  const fi = STATUS_ORDER.indexOf(from as any);
  const ti = STATUS_ORDER.indexOf(to as any);
  return fi >= 0 && ti >= 0 && ti < fi;
}

// ── Single application status update (agent / admin / employer) ──────
router.patch("/:id/status", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    if (!["agent", "employer", "admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Not authorized" } });
    }

    const { status, reason, rejectionFeedback } = req.body ?? {};
    const validStatuses = ["submitted", "reviewed", "shortlisted", "interview_scheduled", "selected", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 400, message: "Invalid status" } });
    }

    const [app] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!app) return res.status(404).json({ success: false, error: { code: 404, message: "Application not found" } });

    // ── Consult runtime settings ──────────────────────────────────────
    const terminal: string[] = await getSetting("pipeline.terminal_states");
    const allowBackward: boolean = await getSetting("pipeline.allow_backward_transitions");
    const requireBackwardReason: boolean = await getSetting("pipeline.require_reason_on_backward");
    const requireRejectionReason: boolean = await getSetting("rejection.require_reason");
    const allowRevertReject: boolean = await getSetting("rejection.allow_revert");
    const autoNotify: boolean = await getSetting("notifications.auto_on_status_change");

    const isAdmin = user.role === "admin" || user.role === "superadmin";
    const fromStatus = app.status || "submitted";

    // Terminal-state lock: regular agents cannot mutate
    if (terminal.includes(fromStatus) && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: `Status "${fromStatus}" is terminal. Ask an admin to change it.` } });
    }

    // Backward transition gate
    if (!isAdmin && isBackward(fromStatus, status) && !allowBackward) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Backward status changes are disabled. Contact an admin." } });
    }
    if (isBackward(fromStatus, status) && requireBackwardReason && !reason?.trim()) {
      return res.status(400).json({ success: false, error: { code: 400, message: "A reason is required when moving a status backward." } });
    }

    // Un-reject gate
    if (fromStatus === "rejected" && status !== "rejected" && !allowRevertReject && !isAdmin) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Reverting a rejection is disabled in system settings." } });
    }

    // Rejection-reason gate
    if (status === "rejected" && requireRejectionReason && !rejectionFeedback?.trim()) {
      return res.status(400).json({ success: false, error: { code: 400, message: "A rejection reason / feedback is required." } });
    }

    const updates: any = { status };
    if (rejectionFeedback !== undefined) updates.rejectionFeedback = rejectionFeedback || null;
    const [updated] = await db.update(applications).set(updates).where(eq(applications.id, app.id)).returning();

    // PWS §8: audit every application state transition
    try {
      const { logTransition } = await import("../services/audit-transitions.service");
      await logTransition({
        actorUserId: user.id, actorRole: user.role,
        entityType: "application", entityId: app.id, action: "status_change",
        fromState: fromStatus, toState: status,
        reason: reason || rejectionFeedback,
        ipAddress: req.ip,
      });
    } catch (e: any) { logger.warn(`audit on status change failed: ${e?.message}`); }

    // PWS §5: fire the matching pipeline event through the notification engine
    // so candidate/agent/employer all get the right wording per their role.
    // The engine is the single source of truth for notifications on status
    // changes; the legacy per-status notify() call is gone so candidates don't
    // get two rows per transition (one generic "Application Update" + one
    // templated event).
    const eventKey =
      status === "reviewed"            ? "application.reviewed"
    : status === "shortlisted"         ? "application.shortlisted"
    : status === "interview_scheduled" ? "interview.scheduled"
    : status === "selected"            ? "application.selected"
    : status === "rejected" && user.role === "employer" ? "application.employer_rejected"
    : status === "rejected"            ? "application.rejected"
    : null;

    let fired = false;
    if (autoNotify && eventKey) {
      try {
        const { fireEvent, resolveParticipantsFromApplication } = await import("../services/event-notifications.service");
        const ctx = await resolveParticipantsFromApplication(app.id);
        ctx.actorUserId = user.id;
        ctx.actorRole = user.role;
        await fireEvent(eventKey as any, ctx);
        fired = true;
      } catch (e: any) { logger.warn(`fireEvent on status change failed: ${e?.message}`); }
    }

    // Fallback only if the engine didn't fire (unmapped status, missing
    // template, or autoNotify disabled by admin). Keeps the candidate informed
    // even when the template layer is misconfigured.
    if (autoNotify && !fired && app.candidateId && app.jobId) {
      const [cand] = await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1);
      const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1);
      if (cand?.userId && job) {
        const labels: Record<string, string> = {
          reviewed: "Your application has been reviewed",
          shortlisted: "You've been shortlisted",
          interview_scheduled: "An interview has been scheduled",
          selected: "You've been selected",
          rejected: "Your application was not selected this time",
        };
        const severity =
          status === "selected" || status === "shortlisted" || status === "interview_scheduled" ? "positive"
        : status === "rejected" ? "warning"
        : "info";
        notify({
          userId: cand.userId, type: "application_update",
          title: `${labels[status] || status}`,
          message: `${labels[status] || status} for "${job.title}" at ${job.company}.`,
          severity: severity as any,
          metadata: { applicationId: app.id, jobId: app.jobId, newStatus: status },
        }).catch(() => {});
      }
    }

    logger.info(`Application ${app.id}: ${fromStatus} → ${status} by ${user.id}${reason ? ` (reason: ${reason})` : ""}`);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ── Bulk Status Update ──────────────────────────────────────────────
router.patch("/bulk-status", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const userRole = (req.user as any)?.role;
    if (!["agent", "employer", "admin"].includes(userRole)) {
      return res.status(403).json({ success: false, error: { code: 403, message: "Not authorized" } });
    }

    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 400, message: "ids must be a non-empty array" } });
    }

    if (ids.length > 50) {
      return res.status(400).json({ success: false, error: { code: 400, message: "Maximum 50 applications per bulk update" } });
    }

    const validStatuses = ["submitted", "reviewed", "shortlisted", "interview_scheduled", "selected", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 400, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` } });
    }

    // Ownership filter: agents/employers can only update applications on their own jobs
    const userId = (req.user as any)?.id;
    let ownedAppIds = ids;
    if (userRole === "agent" || userRole === "employer") {
      const ownedApps = await db
        .select({ appId: applications.id })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(and(
          inArray(applications.id, ids),
          userRole === "agent" ? eq(jobs.agentId, userId) : eq(jobs.employerId, userId)
        ));
      ownedAppIds = ownedApps.map((a: { appId: string }) => a.appId);
      if (ownedAppIds.length === 0) {
        return res.status(403).json({ success: false, error: { code: 403, message: "None of the specified applications belong to your jobs" } });
      }
    }

    const updated = await db
      .update(applications)
      .set({ status })
      .where(inArray(applications.id, ownedAppIds))
      .returning();

    // Create notifications for each updated candidate
    const statusLabels: Record<string, string> = {
      reviewed: "Your application has been reviewed",
      shortlisted: "You've been shortlisted",
      interview_scheduled: "An interview has been scheduled",
      selected: "You've been selected",
      rejected: "Your application was not selected this time",
    };

    for (const app of updated) {
      if (!app.candidateId || !app.jobId) continue;

      const candRows = await db.select().from(candidates).where(eq(candidates.id, app.candidateId)).limit(1);
      const jobRows = await db.select().from(jobs).where(eq(jobs.id, app.jobId)).limit(1);

      if (candRows.length > 0 && candRows[0].userId && jobRows.length > 0) {
        notify({
          userId: candRows[0].userId,
          type: "application_update",
          title: `Application Update: ${jobRows[0].title}`,
          message: `${statusLabels[status] || status} for "${jobRows[0].title}" at ${jobRows[0].company}.`,
          metadata: { applicationId: app.id, jobId: app.jobId, newStatus: status },
        }).catch(() => {});
      }
    }

    logger.info(`Bulk status update: ${updated.length} applications → ${status}`);
    res.json({ success: true, data: { updated: updated.length, status } });
  } catch (error) {
    next(error);
  }
});

// ── Get Application Detail (with score breakdown) ───────────────────
router.get("/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const result = await db
      .select({ application: applications, job: jobs, candidate: candidates })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(eq(applications.id, req.params.id))
      .limit(1);

    if (result.length === 0) {
      return res.status(404).json({ success: false, error: { code: 404, message: "Application not found" } });
    }

    const row = result[0] as any;
    const app = row.application;
    const job = row.job;
    const candidate = row.candidate;

    // Ownership check: candidates see only their own, agents/employers only their jobs'
    const user = req.user as any;
    if (user.role === "candidate") {
      if (candidate.userId !== user.id) {
        return res.status(403).json({ success: false, error: { code: 403, message: "Access denied" } });
      }
    } else if (user.role === "agent") {
      if (job.agentId !== user.id) {
        return res.status(403).json({ success: false, error: { code: 403, message: "Access denied" } });
      }
    } else if (user.role === "employer") {
      if (job.employerId !== user.id) {
        return res.status(403).json({ success: false, error: { code: 403, message: "Access denied" } });
      }
    }

    // Calculate score breakdown
    const breakdown = calculateScoreBreakdown(candidate, job);

    res.json({
      success: true,
      data: {
        id: app.id,
        status: app.status,
        matchScore: app.matchScore,
        appliedAt: app.appliedAt,
        scoreBreakdown: breakdown,
        job: {
          id: job.id, title: job.title, company: job.company,
          location: job.location, country: job.country, salary: job.salary,
          skills: job.skills, experience: job.experience,
        },
        candidate: {
          id: candidate.id, fullName: candidate.fullName,
          email: candidate.email, skills: candidate.skills,
          experience: candidate.experience, location: candidate.location,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ── Candidate Recommendations ───────────────────────────────────────
router.get("/recommendations/for-me", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const userId = (req.user as any)?.id;
    if ((req.user as any)?.role !== "candidate") {
      return res.status(403).json({ success: false, error: { code: 403, message: "Only candidates can get recommendations" } });
    }

    // Get candidate profile
    const candRows = await db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);
    if (candRows.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const candidate = candRows[0];

    // Get all active jobs
    const activeJobs = await db.select().from(jobs).where(eq(jobs.status, "active"));

    // Get jobs candidate already applied to
    const appliedRows = await db
      .select({ jobId: applications.jobId })
      .from(applications)
      .where(eq(applications.candidateId, candidate.id));
    const appliedJobIds = new Set(appliedRows.map((r: any) => r.jobId));

    // Score, filter out applied, then apply the (configurable) threshold
    const threshold: number = await getSetting("matching.recommendation_threshold_pct");
    const scored = activeJobs
      .filter((job: any) => !appliedJobIds.has(job.id))
      .map((job: any) => ({
        ...job,
        matchScore: calculateScore(candidate, job),
        scoreBreakdown: calculateScoreBreakdown(candidate, job),
      }))
      .filter((j: any) => j.matchScore >= threshold)
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 10);

    res.json({ success: true, data: scored });
  } catch (error) {
    next(error);
  }
});

/**
 * Calculate match score: skill 50% + experience 30% + country 20%
 */
function calculateScore(candidate: any, job: any): number {
  const bd = calculateScoreBreakdown(candidate, job);
  return bd.total;
}

function calculateScoreBreakdown(candidate: any, job: any) {
  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());
  const jobSkills = (job.skills || []).map((s: string) => s.toLowerCase());

  // Skill match (50 points)
  let skillScore = 25;
  let skillDetail = "No skills specified on job";
  if (jobSkills.length > 0) {
    const overlap = candidateSkills.filter((s: string) => jobSkills.includes(s));
    skillScore = Math.round((overlap.length / jobSkills.length) * 50);
    skillDetail = `${overlap.length}/${jobSkills.length} skills match (${overlap.join(", ") || "none"})`;
  }

  // Experience match (30 points)
  const required = job.experience || 0;
  const has = candidate.experience || 0;
  let expScore = 30;
  let expDetail = "No experience required";
  if (required > 0) {
    expScore = Math.round(Math.min(has / required, 1) * 30);
    expDetail = `${has}/${required} years (${has >= required ? "meets requirement" : "below requirement"})`;
  }

  // Country preference (20 points)
  const preferred = (candidate.preferredCountries || []).map((c: string) => c.toLowerCase());
  let countryScore = 20;
  let countryDetail = "No country preference set";
  if (preferred.length > 0) {
    if (preferred.includes(job.country?.toLowerCase())) {
      countryScore = 20;
      countryDetail = `${job.country} is in preferred countries`;
    } else {
      countryScore = 0;
      countryDetail = `${job.country} not in preferred countries (${preferred.join(", ")})`;
    }
  }

  const total = Math.min(100, Math.max(0, skillScore + expScore + countryScore));

  return {
    total,
    skill: { score: skillScore, max: 50, detail: skillDetail },
    experience: { score: expScore, max: 30, detail: expDetail },
    country: { score: countryScore, max: 20, detail: countryDetail },
  };
}

export default router;
