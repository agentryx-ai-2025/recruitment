/**
 * Pre-departure / deployment checklist — the single source of truth for
 * "what stands between an accepted offer and the candidate boarding the
 * plane". Derived entirely from existing data (candidate compliance fields
 * + placement), so every role renders the same truth:
 *   - Candidate sees it as their Pre-Departure Tracker
 *   - Employer sees a read-only readiness summary
 *   - HPSEDC/admin oversight aggregates it
 *
 * Best-practice steps follow the Emigration Act / MEA eMigrate lifecycle.
 */
export type DeployStatus = "done" | "in_progress" | "action_needed" | "pending";
export interface DeployItem {
  key: string;
  label: string;
  status: DeployStatus;
  owner: "you" | "agency";
  detail?: string | null;
}

const VISA_LABEL: Record<string, string> = {
  not_applied: "Not applied yet",
  applied: "Application submitted",
  approved: "Approved",
  rejected: "Rejected",
};

// audit 2026-07-06 (Batch 4B): 6-month passport-validity rule. Most
// destination countries refuse entry (and eMigrate refuses clearance) when the
// passport expires within 6 months of travel. Returns:
//   null               → no issue (or no expiry on file — absence is handled
//                        by the caller, e.g. the "passport on file" check)
//   "expired"          → already expired at referenceDate
//   "within_6_months"  → valid, but expires within 6 months of referenceDate
export type PassportValidityIssue = null | "expired" | "within_6_months";
export function passportValidityIssue(
  passportExpiry: string | Date | null | undefined,
  referenceDate: string | Date = new Date(),
): PassportValidityIssue {
  if (!passportExpiry) return null;
  const expiry = new Date(passportExpiry);
  if (Number.isNaN(expiry.getTime())) return null;
  const ref = new Date(referenceDate);
  if (expiry < ref) return "expired";
  const sixMonthsOut = new Date(ref);
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);
  if (expiry < sixMonthsOut) return "within_6_months";
  return null;
}

// audit 2026-07-06 (Batch 4B): PDO/PBBY travel gate for ECR candidates
// (Emigration Act — both are mandatory before an ECR worker departs).
// Returns a human-readable list of what's missing, or null when clear /
// not applicable (non-ECR candidates are never gated).
export function ecrTravelGateIssue(candidate: any): string | null {
  if (candidate?.ecrStatus !== "ecr") return null;
  const missing: string[] = [];
  if (!candidate.pdoCompleted) missing.push("Pre-Departure Orientation (PDO)");
  if (candidate.pbbyInsuranceStatus !== "enrolled") missing.push("PBBY insurance enrolment");
  return missing.length ? missing.join(" and ") : null;
}

// audit 2026-07-06 (Batch 4B-2): optional context the callers resolve outside
// this pure function (it deliberately takes no DB dependency).
export interface DeploymentChecklistOpts {
  // Is the placement's destination one of the MEA-notified ECR countries?
  // (country_info.is_ecr_country — resolved by the route from the placement's
  // country.) Drives the conditional eMigrate/PoE emigration-clearance step.
  destinationIsEcr?: boolean;
}

export function buildDeploymentChecklist(candidate: any, placement: any, opts?: DeploymentChecklistOpts): DeployItem[] {
  const c = candidate ?? {};
  const p = placement ?? {};
  const offerAccepted = ["accepted", "active", "completed"].includes(p.status);
  const visa = p.visaStatus as string | null | undefined;

  return [
    {
      key: "offer", label: "Offer accepted", owner: "you",
      status: offerAccepted ? "done" : "pending",
    },
    // audit 2026-07-06 (Batch 4B): "passport exists" is not enough — an
    // expired (or soon-expiring) passport blocks visa + eMigrate clearance.
    // Surface it as action_needed with a clear label instead of a false "done".
    (() => {
      const issue = passportValidityIssue(c.passportExpiry);
      const validTo = c.passportExpiry ? new Date(c.passportExpiry).toLocaleDateString("en-IN") : null;
      if (!c.passportNumber) {
        return { key: "passport", label: "Passport on file", owner: "you" as const, status: "action_needed" as DeployStatus, detail: null };
      }
      if (issue === "expired") {
        return { key: "passport", label: "Passport expired — renew now", owner: "you" as const, status: "action_needed" as DeployStatus, detail: `Expired ${validTo}` };
      }
      if (issue === "within_6_months") {
        return { key: "passport", label: "Passport expires within 6 months — renew", owner: "you" as const, status: "action_needed" as DeployStatus, detail: `Valid to ${validTo} — most countries require 6 months validity` };
      }
      return { key: "passport", label: "Passport on file", owner: "you" as const, status: "done" as DeployStatus, detail: validTo ? `Valid to ${validTo}` : null };
    })(),
    {
      key: "pcc", label: "Police clearance (PCC)", owner: "you",
      status: ["submitted", "verified"].includes(c.pccStatus) ? "done" : "pending",
    },
    {
      key: "medical", label: "Medical fitness", owner: "you",
      status: c.medicalStatus === "fit" ? "done" : "pending",
    },
    {
      key: "visa", label: "Visa / passport assistance", owner: "agency",
      status: visa === "approved" ? "done" : visa === "applied" ? "in_progress" : visa === "rejected" ? "action_needed" : "pending",
      detail: visa ? VISA_LABEL[visa] ?? visa : null,
    },
    {
      key: "pdo", label: "Pre-departure orientation (PDO)", owner: "agency",
      status: c.pdoCompleted ? "done" : "pending",
    },
    {
      key: "pbby", label: "PBBY insurance", owner: "agency",
      status: c.pbbyInsuranceStatus === "enrolled" ? "done" : "pending",
    },
    // audit 2026-07-06 (Batch 4B-2): eMigrate / PoE emigration clearance —
    // shown ONLY when the destination is an ECR-notified country AND the
    // candidate holds an ECR passport (an ECR worker departing to an ECR
    // country without PoE clearance is unlawful under the Emigration Act).
    // INTERNAL tracking only: there is no live eMigrate API integration —
    // HPSEDC staff record the outcome obtained on the government portal via
    // PATCH /placements/:id/emigration-clearance.
    ...((opts?.destinationIsEcr && c.ecrStatus === "ecr" ? [{
      key: "emigration",
      label: "Emigration clearance (PoE / eMigrate)",
      owner: "agency",
      status: p.emigrationClearanceStatus === "cleared" || p.emigrationClearanceStatus === "not_required"
        ? "done"
        : p.emigrationClearanceStatus === "pending" ? "in_progress" : "pending",
      detail: p.emigrationClearanceStatus === "cleared" ? "Cleared by Protector of Emigrants"
        : p.emigrationClearanceStatus === "not_required" ? "Marked not required by HPSEDC"
        : p.emigrationClearanceStatus === "pending" ? "Application in progress on eMigrate"
        : "Required — ECR passport travelling to an ECR country",
    }] : []) as DeployItem[]),
    {
      key: "appointment", label: "Appointment letter", owner: "agency",
      status: p.appointmentLetterUrl ? "done" : "pending",
    },
    {
      key: "travel", label: "Travel / start date", owner: "agency",
      status: p.startDate ? "done" : "pending",
      detail: p.startDate ? new Date(p.startDate).toLocaleDateString("en-IN") : null,
    },
  ];
}

export function readinessSummary(items: DeployItem[]) {
  const done = items.filter((i) => i.status === "done").length;
  const actionNeeded = items.filter((i) => i.status === "action_needed").length;
  return {
    done,
    total: items.length,
    pct: items.length ? Math.round((done / items.length) * 100) : 0,
    actionNeeded,
  };
}
