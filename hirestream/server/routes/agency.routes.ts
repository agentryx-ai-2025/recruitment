import { Router } from "express";
import { protect } from "../middleware/auth.middleware";
import { storage } from "../storage";
import { logger } from "../config/logger.config";
import { insertRecruitmentAgentSchema, recruitmentAgents, candidates, agencyReviews,
  candidateEducation, candidateExperience, documents, applications, jobs } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Register a new recruitment agency
router.post("/register", protect, async (req, res, next) => {
  try {
     const userId = (req.user as any)?.id;
     if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

     if ((req.user as any)?.role !== "agent") {
        return res.status(403).json({ success: false, message: "Only agents can register agencies." });
     }

     const validatedData = insertRecruitmentAgentSchema.parse(req.body);
     
     if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

     const newAgency = await storage.db.insert(recruitmentAgents).values({
       ...validatedData,
       userId,
       verified: false // Needs admin approval
     }).returning();

     res.status(201).json({ success: true, data: newAgency[0] });
  } catch (err) {
    logger.error(`Error registering agency: ${err}`);
    next(err);
  }
});

// Get current agency details
router.get("/me", protect, async (req, res, next) => {
  try {
     const userId = (req.user as any)?.id;
     if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

     if ((req.user as any)?.role !== "agent") {
        return res.status(403).json({ success: false, message: "Only agents have agency profiles." });
     }

     if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

     const existing = await storage.db.select().from(recruitmentAgents).where(eq(recruitmentAgents.userId, userId)).limit(1);

     if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: "Agency profile not found" });
     }

     res.status(200).json({ success: true, data: existing[0] });
  } catch (err) {
    logger.error(`Error fetching agency details: ${err}`);
    next(err);
  }
});

// Search candidates (for agents/employers)
router.get("/candidates", protect, async (req, res, next) => {
  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== "agent" && userRole !== "employer" && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Only agents, employers, or admins can search candidates." });
    }

    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    const allCandidates = await storage.db.select().from(candidates);

    // Client can pass ?skill=React&location=Shimla for filtering
    const { skill, location } = req.query;
    let filtered = allCandidates;

    if (skill && typeof skill === "string") {
      const s = skill.toLowerCase();
      filtered = filtered.filter((c: any) =>
        c.skills?.some((sk: string) => sk.toLowerCase().includes(s))
      );
    }

    if (location && typeof location === "string") {
      const l = location.toLowerCase();
      filtered = filtered.filter((c: any) =>
        c.location?.toLowerCase().includes(l)
      );
    }

    res.json({ success: true, data: filtered, total: filtered.length });
  } catch (err) {
    logger.error(`Error searching candidates: ${err}`);
    next(err);
  }
});

// GET /api/v1/agencies/candidates/:id — full candidate profile for agent view
router.get("/candidates/:id", protect, async (req, res, next) => {
  try {
    const userRole = (req.user as any)?.role;
    if (userRole !== "agent" && userRole !== "employer" && userRole !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    const [candidate] = await storage.db.select().from(candidates).where(eq(candidates.id, req.params.id)).limit(1);
    if (!candidate) return res.status(404).json({ success: false, message: "Candidate not found" });

    const education = await storage.db.select().from(candidateEducation).where(eq(candidateEducation.candidateId, candidate.id));
    const experience = await storage.db.select().from(candidateExperience).where(eq(candidateExperience.candidateId, candidate.id));
    const docs = await storage.db.select().from(documents).where(eq(documents.candidateId, candidate.id));

    // Applications by this candidate with basic job info.
    // Sort newest-first so the most recent activity is visible without
    // scrolling — this is what agents actually look for when they open a
    // candidate they just got a notification about.
    const { desc } = await import("drizzle-orm");
    const apps = await storage.db
      .select({ application: applications, job: jobs })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.candidateId, candidate.id))
      .orderBy(desc(applications.appliedAt));
    const applicationsList = apps.map((r: any) => ({
      id: r.application.id,
      status: r.application.status,
      matchScore: r.application.matchScore,
      appliedAt: r.application.appliedAt,
      jobId: r.job.id,
      jobTitle: r.job.title,
      company: r.job.company,
      country: r.job.country,
    }));

    res.json({
      success: true,
      data: {
        ...candidate,
        education, experience, documents: docs,
        applications: applicationsList,
      },
    });
  } catch (err) { next(err); }
});

// ─── AGENCY REVIEWS ─────────────────────────────────────────────────────────
// GET /api/v1/agencies/:id/reviews — public: list reviews for an agency
router.get("/:id/reviews", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });
    const reviews = await storage.db.select().from(agencyReviews).where(eq(agencyReviews.agencyId, req.params.id));
    const avg = reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0;
    res.json({
      success: true,
      data: reviews,
      total: reviews.length,
      averageRating: Number(avg.toFixed(2)),
    });
  } catch (err) {
    logger.error(`Error fetching reviews: ${err}`);
    next(err);
  }
});

// POST /api/v1/agencies/:id/reviews — candidate posts a review
router.post("/:id/reviews", protect, async (req, res, next) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (user.role !== "candidate") {
      return res.status(403).json({ success: false, message: "Only candidates can post reviews" });
    }

    const { rating, title, review } = req.body;
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "rating must be a number between 1 and 5" });
    }

    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    // Verify agency exists
    const agency = await storage.db.select().from(recruitmentAgents).where(eq(recruitmentAgents.id, req.params.id)).limit(1);
    if (!agency.length) return res.status(404).json({ success: false, message: "Agency not found" });

    const [newReview] = await storage.db.insert(agencyReviews).values({
      agencyId: req.params.id,
      candidateUserId: user.id,
      rating,
      title: title || null,
      review: review || null,
    }).returning();

    // Update agency's aggregate rating
    const allReviews = await storage.db.select().from(agencyReviews).where(eq(agencyReviews.agencyId, req.params.id));
    const avgRating = Math.round(allReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / allReviews.length);
    await storage.db.update(recruitmentAgents)
      .set({ rating: avgRating })
      .where(eq(recruitmentAgents.id, req.params.id));

    res.status(201).json({ success: true, data: newReview });
  } catch (err) {
    logger.error(`Error posting review: ${err}`);
    next(err);
  }
});

// GET /api/v1/agencies — list all agencies (for public browsing)
router.get("/", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });
    const agencies = await storage.db.select().from(recruitmentAgents).where(eq(recruitmentAgents.verified, true));
    res.json({ success: true, data: agencies, total: agencies.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/agencies/:id — public agency profile (candidate-facing).
// Includes reviews, recent active jobs, and the set of countries this agency
// has posted jobs in — the three signals candidates weigh when deciding
// whether to trust an agency (GulfTalent / Bayt-style public profile).
router.get("/:id", async (req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });
    const [agency] = await storage.db.select().from(recruitmentAgents).where(eq(recruitmentAgents.id, req.params.id)).limit(1);
    if (!agency) return res.status(404).json({ success: false, message: "Agency not found" });

    const reviews = await storage.db.select().from(agencyReviews).where(eq(agencyReviews.agencyId, agency.id));
    const avgRating = reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;

    // Active public jobs posted by this agency (candidates can click through).
    const { jobs } = await import("@shared/schema");
    const { and } = await import("drizzle-orm");
    const activeJobs = await storage.db.select().from(jobs)
      .where(and(
        eq(jobs.agentId, agency.userId!),
        eq(jobs.visibility, "public"),
        eq(jobs.status, "active"),
      )).limit(20);
    const countriesServed = Array.from(new Set(activeJobs.map((j: any) => j.country).filter(Boolean))).sort();

    res.json({
      success: true,
      data: {
        ...agency,
        reviews,
        reviewCount: reviews.length,
        averageRating: Number(avgRating.toFixed(2)),
        activeJobs: activeJobs.slice(0, 8),
        activeJobCount: activeJobs.length,
        countriesServed,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/v1/agencies/leaderboard — top agencies by composite score
// Score = placements × 10 + rating × 5 (favours both volume and quality)
router.get("/leaderboard/top", async (_req, res, next) => {
  try {
    if (!storage.db) return res.status(500).json({ success: false, message: "No db available" });

    const { getSetting } = await import("../services/settings.service");
    const placementWeight: number = await getSetting("leaderboard.placement_weight");
    const ratingWeight: number = await getSetting("leaderboard.rating_weight");

    const agencies = await storage.db
      .select()
      .from(recruitmentAgents)
      .where(eq(recruitmentAgents.verified, true));

    // Compute review counts in parallel
    const withReviews = await Promise.all(agencies.map(async (a: any) => {
      const reviews = await storage.db!.select().from(agencyReviews).where(eq(agencyReviews.agencyId, a.id));
      const reviewCount = reviews.length;
      const avgRating = reviewCount > 0
        ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviewCount
        : 0;
      const score = (a.placements || 0) * placementWeight + Math.round(avgRating * ratingWeight);
      return {
        id: a.id,
        agencyName: a.agencyName,
        licenseNumber: a.licenseNumber,
        specializations: a.specializations,
        verified: a.verified,
        placements: a.placements || 0,
        averageRating: Number(avgRating.toFixed(2)),
        reviewCount,
        score,
        // Badges
        badges: [
          ...(a.placements >= 50 ? ["top_placer"] : []),
          ...(avgRating >= 4.5 && reviewCount >= 5 ? ["five_star"] : []),
          ...(reviewCount >= 20 ? ["well_reviewed"] : []),
        ],
      };
    }));

    // Sort by composite score, desc
    const ranked = withReviews
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 50)
      .map((a: any, i: number) => ({ ...a, rank: i + 1 }));

    res.json({
      success: true,
      data: ranked,
      total: ranked.length,
      scoring: {
        formula: "placements * 10 + averageRating * 5",
        weights: { placements: 10, rating: 5 },
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

