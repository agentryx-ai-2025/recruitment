/**
 * Seed the PWS §5 default notification templates on server boot.
 * Idempotent: only inserts rows that don't exist yet, admin edits are preserved.
 */

import { storage } from "../storage";
import { notificationTemplates } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import { logger } from "../config/logger.config";

interface TemplateSeed {
  eventKey: string;
  recipientRole: "candidate" | "agent" | "employer";
  title: string;
  body: string;
  channels: string[];
  hideEmployerName: boolean;
}

const DEFAULTS: TemplateSeed[] = [
  // application.submitted — candidate + agent
  { eventKey: "application.submitted", recipientRole: "candidate",
    title: "Application submitted",
    body: "Your application for {{job.title}} is in. Your agency will be in touch soon.",
    channels: ["in_app"], hideEmployerName: true },
  { eventKey: "application.submitted", recipientRole: "agent",
    title: "New applicant for {{job.title}}",
    body: "{{candidate.fullName}} applied for {{job.title}}.",
    channels: ["in_app"], hideEmployerName: false },

  // application.reviewed — candidate
  { eventKey: "application.reviewed", recipientRole: "candidate",
    title: "Application reviewed",
    body: "Your application for {{job.title}} has been reviewed.",
    channels: ["in_app"], hideEmployerName: true },

  // application.shortlisted — candidate + employer
  { eventKey: "application.shortlisted", recipientRole: "candidate",
    title: "You're being considered",
    body: "The agency is putting you forward for {{job.title}}. Sit tight.",
    channels: ["in_app"], hideEmployerName: true },
  { eventKey: "application.shortlisted", recipientRole: "employer",
    title: "New candidate for review",
    body: "{{candidate.fullName}} shortlisted by {{agent.agencyName}} for {{job.title}}.",
    channels: ["in_app", "email"], hideEmployerName: false },

  // employer_approved → interview prep
  { eventKey: "application.employer_approved", recipientRole: "candidate",
    title: "The agency is arranging your interview",
    body: "Congrats — your interview for {{job.title}} is being scheduled. Watch for details.",
    channels: ["in_app"], hideEmployerName: true },
  { eventKey: "application.employer_approved", recipientRole: "agent",
    title: "Schedule interview with {{candidate.fullName}}",
    body: "Employer approved {{candidate.fullName}} for {{job.title}}. Please schedule interview.",
    channels: ["in_app"], hideEmployerName: false },

  // application.rejected — agent-driven rejection (e.g. after screening / interview).
  // Candidate sees a softened message, no employer name. Employer doesn't need
  // to hear about it (they never saw the candidate) — so no template for them.
  { eventKey: "application.rejected", recipientRole: "candidate",
    title: "Application not advancing",
    body: "Your application for {{job.title}} isn't moving forward. Your agency can share feedback if you ask.",
    channels: ["in_app"], hideEmployerName: true },

  // employer_rejected — candidate gets soft message, agent gets direct
  { eventKey: "application.employer_rejected", recipientRole: "candidate",
    title: "Not selected this round",
    body: "You weren't selected for {{job.title}} this time. Keep applying — new roles open every week.",
    channels: ["in_app"], hideEmployerName: true },
  { eventKey: "application.employer_rejected", recipientRole: "agent",
    title: "Employer rejected {{candidate.fullName}}",
    body: "Employer rejected {{candidate.fullName}} for {{job.title}}. Submit a substitute if possible.",
    channels: ["in_app"], hideEmployerName: false },

  // interview scheduled
  { eventKey: "interview.scheduled", recipientRole: "candidate",
    title: "Interview scheduled",
    body: "Your interview for {{job.title}} is scheduled. Check your dashboard for details.",
    channels: ["in_app", "email"], hideEmployerName: true },
  { eventKey: "interview.scheduled", recipientRole: "employer",
    title: "Interview scheduled for {{candidate.fullName}}",
    body: "{{agent.agencyName}} scheduled {{candidate.fullName}} for {{job.title}}.",
    channels: ["in_app"], hideEmployerName: false },

  // interview completed → decision pending
  { eventKey: "interview.completed", recipientRole: "candidate",
    title: "Decision pending",
    body: "Your interview for {{job.title}} is complete. The agency will share the outcome soon.",
    channels: ["in_app"], hideEmployerName: true },
  { eventKey: "interview.completed", recipientRole: "agent",
    title: "Record interview outcome",
    body: "Record the outcome of {{candidate.fullName}}'s interview for {{job.title}}.",
    channels: ["in_app"], hideEmployerName: false },
  { eventKey: "interview.completed", recipientRole: "employer",
    title: "Record interview decision",
    body: "Please confirm your decision on {{candidate.fullName}} for {{job.title}}.",
    channels: ["in_app"], hideEmployerName: false },

  // selected
  { eventKey: "application.selected", recipientRole: "candidate",
    title: "Selected — offer coming",
    body: "You've been selected for {{job.title}}! The agency will send your offer letter shortly.",
    channels: ["in_app", "email"], hideEmployerName: true },
  { eventKey: "application.selected", recipientRole: "agent",
    title: "Issue offer letter to {{candidate.fullName}}",
    body: "Employer selected {{candidate.fullName}} for {{job.title}}. Issue the offer letter.",
    channels: ["in_app"], hideEmployerName: false },

  // offer issued
  { eventKey: "offer.issued", recipientRole: "candidate",
    title: "Offer available",
    body: "Your offer letter for {{job.title}} is ready. Review and accept from your dashboard.",
    channels: ["in_app", "email"], hideEmployerName: true },
  { eventKey: "offer.issued", recipientRole: "agent",
    title: "Offer sent to {{candidate.fullName}}",
    body: "Offer for {{job.title}} sent to {{candidate.fullName}}.",
    channels: ["in_app"], hideEmployerName: false },
  { eventKey: "offer.issued", recipientRole: "employer",
    title: "Appointment letter issued",
    body: "Appointment letter for {{candidate.fullName}} issued for {{job.title}}.",
    channels: ["in_app"], hideEmployerName: false },

  // offer accepted
  { eventKey: "offer.accepted", recipientRole: "candidate",
    title: "Placement confirmed",
    body: "Your placement for {{job.title}} is confirmed. Welfare check-ins will begin on departure day.",
    channels: ["in_app", "email"], hideEmployerName: false },
  { eventKey: "offer.accepted", recipientRole: "agent",
    title: "Placement confirmed",
    body: "{{candidate.fullName}} accepted the offer for {{job.title}}.",
    channels: ["in_app", "email"], hideEmployerName: false },
  { eventKey: "offer.accepted", recipientRole: "employer",
    title: "Candidate accepted offer",
    body: "{{candidate.fullName}} accepted your offer for {{job.title}}.",
    channels: ["in_app", "email"], hideEmployerName: false },

  // offer declined
  { eventKey: "offer.declined", recipientRole: "candidate",
    title: "You declined the offer",
    body: "You declined the offer for {{job.title}}. No further action.",
    channels: ["in_app"], hideEmployerName: true },
  { eventKey: "offer.declined", recipientRole: "agent",
    title: "Candidate declined — substitute needed",
    body: "{{candidate.fullName}} declined the offer for {{job.title}}. Please submit a substitute candidate.",
    channels: ["in_app"], hideEmployerName: false },
  { eventKey: "offer.declined", recipientRole: "employer",
    title: "Candidate declined — agent will substitute",
    body: "{{candidate.fullName}} declined the offer for {{job.title}}. {{agent.agencyName}} will submit a substitute.",
    channels: ["in_app"], hideEmployerName: false },

  // job closed (manual or cascade)
  { eventKey: "job.closed", recipientRole: "candidate",
    title: "Position filled",
    body: "Thank you for applying to {{job.title}} — the position has been filled. Explore other roles on HireStream.",
    channels: ["in_app"], hideEmployerName: true },
  { eventKey: "job.closed", recipientRole: "agent",
    title: "Requisition closed",
    body: "The requisition for {{job.title}} has been closed.",
    channels: ["in_app"], hideEmployerName: false },
  { eventKey: "job.closed", recipientRole: "employer",
    title: "Job closed",
    body: "Your job {{job.title}} is now closed.",
    channels: ["in_app"], hideEmployerName: false },

  // auto-close deadline nudge
  { eventKey: "job.auto_close_nudge", recipientRole: "agent",
    title: "⚠ {{job.title}} closes in {{extra.daysLeft}} days",
    body: "Your job {{job.title}} will auto-close on the hiring deadline. Extend or close it now if plans changed.",
    channels: ["in_app"], hideEmployerName: false },
  { eventKey: "job.auto_close_nudge", recipientRole: "employer",
    title: "⚠ {{job.title}} closes in {{extra.daysLeft}} days",
    body: "Your requisition {{job.title}} will auto-close on the hiring deadline.",
    channels: ["in_app"], hideEmployerName: false },

  // requisition picked up
  { eventKey: "requisition.picked_up", recipientRole: "employer",
    title: "{{agent.agencyName}} picked up your requisition",
    body: "{{agent.agencyName}} has picked up your requisition for {{job.title}} and will start sourcing candidates.",
    channels: ["in_app"], hideEmployerName: false },

  // auto-match — new job alerts candidates whose profile matches
  { eventKey: "job.matches_your_profile", recipientRole: "candidate",
    title: "Job matching your profile: {{job.title}}",
    body: "A new role matches your skills and preferred country: {{job.title}} in {{job.location}}, {{job.country}}. Apply via your agent from your dashboard.",
    channels: ["in_app"], hideEmployerName: true },
];

/** Idempotent seed. Only inserts rows that don't exist for (eventKey, role). */
export async function seedNotificationTemplates(): Promise<void> {
  const db = storage.db;
  if (!db) return;

  let inserted = 0;
  for (const t of DEFAULTS) {
    const existing = await db.select().from(notificationTemplates)
      .where(and(eq(notificationTemplates.eventKey, t.eventKey), eq(notificationTemplates.recipientRole, t.recipientRole)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(notificationTemplates).values(t);
      inserted++;
    }
  }
  logger.info(`Notification templates: ${inserted} seeded, ${DEFAULTS.length - inserted} already present`);
}
