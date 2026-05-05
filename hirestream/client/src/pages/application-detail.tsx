import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, CheckCircle, XCircle, ClipboardList, MapPin, Loader2, Briefcase,
} from "lucide-react";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: null };
  return res.json();
}

const PIPELINE = [
  { key: "submitted", label: "Submitted", bg: "bg-blue-100", color: "text-blue-600" },
  { key: "reviewed", label: "Reviewed", bg: "bg-amber-100", color: "text-amber-600" },
  { key: "shortlisted", label: "Shortlisted", bg: "bg-purple-100", color: "text-purple-600" },
  { key: "interview_scheduled", label: "Interview", bg: "bg-cyan-100", color: "text-cyan-600" },
  { key: "selected", label: "Selected", bg: "bg-emerald-100", color: "text-emerald-600" },
  { key: "placed", label: "Placed", bg: "bg-green-100", color: "text-green-700" },
];

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: appsRes, isLoading } = useQuery({
    queryKey: ["/api/v1/candidates/applications"],
    queryFn: () => fetchJson("/api/v1/candidates/applications"),
  });

  const app = (appsRes?.data ?? []).find((a: any) => a.id === id);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }
  if (!app) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <h1 className="text-2xl font-bold text-slate-900">Application not found</h1>
        <Button className="mt-6" onClick={() => setLocation("/")}>Back to dashboard</Button>
      </div>
    );
  }

  const stageIdx = PIPELINE.findIndex((s) => s.key === app.status);
  const isRejected = app.status === "rejected";
  // Known dates per pipeline stage (best-effort from what the candidate API exposes)
  const stageDates: Record<string, string | undefined> = {
    submitted: app.appliedAt,
    interview_scheduled: app.nextInterview?.scheduledAt,
    placed: app.placement?.startDate,
  };
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <button onClick={() => history.length > 1 ? history.back() : setLocation("/")}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-slate-300">/</span>
        <Link href="/" className="text-slate-500 hover:text-blue-600">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium truncate">Application</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{app.jobTitle}</h1>
            <p className="text-base text-slate-600 font-medium mt-1">{app.company}</p>
            {app.location && (
              <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-slate-400" /> {app.location}, {app.country}
              </p>
            )}
          </div>
          <Link href={`/jobs/${app.jobId}`}
            className="text-sm text-blue-600 hover:underline font-medium">View original job posting →</Link>
        </div>

        <div className="flex items-center gap-1.5 my-7 bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 border border-slate-100 overflow-x-auto">
          {PIPELINE.map((stage, i) => {
            const isDone = !isRejected && i < stageIdx;
            const isCurrent = !isRejected && i === stageIdx;
            return (
              <div key={stage.key} className="flex items-center flex-1 last:flex-none min-w-0">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                    isDone ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white shadow-md" :
                    isCurrent ? `${stage.bg} border-current ${stage.color} ring-4 ring-blue-50 shadow-sm` :
                    isRejected ? "bg-red-100 border-red-300 text-red-500" :
                    "bg-white border-slate-200 text-slate-300"
                  }`}>
                    {isDone ? <CheckCircle className="w-4 h-4" /> : isRejected && i === 0 ? <XCircle className="w-4 h-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  <span className={`text-[10px] mt-1.5 font-semibold whitespace-nowrap ${isCurrent ? stage.color : isDone ? "text-emerald-600" : "text-slate-300"}`}>
                    {stage.label}
                  </span>
                  {stageDates[stage.key] && (isDone || isCurrent) && (
                    <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">{fmt(stageDates[stage.key])}</span>
                  )}
                </div>
                {i < PIPELINE.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded-full ${isDone ? "bg-emerald-400" : "bg-slate-200"}`} />}
              </div>
            );
          })}
        </div>

        {isRejected && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-sm text-red-800 font-semibold">This application was not selected</p>
            </div>
            {app.rejectionFeedback ? (
              <div className="mt-3 pt-3 border-t border-red-200/60">
                <p className="text-[11px] uppercase tracking-wide text-red-700 font-semibold mb-1">Feedback from the recruiter</p>
                <p className="text-sm text-slate-700 leading-relaxed">{app.rejectionFeedback}</p>
              </div>
            ) : (
              <p className="text-xs text-red-600/80 mt-2 pl-13">No detailed feedback was shared.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-xl p-4 border border-blue-100/50">
            <p className="text-xs text-blue-600 font-semibold mb-1">Match Score</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{app.matchScore}%</p>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 font-semibold mb-1">Applied Date</p>
            <p className="text-2xl font-bold text-slate-900">{app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-IN") : "—"}</p>
          </div>
        </div>

        {app.skills?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills for this role</h2>
            <div className="flex flex-wrap gap-2">
              {app.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs rounded-lg px-3 py-1">{s}</Badge>)}
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
}
