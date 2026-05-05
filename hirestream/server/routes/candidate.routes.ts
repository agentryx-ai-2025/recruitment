import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { validateRequest } from "../middleware/validate.middleware";
import { storage } from "../storage";
import { logger } from "../config/logger.config";
import {
  updateCandidateSchema, candidates, applications, jobs,
  candidateEducation, candidateExperience, documents,
  insertEducationSchema, insertExperienceSchema, placements, interviews,
} from "@shared/schema";
import { eq, and, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { notify } from "../services/notification.service";

const router = Router();

// Get candidate profile
router.get("/profile", protect, async (req, res, next) => {
  try {
     const userId = (req.user as any)?.id;
     if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
     
     if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });
     
     const result = await storage.db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);
     
     if (!result || result.length === 0) {
        return res.status(404).json({ success: false, message: "Candidate profile not found" });
     }
     
     res.json({ success: true, data: result[0] });
  } catch (err) {
    logger.error(`Error fetching candidate profile: ${err}`);
    next(err);
  }
});

// Update candidate profile
router.patch("/profile", protect, async (req, res, next) => {
  try {
     const userId = (req.user as any)?.id;
     if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

     if ((req.user as any)?.role !== "candidate") {
        return res.status(403).json({ success: false, message: "Only candidates can update their profiles." });
     }

     // safeParse so Zod issues surface as a clean 400 with the first
     // field-level message — the old .parse() path threw, bubbled to the
     // global error handler, and came back to the client as a 500 with a
     // JSON-stringified issues array.
     const parsed = updateCandidateSchema.safeParse(req.body);
     if (!parsed.success) {
       return res.status(400).json({
         success: false,
         message: parsed.error.issues[0]?.message ?? "Invalid input",
         issues: parsed.error.issues,
       });
     }
     const validatedData = parsed.data;
     
     if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

     // Check if candidate exists, otherwise create it
     const existing = await storage.db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);

     if (!existing || existing.length === 0) {
        // Technically, candidate rows should be created on registration, but if not, we create it here
        const newCandidate = await storage.db.insert(candidates).values({
          userId,
          fullName: (req.user as any)?.username || "Unknown",
          email: (req.user as any)?.email || "",
          ...validatedData
        }).returning();
        
        return res.status(200).json({ success: true, data: newCandidate[0] });
     }

     const updated = await storage.db.update(candidates)
         .set(validatedData)
         .where(eq(candidates.userId, userId))
         .returning();

     res.status(200).json({ success: true, data: updated[0] });
  } catch (err) {
    logger.error(`Error updating candidate profile: ${err}`);
    next(err);
  }
});

// Get candidate's applications with full job details (JOIN)
router.get("/applications", protect, async (req, res, next) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    // Find candidate record
    const candidateResult = await storage.db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);
    if (!candidateResult || candidateResult.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const candidateId = candidateResult[0].id;

    // Join applications with jobs to get full details
    const result = await storage.db
      .select({
        application: applications,
        job: jobs,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.candidateId, candidateId));

    // Flatten into a clean response
    const appIds = result.map((r: any) => r.application.id);
    // Pull placements + next interview per application so the candidate UI can
    // render offer Accept/Decline and "upcoming interview" without extra calls.
    const placementRows = appIds.length === 0 ? [] : await storage.db
      .select().from(placements).where(inArray(placements.applicationId, appIds));
    const interviewRows = appIds.length === 0 ? [] : await storage.db
      .select().from(interviews).where(inArray(interviews.applicationId, appIds));
    const placementByApp = new Map(placementRows.map((p: any) => [p.applicationId, p]));
    const interviewByApp = new Map(
      interviewRows
        .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
        .map((i: any) => [i.applicationId, i])
    );

    const enriched = result.map((row: any) => {
      const p: any = placementByApp.get(row.application.id);
      const i: any = interviewByApp.get(row.application.id);
      return {
        id: row.application.id,
        status: row.application.status,
        matchScore: row.application.matchScore,
        rejectionFeedback: row.application.rejectionFeedback,
        appliedAt: row.application.appliedAt,
        jobId: row.job.id,
        jobTitle: row.job.title,
        company: row.job.company,
        location: row.job.location,
        country: row.job.country,
        salary: row.job.salary,
        skills: row.job.skills,
        // Offer data (from placements table) for FRS 1.26 / 1.27
        placement: p ? {
          id: p.id, status: p.status, startDate: p.startDate, country: p.country,
          salary: p.salary, visaStatus: p.visaStatus,
          appointmentLetterUrl: p.appointmentLetterUrl, declineReason: p.declineReason,
        } : null,
        // Next scheduled interview for this application
        nextInterview: i ? {
          id: i.id, scheduledAt: i.scheduledAt, location: i.location, mode: i.mode, result: i.result,
        } : null,
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    logger.error(`Error fetching candidate applications: ${err}`);
    next(err);
  }
});

// Update application status (for employers/agents)
router.put("/applications/:id/status", protect, async (req, res, next) => {
  try {
    const userId = (req.user as any)?.id;
    const userRole = (req.user as any)?.role;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (userRole !== "employer" && userRole !== "agent" && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only employers, agents, or admins can update application status." });
    }

    const { status } = req.body;
    const validStatuses = ["submitted", "reviewed", "shortlisted", "interview_scheduled", "selected", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    const applicationId = req.params.id;

    // Get the application with job info
    const appResult = await storage.db
      .select({ application: applications, job: jobs })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!appResult || appResult.length === 0) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    // Update the status
    const updated = await storage.db
      .update(applications)
      .set({ status })
      .where(eq(applications.id, applicationId))
      .returning();

    // Notify the candidate
    const candidateRecord = await storage.db.select().from(candidates).where(eq(candidates.id, appResult[0].application.candidateId!)).limit(1);
    if (candidateRecord.length > 0 && candidateRecord[0].userId) {
      const statusLabels: Record<string, string> = {
        reviewed: "Your application has been reviewed",
        shortlisted: "Congratulations! You've been shortlisted",
        interview_scheduled: "An interview has been scheduled",
        selected: "🎉 Congratulations! You've been selected",
        rejected: "Your application was not selected this time",
      };
      notify({
        userId: candidateRecord[0].userId,
        type: "application_update",
        title: `Application Update: ${appResult[0].job.title}`,
        message: `${statusLabels[status] || status} for "${appResult[0].job.title}" at ${appResult[0].job.company}.`,
        metadata: { applicationId, jobId: appResult[0].job.id, newStatus: status },
      }).catch(() => {});
    }

    res.json({ success: true, data: updated[0] });
  } catch (err) {
    logger.error(`Error updating application status: ${err}`);
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PDF PROFILE EXPORT
// ═══════════════════════════════════════════════════════════════════

router.get("/profile/pdf", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.status(404).json({ success: false, error: { code: 404, message: "Candidate profile not found" } });

    const profileRows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
    const profile = profileRows[0];

    const eduRows = await db.select().from(candidateEducation).where(eq(candidateEducation.candidateId, candidateId));
    const expRows = await db.select().from(candidateExperience).where(eq(candidateExperience.candidateId, candidateId));

    // Generate HTML resume
    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${profile.fullName} - Profile</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #333; }
  h1 { color: #1a56db; margin-bottom: 4px; }
  h2 { color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 4px; margin-top: 28px; font-size: 16px; }
  .subtitle { color: #666; font-size: 14px; }
  .section { margin-bottom: 20px; }
  .entry { margin-bottom: 12px; }
  .entry-title { font-weight: bold; }
  .entry-detail { color: #555; font-size: 13px; }
  .skills { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-tag { background: #e8f0fe; color: #1a56db; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
  .header-line { display: flex; justify-content: space-between; align-items: baseline; }
  .footer { margin-top: 40px; text-align: center; color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 12px; }
</style></head><body>

<h1>${profile.fullName}</h1>
<p class="subtitle">${profile.email}${profile.phone ? ' | ' + profile.phone : ''}${profile.location ? ' | ' + profile.location : ''}</p>

${profile.skills && profile.skills.length > 0 ? `
<h2>Skills</h2>
<div class="skills">${profile.skills.map((s: string) => `<span class="skill-tag">${s}</span>`).join('')}</div>
` : ''}

${profile.preferredCountries && profile.preferredCountries.length > 0 ? `
<h2>Preferred Countries</h2>
<p>${profile.preferredCountries.join(', ')}</p>
` : ''}

${eduRows.length > 0 ? `
<h2>Education</h2>
${eduRows.map((e: any) => `
<div class="entry">
  <div class="header-line">
    <span class="entry-title">${e.degree}</span>
    <span class="entry-detail">${e.year || ''}</span>
  </div>
  <div class="entry-detail">${e.institution}${e.percentage ? ' — ' + e.percentage + '%' : ''}</div>
</div>`).join('')}
` : ''}

${expRows.length > 0 ? `
<h2>Work Experience</h2>
${expRows.map((e: any) => `
<div class="entry">
  <div class="header-line">
    <span class="entry-title">${e.role}</span>
    <span class="entry-detail">${e.years ? e.years + ' yr(s)' : ''}</span>
  </div>
  <div class="entry-detail">${e.company}${e.country ? ', ' + e.country : ''}</div>
  ${e.description ? `<div class="entry-detail" style="margin-top:4px">${e.description}</div>` : ''}
</div>`).join('')}
` : ''}

<p class="footer">Generated from HireStream — HPSEDC Overseas Placement Portal | ${new Date().toLocaleDateString('en-IN')}</p>
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="${profile.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_Profile.html"`);
    res.send(html);
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// EDUCATION CRUD
// ═══════════════════════════════════════════════════════════════════

async function getCandidateIdFromUser(userId: string): Promise<string | null> {
  const db = storage.db;
  if (!db) return null;
  const rows = await db.select().from(candidates).where(eq(candidates.userId, userId)).limit(1);
  return rows.length > 0 ? rows[0].id : null;
}

// Add education
router.post("/education", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.status(404).json({ success: false, error: { code: 404, message: "Candidate profile not found" } });

    // Validate year/percentage ranges — HTIS BUG-003 caught out-of-range values
    // being accepted. Validation lives in insertEducationSchema so the same
    // rules apply to PUT below.
    const parsed = insertEducationSchema.safeParse({ ...req.body, candidateId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 400, message: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues } });
    }
    const result = await db.insert(candidateEducation).values(parsed.data as any).returning();
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// List education
router.get("/education", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.json({ success: true, data: [] });

    const rows = await db.select().from(candidateEducation).where(eq(candidateEducation.candidateId, candidateId));
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// Update education
router.put("/education/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.status(404).json({ success: false, error: { code: 404, message: "Candidate profile not found" } });

    // Verify ownership
    const existing = await db.select().from(candidateEducation)
      .where(and(eq(candidateEducation.id, req.params.id), eq(candidateEducation.candidateId, candidateId)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ success: false, error: { code: 404, message: "Education record not found" } });

    const { candidateId: _, id: __, ...updateBody } = req.body;
    // Same validation as POST — BUG-003 applies to edits too.
    const parsed = insertEducationSchema.partial().safeParse(updateBody);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 400, message: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues } });
    }
    const result = await db.update(candidateEducation).set(parsed.data as any).where(eq(candidateEducation.id, req.params.id)).returning();
    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// Delete education
router.delete("/education/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.status(404).json({ success: false, error: { code: 404, message: "Candidate profile not found" } });

    const existing = await db.select().from(candidateEducation)
      .where(and(eq(candidateEducation.id, req.params.id), eq(candidateEducation.candidateId, candidateId)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ success: false, error: { code: 404, message: "Education record not found" } });

    await db.delete(candidateEducation).where(eq(candidateEducation.id, req.params.id));
    res.json({ success: true, message: "Education record deleted" });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// EXPERIENCE CRUD
// ═══════════════════════════════════════════════════════════════════

// Add experience
router.post("/experience", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.status(404).json({ success: false, error: { code: 404, message: "Candidate profile not found" } });

    const parsed = insertExperienceSchema.safeParse({ ...req.body, candidateId });
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 400, message: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues } });
    }
    const result = await db.insert(candidateExperience).values(parsed.data as any).returning();
    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// List experience
router.get("/experience", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.json({ success: true, data: [] });

    const rows = await db.select().from(candidateExperience).where(eq(candidateExperience.candidateId, candidateId));
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

// Update experience
router.put("/experience/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.status(404).json({ success: false, error: { code: 404, message: "Candidate profile not found" } });

    const existing = await db.select().from(candidateExperience)
      .where(and(eq(candidateExperience.id, req.params.id), eq(candidateExperience.candidateId, candidateId)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ success: false, error: { code: 404, message: "Experience record not found" } });

    const { candidateId: _, id: __, ...updateBody } = req.body;
    const parsed = insertExperienceSchema.partial().safeParse(updateBody);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 400, message: parsed.error.issues[0]?.message ?? "Invalid input", issues: parsed.error.issues } });
    }
    const result = await db.update(candidateExperience).set(parsed.data as any).where(eq(candidateExperience.id, req.params.id)).returning();
    res.json({ success: true, data: result[0] });
  } catch (error) {
    next(error);
  }
});

// Delete experience
router.delete("/experience/:id", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) return res.status(404).json({ success: false, error: { code: 404, message: "Candidate profile not found" } });

    const existing = await db.select().from(candidateExperience)
      .where(and(eq(candidateExperience.id, req.params.id), eq(candidateExperience.candidateId, candidateId)))
      .limit(1);
    if (existing.length === 0) return res.status(404).json({ success: false, error: { code: 404, message: "Experience record not found" } });

    await db.delete(candidateExperience).where(eq(candidateExperience.id, req.params.id));
    res.json({ success: true, message: "Experience record deleted" });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════
// PROFILE COMPLETION
// ═══════════════════════════════════════════════════════════════════

router.get("/profile/completion", protect, async (req, res, next) => {
  try {
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });

    const user = req.user as any;
    const candidateId = await getCandidateIdFromUser(user.id);
    if (!candidateId) {
      return res.json({ success: true, data: { percentage: 0, missing: ["profile", "education", "experience", "documents"] } });
    }

    // Fetch candidate profile
    const profileRows = await db.select().from(candidates).where(eq(candidates.id, candidateId)).limit(1);
    const profile = profileRows[0];

    // Check each section (8 checkpoints, each worth 12.5%)
    const checks: { name: string; done: boolean }[] = [];

    // 1. Full name
    checks.push({ name: "fullName", done: Boolean(profile.fullName && profile.fullName !== "Unknown") });
    // 2. Email
    checks.push({ name: "email", done: Boolean(profile.email) });
    // 3. Phone
    checks.push({ name: "phone", done: Boolean(profile.phone) });
    // 4. Location
    checks.push({ name: "location", done: Boolean(profile.location) });
    // 5. Skills (at least 1)
    checks.push({ name: "skills", done: Boolean(profile.skills && profile.skills.length > 0) });
    // 6. At least 1 education record
    const eduCount = await db.select({ c: count() }).from(candidateEducation).where(eq(candidateEducation.candidateId, candidateId));
    checks.push({ name: "education", done: (eduCount[0]?.c ?? 0) > 0 });
    // 7. At least 1 experience record
    const expCount = await db.select({ c: count() }).from(candidateExperience).where(eq(candidateExperience.candidateId, candidateId));
    checks.push({ name: "experience", done: (expCount[0]?.c ?? 0) > 0 });
    // 8. At least 1 document uploaded
    const docCount = await db.select({ c: count() }).from(documents).where(eq(documents.candidateId, candidateId));
    checks.push({ name: "documents", done: (docCount[0]?.c ?? 0) > 0 });

    const completed = checks.filter((c) => c.done).length;
    const percentage = Math.round((completed / checks.length) * 100);
    const missing = checks.filter((c) => !c.done).map((c) => c.name);

    res.json({ success: true, data: { percentage, completed, total: checks.length, missing, checks } });
  } catch (error) {
    next(error);
  }
});

export default router;
