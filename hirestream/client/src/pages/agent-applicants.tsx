/**
 * Agent aggregate "All my applicants" — answers the question
 * "across everything I'm recruiting for, who should I act on today?"
 * Lands on Awaiting-me (status=submitted) by default, shows the job name
 * on every card, aging badges, and a Stale chip. Pattern is the same as
 * the per-job list view so agents don't learn two UIs.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Filter, Users, ArrowLeft, Briefcase, MapPin, Eye, Star, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoAvatar } from "@/components/shared/PhotoAvatar";
import { ScheduleInterviewModal } from "@/components/shared/ScheduleInterviewModal";
import { RecordOutcomeModal } from "@/components/shared/RecordOutcomeModal";
import { useToast } from "@/hooks/use-toast";

type Applicant = {
  applicationId: string;
  status: string;
  matchScore: number;
  appliedAt: string;
  stageEnteredAt: string | null;
  daysInStage: number | null;
  jobId: string;
  jobTitle: string;
  jobCountry: string | null;
  jobCompany: string | null;
  jobPriority: string | null;
  candidate: {
    id: string; fullName: string; email: string; phone: string;
    location: string; experience: number; skills: string[]; photoUrl?: string | null;
  };
};

type SortKey = "newest" | "oldest" | "match" | "longest_in_stage";

const PIPELINE = [
  { key: "submitted",           label: "Submitted",  color: "bg-blue-100 text-blue-700" },
  { key: "reviewed",            label: "Reviewed",   color: "bg-amber-100 text-amber-700" },
  { key: "shortlisted",         label: "Shortlisted",color: "bg-purple-100 text-purple-700" },
  { key: "interview_scheduled", label: "Interview",  color: "bg-cyan-100 text-cyan-700" },
  { key: "selected",            label: "Selected",   color: "bg-emerald-100 text-emerald-700" },
  { key: "placed",              label: "Placed",     color: "bg-green-100 text-green-700" },
  { key: "rejected",            label: "Rejected",   color: "bg-red-100 text-red-700" },
] as const;

const VALID_STATUSES = ["submitted", "reviewed", "shortlisted", "interview_scheduled", "selected", "placed", "rejected"];

export default function AgentApplicantsPage() {
  const [, setLocation] = useLocation();
  const queryString = useSearch();
  // Seed the filter from ?status=<stage> when the page is deep-linked from
  // the dashboard pipeline pills. Treat the query as a one-shot hint — after
  // mount the user can change the filter freely and the URL is left alone.
  const initialStatus = useMemo(() => {
    const p = new URLSearchParams(queryString);
    const s = p.get("status");
    return s && VALID_STATUSES.includes(s) ? s : "all";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [search, setSearch] = useState("");
  const [onlyStale, setOnlyStale] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("newest");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");

  // When the query explicitly specifies a status, treat that as the user's
  // intent — don't let the "auto-default to submitted" effect override it.
  const userTouchedFilter = useRef(initialStatus !== "all");
  const autoFilterApplied = useRef(initialStatus !== "all");
  const setStatusFilterManual = (v: string) => { userTouchedFilter.current = true; setStatusFilter(v); };

  const { data, isLoading } = useQuery({
    queryKey: ["/api/v1/agent/applicants"],
    queryFn: async () => (await fetch("/api/v1/agent/applicants")).json(),
  });
  const applicants: Applicant[] = data?.data ?? [];
  const jobCount: number = data?.jobCount ?? 0;

  // v0.4.21: inline action buttons on each card. Agents shouldn't have
  // to drill into a specific job just to schedule an interview or move
  // a candidate forward in the pipeline.
  const { toast } = useToast();
  const qc = useQueryClient();
  const [interviewFor, setInterviewFor] = useState<{ applicationId: string; candidateName: string } | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<{ applicationId: string; candidateName: string } | null>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ applicationId, status, feedback }: { applicationId: string; status: string; feedback?: string }) => {
      const res = await fetch(`/api/v1/applications/${applicationId}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionFeedback: feedback }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error?.message || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/agent/applicants"] });
      toast({ title: "Status updated" });
    },
    onError: (e: any) => toast({ title: "Couldn't update", description: e.message, variant: "destructive" }),
  });

  const counts: Record<string, number> = {};
  for (const s of PIPELINE) counts[s.key] = 0;
  for (const a of applicants) counts[a.status] = (counts[a.status] || 0) + 1;

  // Awaiting-me default — "submitted" when any exist. Only runs once per load.
  useEffect(() => {
    if (autoFilterApplied.current || userTouchedFilter.current) return;
    if (applicants.length > 0) {
      if ((counts.submitted ?? 0) > 0) setStatusFilter("submitted");
      autoFilterApplied.current = true;
    }
  }, [applicants.length, counts.submitted]);

  const isStale = (a: Applicant) => {
    const terminal = ["rejected", "selected", "placed"].includes(a.status);
    return !terminal && (a.daysInStage ?? 0) >= 7;
  };
  const staleCount = useMemo(() => applicants.filter(isStale).length, [applicants]);
  const countries = useMemo(() => Array.from(new Set(applicants.map(a => a.jobCountry).filter(Boolean))).sort() as string[], [applicants]);
  const companies = useMemo(() => Array.from(new Set(applicants.map(a => a.jobCompany).filter(Boolean))).sort() as string[], [applicants]);
  const priorities = useMemo(() => Array.from(new Set(applicants.map(a => a.jobPriority).filter(Boolean))) as string[], [applicants]);
  const jobsOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const a of applicants) if (!seen.has(a.jobId)) seen.set(a.jobId, a.jobTitle);
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [applicants]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const rows = applicants.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (onlyStale && !isStale(a)) return false;
      if (countryFilter !== "all" && a.jobCountry !== countryFilter) return false;
      if (companyFilter !== "all" && a.jobCompany !== companyFilter) return false;
      if (priorityFilter !== "all" && a.jobPriority !== priorityFilter) return false;
      if (jobFilter !== "all" && a.jobId !== jobFilter) return false;
      if (s) {
        const hay = `${a.candidate.fullName} ${a.jobTitle} ${(a.candidate.skills || []).join(" ")} ${a.jobCompany ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    const timeOf = (a: Applicant) => new Date(a.appliedAt).getTime();
    switch (sortBy) {
      case "oldest":            rows.sort((a, b) => timeOf(a) - timeOf(b)); break;
      case "match":             rows.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0)); break;
      case "longest_in_stage":  rows.sort((a, b) => (b.daysInStage ?? 0) - (a.daysInStage ?? 0)); break;
      case "newest":
      default:                  rows.sort((a, b) => timeOf(b) - timeOf(a));
    }
    return rows;
  }, [applicants, statusFilter, search, onlyStale, countryFilter, companyFilter, priorityFilter, jobFilter, sortBy]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <button onClick={() => history.length > 1 ? history.back() : setLocation("/")}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-slate-300">/</span>
        <Link href="/" className="text-slate-500 hover:text-blue-600">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium">All applicants</span>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="w-6 h-6" /> All applicants across your jobs</h1>
        <p className="text-sm text-blue-100 mt-1">
          {applicants.length} applicants across {jobCount} job{jobCount !== 1 ? "s" : ""}. Default view shows fresh submissions awaiting your triage.
        </p>
      </div>

      {/* Stage cards — single horizontal row with nowrap. On narrow viewports
          the row scrolls horizontally rather than wrapping to a second line,
          keeping the visual rhythm intact. All 8 cells (All + 7 stages) live
          on one line on any screen ≥ 720px. */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
        <button onClick={() => setStatusFilterManual("all")}
          className={`shrink-0 snap-start bg-slate-100 text-slate-700 rounded-lg px-3 py-2 text-left hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 transition min-w-[92px] ${statusFilter === "all" ? "ring-2 ring-slate-900" : ""}`}>
          <div className="text-[11px] font-medium opacity-90">All</div>
          <div className="text-lg font-bold tabular-nums">{applicants.length}</div>
        </button>
        {PIPELINE.map((s) => (
          <button key={s.key} onClick={() => setStatusFilterManual(s.key === statusFilter ? "all" : s.key)}
            className={`shrink-0 snap-start ${s.color} rounded-lg px-3 py-2 text-left hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 transition min-w-[92px] ${statusFilter === s.key ? "ring-2 ring-slate-900" : ""}`}>
            <div className="text-[11px] font-medium opacity-90">{s.label}</div>
            <div className="text-lg font-bold tabular-nums">{counts[s.key] || 0}</div>
          </button>
        ))}
      </div>

      {/* Toolbar row 1 — search + stale chip + result count.
          Toolbar row 2 — sort + dimension filters (country / company / priority / job).
          Laid out as two rows so the search input always gets the full width
          while the filter selects fit on a single line on desktop. */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        <Input placeholder="Search candidate, job title, company, or skill…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm flex-1 min-w-[200px]" />
        <div className="text-xs text-slate-500 tabular-nums">{filtered.length} of {applicants.length}</div>
        {staleCount > 0 && (
          <button type="button" onClick={() => setOnlyStale(v => !v)}
            aria-pressed={onlyStale}
            className={`h-9 px-2.5 text-xs font-semibold rounded-md border transition flex items-center gap-1 ${
              onlyStale ? "bg-amber-500 border-amber-600 text-white shadow" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
            }`}
            title="Applicants in their current stage for 7 or more days">
            ⏳ Stale <span className={onlyStale ? "bg-white/30 px-1 rounded" : "bg-amber-200 px-1 rounded"}>{staleCount}</span>
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
        <label className="text-slate-500 font-medium">Sort</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="h-9 rounded-md border border-slate-200 px-2 bg-white">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="match">Best match</option>
          <option value="longest_in_stage">Longest in stage</option>
        </select>
        {countries.length > 1 && (
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-2 bg-white">
            <option value="all">All countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {companies.length > 1 && (
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-2 bg-white">
            <option value="all">All companies</option>
            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {priorities.length > 1 && (
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-2 bg-white">
            <option value="all">All priorities</option>
            {priorities.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        )}
        {jobsOptions.length > 1 && (
          <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-2 bg-white max-w-[240px]">
            <option value="all">All jobs</option>
            {jobsOptions.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
          </select>
        )}
        {(countryFilter !== "all" || companyFilter !== "all" || priorityFilter !== "all" || jobFilter !== "all" || sortBy !== "newest") && (
          <button onClick={() => { setCountryFilter("all"); setCompanyFilter("all"); setPriorityFilter("all"); setJobFilter("all"); setSortBy("newest"); }}
            className="text-slate-500 hover:text-slate-900 hover:underline">Clear</button>
        )}
      </div>

      {/* List */}
      <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 font-medium">
              {applicants.length === 0
                ? "No applicants yet across any of your jobs."
                : "No applicants match the current filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((a) => {
              const terminal = ["rejected", "selected", "placed"].includes(a.status);
              const days = a.daysInStage;
              const critical = !terminal && days != null && days >= 14;
              const stale = !terminal && days != null && days >= 7;
              const stageColor = PIPELINE.find(p => p.key === a.status)?.color ?? "bg-slate-50";
              return (
                <div key={a.applicationId} className="p-4 md:p-5 hover:bg-slate-50/60 transition">
                  <div className="flex items-start gap-4 flex-wrap">
                    <Link href={`/agent/candidates/${a.candidate.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1 group cursor-pointer">
                      <PhotoAvatar photoUrl={a.candidate.photoUrl} name={a.candidate.fullName || "?"}
                        size="w-10 h-10" rounded="rounded-xl" textSize="text-xs" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700 truncate">{a.candidate.fullName}</p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <Link href={`/agent/jobs/${a.jobId}`} onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-700 hover:underline truncate">
                            {a.jobTitle}
                          </Link>
                          {a.jobCountry && <><MapPin className="w-3 h-3 ml-1" />{a.jobCountry}</>}
                        </p>
                        {a.candidate.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {a.candidate.skills.slice(0, 4).map((s) => (
                              <Badge key={s} variant="secondary" className="text-[10px] rounded px-1.5 py-0">{s}</Badge>
                            ))}
                            {a.candidate.skills.length > 4 && <span className="text-[10px] text-slate-400">+{a.candidate.skills.length - 4}</span>}
                          </div>
                        )}
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[11px] font-bold ${a.matchScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : a.matchScore >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50"}`}>
                        {a.matchScore}% match
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] capitalize ${stageColor}`}>
                        {a.status?.replace(/_/g, " ")}
                      </Badge>
                      {stale && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
                        }`} title={`Entered ${a.status.replace(/_/g, " ")} ${days} day${days === 1 ? "" : "s"} ago`}>
                          {critical ? "🔥 " : "⏳ "}{days}d in stage
                        </span>
                      )}
                    </div>
                  </div>

                  {/* v0.4.21: inline action buttons. Same shape as the
                      per-job page so agents only learn one UI. */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/agent/candidates/${a.candidate.id}`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="w-3.5 h-3.5" /> View Profile
                      </Button>
                    </Link>
                    {a.status === "submitted" && (
                      <Button size="sm" variant="outline" disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ applicationId: a.applicationId, status: "reviewed" })}
                        className="gap-1 border-amber-200 text-amber-700 hover:bg-amber-50">
                        Mark Reviewed
                      </Button>
                    )}
                    {["submitted", "reviewed"].includes(a.status) && (
                      <Button size="sm" disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ applicationId: a.applicationId, status: "shortlisted" })}
                        className="gap-1 bg-purple-600 hover:bg-purple-700 text-white">
                        <Star className="w-3.5 h-3.5" /> Shortlist
                      </Button>
                    )}
                    {a.status === "shortlisted" && (
                      <Button size="sm"
                        onClick={() => setInterviewFor({ applicationId: a.applicationId, candidateName: a.candidate.fullName })}
                        className="gap-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                        <Clock className="w-3.5 h-3.5" /> Schedule Interview
                      </Button>
                    )}
                    {a.status === "interview_scheduled" && (
                      <Button size="sm" disabled={updateStatus.isPending}
                        onClick={() => setOutcomeFor({ applicationId: a.applicationId, candidateName: a.candidate.fullName })}
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle className="w-3.5 h-3.5" /> Record Outcome
                      </Button>
                    )}
                    {!["rejected", "selected", "placed", "interview_scheduled"].includes(a.status) && (
                      <Button size="sm" variant="outline" disabled={updateStatus.isPending}
                        onClick={() => {
                          const feedback = window.prompt("Feedback for candidate (optional):") || "";
                          updateStatus.mutate({ applicationId: a.applicationId, status: "rejected", feedback });
                        }}
                        className="gap-1 border-red-200 text-red-700 hover:bg-red-50">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* v0.4.21: shared modals — Schedule Interview (for shortlisted)
          and Record Outcome (for interview_scheduled). Same components
          used on agent-job-detail.tsx so behaviour stays consistent
          across the two agent surfaces. */}
      <ScheduleInterviewModal
        open={!!interviewFor}
        onClose={() => setInterviewFor(null)}
        applicationId={interviewFor?.applicationId ?? ""}
        candidateName={interviewFor?.candidateName ?? ""}
        onScheduled={() => {
          qc.invalidateQueries({ queryKey: ["/api/v1/agent/applicants"] });
          setInterviewFor(null);
        }}
      />
      <RecordOutcomeModal
        open={!!outcomeFor}
        onClose={() => setOutcomeFor(null)}
        applicationId={outcomeFor?.applicationId ?? ""}
        candidateName={outcomeFor?.candidateName ?? ""}
        onRecorded={() => {
          qc.invalidateQueries({ queryKey: ["/api/v1/agent/applicants"] });
          setOutcomeFor(null);
        }}
      />
    </div>
  );
}
