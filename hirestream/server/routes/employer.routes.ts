/**
 * Employer-specific actions. Reflects the real overseas-placement workflow
 * where employer is a decision-maker reviewing the agency's curated shortlist —
 * not a front-line recruiter.
 */

import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { storage } from "../storage";
import {
  jobs, applications, candidates, placements, recruitmentAgents, notifications, auditLog,
} from "@shared/schema";
import { eq, and, inArray, desc, or, isNotNull } from "drizzle-orm";
import { notify } from "../services/notification.service";
import { logger } from "../config/logger.config";

const router = Router();
router.use(protect);
router.use((req, res, next) => {
  const user = (req as any).user;
  if (!["employer", "admin", "superadmin"].includes(user.role)) {
    return res.status(403).json({ success: false, message: "Employer-only endpoint" });
  }
  next();
});

// Return the set of job IDs the employer "owns": their direct jobs + every
// derivative (agent-picked-up) job whose parent requisition they posted.
// PWS §2: employer owns requisition => they own its downstream agent jobs.
async function ownedJobIds(db: any, userId: string): Promise<string[]> {
  const direct = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.employerId, userId));
  const directIds = direct.map((r: any) => r.id);
  if (directIds.length === 0) return [];
  const derivative = await db.select({ id: jobs.id }).from(jobs)
    .where(inArray(jobs.parentRequisitionId, directIds));
  return [...directIds, ...derivative.map((r: any) => r.id)];
}

// Does this employer own (directly or as requisition parent) this job?
async function employerOwnsJob(db: any, userRole: string, userId: string, job: any): Promise<boolean> {
  if (userRole !== "employer") return true; // admin/superadmin bypass
  if (!job) return false;
  if (job.employerId === userId) return true;
  if (job.parentRequisitionId) {
    const [parent] = await db.select({ employerId: jobs.employerId }).from(jobs)
      .where(eq(jobs.id, job.parentRequisitionId)).limit(1);
    return !!parent && parent.employerId === userId;
  }
  return false;
}

// ── Employer's requisitions (jobs they own) with candidate counts ────
router.get("/requisitions", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;

    const myJobs = user.role === "employer"
      ? await db.select().from(jobs).where(eq(jobs.employerId, user.id))
      : await db.select().from(jobs);

    // For each requisition, also sum applicants from every agent-derivative.
    const enriched = await Promise.all(myJobs.map(async (j: any) => {
      const derivatives = await db.select({ id: jobs.id }).from(jobs)
        .where(eq(jobs.parentRequisitionId, j.id));
      const jobIds = [j.id, ...derivatives.map((d: any) => d.id)];
      const apps = await db.select().from(applications).where(inArray(applications.jobId, jobIds));
      const awaitingDecision = apps.filter((a: any) =>
        a.status === "shortlisted" && !a.employerDecision
      ).length;
      const approvedForInterview = apps.filter((a: any) => a.employerDecision === "approved_for_interview").length;
      const placed = apps.filter((a: any) => a.status === "placed").length;
      const selected = apps.filter((a: any) => a.status === "selected").length;
      return {
        ...j,
        stats: {
          totalApplicants: apps.length,
          awaitingDecision,
          approvedForInterview,
          selected,
          placed,
          progressPct: j.targetHires > 0 ? Math.min(100, Math.round(((placed + selected) / j.targetHires) * 100)) : 0,
        },
      };
    }));
    return res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
});

// ── The employer's review queue: everyone shortlisted or past, across all their jobs ──
router.get("/review-queue", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;

    // Employer owns both their direct postings AND agent derivatives picked up
    // against those requisitions — both flows must be visible in review queue.
    const myJobIds = user.role === "employer"
      ? await ownedJobIds(db, user.id)
      : (await db.select({ id: jobs.id }).from(jobs)).map((r: any) => r.id);
    if (myJobIds.length === 0) return res.json({ success: true, data: [] });

    const rows = await db
      .select({ application: applications, candidate: candidates, job: jobs })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(
        inArray(applications.jobId, myJobIds),
        inArray(applications.status, ["shortlisted", "interview_scheduled", "selected"]),
      ))
      .orderBy(desc(applications.matchScore));

    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

// ── Applicants for one requisition (aggregated across derivatives) ──
// Employer-facing view of a requisition. `:id` is the employer's own jobs
// row. Includes applicants who applied to the direct job AND applicants who
// applied to any derivative (agent pickup). This is the fix for the "Review
// Queue shows 4 candidates on the hero card but the requisition page is
// empty" bug: the hero card aggregates via /employer/review-queue, but the
// detail page was fetching /jobs/:id/applicants which only returns the
// direct-job applicants.
router.get("/requisitions/:id/applicants", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const [req0] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!req0) return res.status(404).json({ success: false });
    if (!(await employerOwnsJob(db, user.role, user.id, req0))) return res.status(403).json({ success: false });

    // Derivative jobs descending from this requisition.
    const derivatives = await db.select({ id: jobs.id }).from(jobs)
      .where(eq(jobs.parentRequisitionId, req0.id));
    const jobIds = [req0.id, ...derivatives.map((d: any) => d.id)];

    // Fetch applicants across all those jobs, with candidate + the job row so
    // the UI can label "picked up by agency X".
    const rows = await db
      .select({ application: applications, candidate: candidates, job: jobs })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(inArray(applications.jobId, jobIds))
      .orderBy(desc(applications.appliedAt));

    // Time-in-stage: same derivation as the agent applicants endpoint. Pulls
    // the most recent application.status_change audit row per app; falls back
    // to appliedAt. Used by the employer UI to surface aging rows (7d amber,
    // 14d red) on the review queue without a schema change.
    const appIds = rows.map((r: any) => r.application.id);
    const stageEntries: Record<string, Date> = {};
    if (appIds.length > 0) {
      const auditRows = await db
        .select({ resourceId: auditLog.resourceId, createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(and(
          eq(auditLog.action, "application.status_change"),
          inArray(auditLog.resourceId, appIds),
        ))
        .orderBy(desc(auditLog.createdAt));
      for (const ar of auditRows as any[]) {
        if (!stageEntries[ar.resourceId]) stageEntries[ar.resourceId] = new Date(ar.createdAt);
      }
    }

    const applicants = rows.map((r: any) => {
      const stageEnteredAt = stageEntries[r.application.id] ?? r.application.appliedAt;
      const daysInStage = stageEnteredAt ? Math.floor((Date.now() - new Date(stageEnteredAt).getTime()) / 86_400_000) : null;
      return {
        applicationId: r.application.id,
        status: r.application.status,
        matchScore: r.application.matchScore,
        appliedAt: r.application.appliedAt,
        stageEnteredAt,
        daysInStage,
        employerDecision: r.application.employerDecision,
        employerDecisionAt: r.application.employerDecisionAt,
        employerDecisionNotes: r.application.employerDecisionNotes,
        candidate: {
          id: r.candidate.id,
          fullName: r.candidate.fullName,
          email: r.candidate.email,
          phone: r.candidate.phone,
          location: r.candidate.location,
          experience: r.candidate.experience,
          skills: r.candidate.skills,
          photoUrl: r.candidate.photoUrl,
        },
        via: {
          jobId: r.job.id,
          agentId: r.job.agentId,
          isDerivative: !!r.job.parentRequisitionId,
        },
      };
    });
    res.json({ success: true, data: applicants, total: applicants.length, jobCount: jobIds.length });
  } catch (err) { next(err); }
});

// ── Employer: approve a shortlisted candidate for interview ──────────
router.post("/applications/:id/approve-for-interview", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const { notes } = req.body ?? {};

    const [app] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!app) return res.status(404).json({ success: false });

    // Verify the employer owns the job
    const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId!)).limit(1);
    if (!job || !(await employerOwnsJob(db, user.role, user.id, job))) {
      return res.status(403).json({ success: false });
    }

    await db.update(applications).set({
      employerDecision: "approved_for_interview",
      employerDecisionAt: new Date(),
      employerDecisionNotes: notes || null,
    }).where(eq(applications.id, app.id));

    // Notify the agency
    if (job.agentId) {
      notify({
        userId: job.agentId, type: "application_update",
        title: "Employer approved candidate for interview",
        message: `The employer approved a shortlisted candidate for interview on "${job.title}". Please schedule.`,
        metadata: { applicationId: app.id, jobId: job.id },
      }).catch(() => {});
    }
    logger.info(`Employer ${user.id} approved-for-interview app ${app.id}`);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Employer: request replacement candidates from the agency ─────────
router.post("/applications/:id/request-replacement", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const { reason } = req.body ?? {};

    const [app] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!app) return res.status(404).json({ success: false });
    const [job] = await db.select().from(jobs).where(eq(jobs.id, app.jobId!)).limit(1);
    if (!job || !(await employerOwnsJob(db, user.role, user.id, job))) {
      return res.status(403).json({ success: false });
    }

    await db.update(applications).set({
      employerDecision: "replacement_requested",
      employerDecisionAt: new Date(),
      employerDecisionNotes: reason || null,
    }).where(eq(applications.id, app.id));

    // Loud notification to agency — this is an operational signal
    if (job.agentId) {
      notify({
        userId: job.agentId, type: "application_update",
        title: "⚠ Employer requested a replacement candidate",
        message: `Employer didn't find this candidate suitable for "${job.title}". Reason: ${reason || "not specified"}. Please send additional candidates.`,
        metadata: { applicationId: app.id, jobId: job.id, reason },
      }).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Employer: request more candidates (across the requisition) ───────
router.post("/requisitions/:jobId/request-more", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const { count, reason } = req.body ?? {};

    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.jobId)).limit(1);
    if (!job || !(await employerOwnsJob(db, user.role, user.id, job))) {
      return res.status(403).json({ success: false });
    }
    if (job.agentId) {
      notify({
        userId: job.agentId, type: "application_update",
        title: "Employer asked for more candidates",
        message: `"${job.title}" — employer asked for ${count || "additional"} more candidates. ${reason ? `Why: ${reason}` : ""}`.trim(),
        metadata: { jobId: job.id, count, reason },
      }).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── Employer: update requisition fields (target hires, deadline, priority) ──
router.patch("/requisitions/:id", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const [job] = await db.select().from(jobs).where(eq(jobs.id, req.params.id)).limit(1);
    if (!job || (user.role === "employer" && job.employerId !== user.id)) {
      return res.status(403).json({ success: false });
    }
    const { targetHires, hiringDeadline, priority, employerNotes } = req.body ?? {};
    const set: any = {};
    if (targetHires !== undefined) set.targetHires = Number(targetHires);
    if (hiringDeadline !== undefined) set.hiringDeadline = hiringDeadline || null;
    if (priority !== undefined) set.priority = priority;
    if (employerNotes !== undefined) set.employerNotes = employerNotes;
    if (Object.keys(set).length === 0) return res.status(400).json({ success: false, message: "no fields" });
    const [row] = await db.update(jobs).set(set).where(eq(jobs.id, req.params.id)).returning();
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

// ── Employer: add a welfare note to a placement ──────────────────────
router.patch("/placements/:id/welfare-note", async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false });
    const user = (req as any).user;
    const { note } = req.body ?? {};

    // Verify ownership via job
    const [row] = await db
      .select({ p: placements, j: jobs })
      .from(placements)
      .innerJoin(applications, eq(placements.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(placements.id, req.params.id)).limit(1);
    if (!row) return res.status(404).json({ success: false });
    if (!(await employerOwnsJob(db, user.role, user.id, row.j))) return res.status(403).json({ success: false });

    await db.update(placements).set({
      employerWelfareNote: note || null,
      employerWelfareNoteAt: new Date(),
    }).where(eq(placements.id, req.params.id));
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
