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

export function buildDeploymentChecklist(candidate: any, placement: any): DeployItem[] {
  const c = candidate ?? {};
  const p = placement ?? {};
  const offerAccepted = ["accepted", "active", "completed"].includes(p.status);
  const visa = p.visaStatus as string | null | undefined;

  return [
    {
      key: "offer", label: "Offer accepted", owner: "you",
      status: offerAccepted ? "done" : "pending",
    },
    {
      key: "passport", label: "Passport on file", owner: "you",
      status: c.passportNumber ? "done" : "action_needed",
      detail: c.passportExpiry ? `Valid to ${new Date(c.passportExpiry).toLocaleDateString("en-IN")}` : null,
    },
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
