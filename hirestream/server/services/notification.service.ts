import { storage } from "../storage";
import { notifications, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.config";
import { sendEmail } from "./email.service";
import { sendSms } from "./sms.service";

interface NotifyOptions {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  severity?: "info" | "positive" | "warning" | "urgent";
  autoSave?: boolean;  // If true, notification lands pre-saved (can't be accidentally dismissed)
}

/**
 * Create an in-app notification AND send email/SMS based on user preferences.
 * This is the single entry point for all notifications in the system.
 */
export async function notify(opts: NotifyOptions): Promise<void> {
  const db = storage.db;
  if (!db) return;

  try {
    // Always create in-app notification
    await db.insert(notifications).values({
      userId: opts.userId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
      severity: opts.severity ?? "info",
      savedAt: opts.autoSave ? new Date() : null,
      metadata: opts.metadata || {},
    });

    // Get user preferences
    const userRows = await db.select().from(users).where(eq(users.id, opts.userId)).limit(1);
    if (userRows.length === 0) return;

    const user = userRows[0];

    // Send email if user has it enabled
    if (user.notifyEmail !== false && user.email) {
      sendEmail({
        to: user.email,
        subject: `HireStream — ${opts.title}`,
        text: opts.message,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a56db;">HireStream</h2>
            <h3 style="margin-bottom: 8px;">${opts.title}</h3>
            <p style="color: #333;">${opts.message}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px;">HPSEDC Overseas Placement Portal — You can manage notification preferences in your profile settings.</p>
          </div>
        `,
      }).catch((err) => logger.error(`Email notification failed for ${user.email}: ${err}`));
    }

    // Send SMS if user has it enabled and has a phone number
    if (user.notifySms !== false && user.phoneNumber) {
      sendSms(user.phoneNumber, `HireStream: ${opts.title} — ${opts.message}`)
        .catch((err) => logger.error(`SMS notification failed for ${user.phoneNumber}: ${err}`));
    }
  } catch (error) {
    // Notification failures should not break the main flow
    logger.error(`Notification creation failed: ${error}`);
  }
}
