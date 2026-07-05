// HP-4c: simplified blue-collar candidate dashboard.
// Per 04_Blue_Collar_UX_Principles.md: (1) profile completeness, (2) application
// status, (3) grievance/support. Designed with Fable 5. Reuses the SAME query
// keys as candidate-dashboard.tsx (shared cache, no new endpoints). English copy
// for now (consistent with /apply); a coordinated Hindi pass comes later.
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle, FileSearch, CalendarCheck, Award, Plane,
  ShieldCheck, ShieldAlert, MessageCircleQuestion, Briefcase, ArrowRight, RotateCcw,
} from "lucide-react";

type FriendlyKey = "review" | "interview" | "selected" | "placed" | "closed";
const FRIENDLY: Record<FriendlyKey, { icon: React.ElementType; circle: string; iconColor: string; step: number; label: string; line: string }> = {
  review:    { icon: FileSearch,    circle: "bg-amber-100",   iconColor: "text-amber-600",   step: 2, label: "Being reviewed",   line: "HPSEDC is reviewing your application. This can take a few days." },
  interview: { icon: CalendarCheck, circle: "bg-cyan-100",    iconColor: "text-cyan-700",    step: 3, label: "Interview",        line: "You have been selected for an interview." },
  selected:  { icon: Award,         circle: "bg-emerald-100", iconColor: "text-emerald-700", step: 4, label: "You are selected",  line: "Congratulations! More details will follow soon." },
  placed:    { icon: Plane,         circle: "bg-green-100",   iconColor: "text-green-700",   step: 4, label: "Job confirmed",     line: "Congratulations! Your overseas placement is confirmed." },
  closed:    { icon: RotateCcw,     circle: "bg-slate-100",   iconColor: "text-slate-500",   step: 0, label: "This application did not go ahead", line: "No problem — apply for other jobs." },
};

function friendlyKeyFor(app: any): FriendlyKey {
  if (app.placement?.status === "offered") return "selected";
  switch (app.status) {
    case "submitted": case "reviewed": return "review";
    case "shortlisted": case "interview_scheduled": return "interview";
    case "selected": return "selected";
    case "placed": return "placed";
    default: return "closed";
  }
}

const PRIORITY = ["offered", "placed", "selected", "interview_scheduled", "shortlisted", "reviewed", "submitted", "rejected", "withdrawn"];
function pickPrimary(apps: any[]): any | null {
  if (!apps?.length) return null;
  const rank = (a: any) => PRIORITY.indexOf(a.placement?.status === "offered" ? "offered" : a.status);
  return [...apps].sort((a, b) => rank(a) - rank(b) || new Date(b.appliedAt || 0).getTime() - new Date(a.appliedAt || 0).getTime())[0];
}

const BIG_BTN = "w-full h-14 text-lg font-semibold rounded-xl";

export default function CandidateDashboardSimple() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { data: profileRes, isLoading } = useQuery<any>({ queryKey: ["/api/v1/candidates/profile"] });
  const { data: completionRes } = useQuery<any>({ queryKey: ["/api/v1/candidates/profile/completion"] });
  const { data: appsRes } = useQuery<any>({ queryKey: ["/api/v1/candidates/applications"] });

  const profile = profileRes?.data || {};
  const completion = completionRes?.data || { percentage: 0, missing: [] };
  const applications = appsRes?.data || [];
  const firstName = (profile.fullName || "").split(" ")[0];
  // Documents are optional for a blue-collar profile (a candidate may not have
  // them on hand) — the profile is "ready" once the essentials are filled, so
  // we don't loop them back to /apply for a document they can add later.
  const OPTIONAL_CHECKS = ["documents"];
  const missingRequired = (completion.missing || []).filter((m: string) => !OPTIONAL_CHECKS.includes(m));
  const profileDone = completion.percentage > 0 && missingRequired.length === 0;
  const primary = pickPrimary(applications);

  if (isLoading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      {/* Trust band */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <ShieldCheck className="w-6 h-6 text-blue-700 shrink-0" />
        <p className="text-base font-semibold text-blue-900">{t("simpleDash.trustBand")}</p>
      </div>

      {/* 1 · My profile */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">{firstName ? t("simpleDash.greeting", { name: firstName }) : t("simpleDash.greetingNoName")}</h2>
        {profileDone ? (
          <div className="flex items-center gap-3 mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
            <p className="text-lg font-semibold text-emerald-800">{t("simpleDash.profileReady")}</p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mt-3 mb-2">
              <p className="text-base text-slate-600">{t("simpleDash.profileProgress")}</p>
              <span className="text-4xl font-bold text-slate-900 tabular-nums">{completion.percentage}%</span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={completion.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700" style={{ width: `${completion.percentage}%` }} />
            </div>
            <Button onClick={() => setLocation("/start")} className={`${BIG_BTN} mt-4 bg-blue-700 hover:bg-blue-800 text-white`}>
              {t("simpleDash.completeProfile")} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </>
        )}
        {/* Documents are optional but reach 100% — offer them once essentials are in. */}
        {(completion.missing || []).includes("documents") && (
          <button onClick={() => setLocation("/documents")} className="mt-3 w-full text-sm text-blue-700 hover:text-blue-800 underline underline-offset-2 py-2">
            {t("simpleDash.addDocuments")}
          </button>
        )}
      </section>

      {/* 2 · My application status */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">{t("simpleDash.myApplication")}</h2>
        {primary ? <ApplicationStatusBig app={primary} extra={applications.length - 1} /> : (
          <div className="text-center py-2">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg text-slate-700 mb-4">{t("simpleDash.noApplications")}</p>
            <Button onClick={() => setLocation("/?view=jobs&full=1")} className={`${BIG_BTN} bg-blue-700 hover:bg-blue-800 text-white`}>{t("simpleDash.browseJobs")}</Button>
          </div>
        )}
      </section>

      {/* 3 · Help / grievance */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-3">
        <Button onClick={() => setLocation("/grievances")} className={`${BIG_BTN} bg-slate-900 hover:bg-slate-800 text-white`}>
          <MessageCircleQuestion className="w-6 h-6 mr-2" /> {t("simpleDash.needHelp")}
        </Button>
        <Button variant="outline" onClick={() => setLocation("/grievances?type=fraud")} className={`${BIG_BTN} border-2 border-red-300 text-red-700 hover:bg-red-50`}>
          <ShieldAlert className="w-6 h-6 mr-2" /> {t("simpleDash.reportFraud")}
        </Button>
      </section>

      {/* 4 · Footer + escape hatch to the detailed dashboard */}
      <div className="text-center space-y-2 pb-4">
        <p className="text-sm text-slate-500">{t("simpleDash.verifiedLine")}</p>
        <button onClick={() => setLocation("/?full=1")} className="text-sm text-blue-700 underline underline-offset-2 min-h-[44px] px-4">
          {t("simpleDash.fullDashboard")}
        </button>
      </div>
    </div>
  );
}

function ApplicationStatusBig({ app, extra }: { app: any; extra: number }) {
  const [, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const key = friendlyKeyFor(app);
  const f = FRIENDLY[key];
  const Icon = f.icon;
  const offered = app.placement?.status === "offered";
  const interviewDate = app.status === "interview_scheduled" && app.nextInterview?.scheduledAt
    ? new Date(app.nextInterview.scheduledAt).toLocaleDateString(i18n.language === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "long" })
    : null;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${f.circle}`}>
          <Icon className={`w-9 h-9 ${f.iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 leading-tight">{t(`simpleDash.status.${key}Label`)}</p>
          <p className="text-base text-slate-600 mt-1">{interviewDate ? t("simpleDash.status.interviewDate", { date: interviewDate }) : t(`simpleDash.status.${key}Line`)}</p>
        </div>
      </div>
      <p className="text-base font-medium text-slate-700 mt-3 truncate">{app.jobTitle}{app.country ? ` · ${app.country}` : ""}</p>

      {key !== "closed" && (
        <div className="mt-4">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-2.5 flex-1 rounded-full ${s <= f.step ? "bg-emerald-500" : "bg-slate-200"}`} />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-slate-500 font-medium">
            <span>{t("simpleDash.steps.applied")}</span><span>{t("simpleDash.steps.review")}</span><span>{t("simpleDash.steps.interview")}</span><span>{t("simpleDash.steps.selected")}</span>
          </div>
        </div>
      )}

      {offered && (
        <Button onClick={() => setLocation("/?view=applications&intent=offers&full=1")} className={`${BIG_BTN} mt-4 bg-amber-500 hover:bg-amber-600 text-white`}>
          {t("simpleDash.offerAction")}
        </Button>
      )}
      {extra > 0 && (
        <button onClick={() => setLocation("/?view=applications&full=1")} className="mt-4 w-full min-h-[44px] text-base text-blue-700 font-medium underline underline-offset-2">
          {t("simpleDash.moreApplications", { count: extra })}
        </button>
      )}
    </div>
  );
}
