/**
 * Mobile Config Routes — /api/v1/mobile/*
 *
 * Utility endpoints for mobile clients:
 *   GET /version  — force-update kill switch
 *   GET /config   — feature flags exposed to mobile
 *
 * These are public (no auth required) so the app can check them before login.
 *
 * See: /PMD-Final wrapup/MobileApps/05_Backend_API_Adaptations.md §2
 */

import { Router } from "express";
import { env, features } from "../config/env.config";

const router = Router();

// ── GET /version ────────────────────────────────────────────────────
// Returns the minimum supported version and latest version so the mobile
// app can decide whether to force-update, soft-prompt, or do nothing.
router.get("/version", (_req, res) => {
  res.json({
    success: true,
    data: {
      minSupported: env.MOBILE_MIN_SUPPORTED_VERSION,
      latest: env.MOBILE_LATEST_VERSION,
      // forceUpdate is a convenience flag for the client:
      // if the client's version < minSupported, show a blocking screen.
      // The client still needs to compare itself; this is a hint.
      forceUpdate: false,
    },
  });
});

// ── GET /config ─────────────────────────────────────────────────────
// Feature flags exposed to mobile. The app uses these to show/hide UI
// elements without requiring a new build.
router.get("/config", (_req, res) => {
  res.json({
    success: true,
    data: {
      flags: {
        multilingualEnabled: false,    // English-only in v1.0
        photoUploadEnabled: true,
        documentUploadEnabled: true,
        himAccessSsoEnabled: features.himAccess,
        aadhaarVerificationEnabled: features.uidai,
        digilockerEnabled: features.digilocker,
        pushNotificationsEnabled: features.fcm,
      },
    },
  });
});

// ── GET /profile ────────────────────────────────────────────────────
// Returns the authenticated user's profile for the mobile Profile screen.
router.get("/profile", (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 401, message: "Not authenticated" } });
  }
  res.json({
    success: true,
    data: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      fullName: req.user.fullName || req.user.username,
      role: req.user.role,
      phoneNumber: req.user.phoneNumber || null,
      preferredLanguage: req.user.preferredLanguage || "en",
      aadhaarVerified: req.user.aadhaarVerified || false,
      twoFactorEnabled: req.user.twoFactorEnabled || false,
      isActive: req.user.isActive,
    },
  });
});

// ── GET /notifications ──────────────────────────────────────────────
// Returns the authenticated user's notifications from the database,
// ordered by most recent first.
router.get("/notifications", async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 401, message: "Not authenticated" } });
  }

  try {
    const { storage } = await import("../storage");
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });
    const { notifications } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");

    let items = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    // Auto-seed a welcome notification on first visit
    if (items.length === 0) {
      const welcome = {
        userId: req.user.id,
        type: "system",
        title: "Welcome to HireStream!",
        message: "Your account is set up. Start browsing overseas job opportunities from HPSEDC.",
        severity: "info",
      };
      const profileTip = {
        userId: req.user.id,
        type: "info",
        title: "Complete Your Profile",
        message: "Add your education, work experience, and documents for better job matches.",
        severity: "info",
      };
      await db.insert(notifications).values([welcome, profileTip]);
      items = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, req.user.id))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    }

    // Map DB field names to what the mobile client expects
    const mapped = items.map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.read ?? false,
      severity: n.severity,
      metadata: n.metadata,
      createdAt: n.createdAt?.toISOString(),
    }));

    res.json({ success: true, data: { notifications: mapped } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 500, message: err.message || "Internal error" } });
  }
});
// ── PATCH /profile ──────────────────────────────────────────────────
// Update the authenticated user's profile fields.
router.patch("/profile", async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 401, message: "Not authenticated" } });
  }

  try {
    const allowedFields = ["fullName", "phoneNumber", "preferredLanguage"];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: { code: 400, message: "No valid fields to update" } });
    }

    // Import storage to update user
    const { storage } = await import("../storage");
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    await db.update(users).set(updates).where(eq(users.id, req.user.id));

    res.json({ success: true, data: { ...req.user, ...updates } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 500, message: err.message || "Internal error" } });
  }
});

// ── PATCH /notifications/read-all ───────────────────────────────────
// Mark ALL notifications for the authenticated user as read.
router.patch("/notifications/read-all", async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 401, message: "Not authenticated" } });
  }
  try {
    const { storage } = await import("../storage");
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });
    const { notifications } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.userId, req.user.id), eq(notifications.read, false)));

    res.json({ success: true, data: { message: "All notifications marked as read" } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 500, message: err.message || "Internal error" } });
  }
});

// ── PATCH /notifications/:id/read ───────────────────────────────────
// Mark a notification as read in the database.
router.patch("/notifications/:id/read", async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 401, message: "Not authenticated" } });
  }
  try {
    const { storage } = await import("../storage");
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });
    const { notifications } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    await db.update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.userId, req.user.id)));

    res.json({ success: true, data: { id: req.params.id, isRead: true } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 500, message: err.message || "Internal error" } });
  }
});

// ── DELETE /account ─────────────────────────────────────────────────
// Permanently delete the authenticated user's account.
// Required by Google Play Store and Apple App Store policies.
router.delete("/account", async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 401, message: "Not authenticated" } });
  }

  try {
    const { storage } = await import("../storage");
    const db = storage.db;
    if (!db) return res.status(500).json({ success: false, error: { code: 500, message: "Database not available" } });
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");

    // Soft-delete: set isActive to false and anonymize PII
    await db.update(users).set({
      isActive: false,
      email: `deleted-${req.user.id}@hirestream.deleted`,
      username: `deleted-${req.user.id}`,
      fullName: "Deleted User",
      phoneNumber: null,
    }).where(eq(users.id, req.user.id));

    res.json({ success: true, data: { message: "Account deleted successfully" } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 500, message: err.message || "Internal error" } });
  }
});

export default router;
