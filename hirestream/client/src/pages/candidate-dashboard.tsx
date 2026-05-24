import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase, Star, FileText, CheckCircle, AlertCircle, Loader2, Download,
  MapPin, Mail, User, GraduationCap, Building, Search, DollarSign,
  Clock, Shield, ChevronDown, ChevronUp, ArrowUpDown, Sparkles,
  LayoutDashboard, ClipboardList, XCircle, Calendar, ArrowRight,
  Bookmark, BookmarkCheck, Heart, TrendingUp, Globe, Award, Eye, Route, Trash2, Flag, Zap, Upload
} from "lucide-react";
import { ReportJobDialog } from "@/components/shared/report-job-dialog";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: null };
  return res.json();
}

// Animation variants
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

// ── Main Dashboard ──────────────────────────────────────────────────

export default function CandidateDashboard() {
  // HTIS BUG-007 — sub-view state moved to the URL query (?view=saved) so the
  // browser back button returns here from a job detail with the same tab
  // open. Seeding from the URL on first render avoids a "flash of overview"
  // when the user navigates back.
  const [activeView, setActiveViewState] = useState<string>(() => {
    if (typeof window === "undefined") return "overview";
    const v = new URLSearchParams(window.location.search).get("view");
    return v || "overview";
  });
  const setActiveView = React.useCallback((next: string) => {
    setActiveViewState(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (next && next !== "overview") url.searchParams.set("view", next);
    else url.searchParams.delete("view");
    window.history.pushState({}, "", url.toString());
  }, []);
  // Handle native browser back/forward — if the user navigates history, sync
  // our state to the URL so the rendered view matches.
  React.useEffect(() => {
    const onPop = () => {
      const v = new URLSearchParams(window.location.search).get("view");
      setActiveViewState(v || "overview");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profileRes, isLoading } = useQuery({ queryKey: ["/api/v1/candidates/profile"], queryFn: () => fetchJson("/api/v1/candidates/profile") });
  const { data: completionRes } = useQuery({ queryKey: ["/api/v1/candidates/profile/completion"], queryFn: () => fetchJson("/api/v1/candidates/profile/completion") });
  const { data: appsRes } = useQuery({ queryKey: ["/api/v1/candidates/applications"], queryFn: () => fetchJson("/api/v1/candidates/applications") });
  const { data: eduRes } = useQuery({ queryKey: ["/api/v1/candidates/education"], queryFn: () => fetchJson("/api/v1/candidates/education") });
  const { data: expRes } = useQuery({ queryKey: ["/api/v1/candidates/experience"], queryFn: () => fetchJson("/api/v1/candidates/experience") });
  const { data: docsRes } = useQuery({ queryKey: ["/api/v1/candidates/documents"], queryFn: () => fetchJson("/api/v1/candidates/documents") });
  const { data: jobsRes } = useQuery({ queryKey: ["/api/v1/jobs"], queryFn: () => fetchJson("/api/v1/jobs") });
  const { data: recsRes } = useQuery({ queryKey: ["/api/v1/applications/recommendations/for-me"], queryFn: () => fetchJson("/api/v1/applications/recommendations/for-me") });
  const { data: savedRes } = useQuery({ queryKey: ["/api/v1/jobs/saved/my"], queryFn: () => fetchJson("/api/v1/jobs/saved/my") });

  const profile = profileRes?.data || {};
  const completion = completionRes?.data || { percentage: 0, checks: [] };
  const applications = appsRes?.data || [];
  const education = eduRes?.data || [];
  const experience = expRes?.data || [];
  const docs = docsRes?.data || [];
  const allJobs = jobsRes?.data || [];
  const recommendations = recsRes?.data || [];
  const savedJobsList = savedRes?.data || [];
  const appliedJobIds = new Set<string>(applications.map((a: any) => a.jobId));
  const savedJobIds = new Set<string>(savedJobsList.map((s: any) => s.id));

  const appCount = applications.length;
  const shortlistedCount = applications.filter((a: any) => ["shortlisted", "interview_scheduled", "selected"].includes(a.status)).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { key: "overview", label: "Dashboard", icon: LayoutDashboard, count: null, color: "text-blue-600 bg-blue-100" },
    { key: "jobs", label: "Browse Jobs", icon: Briefcase, count: allJobs.length, color: "text-indigo-600 bg-indigo-100" },
    { key: "applications", label: "My Applications", icon: ClipboardList, count: appCount, color: "text-emerald-600 bg-emerald-100" },
    { key: "journey", label: "My Journey", icon: Route, count: null, color: "text-cyan-600 bg-cyan-100" },
    { key: "recommended", label: "Recommended", icon: Sparkles, count: recommendations.length, color: "text-amber-600 bg-amber-100" },
    { key: "saved", label: "Saved Jobs", icon: Bookmark, count: savedJobsList.length, color: "text-rose-600 bg-rose-100" },
    { key: "documents", label: "Documents", icon: FileText, count: docs.length, color: "text-violet-600 bg-violet-100" },
  ];

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 py-5">
      {/* ── MOBILE NAV (< lg) ─── */}
      <div className="lg:hidden mb-4">
        <div className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-slate-200 p-1">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveView(item.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                activeView === item.key ? "bg-blue-50 text-blue-700" : "text-slate-500"
              }`}>
              <item.icon className="w-3.5 h-3.5" /> {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TWO-COLUMN GRID: sidebar 1fr / main 3fr ── */}
      <div className="lg:grid lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-6 xl:gap-7">

        {/* ── LEFT SIDEBAR ── */}
        <aside className="hidden lg:flex lg:flex-col gap-4 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <PhotoAvatar photoUrl={profile.photoUrl} name={profile.fullName || "?"} size="w-10 h-10" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 text-sm leading-snug truncate">{profile.fullName || "Complete Profile"}</p>
                <p className="text-[11px] text-blue-600 font-medium truncate">@{(profile.username || profile.email || "").split("@")[0]}</p>
                <p className="text-xs text-slate-500 truncate">{profile.email}</p>
              </div>
            </div>
            <PhotoUploadRow photoUrl={profile.photoUrl} />

            {/* Profile Completion */}
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Profile Completion</span>
                <span className="text-sm font-bold text-slate-800">{completion.percentage}%</span>
              </div>
              {/* Progress bar instead of ring — scales cleanly at any font size */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    completion.percentage >= 80 ? "bg-emerald-500" : completion.percentage >= 50 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${completion.percentage}%` }}
                />
              </div>
              <div className="flex gap-0.5 mt-2">
                {completion.checks?.slice(0, 5).map((c: any) => (
                  <div key={c.name} title={c.label || c.name} className={`flex-1 h-1 rounded-full ${c.done ? "bg-emerald-400" : "bg-slate-200"}`} />
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                {completion.percentage < 40 ? "Add details to start applying" : completion.percentage < 60 ? "Complete profile to apply" : completion.percentage < 100 ? "Almost done — keep going!" : "All sections complete"}
              </p>
            </div>

            {/* Smart CTA — jumps to the first missing section instead of a generic Edit Profile */}
            {(() => {
              const missing: string[] = completion.missing || [];
              const nextLabel: Record<string, string> = {
                fullName: "Add your name", email: "Add email", phone: "Add phone",
                location: "Add location", skills: "Add skills",
                education: "Add education", experience: "Add experience",
                documents: "Upload documents",
              };
              const nextStep: Record<string, string> = {
                fullName: "1", email: "1", phone: "1", location: "1", skills: "4",
                education: "2", experience: "3", documents: "5",
              };
              const first = missing[0];
              if (!first) {
                return (
                  <Button size="sm" onClick={() => setLocation("/profile")}
                    className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Review Profile
                  </Button>
                );
              }
              return (
                <Button size="sm" onClick={() => setLocation(`/profile?step=${nextStep[first] ?? "1"}`)}
                  className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" /> {nextLabel[first] ?? "Complete next section"}
                </Button>
              );
            })()}
            {/* Always-visible Edit Profile link */}
            <Button variant="outline" size="sm" onClick={() => setLocation("/profile")}
              className="w-full rounded-lg text-xs font-semibold mt-2 border-slate-300 text-slate-700 hover:bg-slate-50">
              <User className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
            </Button>
          </div>

          {/* Navigation */}
          <nav className="bg-white rounded-xl border border-slate-200 p-1.5 shadow-sm">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  activeView === item.key
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.count !== null && item.count > 0 && (
                  <span className={`text-[11px] font-semibold tabular-nums ${
                    activeView === item.key ? "text-blue-600" : "text-slate-400"
                  }`}>{item.count}</span>
                )}
              </button>
            ))}
            {/* Grievance quick link — goes to global route */}
            <button
              onClick={() => setLocation("/grievances")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-slate-600 hover:bg-slate-50 border-t border-slate-100 mt-1 pt-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span className="flex-1 text-left">Raise a Grievance</span>
            </button>
          </nav>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Quick Stats</p>
            <div className="space-y-0.5">
              <MiniStat label="Applications" value={appCount} icon={Briefcase} color="text-blue-600" bg="bg-blue-50" onClick={() => setActiveView("applications")} />
              <MiniStat label="Shortlisted" value={shortlistedCount} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50" onClick={() => setActiveView("applications")} />
              <MiniStat label="Saved Jobs" value={savedJobsList.length} icon={Bookmark} color="text-rose-600" bg="bg-rose-50" onClick={() => setActiveView("saved")} />
              <MiniStat label="Documents" value={docs.length} icon={FileText} color="text-purple-600" bg="bg-purple-50" onClick={() => setActiveView("documents")} />
            </div>
          </div>

          {/* Education & Experience */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-3">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Education
              </p>
              {education.length === 0 ? <p className="text-xs text-slate-400 italic px-1">None added</p> : (
                education.slice(0, 2).map((e: any) => (
                  <div key={e.id} className="border-l-2 border-violet-300 pl-2.5 py-0.5 ml-1 mb-1">
                    <p className="text-xs font-semibold text-slate-700 truncate">{e.degree}</p>
                    <p className="text-[11px] text-slate-400 truncate">{e.institution}</p>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> Experience
              </p>
              {experience.length === 0 ? <p className="text-xs text-slate-400 italic px-1">None added</p> : (
                experience.slice(0, 2).map((e: any) => (
                  <div key={e.id} className="border-l-2 border-emerald-300 pl-2.5 py-0.5 ml-1 mb-1">
                    <p className="text-xs font-semibold text-slate-700 truncate">{e.role}</p>
                    <p className="text-[11px] text-slate-400 truncate">{e.company} · {e.years}yr</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={activeView} variants={scaleIn} initial="initial" animate="animate" exit="exit">
              {activeView === "overview" && <OverviewView appCount={appCount} shortlisted={shortlistedCount} docs={docs.length} savedCount={savedJobsList.length} completion={completion} applications={applications} recommendations={recommendations} setActiveView={setActiveView} profile={profile} education={education} experience={experience} />}
              {activeView === "jobs" && <JobsView allJobs={allJobs} appliedJobIds={appliedJobIds} savedJobIds={savedJobIds} recommendations={recommendations} completion={completion} />}
              {activeView === "applications" && <ApplicationsView applications={applications} />}
              {activeView === "journey" && <JourneyView profile={profile} applications={applications} completion={completion} docs={docs} education={education} experience={experience} />}
              {activeView === "recommended" && <RecommendedView recommendations={recommendations} savedJobIds={savedJobIds} setActiveView={setActiveView} />}
              {activeView === "saved" && <SavedJobsView savedJobs={savedJobsList} appliedJobIds={appliedJobIds} setActiveView={setActiveView} />}
              {activeView === "documents" && <DocumentsView docs={docs} profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ── Helper Components ───────────────────────────────────────────────

function InitialsAvatar({ name, size = "w-12 h-12" }: { name: string; size?: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const gradients = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-purple-500 to-purple-600",
    "from-orange-500 to-orange-600",
    "from-rose-500 to-rose-600",
  ];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length;
  return (
    <div className={`${size} bg-gradient-to-br ${gradients[idx]} rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
      {initials || "?"}
    </div>
  );
}

// Drop-in avatar that prefers a real photo and falls back to initials. Every
// candidate-rendering surface (list rows, detail panes, review queue cards)
// should use this so uploading a photo is instantly reflected everywhere.
function PhotoAvatar({ photoUrl, name, size = "w-12 h-12" }: { photoUrl: string | null | undefined; name: string; size?: string }) {
  if (!photoUrl) return <InitialsAvatar name={name} size={size} />;
  return (
    <img src={photoUrl} alt={name}
      className={`${size} rounded-2xl object-cover flex-shrink-0 shadow-md bg-slate-100`}
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
  );
}

// Upload row on the candidate profile card. Uses the shared /me/photo endpoint
// (accepts multipart/form-data, JPG/PNG, 10MB max via multer). Renders the
// toast + refetches profile on success.
function PhotoUploadRow({ photoUrl }: { photoUrl: string | null | undefined }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const onPick = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload a JPG or PNG image." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max photo size is 10 MB." });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/v1/me/photo", { method: "POST", body: fd });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || "Upload failed");
      }
      toast({ title: "Photo updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    setUploading(true);
    try {
      const r = await fetch("/api/v1/me/photo", { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
      toast({ title: "Photo removed" });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
    } catch (err: any) {
      toast({ title: "Remove failed", description: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mb-3">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); }} />
      <Button variant="outline" size="sm" className="h-7 text-[11px] flex-1"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
        {photoUrl ? "Change photo" : "Upload photo"}
      </Button>
      {photoUrl && (
        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-slate-500 hover:text-red-600"
          disabled={uploading} onClick={removePhoto}>
          Remove
        </Button>
      )}
    </div>
  );
}


function MiniStat({ label, value, icon: Icon, color, bg, onClick }: { label: string; value: number; icon: React.ElementType; color: string; bg: string; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left">
      <div className={`w-7 h-7 rounded-md ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs text-slate-600 flex-1 truncate">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </button>
  );
}

// ── OVERVIEW VIEW ───────────────────────────────────────────────────

function OverviewView({ appCount, shortlisted, docs, savedCount, completion, applications, recommendations, setActiveView, education, experience, profile }: any) {
  const [, setLocation] = useLocation();
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
      {/* Stat Cards — compact, aligned, info-rich */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard icon={Briefcase} gradient="from-blue-500 to-blue-600" lightBg="bg-blue-50" lightText="text-blue-600" value={appCount} label="Applications" subtitle={appCount === 0 ? "Browse jobs to apply" : `${appCount} submitted`} onClick={() => setActiveView("applications")} />
        <StatCard icon={CheckCircle} gradient="from-emerald-500 to-emerald-600" lightBg="bg-emerald-50" lightText="text-emerald-600" value={shortlisted} label="Shortlisted" subtitle={shortlisted === 0 ? "None yet" : `${shortlisted} progressing`} onClick={() => setActiveView("applications")} />
        <StatCard icon={Sparkles} gradient="from-amber-500 to-orange-500" lightBg="bg-amber-50" lightText="text-amber-600" value={recommendations.length} label="Recommended" subtitle={recommendations.length === 0 ? "Complete profile for matches" : "Based on your skills"} onClick={() => setActiveView("recommended")} />
        <StatCard icon={FileText} gradient="from-purple-500 to-purple-600" lightBg="bg-purple-50" lightText="text-purple-600" value={docs} label="Documents" subtitle={docs === 0 ? "Upload CV to apply" : `${docs} uploaded`} onClick={() => setActiveView("documents")} />
      </motion.div>

      {/* Your Journey — 3 next steps */}
      <JourneyStrip profile={profile} completion={completion} docs={docs} education={education} experience={experience} applications={applications} setActiveView={setActiveView} />

      {/* Profile gaps — LinkedIn-style ranked list. Hidden at 100%. */}
      {completion.percentage < 100 && completion.missing?.length > 0 && (
        <ProfileGapsCard completion={completion} />
      )}

      {/* Upcoming Interviews (derived from application.nextInterview) */}
      <UpcomingInterviews applications={applications} setActiveView={setActiveView} />

      {/* Interview prep tips (auto-surface when interviews are upcoming) */}
      <InterviewPrepTips applications={applications} />

      {/* Welfare reply card (candidate with active placement) */}
      <WelfareReplyCard applications={applications} />

      {/* Offers waiting for your response (FRS 1.26, 1.27) */}
      <OffersBanner applications={applications} setActiveView={setActiveView} />

      {/* Recent Applications */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
            Recent Applications
          </h3>
          <Button variant="ghost" size="sm" className="text-xs text-blue-600 font-semibold hover:bg-blue-50 rounded-lg" onClick={() => setActiveView("applications")}>
            View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {applications.length === 0 ? (
          <div className="text-center py-10 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-dashed border-slate-200">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 font-medium">No applications yet</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">Apply to your first overseas job in one click.</p>
            <Button size="sm" onClick={() => setActiveView("jobs")} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Search className="w-4 h-4 mr-1.5" /> Browse Jobs
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.slice(0, 3).map((app: any, i: number) => (
              <motion.div key={app.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <CompactAppCard app={app} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Top Recommendations */}
      {recommendations.length > 0 && (
        <motion.div variants={fadeUp} className="bg-gradient-to-br from-white to-amber-50/20 rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </div>
              Recommended For You
            </h3>
            <Button variant="ghost" size="sm" className="text-xs text-amber-600 font-semibold hover:bg-amber-50 rounded-lg" onClick={() => setActiveView("recommended")}>
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recommendations.slice(0, 3).map((job: any, i: number) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setLocation(`/jobs/${job.id}`)}
                className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-slate-200 transition-all group cursor-pointer"
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.company} · {job.country}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs font-bold ml-2 ${job.matchScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {job.matchScore}%
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── JOBS VIEW ───────────────────────────────────────────────────────

function JobsView({ allJobs, appliedJobIds, savedJobIds, recommendations, completion }: { allJobs: any[]; appliedJobIds: Set<string>; savedJobIds: Set<string>; recommendations: any[]; completion: any }) {
  // Easy Apply threshold — LinkedIn/Naukri-style badge. Shows on cards only
  // when the candidate's profile has enough detail for a recruiter to act on
  // a 1-click apply (no follow-up data entry forced).
  const easyApplyEligible = (completion?.percentage ?? 0) >= 70;
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [salaryTier, setSalaryTier] = useState("all");
  const [experienceTier, setExperienceTier] = useState("all");
  const [reportOpen, setReportOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const matchMap: Record<string, any> = {};
  recommendations.forEach((r: any) => { matchMap[r.id] = { score: r.matchScore, breakdown: r.scoreBreakdown }; });

  let filtered = allJobs.filter((j: any) => {
    const s = search.toLowerCase();
    const matchSearch = !s || j.title.toLowerCase().includes(s) || j.company.toLowerCase().includes(s) || j.skills?.some((sk: string) => sk.toLowerCase().includes(s));
    const matchCountry = country === "all" || j.country?.toLowerCase() === country.toLowerCase();
    const annual = estimatedAnnualUsd(j.salary || "");
    const matchSalary = salaryTier === "all"
      || (salaryTier === "entry"  && annual > 0  && annual < 40_000)
      || (salaryTier === "mid"    && annual >= 40_000 && annual < 80_000)
      || (salaryTier === "senior" && annual >= 80_000)
      || (salaryTier === "unknown" && annual === 0);
    const exp = typeof j.experience === "number" ? j.experience : -1;
    const matchExperience = experienceTier === "all"
      || (experienceTier === "fresher" && exp >= 0 && exp <= 1)
      || (experienceTier === "junior"  && exp >= 2 && exp <= 3)
      || (experienceTier === "mid"     && exp >= 4 && exp <= 6)
      || (experienceTier === "senior"  && exp >= 7 && exp <= 10)
      || (experienceTier === "lead"    && exp > 10);
    return matchSearch && matchCountry && matchSalary && matchExperience;
  });

  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortBy === "match") return (matchMap[b.id]?.score || 0) - (matchMap[a.id]?.score || 0);
    if (sortBy === "date") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    if (sortBy === "salary") return estimatedAnnualUsd(b.salary || "") - estimatedAnnualUsd(a.salary || "");
    return 0;
  });

  const countries = Array.from(new Set(allJobs.map((j: any) => j.country).filter(Boolean)));

  const saveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/v1/jobs/${jobId}/save`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/jobs/saved/my"] });
      toast({ title: data.saved ? "Job Saved" : "Removed from Saved" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/v1/jobs/${jobId}/apply`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/applications/recommendations/for-me"] });
      toast({ title: "Applied!", description: `Match score: ${data.data?.matchScore}%` });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      {/* Job List */}
      <div className="w-[400px] flex-shrink-0 flex flex-col">
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search by title, company, skills..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-11 h-11 rounded-xl text-sm border-slate-200" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200"><Globe className="w-3.5 h-3.5 mr-1.5 text-slate-400" /><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={experienceTier} onValueChange={setExperienceTier}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200"><Briefcase className="w-3.5 h-3.5 mr-1.5 text-slate-400" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Experience</SelectItem>
                <SelectItem value="fresher">Fresher (0–1 yr)</SelectItem>
                <SelectItem value="junior">Junior (2–3 yr)</SelectItem>
                <SelectItem value="mid">Mid (4–6 yr)</SelectItem>
                <SelectItem value="senior">Senior (7–10 yr)</SelectItem>
                <SelectItem value="lead">Lead (10+ yr)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={salaryTier} onValueChange={setSalaryTier}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200"><DollarSign className="w-3.5 h-3.5 mr-1.5 text-slate-400" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Salary</SelectItem>
                <SelectItem value="entry">Entry (&lt; $40k)</SelectItem>
                <SelectItem value="mid">Mid ($40k – $80k)</SelectItem>
                <SelectItem value="senior">Senior ($80k+)</SelectItem>
                <SelectItem value="unknown">Unlisted / Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200"><ArrowUpDown className="w-3 h-3 mr-1.5 text-slate-400" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="match">Best Match</SelectItem>
                <SelectItem value="date">Newest</SelectItem>
                <SelectItem value="salary">Salary (high → low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-400 font-medium">{filtered.length} jobs found</p>
          <SaveSearchButton filters={{ search, country, sortBy, salaryTier, experienceTier }} />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.map((job: any) => {
            const isApplied = appliedJobIds.has(job.id);
            const isSaved = savedJobIds.has(job.id);
            const match = matchMap[job.id];
            const isSelected = selectedJob?.id === job.id;

            return (
              <motion.div
                key={job.id}
                layout
                className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-blue-400 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 shadow-md shadow-blue-100/50"
                    : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm bg-white"
                }`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); saveMutation.mutate(job.id); }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-slate-100 transition-all z-10"
                  title={isSaved ? "Remove from saved" : "Save for later"}>
                  {isSaved
                    ? <BookmarkCheck className="w-4 h-4 text-blue-600 fill-blue-600" />
                    : <Bookmark className="w-4 h-4 text-slate-400 hover:text-blue-500" />}
                </button>

                <div onClick={() => setSelectedJob(job)}>
                  <div className="flex items-start justify-between gap-2 pr-8">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 truncate">{job.title}</p>
                        {isApplied && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        {!isApplied && easyApplyEligible && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200" title="Your profile is ready — apply in one click">
                            <Zap className="w-2.5 h-2.5" /> EASY APPLY
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{job.company}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 flex-wrap">
                        <MapPin className="w-3 h-3" />{job.country}{job.salary ? ` · ${job.salary}` : ""}
                        {/* Surface the experience requirement on the card itself so
                            candidates can filter visually without opening the detail pane.
                            Tester feedback 1.16: "no indication of how much experience is required". */}
                        {typeof job.experience === "number" && job.experience > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0 rounded bg-slate-100 text-slate-700 ml-1">
                            <Briefcase className="w-2.5 h-2.5" /> {job.experience}+ yrs
                          </span>
                        )}
                      </p>
                    </div>
                    {match && (
                      <Badge variant="outline" className={`text-[10px] font-bold flex-shrink-0 ${
                        match.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        match.score >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {match.score}%
                      </Badge>
                    )}
                  </div>

                  {/* 1-click apply right on the card — no need to open detail */}
                  {!isApplied && easyApplyEligible && (
                    <div className="mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); applyMutation.mutate(job.id); }}
                        disabled={applyMutation.isPending}
                        className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md px-2 py-1 inline-flex items-center gap-1 transition"
                      >
                        {applyMutation.isPending && applyMutation.variables === job.id
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Applying…</>
                          : <><Zap className="w-3 h-3" /> Apply now</>}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Job Detail */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {selectedJob ? (
            <motion.div
              key={selectedJob.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 h-full overflow-y-auto shadow-sm"
            >
              {/* Save + Report buttons */}
              <div className="flex justify-end gap-2 mb-3">
                <button
                  onClick={() => setReportOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200 hover:text-red-600 hover:border-red-200 transition-all"
                  title="Report a suspicious job to HPSEDC"
                >
                  <Flag className="w-3.5 h-3.5" /> Report
                </button>
                <button
                  onClick={() => saveMutation.mutate(selectedJob.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    savedJobIds.has(selectedJob.id)
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-50 text-slate-500 border border-slate-200 hover:text-blue-600 hover:border-blue-200"
                  }`}>
                  {savedJobIds.has(selectedJob.id)
                    ? <><BookmarkCheck className="w-4 h-4 fill-blue-600" /> Saved</>
                    : <><Bookmark className="w-4 h-4" /> Save</>}
                </button>
              </div>

              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedJob.title}</h2>
                  <p className="text-sm text-slate-600 mt-0.5 font-medium">{selectedJob.company}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mt-2.5">
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{selectedJob.location}, {selectedJob.country}</span>
                    {selectedJob.salary && <span className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-slate-400" />{selectedJob.salary}</span>}
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{selectedJob.createdAt ? new Date(selectedJob.createdAt).toLocaleDateString("en-IN") : "Recent"}</span>
                  </div>
                </div>
                {matchMap[selectedJob.id] && (
                  <div className="text-center bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 px-4 py-3">
                    <div className={`text-2xl font-bold tabular-nums ${matchMap[selectedJob.id].score >= 80 ? 'text-emerald-600' : matchMap[selectedJob.id].score >= 60 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {matchMap[selectedJob.id].score}%
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Match Score</p>
                  </div>
                )}
              </div>

              {/* Match Breakdown */}
              {matchMap[selectedJob.id]?.breakdown && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: "Skills", ...matchMap[selectedJob.id].breakdown.skill, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
                    { label: "Experience", ...matchMap[selectedJob.id].breakdown.experience, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50" },
                    { label: "Country", ...matchMap[selectedJob.id].breakdown.country, gradient: "from-purple-500 to-purple-600", bg: "bg-purple-50" },
                  ].map(b => (
                    <div key={b.label} className={`${b.bg} rounded-xl p-4 border border-slate-100`}>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-600 font-medium">{b.label}</span>
                        <span className="font-bold tabular-nums">{b.score}/{b.max}</span>
                      </div>
                      <div className="w-full bg-white rounded-full h-2">
                        <div className={`bg-gradient-to-r ${b.gradient} h-2 rounded-full transition-all`} style={{ width: `${b.max > 0 ? (b.score / b.max) * 100 : 0}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5">{b.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Description — always rendered; empty-state makes clear the
                  employer/agent hasn't written one yet, rather than hiding the
                  section (which led tester to flag FRS 1.17 "not detailed"). */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                {selectedJob.description ? (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedJob.description}</p>
                ) : (
                  <p className="text-xs italic text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3">
                    The employer / agency hasn't written a full description for this role yet.
                  </p>
                )}
              </div>

              {/* Requirements — surfaced as its own section so the tester sees
                  it distinctly from Description. */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Requirements</h4>
                {selectedJob.requirements?.length > 0 ? (
                  <ul className="text-sm text-slate-700 list-disc pl-5 space-y-0.5">
                    {selectedJob.requirements.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                ) : (
                  <p className="text-xs italic text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3">
                    No specific requirements listed. Check the Description and Required Skills below for the role expectations.
                  </p>
                )}
              </div>

              {/* Skills — always rendered even when empty so the reviewer
                  sees the section exists, not that it's missing. */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Required Skills</h4>
                {selectedJob.skills?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs rounded-lg px-3 py-1">{s}</Badge>)}
                    {selectedJob.experience > 0 && <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200 rounded-lg px-3 py-1">{selectedJob.experience}+ years</Badge>}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3">
                    No specific skills listed.
                    {selectedJob.experience > 0 && ` Minimum experience: ${selectedJob.experience}+ years.`}
                  </p>
                )}
              </div>

              {/* Benefits (derived from description + country conventions) */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Benefits & Perks</h4>
                <div className="grid grid-cols-2 gap-2">
                  {inferBenefits(selectedJob).map((b) => (
                    <div key={b.label} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-medium">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employer card */}
              <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">About the Employer</h4>
                <div className="flex items-start gap-4 bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br ${companyGradient(selectedJob.company)}`}>
                    {companyInitials(selectedJob.company)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900 truncate">{selectedJob.company}</p>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 px-1.5 py-0">✓ Verified</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedJob.location}, {selectedJob.country}</p>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">{companyTagline(selectedJob)}</p>
                  </div>
                </div>
              </div>

              {/* Similar jobs */}
              {similarJobs(selectedJob, allJobs).length > 0 && (
                <div className="mb-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Similar Jobs</h4>
                  <div className="space-y-2">
                    {similarJobs(selectedJob, allJobs).map((j: any) => (
                      <button key={j.id} onClick={() => setSelectedJob(j)} className="w-full text-left flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200 hover:border-blue-400 hover:shadow-sm transition">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{j.title}</p>
                          <p className="text-xs text-slate-500 truncate">{j.company} · {j.country}</p>
                        </div>
                        {j.salary && <span className="text-[11px] text-slate-600 font-medium shrink-0 ml-2">{j.salary}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Shield className="w-3.5 h-3.5" /> Verified by HPSEDC
                </div>
                {(() => {
                  const applied = appliedJobIds.has(selectedJob.id);
                  if (applied) {
                    return (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-5 py-2 text-sm font-semibold rounded-xl">
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Applied
                      </Badge>
                    );
                  }
                  // Pre-flight eligibility check — tells the candidate what's
                  // missing instead of letting the apply click silently fail.
                  const missing: string[] = completion.missing || [];
                  const reasons: string[] = [];
                  if (!(selectedJob.status === "active")) reasons.push("This job is no longer accepting applications.");
                  if (missing.includes("fullName")) reasons.push("Add your full name to your profile.");
                  if (missing.includes("phone")) reasons.push("Add a phone number to your profile.");
                  if (missing.includes("documents")) reasons.push("Upload at least one document (CV or passport).");
                  if ((completion.percentage ?? 0) < 40) reasons.push("Your profile is below 40% complete — finish a few more sections.");

                  if (reasons.length > 0) {
                    return (
                      <div className="text-right">
                        <Button disabled className="px-6 h-11 rounded-xl bg-slate-200 text-slate-500 cursor-not-allowed">
                          Apply Now
                        </Button>
                        <ul className="text-xs text-red-600 mt-1.5 max-w-[260px] text-left">
                          {reasons.map((r) => <li key={r}>• {r}</li>)}
                        </ul>
                      </div>
                    );
                  }
                  return (
                    <Button
                      className="px-6 h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition-all"
                      onClick={() => applyMutation.mutate(selectedJob.id)} disabled={applyMutation.isPending}>
                      {applyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Apply Now <ArrowRight className="w-4 h-4 ml-1.5" /></>}
                    </Button>
                  );
                })()}
              </div>

              <CountryInfoCard country={selectedJob.country} />
              <SimilarJobsCarousel jobId={selectedJob.id} onPick={setSelectedJob} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-br from-white to-blue-50/20 rounded-2xl border border-slate-200/80 h-full flex items-center justify-center shadow-sm"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-9 h-9 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-500">Select a job to view details</p>
                <p className="text-sm text-slate-400 mt-1">Click any job from the list on the left</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedJob && (
        <ReportJobDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          job={{ id: selectedJob.id, title: selectedJob.title, company: selectedJob.company, agentId: selectedJob.agentId }}
        />
      )}
    </div>
  );
}

// ── APPLICATIONS VIEW ───────────────────────────────────────────────

const PIPELINE = [
  { key: "submitted", label: "Submitted", color: "text-blue-600", bg: "bg-blue-100", gradient: "from-blue-500 to-blue-600" },
  { key: "reviewed", label: "Reviewed", color: "text-amber-600", bg: "bg-amber-100", gradient: "from-amber-500 to-amber-600" },
  { key: "shortlisted", label: "Shortlisted", color: "text-purple-600", bg: "bg-purple-100", gradient: "from-purple-500 to-purple-600" },
  { key: "interview_scheduled", label: "Interview", color: "text-cyan-600", bg: "bg-cyan-100", gradient: "from-cyan-500 to-cyan-600" },
  { key: "selected", label: "Selected", color: "text-emerald-600", bg: "bg-emerald-100", gradient: "from-emerald-500 to-emerald-600" },
  { key: "placed", label: "Placed", color: "text-green-700", bg: "bg-green-100", gradient: "from-green-500 to-green-600" },
];

// Candidate view groups its applications into three buckets:
//   Active  — in-progress submissions the agency is still working (submitted..interview)
//   Offers  — a decision is near or done (selected / placed)
//   Closed  — terminal (rejected / withdrawn)
// Grouping mirrors how other portals (LinkedIn, Naukri, Workday) let candidates
// scan progress without a dropdown dance.
const GROUPS = [
  { key: "active",  label: "Active",  statuses: ["submitted","reviewed","shortlisted","interview_scheduled"] },
  { key: "offers",  label: "Offers",  statuses: ["selected","placed"] },
  { key: "closed",  label: "Closed",  statuses: ["rejected","withdrawn"] },
] as const;
type GroupKey = typeof GROUPS[number]["key"];
function groupForStatus(status: string): GroupKey | null {
  for (const g of GROUPS) if ((g.statuses as readonly string[]).includes(status)) return g.key;
  return null;
}

function renderAppCard(app: any, selectedApp: any, setSelectedApp: (a: any) => void) {
  const isSelected = selectedApp?.id === app.id;
  return (
    <div key={app.id} onClick={() => setSelectedApp(app)}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? "border-blue-400 bg-gradient-to-r from-blue-50/80 to-indigo-50/40 shadow-md"
          : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm bg-white"
      }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-bold text-slate-900 truncate">{app.jobTitle || "Job"}</p>
            {["reviewed","shortlisted","interview_scheduled","selected","placed"].includes(app.status) && (
              <span
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                title="The agency has opened and reviewed this application">
                <Eye className="w-2.5 h-2.5" /> Viewed
              </span>
            )}
            {app.placement?.status === "offered" && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500 text-white">
                ⚡ Decide
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{app.company}{app.country ? ` · ${app.country}` : ""}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] font-bold flex-shrink-0 ${app.matchScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
          {app.matchScore}%
        </Badge>
      </div>
      <div className="flex items-center gap-0.5 mt-3">
        {PIPELINE.map((stage, i) => {
          const stageIdx = PIPELINE.findIndex(s => s.key === app.status);
          const isRejected = app.status === "rejected";
          return (
            <div key={stage.key} className={`h-2 flex-1 rounded-full transition-all ${
              isRejected ? "bg-red-200" : i <= stageIdx ? "bg-emerald-400" : "bg-slate-200"
            }`} />
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5 capitalize font-medium">{app.status?.replace(/_/g, " ")} · {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-IN") : ""}</p>
    </div>
  );
}

function ApplicationsView({ applications }: { applications: any[] }) {
  const [statusFilter, setStatusFilter] = useState("all");
  // Quick-filter: "Awaiting your action" — apps where the next move is on the
  // candidate (offer awaiting accept/decline). Default ON once we detect an
  // offer; candidates need to see the decision first. They can click it off to
  // see the full inventory.
  const [awaitingMe, setAwaitingMe] = useState(false);
  const autoAwaitingApplied = useRef(false);
  const [collapsed, setCollapsed] = useState<Record<GroupKey, boolean>>({ active: false, offers: false, closed: false });
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const acceptMutation = useMutation({
    mutationFn: async (placementId: string) => {
      const res = await fetch(`/api/v1/drives/placements/${placementId}/accept`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Offer accepted", description: "Your visa process will begin. Check documents." });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/applications"] });
    },
  });
  const declineMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/v1/drives/placements/${id}/decline`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Offer declined", description: "Thank you for letting us know." });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/applications"] });
    },
  });

  // Base filter chain: status dropdown + "awaiting me" quick-filter.
  const awaitingMeIds = useMemo(() => new Set(
    applications
      .filter((a: any) => a.placement?.status === "offered")
      .map((a: any) => a.id)
  ), [applications]);
  const hasAwaitingMe = awaitingMeIds.size > 0;
  useEffect(() => {
    if (autoAwaitingApplied.current) return;
    if (hasAwaitingMe) {
      setAwaitingMe(true);
      autoAwaitingApplied.current = true;
    } else if (applications.length > 0) {
      autoAwaitingApplied.current = true;
    }
  }, [hasAwaitingMe, applications.length]);
  const baseFilter = (a: any) => {
    if (awaitingMe && !awaitingMeIds.has(a.id)) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    return true;
  };
  const filtered = applications.filter(baseFilter);

  // Group-by-bucket when no specific status is picked and "awaiting" quick-filter
  // is off. Otherwise the user has narrowed the view themselves — respect that
  // and render a flat list.
  const useGrouping = statusFilter === "all" && !awaitingMe;
  const grouped: Record<GroupKey, any[]> = { active: [], offers: [], closed: [] };
  if (useGrouping) {
    for (const a of filtered) {
      const g = groupForStatus(a.status);
      if (g) grouped[g].push(a);
    }
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      <div className="w-[400px] flex-shrink-0 flex flex-col">
        <div className="flex gap-2 mb-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200 flex-1 min-w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {PIPELINE.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasAwaitingMe && (
          <button
            type="button"
            onClick={() => setAwaitingMe(v => !v)}
            aria-pressed={awaitingMe}
            className={`mb-3 w-full text-xs font-semibold px-3 py-2 rounded-xl border transition flex items-center justify-center gap-1.5 ${
              awaitingMe
                ? "bg-amber-500 border-amber-600 text-white shadow"
                : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
            }`}
            title="Offers awaiting your accept/decline">
            ⚡ Awaiting your action <span className={awaitingMe ? "bg-white/30 px-1.5 rounded" : "bg-amber-200 px-1.5 rounded"}>{awaitingMeIds.size}</span>
          </button>
        )}
        <p className="text-xs text-slate-400 mb-3 font-medium">
          {filtered.length} application{filtered.length !== 1 ? "s" : ""}
          {awaitingMe && <span className="text-amber-700"> · awaiting your action</span>}
        </p>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-dashed border-slate-200">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm text-slate-400">
                {awaitingMe ? "Nothing needs your action right now" : `No applications ${statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}`}
              </p>
            </div>
          ) : useGrouping ? (
            GROUPS.filter(g => grouped[g.key].length > 0).map((g) => (
              <div key={g.key} className="mb-4">
                <button
                  type="button"
                  onClick={() => setCollapsed(prev => ({ ...prev, [g.key]: !prev[g.key] }))}
                  className="w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-900 px-1 py-1.5 transition">
                  <span className="flex items-center gap-1.5">
                    <span className={`transition-transform ${collapsed[g.key] ? "" : "rotate-90"}`}>▸</span>
                    {g.label}
                    <span className="text-slate-400 font-mono">{grouped[g.key].length}</span>
                  </span>
                </button>
                {!collapsed[g.key] && (
                  <div className="space-y-2 mt-1">
                    {grouped[g.key].map((app: any) => renderAppCard(app, selectedApp, setSelectedApp))}
                  </div>
                )}
              </div>
            ))
          ) : (
            filtered.map((app: any) => renderAppCard(app, selectedApp, setSelectedApp))
          )}
        </div>
      </div>

      {/* App Detail */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {selectedApp ? (
            <motion.div
              key={selectedApp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 h-full overflow-y-auto shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-900">{selectedApp.jobTitle}</h2>
              <p className="text-sm text-slate-500 font-medium">{selectedApp.company}{selectedApp.location ? ` — ${selectedApp.location}, ${selectedApp.country}` : ""}</p>

              {/* Full Pipeline */}
              <div className="flex items-center gap-1.5 my-6 bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 border border-slate-100">
                {PIPELINE.map((stage, i) => {
                  const stageIdx = PIPELINE.findIndex(s => s.key === selectedApp.status);
                  const isRejected = selectedApp.status === "rejected";
                  const isDone = !isRejected && i < stageIdx;
                  const isCurrent = !isRejected && i === stageIdx;

                  return (
                    <div key={stage.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                          isDone ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20" :
                          isCurrent ? `${stage.bg} border-current ${stage.color} ring-4 ring-blue-50 shadow-sm` :
                          isRejected ? "bg-red-100 border-red-300 text-red-500" :
                          "bg-white border-slate-200 text-slate-300"
                        }`}>
                          {isDone ? <CheckCircle className="w-4 h-4" /> : isRejected && i === 0 ? <XCircle className="w-4 h-4" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                        </div>
                        <span className={`text-[10px] mt-1.5 font-semibold ${isCurrent ? stage.color : isDone ? "text-emerald-600" : "text-slate-300"}`}>
                          {stage.label}
                        </span>
                      </div>
                      {i < PIPELINE.length - 1 && <div className={`flex-1 h-0.5 mx-1 rounded-full ${isDone ? "bg-emerald-400" : "bg-slate-200"}`} />}
                    </div>
                  );
                })}
              </div>

              {selectedApp.status === "rejected" && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-red-800 font-semibold">This application was not selected</p>
                      {!selectedApp.rejectionFeedback && (
                        <p className="text-xs text-red-600/80 mt-0.5">No detailed feedback was provided by the recruiter.</p>
                      )}
                    </div>
                  </div>
                  {selectedApp.rejectionFeedback && (
                    <div className="mt-3 pt-3 border-t border-red-200/60">
                      <p className="text-[11px] uppercase tracking-wide text-red-700 font-semibold mb-1">Feedback from the recruiter</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{selectedApp.rejectionFeedback}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-xl p-4 border border-blue-100/50">
                  <p className="text-xs text-blue-600 font-semibold mb-1">Match Score</p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">{selectedApp.matchScore}%</p>
                </div>
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 border border-slate-100">
                  <p className="text-xs text-slate-500 font-semibold mb-1">Applied Date</p>
                  <p className="text-2xl font-bold text-slate-900">{selectedApp.appliedAt ? new Date(selectedApp.appliedAt).toLocaleDateString("en-IN") : "—"}</p>
                </div>
              </div>

              {/* Next scheduled interview */}
              {selectedApp.nextInterview && !["rejected", "placed"].includes(selectedApp.status) && (
                <div className="mt-5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/60 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Upcoming interview</p>
                      <p className="text-sm text-slate-700 mt-0.5">
                        {new Date(selectedApp.nextInterview.scheduledAt).toLocaleString("en-IN", {
                          weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedApp.nextInterview.mode === "virtual" ? "Virtual interview" : "In-person"}
                        {selectedApp.nextInterview.location ? ` · ${selectedApp.nextInterview.location}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Offer Received — Accept / Decline (FRS 1.26, 1.27) */}
              {selectedApp.placement && selectedApp.placement.status === "offered" && (
                <div className="mt-5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200/60 rounded-xl p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Award className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">Offer received 🎉</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Salary: {selectedApp.placement.salary || "—"} ·
                        Start: {selectedApp.placement.startDate ? new Date(selectedApp.placement.startDate).toLocaleDateString("en-IN") : "TBD"} ·
                        Country: {selectedApp.placement.country}
                      </p>
                    </div>
                  </div>
                  {!showDeclineForm ? (
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" disabled={acceptMutation.isPending}
                        onClick={() => acceptMutation.mutate(selectedApp.placement.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {acceptMutation.isPending
                          ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                          : <CheckCircle className="w-4 h-4 mr-1.5" />}
                        {acceptMutation.isPending ? "Accepting…" : "Accept Offer"}
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => { setShowDeclineForm(true); setDeclineReason(""); }}
                        className="border-red-200 text-red-700 hover:bg-red-50">
                        <XCircle className="w-4 h-4 mr-1.5" /> Decline
                      </Button>
                      <a href={`/api/v1/me/placements/${selectedApp.placement.id}/offer-letter.pdf`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-md border border-slate-200 bg-white hover:border-emerald-400 hover:text-emerald-700 transition">
                        <Download className="w-4 h-4" /> Download offer letter (PDF)
                      </a>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-red-200 p-3">
                      <label className="text-xs font-semibold text-slate-700">Reason for declining <span className="text-slate-400">(optional, helps us improve matches)</span></label>
                      <textarea
                        value={declineReason} onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="e.g. Found a better opportunity, family reasons, salary too low…"
                        className="mt-2 w-full border border-slate-200 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 min-h-[64px]"
                      />
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" disabled={declineMutation.isPending}
                          onClick={() => {
                            declineMutation.mutate({ id: selectedApp.placement.id, reason: declineReason.trim() || "No reason provided" });
                            setShowDeclineForm(false);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white">
                          {declineMutation.isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                          {declineMutation.isPending ? "Declining…" : "Confirm Decline"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowDeclineForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Accepted Offer */}
              {selectedApp.placement && selectedApp.placement.status === "accepted" && (
                <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm text-emerald-900 font-medium">Offer accepted. Visa status: <span className="font-bold capitalize">{selectedApp.placement.visaStatus?.replace(/_/g, " ") || "not applied"}</span></p>
                </div>
              )}

              {/* Agency Review — shown for placed/selected applications */}
              {(selectedApp.status === "placed" || selectedApp.status === "selected") && selectedApp.agencyId && (
                <AgencyReviewPanel agencyId={selectedApp.agencyId} agencyName={selectedApp.company || "the agency"} />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200/80 h-full flex items-center justify-center shadow-sm"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-9 h-9 text-slate-300" />
                </div>
                <p className="font-semibold text-slate-500">Select an application</p>
                <p className="text-sm text-slate-400 mt-1">Click any application from the list</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── RECOMMENDED VIEW ────────────────────────────────────────────────

function RecommendedView({ recommendations, savedJobIds, setActiveView }: { recommendations: any[]; savedJobIds: Set<string>; setActiveView: (v: string) => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/v1/jobs/${jobId}/save`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/jobs/saved/my"] });
      toast({ title: data.saved ? "Job Saved" : "Removed from Saved" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/v1/jobs/${jobId}/apply`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/applications/recommendations/for-me"] });
      toast({ title: "Applied!", description: `Match score: ${data.data?.matchScore}%` });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Recommended Jobs ({recommendations.length})</h3>
          <p className="text-xs text-slate-500">Ranked by how well they match your skills, experience, and country preference</p>
        </div>
      </motion.div>

      {recommendations.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 bg-gradient-to-br from-white to-amber-50/30 rounded-2xl border border-slate-200/80 shadow-sm">
          <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-semibold">No recommendations yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Complete your profile to unlock personalized job matches.</p>
          <Button size="sm" onClick={() => setLocation("/profile")} className="bg-amber-600 hover:bg-amber-700 text-white">
            <User className="w-4 h-4 mr-1.5" /> Complete Profile
          </Button>
        </motion.div>
      ) : (
        recommendations.map((job: any, i: number) => (
          <motion.div
            key={job.id}
            variants={fadeUp}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-100/50 hover:border-blue-300 transition-all shadow-sm"
          >
            <div
              onClick={() => setLocation(`/jobs/${job.id}`)}
              className="flex items-start justify-between gap-4 mb-4 cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0">
                  <Building className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{job.title}</h4>
                  <p className="text-sm text-slate-500">{job.company} · {job.location}, {job.country}</p>
                  {job.salary && <p className="text-sm font-medium text-slate-700 mt-0.5">{job.salary}</p>}
                </div>
              </div>
              <div className="text-center flex-shrink-0 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 px-4 py-2">
                <p className={`text-2xl font-bold tabular-nums ${job.matchScore >= 80 ? 'text-emerald-600' : job.matchScore >= 60 ? 'text-amber-600' : 'text-slate-500'}`}>{job.matchScore}%</p>
                <p className="text-[10px] text-slate-400 font-medium">match</p>
              </div>
            </div>
            {job.scoreBreakdown && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Skills", ...job.scoreBreakdown.skill, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50" },
                  { label: "Experience", ...job.scoreBreakdown.experience, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50" },
                  { label: "Country", ...job.scoreBreakdown.country, gradient: "from-purple-500 to-purple-600", bg: "bg-purple-50" },
                ].map(b => (
                  <div key={b.label} className={`${b.bg} rounded-xl p-3 border border-slate-100`}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium">{b.label}</span>
                      <span className="font-bold tabular-nums">{b.score}/{b.max}</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-1.5">
                      <div className={`bg-gradient-to-r ${b.gradient} h-1.5 rounded-full`} style={{ width: `${b.max > 0 ? (b.score / b.max) * 100 : 0}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">{b.detail}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Button
                className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-md shadow-blue-500/20 gap-1.5"
                onClick={() => applyMutation.mutate(job.id)} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <>Apply <ArrowRight className="w-3 h-3" /></>}
              </Button>
              <Button variant="outline"
                onClick={() => saveMutation.mutate(job.id)}
                className={`rounded-xl gap-1.5 ${savedJobIds.has(job.id) ? "bg-blue-50 text-blue-700 border-blue-200" : "text-slate-500"}`}>
                {savedJobIds.has(job.id)
                  ? <><BookmarkCheck className="w-3.5 h-3.5 fill-blue-600" /> Saved</>
                  : <><Bookmark className="w-3.5 h-3.5" /> Save</>}
              </Button>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
}

// ── DOCUMENTS VIEW ──────────────────────────────────────────────────

function DocumentsView({ docs, profile }: { docs: any[]; profile: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState<string>("cv");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      const res = await fetch("/api/v1/candidates/documents", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error?.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded" });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/candidates/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ file, type: docType });
    e.target.value = ""; // reset so same file can be re-uploaded
  };

  const typeMeta: Record<string, { label: string; color: string }> = {
    cv:          { label: "CV / Resume",  color: "bg-blue-50 text-blue-700 border-blue-200" },
    passport:    { label: "Passport",     color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    certificate: { label: "Certificate",  color: "bg-amber-50 text-amber-700 border-amber-200" },
    other:       { label: "Other",        color: "bg-slate-50 text-slate-700 border-slate-200" },
  };

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md shadow-violet-500/20">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">My Documents ({docs.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="h-10 text-xs rounded-xl w-36 border-violet-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cv">CV / Resume</SelectItem>
              <SelectItem value="passport">Passport</SelectItem>
              <SelectItem value="certificate">Certificate</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <input ref={fileInputRef} type="file" className="hidden" onChange={onFileChange}
            accept=".pdf,.jpg,.jpeg,.png" />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-semibold shadow-md shadow-violet-500/20 gap-1.5">
            {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Upload
          </Button>
        </div>
      </motion.div>
      {docs.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 bg-gradient-to-br from-white to-violet-50/30 rounded-2xl border border-slate-200/80 shadow-sm">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-semibold">No documents uploaded</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Employers can't review you without a CV and passport.</p>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-violet-600 hover:bg-violet-700 text-white">
            <FileText className="w-4 h-4 mr-1.5" /> Upload first document
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc: any, i: number) => {
            const meta = typeMeta[doc.type] || typeMeta.other;
            return (
              <motion.div
                key={doc.id}
                variants={fadeUp}
                className="group bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center justify-between hover:shadow-md transition-all shadow-sm"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                    <FileText className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate" title={doc.fileName}>{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] rounded-md ${meta.color}`}>{meta.label}</Badge>
                      {doc.fileSize && <span className="text-[10px] text-slate-400">{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                      {doc.verified ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 rounded-md">
                          <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200 rounded-md">
                          Pending verification
                        </Badge>
                      )}
                    </div>
                    {doc.uploadedAt && <p className="text-[10px] text-slate-400 mt-1">Uploaded {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm"
                    onClick={() => window.open(`/api/v1/candidates/documents/${doc.id}/download`, "_blank")}
                    className="rounded-xl gap-1.5">
                    <Download className="w-4 h-4" /> Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                      if (window.confirm(`Delete ${doc.fileName}?`)) deleteMutation.mutate(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Pre-Departure Compliance self-service ──────────────────── */}
      <CandidateCompliancePanel profile={profile} />

      {/* ── Profile PDF export ──────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="mt-4 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-600" /> My Portfolio PDF
          </h3>
          <p className="text-xs text-slate-500 mt-1">Download a one-page PDF of your full profile — for offline sharing, family, or visa paperwork.</p>
        </div>
        <a href="/api/v1/me/profile.pdf"
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition">
          <Download className="w-4 h-4" /> Download PDF
        </a>
      </motion.div>

      {/* ── References ──────────────────────────────────────────────── */}
      <CandidateReferencesPanel />
    </motion.div>
  );
}

// ── SAVED JOBS VIEW ─────────────────────────────────────────────────

function SavedJobsView({ savedJobs, appliedJobIds, setActiveView }: { savedJobs: any[]; appliedJobIds: Set<string>; setActiveView: (v: string) => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const unsaveMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/v1/jobs/${jobId}/save`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/jobs/saved/my"] });
      toast({ title: "Removed from saved" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await fetch(`/api/v1/jobs/${jobId}/apply`, { method: "POST", headers: { "Content-Type": "application/json" } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Failed"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/applications"] });
      toast({ title: "Applied!", description: `Match score: ${data.data?.matchScore}%` });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <motion.div variants={stagger} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md shadow-rose-500/20">
          <Bookmark className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Saved Jobs ({savedJobs.length})</h3>
      </motion.div>
      {savedJobs.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 bg-gradient-to-br from-white to-rose-50/30 rounded-2xl border border-slate-200/80 shadow-sm">
          <Bookmark className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-semibold">No saved jobs</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Bookmark jobs you're interested in to come back to them later.</p>
          <Button size="sm" onClick={() => setActiveView("jobs")} className="bg-rose-600 hover:bg-rose-700 text-white">
            <Search className="w-4 h-4 mr-1.5" /> Browse Jobs
          </Button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {savedJobs.map((job: any) => {
            const isApplied = appliedJobIds.has(job.id);
            return (
              <motion.div
                key={job.id}
                variants={fadeUp}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:shadow-slate-100/50 hover:border-blue-300 transition-all shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div onClick={() => setLocation(`/jobs/${job.id}`)} className="flex items-start gap-3 cursor-pointer group flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                      <Briefcase className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{job.title}</h4>
                      <p className="text-sm text-slate-500">{job.company} · {job.location}, {job.country}</p>
                      {job.salary && <p className="text-sm font-medium text-slate-700 mt-0.5">{job.salary}</p>}
                      {job.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {job.skills.slice(0, 4).map((s: string) => <Badge key={s} variant="secondary" className="text-xs rounded-lg">{s}</Badge>)}
                        </div>
                      )}
                      <p className="text-[10px] text-slate-400 mt-2">Saved {job.savedAt ? new Date(job.savedAt).toLocaleDateString("en-IN") : ""}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {isApplied ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold rounded-lg px-3 py-1"><CheckCircle className="w-3 h-3 mr-0.5" /> Applied</Badge>
                    ) : (
                      <Button
                        className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
                        onClick={() => applyMutation.mutate(job.id)} disabled={applyMutation.isPending}>
                        Apply Now
                      </Button>
                    )}
                    <Button variant="outline" className="text-xs text-red-500 border-red-200 hover:bg-red-50 rounded-xl gap-1"
                      onClick={() => unsaveMutation.mutate(job.id)}>
                      <Bookmark className="w-3 h-3" /> Unsave
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Compact Application Card (for overview) ─────────────────────────

function CompactAppCard({ app }: { app: any }) {
  const [, setLocation] = useLocation();
  const stageIdx = PIPELINE.findIndex(s => s.key === app.status);
  const currentStage = PIPELINE.find(s => s.key === app.status);
  return (
    <div onClick={() => setLocation(`/applications/${app.id}`)}
      className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md hover:border-slate-200 transition-all group cursor-pointer">
      <div className="min-w-0 flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Briefcase className="w-5 h-5 text-blue-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p title={app.jobTitle} className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{app.jobTitle || "Job"}</p>
          <p title={`${app.company ?? ""}${app.country ? ` · ${app.country}` : ""}`} className="text-[11px] text-slate-400 truncate">{app.company}{app.country ? ` · ${app.country}` : ""}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-0.5 flex-1 max-w-[140px]">
              {PIPELINE.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${app.status === "rejected" ? "bg-red-200" : i <= stageIdx ? "bg-emerald-400" : "bg-slate-200"}`} />
              ))}
            </div>
            <span className={`text-[10px] font-semibold capitalize ${currentStage?.color || "text-slate-400"}`}>
              {app.status?.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
        <Badge variant="outline" className={`text-xs font-bold ${app.matchScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : app.matchScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
          {app.matchScore}% match
        </Badge>
        {app.appliedAt && <p className="text-[10px] text-slate-400">{new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>}
      </div>
    </div>
  );
}

// ── JOURNEY VIEW ────────────────────────────────────────────────────

function JourneyView({ profile, applications, completion, docs, education, experience }: any) {
  // Build milestones from user data
  const profileComplete = completion.percentage >= 80;
  const hasProfile = profile?.fullName;
  const hasEducation = education?.length > 0;
  const hasExperience = experience?.length > 0;
  const hasDocs = docs?.length > 0;
  const hasApplied = applications?.length > 0;
  const shortlistedApp = applications?.find((a: any) => ["shortlisted", "interview_scheduled", "selected", "placed"].includes(a.status));
  const interviewApp = applications?.find((a: any) => ["interview_scheduled", "selected", "placed"].includes(a.status));
  const selectedApp = applications?.find((a: any) => ["selected", "placed"].includes(a.status));
  const placedApp = applications?.find((a: any) => a.status === "placed");

  const milestones = [
    { label: "Registered", desc: "Account created on HireStream", icon: User, done: !!hasProfile, date: profile?.createdAt, color: "blue" },
    { label: "Profile Setup", desc: hasProfile ? `Profile ${completion.percentage}% complete` : "Complete your profile", icon: CheckCircle, done: profileComplete, date: null, color: "indigo" },
    { label: "Education Added", desc: hasEducation ? `${education.length} qualification(s)` : "Add academic records", icon: GraduationCap, done: hasEducation, date: null, color: "violet" },
    { label: "Experience Added", desc: hasExperience ? `${experience.length} record(s)` : "Add work history", icon: Briefcase, done: hasExperience, date: null, color: "emerald" },
    { label: "Documents Uploaded", desc: hasDocs ? `${docs.length} file(s)` : "Upload CV, passport, certificates", icon: FileText, done: hasDocs, date: null, color: "purple" },
    { label: "First Application", desc: hasApplied ? `${applications.length} job(s) applied` : "Apply to your first job", icon: ClipboardList, done: hasApplied, date: applications?.[0]?.appliedAt, color: "amber" },
    { label: "Shortlisted", desc: shortlistedApp ? `For ${shortlistedApp.jobTitle || "a position"}` : "Waiting for recruiter review", icon: Star, done: !!shortlistedApp, date: shortlistedApp?.appliedAt, color: "orange" },
    { label: "Interview Scheduled", desc: interviewApp ? `With ${interviewApp.company || "employer"}` : "Pending shortlist", icon: Calendar, done: !!interviewApp, date: interviewApp?.appliedAt, color: "rose" },
    { label: "Selected", desc: selectedApp ? `Selected for ${selectedApp.jobTitle || "role"}` : "Show your best in the interview", icon: Award, done: !!selectedApp, date: selectedApp?.appliedAt, color: "pink" },
    { label: "Placed Abroad", desc: placedApp ? `Placed at ${placedApp.company || "overseas employer"}` : "Final step — overseas deployment", icon: Globe, done: !!placedApp, date: placedApp?.appliedAt, color: "green" },
  ];

  const completedCount = milestones.filter(m => m.done).length;
  const progressPct = Math.round((completedCount / milestones.length) * 100);

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
      {/* Journey Summary Header */}
      <motion.div variants={fadeUp} className="bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Route className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold">My Career Journey</h3>
          </div>
          <p className="text-blue-100 text-sm mb-4">Your path from registration to overseas placement</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/15 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="text-sm font-bold tabular-nums">{completedCount}/{milestones.length}</span>
            <span className="text-xs text-blue-200">milestones</span>
          </div>
        </div>
      </motion.div>

      {/* Timeline */}
      <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[22px] top-2 bottom-2 w-0.5 bg-slate-200" />

          <div className="space-y-5">
            {milestones.map((m, i) => {
              const MIcon = m.icon;
              const colorMap: Record<string, { bg: string; text: string; ring: string; line: string }> = {
                blue: { bg: "bg-blue-500", text: "text-blue-600", ring: "ring-blue-100", line: "bg-blue-400" },
                indigo: { bg: "bg-indigo-500", text: "text-indigo-600", ring: "ring-indigo-100", line: "bg-indigo-400" },
                violet: { bg: "bg-violet-500", text: "text-violet-600", ring: "ring-violet-100", line: "bg-violet-400" },
                emerald: { bg: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-100", line: "bg-emerald-400" },
                purple: { bg: "bg-purple-500", text: "text-purple-600", ring: "ring-purple-100", line: "bg-purple-400" },
                amber: { bg: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-100", line: "bg-amber-400" },
                orange: { bg: "bg-orange-500", text: "text-orange-600", ring: "ring-orange-100", line: "bg-orange-400" },
                rose: { bg: "bg-rose-500", text: "text-rose-600", ring: "ring-rose-100", line: "bg-rose-400" },
                pink: { bg: "bg-pink-500", text: "text-pink-600", ring: "ring-pink-100", line: "bg-pink-400" },
                green: { bg: "bg-green-500", text: "text-green-600", ring: "ring-green-100", line: "bg-green-400" },
              };
              const c = colorMap[m.color] || colorMap.blue;
              const isNext = !m.done && i === milestones.findIndex(x => !x.done);

              return (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="relative flex items-start gap-4"
                >
                  {/* Node */}
                  <div className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    m.done ? `${c.bg} text-white shadow-md` :
                    isNext ? `bg-white border-2 border-dashed ${c.text.replace('text-', 'border-')} ring-4 ${c.ring}` :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {m.done ? <CheckCircle className="w-5 h-5" /> : <MIcon className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className={`flex-1 pb-1 ${m.done ? "" : isNext ? "" : "opacity-60"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={`font-semibold text-sm ${m.done ? "text-slate-900" : "text-slate-600"}`}>{m.label}</h4>
                      {m.done && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Done</Badge>}
                      {isNext && <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] animate-pulse">Next Up</Badge>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                    {m.date && (
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(m.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────

// ── Agency Review Panel ────────────────────────────────────────────────
function AgencyReviewPanel({ agencyId, agencyName }: { agencyId: string; agencyName: string }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if already reviewed
  const { data: reviewsRes } = useQuery({
    queryKey: [`/api/v1/agencies/${agencyId}/reviews`],
    queryFn: () => fetch(`/api/v1/agencies/${agencyId}/reviews`).then(r => r.json()),
  });
  const reviews = reviewsRes?.data || [];
  const avgRating = reviewsRes?.averageRating || 0;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/agencies/${agencyId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title, review }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/v1/agencies/${agencyId}/reviews`] });
      toast({ title: "Thank you!", description: "Your review has been submitted." });
      setExpanded(false);
      setRating(0); setTitle(""); setReview("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="mt-5 bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 border border-amber-200/60 rounded-xl p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/20">
          <Star className="w-5 h-5 text-white fill-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">Rate your experience with {agencyName}</p>
          <p className="text-xs text-slate-600 mt-0.5">Your feedback helps other candidates make informed choices.</p>
          {reviews.length > 0 && (
            <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              Current: <span className="font-bold">{avgRating.toFixed(1)}/5</span> from {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {!expanded ? (
        <Button size="sm" onClick={() => setExpanded(true)}
          className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold">
          <Star className="w-3.5 h-3.5 mr-1.5" /> Write a Review
        </Button>
      ) : (
        <div className="space-y-3 mt-3">
          {/* Star Rating */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1.5">Your Rating</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      (hoverRating || rating) >= n
                        ? "fill-amber-500 text-amber-500"
                        : "fill-slate-200 text-slate-300"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-bold text-amber-700">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Title (optional)</p>
            <Input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Smooth and professional experience"
              className="h-10 rounded-lg border-amber-200 text-sm" />
          </div>

          {/* Review */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-1">Detailed Review (optional)</p>
            <textarea
              className="w-full min-h-[90px] p-3 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
              placeholder="Share what went well, what could improve..."
              value={review} onChange={e => setReview(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={rating === 0 || submitMutation.isPending}
              className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-semibold">
              {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Submit Review</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setExpanded(false)} className="rounded-lg text-xs">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Save-current-search button in the Jobs tab filter bar. Candidates click
// once; a cron emails them new matches daily/weekly. Indeed's biggest
// retention lever — ported into the overseas-placement context.
function SaveSearchButton({ filters }: { filters: any }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "off">("weekly");
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/v1/me/saved-searches", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name || describeFilters(filters), filters, frequency }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || j.error?.message || "Failed");
      return j.data;
    },
    onSuccess: () => {
      toast({ title: "Search saved", description: frequency === "off" ? "Find it in your dashboard." : `We'll email you ${frequency} with new matches.` });
      setOpen(false); setName(""); setFrequency("weekly");
      qc.invalidateQueries({ queryKey: ["/api/v1/me/saved-searches"] });
    },
    onError: (e: any) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md px-2 py-1 transition">
        <Bookmark className="w-3 h-3" /> Save search
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Save this search</DialogTitle>
            <DialogDescription>
              Get emailed when new jobs match these filters. You can turn it off anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder={describeFilters(filters)} maxLength={80} className="mt-1" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Email frequency</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["daily", "weekly", "off"] as const).map((f) => (
                  <button key={f} onClick={() => setFrequency(f)}
                    className={`text-sm rounded-md py-2 border transition ${
                      frequency === f ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 hover:border-blue-300"
                    }`}>{f === "off" ? "No email" : f}</button>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
              Current filters: {describeFilters(filters)}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bookmark className="w-4 h-4 mr-1" />}
              Save search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function describeFilters(f: any): string {
  const parts: string[] = [];
  if (f.search) parts.push(`"${f.search}"`);
  if (f.country && f.country !== "all") parts.push(f.country);
  if (f.salaryTier && f.salaryTier !== "all") parts.push(f.salaryTier);
  if (f.experienceTier && f.experienceTier !== "all") parts.push(f.experienceTier);
  return parts.length ? parts.join(" · ") : "All overseas jobs";
}

// Country Info Card — embassy + visa + labor law + COL + climate for the
// destination country. Biggest single UX differentiator for an overseas-
// placement govt portal; rural candidates shouldn't need to Google embassy
// numbers. Admin-editable reference data seeded for 15 common destinations.
function CountryInfoCard({ country }: { country: string }) {
  const { data } = useQuery({
    queryKey: ["/api/v1/content/countries", country],
    queryFn: () => fetchJson(`/api/v1/content/countries/${encodeURIComponent(country)}`),
    enabled: !!country,
    staleTime: 5 * 60_000,
  });
  const info = data?.data;
  if (!info) return null;

  const rows: { icon: any; label: string; value?: string | null }[] = [
    { icon: Shield,   label: "Indian Embassy",         value: [info.embassyPhone, info.embassyEmail].filter(Boolean).join(" · ") },
    { icon: Clock,    label: "Typical visa timeline",  value: info.visaTimelineDays ? `~${info.visaTimelineDays} days` : null },
    { icon: DollarSign, label: "Wage & pay notes",     value: info.minWageNote },
    { icon: FileText, label: "Labor law basics",       value: info.laborLawSummary },
    { icon: TrendingUp, label: "Cost of living",       value: info.costOfLivingNote },
    { icon: Globe,    label: "Climate & work hours",   value: info.climateNote },
    { icon: ClipboardList, label: "Entry requirements", value: info.entryRequirements },
    { icon: AlertCircle, label: "Emergency contacts",  value: info.emergencyContact },
  ].filter((r) => r.value);

  return (
    <div className="mt-8 pt-6 border-t border-slate-100">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Globe className="w-4 h-4 text-blue-600" />
        Working in {info.name}
        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">HPSEDC Reference</Badge>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <r.icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{r.label}</div>
              <div className="text-xs text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap">{r.value}</div>
            </div>
          </div>
        ))}
      </div>
      {info.embassyWebsite && (
        <p className="text-[10px] text-slate-400 mt-2">
          Verify latest at the embassy: <a href={info.embassyWebsite} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{info.embassyWebsite}</a>. This is a summary; follow official guidance for legal matters.
        </p>
      )}
    </div>
  );
}

// Similar jobs — Indeed/SEEK-style carousel at the bottom of job detail.
// Backed by GET /api/v1/jobs/:id/similar — cheap heuristic (same country +
// skill overlap) so this loads fast even on the mobile tier.
function SimilarJobsCarousel({ jobId, onPick }: { jobId: string; onPick: (j: any) => void }) {
  const { data } = useQuery({
    queryKey: ["/api/v1/jobs", jobId, "similar"],
    queryFn: () => fetchJson(`/api/v1/jobs/${jobId}/similar?limit=5`),
    staleTime: 60_000,
  });
  const similar: any[] = data?.data ?? [];
  if (similar.length === 0) return null;
  return (
    <div className="mt-8 pt-6 border-t border-slate-100">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" /> Similar jobs you might like
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
        {similar.map((j: any) => (
          <button key={j.id} onClick={() => onPick(j)}
            className="shrink-0 w-64 snap-start text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition group">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700 transition">{j.title}</p>
                <p className="text-[11px] text-slate-500 truncate">{j.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2 flex-wrap">
              <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{j.location}</span>
              {j.salary && <span className="truncate">· {j.salary}</span>}
            </div>
            {j.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {j.skills.slice(0, 3).map((s: string) => (
                  <span key={s} className="text-[9px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{s}</span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// Profile gaps — ranked list of missing sections with impact hints.
// LinkedIn/Naukri-style. The impact copy is crafted specifically for
// overseas-placement candidates so HPSEDC's users understand WHY a field
// matters (eg "Gulf employers require Aadhaar-linked phone", "most jobs
// filter by skills").
function ProfileGapsCard({ completion }: { completion: any }) {
  const [, setLocation] = useLocation();
  const gapMeta: Record<string, { label: string; impact: string; weight: number; step: string }> = {
    fullName:   { label: "Add your full name",            impact: "Required — agencies can't submit you without it.",      weight: 100, step: "1" },
    phone:      { label: "Add a verified phone number",   impact: "Required for OTP. Gulf / SE Asia jobs prioritize verified numbers.", weight: 95, step: "1" },
    email:      { label: "Add a working email",           impact: "Used for offer letters, visa mails, welfare check-ins.", weight: 90, step: "1" },
    location:   { label: "Add your current city",         impact: "Many employers screen by home district / state.",        weight: 70, step: "1" },
    skills:     { label: "Tag at least 3 skills",         impact: "Unlocks Recommended Jobs — match scoring needs skills.", weight: 85, step: "4" },
    education:  { label: "Add your highest education",    impact: "Gulf / EU visas check qualification. Blocks most jobs if empty.", weight: 80, step: "2" },
    experience: { label: "Add at least one work entry",   impact: "Agents deprioritize profiles with zero work history.",   weight: 75, step: "3" },
    documents:  { label: "Upload CV or passport",         impact: "Most agencies reject an application that has no resume on file.", weight: 90, step: "5" },
  };
  const gaps = (completion.missing || [])
    .map((k: string) => ({ key: k, ...(gapMeta[k] || { label: k, impact: "Add to strengthen your profile.", weight: 10, step: "1" }) }))
    .sort((a: any, b: any) => b.weight - a.weight);
  if (gaps.length === 0) return null;

  return (
    <motion.div variants={fadeUp} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          Strengthen your profile
        </h3>
        <span className="text-xs font-semibold text-slate-500">{gaps.length} gap{gaps.length > 1 ? "s" : ""}</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Completing these raises your match score and opens up more overseas roles.</p>
      <div className="space-y-2">
        {gaps.map((g: any, i: number) => (
          <button key={g.key} onClick={() => setLocation(`/profile?step=${g.step}`)}
            className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition group">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
            <span className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition">{g.label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{g.impact}</p>
            </span>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, gradient, lightBg, lightText, value, label, subtitle, onClick }: {
  icon: React.ElementType; gradient: string; lightBg: string; lightText: string; value: number; label: string; subtitle: string; onClick?: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`bg-white rounded-xl border border-slate-200/80 p-4 transition-all shadow-sm hover:shadow-md group ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`${lightBg} p-2.5 rounded-xl flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${lightText}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
            <p className="text-xs font-semibold text-slate-500 truncate">{label}</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">{subtitle}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </motion.div>
  );
}

// ── Company / benefits / similar-jobs helpers ────────────────────────

function companyInitials(company: string): string {
  return (company || "?")
    .split(/\s+/)
    .filter((w) => !/^(inc|ltd|llp|plc|the|and|&|of|group|corp|company)\.?$/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || (company || "?").slice(0, 2).toUpperCase();
}

function companyGradient(company: string): string {
  const gradients = [
    "from-blue-500 to-blue-700",
    "from-emerald-500 to-emerald-700",
    "from-purple-500 to-purple-700",
    "from-rose-500 to-rose-700",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-cyan-700",
    "from-indigo-500 to-indigo-700",
  ];
  let hash = 0;
  for (const c of company || "") hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return gradients[hash % gradients.length];
}

function companyTagline(job: any): string {
  const countryPitch: Record<string, string> = {
    Canada: "Leading employer with PR sponsorship and relocation support for international talent.",
    Australia: "457 visa sponsorship; hybrid-first workplace with strong benefits package.",
    Germany: "EU Blue Card sponsorship and German language training for new hires.",
    UAE: "Tax-free package with housing allowance, medical insurance, and annual home flight.",
    UK: "Tier-2 visa sponsorship with NHS benefits and accommodation assistance.",
    "New Zealand": "Relocation package, skilled-migrant visa pathway, and regional housing support.",
    "Saudi Arabia": "Tax-free compensation, housing and transport allowance, end-of-service benefits.",
    Maldives: "Full board on-site (accommodation + meals), bi-annual flights home.",
    Japan: "SSW visa sponsorship, Japanese language training, and government-backed placement.",
  };
  return countryPitch[job.country] || `Verified employer recruiting internationally from Himachal Pradesh.`;
}

function inferBenefits(job: any): { label: string }[] {
  const desc = (job.description || "").toLowerCase();
  const text = desc + " " + (job.salary || "").toLowerCase();
  const benefits: { label: string }[] = [];
  const add = (label: string) => { if (!benefits.find((b) => b.label === label)) benefits.push({ label }); };

  if (/visa|sponsor|blue.?card|tier.?2|457|ssw|pr sponsor/.test(text)) add("Visa sponsorship");
  if (/reloc|moving|flight|airfare/.test(text))                        add("Relocation assistance");
  if (/accommod|housing|board|dorm/.test(text))                        add("Accommodation");
  if (/health|medical|insurance/.test(text))                           add("Health insurance");
  if (/tax.?free/.test(text))                                          add("Tax-free salary");
  if (/training|language|upskill/.test(text))                          add("Training & upskilling");
  if (/annual flight|home.*flight|home.*leave/.test(text))             add("Annual home flight");
  if (/hybrid|remote|flexible/.test(text))                             add("Flexible work");

  // Fallback: country-conventional benefits (so the section never looks empty)
  if (benefits.length < 3) {
    const fallback: Record<string, string[]> = {
      Canada: ["Health insurance", "PR sponsorship", "Relocation assistance"],
      Australia: ["Visa sponsorship", "Superannuation", "Annual leave 4 weeks"],
      Germany: ["EU Blue Card", "Health insurance", "30 days paid leave"],
      UAE: ["Tax-free salary", "Housing allowance", "Annual home flight"],
      UK: ["NHS access", "Visa sponsorship", "Pension scheme"],
      "New Zealand": ["Skilled Migrant pathway", "Relocation assistance", "KiwiSaver"],
      "Saudi Arabia": ["Tax-free salary", "Housing + transport", "End-of-service benefits"],
      Maldives: ["Full board (stay + meals)", "Bi-annual flights home", "Medical cover"],
      Japan: ["SSW visa", "Japanese language training", "Subsidised housing"],
    };
    (fallback[job.country] || ["Visa support", "Medical cover", "Relocation help"]).forEach(add);
  }
  return benefits.slice(0, 6);
}

function similarJobs(current: any, all: any[]): any[] {
  if (!current || !Array.isArray(all)) return [];
  const currentSkills = new Set(((current.skills || []) as string[]).map((s) => s.toLowerCase()));
  return all
    .filter((j) => j.id !== current.id)
    .map((j) => {
      const overlap = ((j.skills || []) as string[]).filter((s) => currentSkills.has(s.toLowerCase())).length;
      const sameCountry = j.country === current.country ? 1 : 0;
      return { j, score: overlap * 2 + sameCountry };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.j);
}

// ── Journey Strip: 3 next milestones on Overview ─────────────────────
function JourneyStrip({ profile, completion, docs, education, experience, applications, setActiveView }: any) {
  const [, setLocation] = useLocation();
  const hasProfile     = !!profile?.fullName;
  const profileFull    = (completion?.percentage ?? 0) >= 80;
  const hasEducation   = (education?.length ?? 0) > 0;
  const hasExperience  = (experience?.length ?? 0) > 0;
  const hasDocs        = (docs ?? 0) > 0;
  const hasApplied     = (applications?.length ?? 0) > 0;
  const shortlisted    = applications?.find((a: any) => ["shortlisted", "interview_scheduled", "selected", "placed"].includes(a.status));
  const interview      = applications?.find((a: any) => ["interview_scheduled", "selected", "placed"].includes(a.status));
  const placed         = applications?.find((a: any) => a.status === "placed");

  const allSteps = [
    { key: "register",   label: "Register",            icon: User,         done: hasProfile,    cta: null },
    { key: "profile",    label: "Complete profile",    icon: CheckCircle,  done: profileFull,   cta: { label: "Complete", action: () => setLocation("/profile") } },
    { key: "education",  label: "Add education",       icon: GraduationCap, done: hasEducation, cta: { label: "Add",      action: () => setLocation("/profile") } },
    { key: "experience", label: "Add experience",      icon: Briefcase,    done: hasExperience, cta: { label: "Add",      action: () => setLocation("/profile") } },
    { key: "documents",  label: "Upload CV + passport", icon: FileText,    done: hasDocs,       cta: { label: "Upload",   action: () => setActiveView("documents") } },
    { key: "apply",      label: "Apply to a job",      icon: ClipboardList, done: hasApplied,   cta: { label: "Browse",   action: () => setActiveView("jobs") } },
    { key: "shortlisted", label: "Get shortlisted",    icon: Star,         done: !!shortlisted, cta: null },
    { key: "interview",  label: "Attend interview",    icon: Calendar,     done: !!interview,   cta: null },
    { key: "placed",     label: "Placed abroad",       icon: Globe,        done: !!placed,      cta: null },
  ];
  const completed = allSteps.filter((s) => s.done).length;
  const next3 = allSteps.filter((s) => !s.done).slice(0, 3);
  const pct = Math.round((completed / allSteps.length) * 100);

  return (
    <motion.div variants={fadeUp} className="bg-gradient-to-br from-indigo-50 via-white to-blue-50/40 rounded-2xl border border-indigo-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Route className="w-4 h-4 text-indigo-600" />
          </div>
          Your Journey
          <Badge variant="outline" className="ml-2 text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
            {completed}/{allSteps.length} · {pct}%
          </Badge>
        </h3>
        <Button variant="ghost" size="sm" className="text-xs text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg" onClick={() => setActiveView("journey")}>
          Full Timeline <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Compact progress bar */}
      <div className="h-2 w-full bg-white rounded-full mb-4 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* Next 3 steps */}
      {next3.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-600 font-medium">You've completed every milestone — congratulations! 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {next3.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="bg-white rounded-xl p-3 border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-400 font-semibold">Next step {i + 1}</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{step.label}</p>
                </div>
                {step.cta && (
                  <Button size="sm" variant="outline" className="text-xs h-8 px-3 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0" onClick={step.cta.action}>
                    {step.cta.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Best-effort salary normalization — parses freeform strings like
 * "CAD 85,000 – 110,000", "GBP 32,000 - 42,000", "AED 15,000 - 20,000/mo",
 * "USD 4,000 – 6,000/mo tax-free" into a single USD/year midpoint for
 * filter + sort purposes. Returns 0 if unparseable (e.g., "+ board").
 */
function estimatedAnnualUsd(salary: string): number {
  if (!salary) return 0;
  const s = salary.replace(/,/g, "").toLowerCase();
  const nums = s.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length === 0) return 0;
  const mid = nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];

  // Currency → USD (rough April-2026 rates; good enough for bucketing)
  const rates: Record<string, number> = {
    usd: 1, cad: 0.74, aud: 0.66, nzd: 0.60, gbp: 1.27, eur: 1.08,
    aed: 0.27, sar: 0.27, qar: 0.27, inr: 0.012, jpy: 0.0065,
  };
  let rate = 1;
  for (const c of Object.keys(rates)) if (s.includes(c)) { rate = rates[c]; break; }

  // Monthly → annual
  const monthly = /\/mo|per month|monthly/i.test(salary);
  const usd = mid * rate * (monthly ? 12 : 1);
  return Math.round(usd);
}

// ── Upcoming Interviews on Overview ──────────────────────────────────
function UpcomingInterviews({ applications, setActiveView }: { applications: any[]; setActiveView: (v: string) => void }) {
  const upcoming = (applications ?? [])
    .filter((a) => a.nextInterview && new Date(a.nextInterview.scheduledAt).getTime() > Date.now() - 3 * 86_400_000)
    .sort((a, b) => new Date(a.nextInterview.scheduledAt).getTime() - new Date(b.nextInterview.scheduledAt).getTime())
    .slice(0, 3);
  if (upcoming.length === 0) return null;
  return (
    <motion.div variants={fadeUp} className="bg-gradient-to-r from-cyan-50 via-white to-blue-50/40 rounded-2xl border border-cyan-200/60 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-cyan-600" />
          </div>
          Upcoming Interviews
          <Badge variant="outline" className="ml-2 text-[10px] bg-cyan-50 text-cyan-700 border-cyan-200">{upcoming.length}</Badge>
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {upcoming.map((a) => (
          <div key={a.id}
            className="bg-white rounded-xl p-3 border border-slate-200 hover:border-cyan-400 hover:shadow-sm transition">
            <button onClick={() => setActiveView("applications")} className="text-left w-full">
              <p className="text-sm font-bold text-slate-900 truncate">{a.jobTitle}</p>
              <p className="text-xs text-slate-500 truncate">{a.company}</p>
              <div className="flex items-center gap-2 mt-2 text-xs text-cyan-700 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(a.nextInterview.scheduledAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                <span className="text-slate-400 font-normal">·</span>
                <span className="capitalize text-slate-500 font-normal">{a.nextInterview.mode?.replace(/_/g, " ") || "in person"}</span>
              </div>
            </button>
            <a href={`/api/v1/me/interviews/${a.nextInterview.id}.ics`}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-700 mt-2 font-medium">
              <Download className="w-3 h-3" /> Add to calendar (.ics)
            </a>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Offers Waiting Banner (FRS 1.26 / 1.27) ──────────────────────────
function OffersBanner({ applications, setActiveView }: { applications: any[]; setActiveView: (v: string) => void }) {
  const offers = (applications ?? []).filter((a) => a.placement?.status === "offered");
  if (offers.length === 0) return null;
  return (
    <motion.div variants={fadeUp} className="bg-gradient-to-r from-emerald-50 via-green-50 to-white rounded-2xl border border-emerald-200 p-5 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Award className="w-6 h-6 text-emerald-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">
          {offers.length === 1
            ? `You have an offer from ${offers[0].company} 🎉`
            : `You have ${offers.length} offers waiting for your response`}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">Accept or decline from your applications. Visa process starts once you accept.</p>
      </div>
      <Button size="sm" onClick={() => setActiveView("applications")} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
        Review <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </motion.div>
  );
}

// ── Candidate self-service compliance panel ──────────────────────────
function CandidateCompliancePanel({ profile }: { profile: any }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);

  // Initialise from profile on first render or when profile id changes
  React.useEffect(() => {
    if (profile && (!form || form._id !== profile.id)) {
      setForm({
        _id: profile.id,
        passportNumber: profile.passportNumber ?? "",
        passportExpiry: profile.passportExpiry ?? "",
        ecrStatus: profile.ecrStatus ?? "",
        pccStatus: profile.pccStatus ?? "",
        medicalStatus: profile.medicalStatus ?? "",
        ieltsBand: profile.ieltsBand ?? "",
        pdoCompleted: !!profile.pdoCompleted,
        pdoDate: profile.pdoDate ?? "",
        pbbyInsuranceStatus: profile.pbbyInsuranceStatus ?? "",
        pbbyPolicyNumber: profile.pbbyPolicyNumber ?? "",
      });
    }
  }, [profile?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const body: any = { ...form };
      delete body._id;
      body.ieltsBand = body.ieltsBand === "" ? null : Number(body.ieltsBand);
      body.passportExpiry = body.passportExpiry || null;
      body.pdoDate = body.pdoDate || null;
      const r = await fetch("/api/v1/me/compliance", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Compliance record saved" });
      qc.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
    },
    onError: () => toast({ title: "Couldn't save", variant: "destructive" }),
  });

  if (!form) return null;

  return (
    <motion.section variants={fadeUp} className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 mt-0.5" />
          <div>
            <h3 className="font-bold">Pre-Departure Compliance</h3>
            <p className="text-xs text-slate-300 mt-0.5">Your passport, police clearance, medical status, PDO, and PBBY insurance. Required under the Emigration Act for overseas placement.</p>
          </div>
        </div>
      </div>
      <div className="p-5 grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-slate-700">Passport number</label>
          <Input value={form.passportNumber} onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
            className="mt-1 h-10 text-sm" placeholder="e.g. N1234567" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Passport expiry</label>
          <Input type="date" value={form.passportExpiry}
            onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })}
            min={new Date().toISOString().slice(0, 10)}
            className="mt-1 h-10 text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">ECR / ECNR status</label>
          <Select value={form.ecrStatus} onValueChange={(v) => setForm({ ...form, ecrStatus: v })}>
            <SelectTrigger className="mt-1 h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ecnr">ECNR (no clearance needed)</SelectItem>
              <SelectItem value="ecr">ECR (emigration clearance required)</SelectItem>
              <SelectItem value="unknown">Not sure</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Police Clearance Certificate (PCC)</label>
          <Select value={form.pccStatus} onValueChange={(v) => setForm({ ...form, pccStatus: v })}>
            <SelectTrigger className="mt-1 h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="not_required">Not required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Medical fitness</label>
          <Select value={form.medicalStatus} onValueChange={(v) => setForm({ ...form, medicalStatus: v })}>
            <SelectTrigger className="mt-1 h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fit">Fit</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="unfit">Unfit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">IELTS band</label>
          <Input type="number" step="0.5" min="0" max="9"
            value={form.ieltsBand} onChange={(e) => setForm({ ...form, ieltsBand: e.target.value })}
            className="mt-1 h-10 text-sm" placeholder="e.g. 7.5" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">Pre-Departure Orientation (PDO)</label>
          <div className="flex items-center gap-3 mt-1">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={form.pdoCompleted}
                onChange={(e) => setForm({ ...form, pdoCompleted: e.target.checked })}
                className="w-4 h-4" />
              Completed
            </label>
            <Input type="date" value={form.pdoDate}
              onChange={(e) => setForm({ ...form, pdoDate: e.target.value })}
              className="h-10 text-sm flex-1" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-700">PBBY insurance</label>
          <Select value={form.pbbyInsuranceStatus} onValueChange={(v) => setForm({ ...form, pbbyInsuranceStatus: v })}>
            <SelectTrigger className="mt-1 h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="enrolled">Enrolled</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="not_required">Not required</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-semibold text-slate-700">PBBY policy number</label>
          <Input value={form.pbbyPolicyNumber}
            onChange={(e) => setForm({ ...form, pbbyPolicyNumber: e.target.value })}
            className="mt-1 h-10 text-sm" placeholder="Policy / enrolment number" />
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-50 px-5 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-500">Saves instantly. Your agent and HPSEDC can verify these details.</p>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save compliance"}
        </Button>
      </div>
    </motion.section>
  );
}

// ── Candidate references panel ───────────────────────────────────────
function CandidateReferencesPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", relationship: "", email: "", phone: "", organization: "" });

  const { data: res } = useQuery({
    queryKey: ["/api/v1/me/references"],
    queryFn: async () => {
      const r = await fetch("/api/v1/me/references");
      return r.ok ? r.json() : { data: [] };
    },
  });
  const refs: any[] = res?.data ?? [];

  const add = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/v1/me/references", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Reference added" });
      setForm({ name: "", relationship: "", email: "", phone: "", organization: "" });
      qc.invalidateQueries({ queryKey: ["/api/v1/me/references"] });
    },
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/v1/me/references/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/v1/me/references"] }),
  });

  return (
    <motion.section variants={fadeUp} className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-blue-600" /> Professional References
        <Badge variant="outline" className="text-[10px] bg-slate-50">{refs.length}</Badge>
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Add up to 3 professional references. Recruiters may contact them during background checks to speed up your overseas placement.
      </p>

      <div className="space-y-2 mb-4">
        {refs.map((r) => (
          <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{r.name}</p>
              <p className="text-xs text-slate-500">{r.relationship || "—"}{r.organization ? ` · ${r.organization}` : ""}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                {r.email && <span>{r.email}</span>}
                {r.phone && <span>{r.phone}</span>}
                {r.contacted && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Contacted</Badge>}
              </div>
            </div>
            <button onClick={() => del.mutate(r.id)} className="text-slate-400 hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {refs.length < 3 && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">Add a reference</p>
          <div className="grid md:grid-cols-2 gap-2">
            <Input placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Relationship (e.g. Manager at Infosys)" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm" />
            <Input placeholder="Organisation" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="h-9 text-sm md:col-span-2" />
          </div>
          <Button size="sm" disabled={!form.name.trim() || add.isPending} onClick={() => add.mutate()} className="mt-3">
            {add.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Add reference"}
          </Button>
        </div>
      )}
    </motion.section>
  );
}

// ── Interview prep tips (auto-surface when interviews upcoming) ──────
function InterviewPrepTips({ applications }: { applications: any[] }) {
  const hasUpcoming = (applications ?? []).some((a) =>
    a.nextInterview && new Date(a.nextInterview.scheduledAt).getTime() > Date.now()
  );
  if (!hasUpcoming) return null;

  const tips = [
    { emoji: "📋", title: "Review the job description", detail: "Re-read the skills + requirements the night before. Recruiters ask you to map your experience to them." },
    { emoji: "🎯", title: "Prepare 3 specific stories", detail: "One for a technical problem you solved, one for a teamwork moment, one for handling pressure." },
    { emoji: "🌍", title: "Know the country", detail: "Basic cost of living, visa route, and cultural norms. Shows real commitment." },
    { emoji: "📞", title: "Test your setup for virtual interviews", detail: "Camera, mic, internet, quiet background, good lighting. 10 minutes early." },
    { emoji: "❓", title: "Have 2 questions ready", detail: "Ask about the team, onboarding, or a genuine career-growth question. Never 'no questions'." },
  ];

  return (
    <motion.div variants={fadeUp} className="bg-gradient-to-br from-blue-50 to-indigo-50/40 rounded-2xl border border-blue-200/60 p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-blue-600" />
        </div>
        Interview prep tips
      </h3>
      <div className="grid md:grid-cols-2 gap-2">
        {tips.map((t, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-sm font-semibold text-slate-900">{t.emoji} {t.title}</p>
            <p className="text-xs text-slate-600 mt-0.5">{t.detail}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Welfare reply (candidate proactively reaches out post-placement) ─
function WelfareReplyCard({ applications }: { applications: any[] }) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const activePlacement = (applications ?? []).find((a) =>
    a.placement && (a.placement.status === "accepted" || a.placement.status === "active")
  );
  const placementId = activePlacement?.placement?.id;

  // Hooks must run on every render. Gate the fetch on the URL instead of the
  // mutation's existence — this fixes a React #310 crash that triggered the
  // moment a candidate's applications started carrying an accepted placement.
  const post = useMutation({
    mutationFn: async () => {
      if (!placementId) throw new Error("No active placement");
      const r = await fetch(`/api/v1/me/placements/${placementId}/welfare-reply`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Thanks for the update", description: "Your note has been shared with your agent." });
      setNote("");
      qc.invalidateQueries({ queryKey: ["/api/v1/candidates/applications"] });
    },
    onError: () => toast({ title: "Couldn't send", variant: "destructive" }),
  });

  if (!activePlacement) return null;

  return (
    <motion.div variants={fadeUp} className="bg-gradient-to-r from-rose-50 via-white to-pink-50/40 rounded-2xl border border-rose-200/60 p-5 shadow-sm">
      <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
          <Heart className="w-4 h-4 text-rose-600" />
        </div>
        How are you doing?
      </h3>
      <p className="text-sm text-slate-600 mb-3">
        You've accepted an offer at <span className="font-semibold">{activePlacement.company}</span>. If you have any concerns or good news about your placement, let us know. HPSEDC and your agency will see it.
      </p>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. 'Settled in well, work is going great' or 'Accommodation is not what was promised'"
          className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm"
        />
        <Button size="sm" disabled={!note.trim() || post.isPending}
          onClick={() => post.mutate()}
          className="bg-rose-600 hover:bg-rose-700 text-white">
          {post.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send update"}
        </Button>
      </div>
    </motion.div>
  );
}
