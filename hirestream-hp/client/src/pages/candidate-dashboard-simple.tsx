// HP-4c: simplified blue-collar candidate dashboard.
// Per 04_Blue_Collar_UX_Principles.md: (1) profile completeness, (2) application
// status, (3) grievance/support. Designed with Fable 5. Reuses the SAME query
// keys as candidate-dashboard.tsx (shared cache, no new endpoints). English copy
// for now (consistent with /apply); a coordinated Hindi pass comes later.
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useHelpline, useCapabilities } from "@/hooks/use-capabilities";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle, FileSearch, CalendarCheck, Award, Plane,
  ShieldCheck, ShieldAlert, MessageCircleQuestion, Briefcase, ArrowRight, RotateCcw,
  Phone, PhoneCall, GraduationCap, ChevronRight,
} from "lucide-react";

// A stable, human-friendly HPSEDC registration number derived from the
// candidate id (works for uuid or numeric ids). Shown as a govt "receipt".
function regCodeFor(id: any): string {
  const s = String(id || "").replace(/[^a-zA-Z0-9]/g, "");
  return s ? `HP-${s.slice(-6).toUpperCase()}` : "";
}
const DEGREE_LEVELS = ["diploma", "bachelor", "master", "doctorate"];

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
  const queryClient = useQueryClient();
  const helpline = useHelpline();
  const { capabilities } = useCapabilities();
  const { data: profileRes, isLoading } = useQuery<any>({ queryKey: ["/api/v1/candidates/profile"] });
  const { data: completionRes } = useQuery<any>({ queryKey: ["/api/v1/candidates/profile/completion"] });
  const { data: appsRes } = useQuery<any>({ queryKey: ["/api/v1/candidates/applications"] });

  const profile = profileRes?.data || {};
  const completion = completionRes?.data || { percentage: 0, missing: [] };
  const applications = appsRes?.data || [];
  const firstName = (profile.fullName || "").split(" ")[0];

  // Tier-aware profile card (Fable v0.7.0): a first-time user sees the default
  // path big + two slim alternatives; a returning user continues their chosen
  // flow; an assisted user sees a "we'll call you" status, not a Complete CTA.
  const tier: string | null = profile.registrationTier || null;
  const callbackPending = tier === "assisted" && !!profile.wantsCallback;
  const hasDegree = DEGREE_LEVELS.includes(profile.qualificationLevel);
  const regCode = regCodeFor(profile.id);
  // Record the chosen tier (so a returning user gets "Continue"), then route.
  const setTierAndGo = async (t: string, path: string) => {
    try {
      await fetch("/api/v1/candidates/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ registrationTier: t }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
    } catch { /* non-blocking — routing still proceeds */ }
    setLocation(path);
  };
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
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
              <p className="text-lg font-semibold text-emerald-800">{t("simpleDash.profileReady")}</p>
            </div>
            {regCode && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <p className="text-xs text-slate-500">{t("simpleDash.regNumber")}</p>
                <p className="text-lg font-bold tracking-wide text-slate-900">{regCode}</p>
                <p className="text-xs text-slate-400 mt-0.5">{t("simpleDash.regNumberHint")}</p>
              </div>
            )}
            {tier === "standard" && hasDegree && (
              <button onClick={() => setLocation("/apply/pro")} className="w-full text-left text-sm text-violet-700 hover:text-violet-800 underline underline-offset-2 py-1">
                {t("simpleDash.addDegreeDetails")}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between mb-1.5">
              <p className="text-sm font-medium text-slate-500">{t("simpleDash.profileProgress")}</p>
              <span className="text-base font-bold text-blue-700 tabular-nums">{completion.percentage}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={completion.percentage} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700" style={{ width: `${completion.percentage}%` }} />
            </div>

            {callbackPending ? (
              // State C — assisted: HPSEDC is filling this in; no "Complete" CTA.
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <PhoneCall className="w-6 h-6 text-emerald-600 shrink-0" />
                  <p className="text-base font-semibold text-emerald-800">{profile.phone ? t("simpleDash.callbackPending", { phone: profile.phone }) : t("simpleDash.callbackPendingNoPhone")}</p>
                </div>
                <button onClick={() => setLocation("/start")} className="w-full text-sm text-blue-700 hover:text-blue-800 underline underline-offset-2 py-2">{t("simpleDash.fillMyself")}</button>
              </div>
            ) : tier === "standard" || tier === "professional" ? (
              // State B — a path is chosen; continue it, don't re-ask.
              <>
                <Button onClick={() => setLocation(tier === "professional" ? "/apply/pro" : "/apply")} className={`${BIG_BTN} mt-4 bg-blue-700 hover:bg-blue-800 text-white`}>
                  {t("simpleDash.continueProfile")} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <button onClick={() => setLocation("/start")} className="mt-2 w-full text-sm text-slate-500 hover:text-blue-700 underline underline-offset-2 py-2">{t("simpleDash.changeRegister")}</button>
              </>
            ) : (
              // State A — first time: Standard is the default; Professional and
              // (if enabled) the callback are real, equal-weight option cards.
              <>
                <Button onClick={() => setTierAndGo("standard", "/apply")} className={`${BIG_BTN} mt-4 bg-blue-700 hover:bg-blue-800 text-white`}>
                  {t("simpleDash.fillMyDetails")} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-xs text-slate-500 mt-5 mb-2">{t("simpleDash.otherWays")}</p>
                <div className="space-y-2.5">
                  {/* Professional — a real, equal-weight option (not a tiny link) */}
                  <button onClick={() => setTierAndGo("professional", "/apply/pro")} className="w-full flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-sm active:scale-[0.99] transition-all">
                    <span className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><GraduationCap className="w-6 h-6" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-slate-900 leading-tight">{t("simpleDash.proCardTitle")}</span>
                      <span className="block text-xs text-slate-500 mt-0.5">{t("simpleDash.proCardSub")}</span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                  </button>
                  {/* Callback — configurable (capability flag) + framed as slower */}
                  {capabilities.assistedCallbackEnabled && (
                    <button onClick={() => setLocation("/start?mode=assisted")} className="w-full flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm active:scale-[0.99] transition-all">
                      <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><PhoneCall className="w-6 h-6" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-slate-900 leading-tight">{t("simpleDash.callbackCardTitle")}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{t("simpleDash.callbackCardSub")}</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                    </button>
                  )}
                </div>
              </>
            )}
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

      {/* 3 · Help / safety — in a single govt-agency deployment the helpline +
          a money-safety advisory are the trust signals; "fraud" is reframed as
          impersonators asking for money, and demoted from a giant button. */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-3">
        <Button onClick={() => setLocation("/grievances")} className={`${BIG_BTN} bg-slate-900 hover:bg-slate-800 text-white`}>
          <MessageCircleQuestion className="w-6 h-6 mr-2" /> {t("simpleDash.askHpsedc")}
        </Button>
        {helpline.helplinePhone && (
          <a href={`tel:${helpline.helplinePhone.replace(/\s/g, "")}`} className={`${BIG_BTN} flex items-center justify-center border-2 border-blue-200 text-blue-800 hover:bg-blue-50`}>
            <Phone className="w-5 h-5 mr-2" /> {t("simpleDash.callHelpline", { phone: helpline.helplinePhone })}
          </a>
        )}
        {helpline.helplinePhone && helpline.helplineHours && (
          <p className="text-center text-xs text-slate-400 -mt-1">{helpline.helplineHours}</p>
        )}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">{t("simpleDash.neverAsksMoney")}</p>
            <button onClick={() => setLocation("/grievances?type=fraud")} className="text-sm text-amber-800 underline underline-offset-2 min-h-[36px] text-left">{t("simpleDash.reportMoney")}</button>
          </div>
        </div>
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
