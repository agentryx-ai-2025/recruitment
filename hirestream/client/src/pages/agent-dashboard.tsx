import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Briefcase, Handshake, Star, Search, Plus, Calendar,
  Loader2, MapPin, Building, Eye, Edit, Globe, CheckCircle,
  AlertCircle, User, Clock, FileText, ArrowRight, Bell,
  LayoutDashboard, ClipboardList, Megaphone, Activity, ArrowLeft, TrendingUp, Trash2, Copy
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { AgencyRegisterForm } from "@/components/agent/agency-register-form";
import { JobPoster } from "@/components/agent/job-poster";
import { ApplicantManager } from "@/components/agent/applicant-manager";
import { DriveCreationForm } from "@/components/agent/drive-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Mail, Phone, GraduationCap, Award, AlertTriangle, Heart, Shield, MessageSquare, FolderLock, Fingerprint } from "lucide-react";
import { PhotoAvatar } from "@/components/shared/PhotoAvatar";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: null };
  return res.json();
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, scale: 0.97, transition: { duration: 0.15 } },
};

function InitialsAvatar({ name, size = "w-10 h-10" }: { name: string; size?: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const gradients = ["from-blue-500 to-blue-600", "from-emerald-500 to-emerald-600", "from-purple-500 to-purple-600", "from-orange-500 to-orange-600", "from-rose-500 to-rose-600"];
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length;
  return (
    <div className={`${size} bg-gradient-to-br ${gradients[idx]} rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials || <Building className="w-4 h-4" />}
    </div>
  );
}

export default function AgentDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState("overview");
  const [jobStatusFilter, setJobStatusFilter] = useState<"all" | "active" | "closed" | "draft">("all");
  const [searchSkill, setSearchSkill] = useState("");

  const { data: agencyRes, isLoading } = useQuery({
    queryKey: ["/api/v1/agencies/me"],
    queryFn: () => fetchJson("/api/v1/agencies/me"),
  });
  const { data: jobsRes } = useQuery({
    queryKey: ["/api/v1/jobs", "agent", "mine"],
    queryFn: () => fetchJson("/api/v1/jobs?status=all&mine=true&limit=100"),
  });
  const { data: candidatesRes, isLoading: candidatesLoading } = useQuery({
    queryKey: ["/api/v1/agencies/candidates", searchSkill],
    queryFn: () => fetchJson(`/api/v1/agencies/candidates${searchSkill ? `?skill=${searchSkill}` : ''}`),
  });
  const { data: drivesRes } = useQuery({
    queryKey: ["/api/v1/drives/my"],
    queryFn: () => fetchJson("/api/v1/drives/my"),
  });
  const { data: notifsRes } = useQuery({
    queryKey: ["/api/v1/notifications"],
    queryFn: () => fetchJson("/api/v1/notifications?limit=5"),
  });

  const agency = agencyRes?.data;
  const isRegistered = !!agency;
  const isVerified = isRegistered && agency.verified;
  const allJobs = (jobsRes?.data || []).filter((j: any) => j.agentId === user?.id);
  const activeJobs = allJobs.filter((j: any) => j.status === "active");
  const draftJobs = allJobs.filter((j: any) => j.status === "draft");
  const candidates = candidatesRes?.data || [];
  const candidateTotal = candidatesRes?.total || candidates.length;
  const drives = drivesRes?.data || [];
  const notifications = notifsRes?.data || [];

  if (isLoading) {
    return (
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 py-8 space-y-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 py-10">
        <button
          onClick={() => { window.location.href = "/home"; }}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </button>
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-5">
            <Building className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Register Your Agency</h2>
          <p className="text-gray-500 mb-8">To post jobs and manage recruitment drives, register your agency and get verified by HPSEDC.</p>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <AgencyRegisterForm />
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { key: "overview", label: "Dashboard", icon: LayoutDashboard, count: null },
    { key: "jobs", label: "My Jobs", icon: Briefcase, count: allJobs.length },
    { key: "requisitions", label: "Open Requisitions", icon: Handshake, count: null },
    { key: "candidates", label: "Candidates", icon: Users, count: candidateTotal },
    { key: "drives", label: "Drives", icon: Megaphone, count: drives.length },
    { key: "reports", label: "Reports", icon: TrendingUp, count: null },
    { key: "activity", label: "Activity", icon: Activity, count: notifications.length },
  ];

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 py-5">
      {/* Mobile Nav */}
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

      <div className="lg:grid lg:grid-cols-[minmax(220px,280px)_1fr] lg:gap-6 xl:gap-7">
        {/* ── SIDEBAR ── */}
        <aside className="hidden lg:flex lg:flex-col gap-4 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pb-4">
          {/* Agency Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <InitialsAvatar name={agency.agencyName} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 text-sm leading-snug truncate">{agency.agencyName}</p>
                <p className="text-xs text-slate-500 truncate">License: {agency.licenseNumber}</p>
              </div>
            </div>
            <Badge className={`text-xs w-full justify-center py-1 ${isVerified ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
              {isVerified ? "Verified Agency" : "Pending Verification"}
            </Badge>
            {agency.specializations?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {agency.specializations.map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>
                ))}
              </div>
            )}
            <div className="mt-3">
              <JobPoster isVerified={isVerified} />
            </div>
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
          </nav>

          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Quick Stats</p>
            <div className="space-y-0.5">
              <MiniStat label="Active Jobs" value={activeJobs.length} icon={Briefcase} color="text-emerald-600" bg="bg-emerald-50" onClick={() => { setJobStatusFilter("active"); setActiveView("jobs"); }} />
              <MiniStat label="Candidates" value={candidateTotal} icon={Users} color="text-blue-600" bg="bg-blue-50" onClick={() => setActiveView("candidates")} />
              <MiniStat label="Placements" value={agency.placements || 0} icon={Handshake} color="text-orange-600" bg="bg-orange-50" onClick={() => setLocation("/agent/applicants?status=placed")} />
              <MiniStat label="Rating" value={agency.rating || "—"} icon={Star} color="text-purple-600" bg="bg-purple-50" />
            </div>
          </div>

          {/* Aggregate applicants CTA — cross-job view for agents juggling many
              requisitions. Deep-links to /agent/applicants. */}
          <Link href="/agent/applicants"
            className="block mt-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-xl p-3 shadow-sm hover:shadow-md transition">
            <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">One-pane view</p>
            <p className="text-sm font-semibold mt-0.5">All applicants across your jobs →</p>
            <p className="text-[11px] opacity-80 mt-0.5">Default filter: awaiting your triage</p>
          </Link>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="min-w-0">
          {!isVerified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Agency verification pending</p>
                <p className="text-xs text-amber-600 mt-0.5">HPSEDC will review your agency details. Once verified, you can post jobs and manage drives.</p>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={activeView} variants={scaleIn} initial="initial" animate="animate" exit="exit">
              {activeView === "overview" && (
                <OverviewContent
                  candidateTotal={candidateTotal} activeJobs={activeJobs.length} allJobs={allJobs}
                  placements={agency.placements || 0} rating={agency.rating || "—"}
                  drives={drives} notifications={notifications}
                  setActiveView={setActiveView} isVerified={isVerified}
                />
              )}
              {activeView === "jobs" && <JobsContent allJobs={allJobs} isVerified={isVerified} statusFilter={jobStatusFilter} setStatusFilter={setJobStatusFilter} />}
              {activeView === "requisitions" && <RequisitionsContent isVerified={isVerified} />}
              {activeView === "candidates" && <CandidatesContent candidates={candidates} candidateTotal={candidateTotal} loading={candidatesLoading} searchSkill={searchSkill} setSearchSkill={setSearchSkill} />}
              {activeView === "drives" && <DrivesContent drives={drives} isVerified={isVerified} />}
              {activeView === "reports" && <AgentReports />}
              {activeView === "activity" && <ActivityContent notifications={notifications} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ── Mini Stat ──
function MiniStat({ label, value, icon: Icon, color, bg, onClick }: { label: string; value: number | string; icon: React.ElementType; color: string; bg: string; onClick?: () => void }) {
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

// ── Stat Card (for overview) ──
function StatCard({ icon: Icon, color, lightBg, value, label, subtitle, onClick }: {
  icon: React.ElementType; color: string; lightBg: string; value: number | string; label: string; subtitle: string; onClick?: () => void;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2 }}
      className={`bg-white rounded-xl border border-slate-200 p-4 transition-all shadow-sm hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`${lightBg} ${color} p-2 rounded-lg flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
            <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>
        </div>
        {onClick && <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />}
      </div>
    </motion.div>
  );
}

// ── Overview ──
function OverviewContent({ candidateTotal, activeJobs, allJobs, placements, rating, drives, notifications, setActiveView, isVerified }: any) {
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
      <motion.div variants={fadeUp} className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard icon={Users} color="text-blue-600" lightBg="bg-blue-50" value={candidateTotal} label="Candidates" subtitle="In candidate pool" onClick={() => setActiveView("candidates")} />
        <StatCard icon={Briefcase} color="text-emerald-600" lightBg="bg-emerald-50" value={activeJobs} label="Active Jobs" subtitle={`${allJobs.length} total posted`} onClick={() => { setJobStatusFilter("active"); setActiveView("jobs"); }} />
        <StatCard icon={Handshake} color="text-orange-600" lightBg="bg-orange-50" value={placements} label="Placements" subtitle="Successfully placed" onClick={() => setLocation("/agent/applicants?status=placed")} />
        <StatCard icon={Star} color="text-purple-600" lightBg="bg-purple-50" value={rating} label="Rating" subtitle="Agency rating" />
      </motion.div>

      {/* Aggregate pipeline across all the agent's jobs */}
      <AgentPipelineFunnel allJobs={allJobs} setActiveView={setActiveView} />

      {/* Recent Jobs */}
      <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" /> Recent Jobs
          </h3>
          <Button variant="ghost" size="sm" className="text-xs text-blue-600 font-semibold" onClick={() => setActiveView("jobs")}>
            View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {allJobs.length === 0 ? (
          <div className="text-center py-10 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-dashed border-slate-200">
            <Briefcase className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">{isVerified ? "No jobs posted yet" : "Agency not yet verified"}</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              {isVerified ? "Post your first overseas placement job in under a minute." : "Contact HPSEDC to complete license verification."}
            </p>
            {isVerified && (
              <Button size="sm" onClick={() => setActiveView("jobs")} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" /> Post Your First Job
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {allJobs.slice(0, 3).map((job: any) => (
              <RecentJobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Recent Drives */}
      {drives.length > 0 && (
        <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-600" /> Recent Drives
            </h3>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600 font-semibold" onClick={() => setActiveView("drives")}>
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-2">
            {drives.slice(0, 3).map((d: any) => (
              <Link key={d.id} href={`/agent/drives/${d.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group cursor-pointer">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700">{d.title}</p>
                  <p className="text-xs text-slate-400">
                    {d.date ? new Date(d.date).toLocaleDateString('en-IN') : '—'} · {d.location}
                  </p>
                </div>
                <Badge className={`text-[11px] ${
                  d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  d.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  d.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{d.status}</Badge>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── Jobs Content ──
function JobsContent({ allJobs, isVerified, statusFilter, setStatusFilter }: {
  allJobs: any[]; isVerified: boolean;
  statusFilter: "all" | "active" | "closed" | "draft";
  setStatusFilter: (v: "all" | "active" | "closed" | "draft") => void;
}) {
  type JobSort = "newest" | "oldest" | "deadline" | "priority";
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "standard" | "urgent" | "critical">("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<JobSort>("newest");

  const countries = Array.from(new Set(allJobs.map((j: any) => j.country).filter(Boolean))).sort() as string[];
  const companies = Array.from(new Set(allJobs.map((j: any) => j.company).filter(Boolean))).sort() as string[];
  const counts = {
    all: allJobs.length,
    active: allJobs.filter((j: any) => j.status === "active").length,
    closed: allJobs.filter((j: any) => j.status === "closed").length,
    draft: allJobs.filter((j: any) => j.status === "draft").length,
  };
  // Priority chips double as filter; "critical" outranks "urgent" which outranks "standard".
  const priorityRank: Record<string, number> = { critical: 3, urgent: 2, standard: 1 };
  const filtered = allJobs.filter((j: any) => {
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    const matchCountry = countryFilter === "all" || j.country === countryFilter;
    const matchCompany = companyFilter === "all" || j.company === companyFilter;
    const matchPriority = priorityFilter === "all" || (j.priority || "standard") === priorityFilter;
    const s = search.toLowerCase();
    const matchSearch = !s ||
      (j.title || "").toLowerCase().includes(s) ||
      (j.company || "").toLowerCase().includes(s) ||
      (j.location || "").toLowerCase().includes(s) ||
      (j.skills || []).some((sk: string) => sk.toLowerCase().includes(s));
    return matchStatus && matchCountry && matchCompany && matchPriority && matchSearch;
  });
  // Sort applied after filter. Deadline sort puts null deadlines last so they
  // don't clutter the top of the list.
  filtered.sort((a: any, b: any) => {
    switch (sortBy) {
      case "oldest":   return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "deadline": {
        const da = a.hiringDeadline ? new Date(a.hiringDeadline).getTime() : Infinity;
        const db = b.hiringDeadline ? new Date(b.hiringDeadline).getTime() : Infinity;
        return da - db;
      }
      case "priority": return (priorityRank[b.priority] ?? 1) - (priorityRank[a.priority] ?? 1);
      case "newest":
      default:         return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  const chips: Array<["all" | "active" | "closed" | "draft", string, string]> = [
    ["all",    "All",    "bg-slate-100 text-slate-700"],
    ["active", "Active", "bg-emerald-100 text-emerald-800"],
    ["draft",  "Drafts", "bg-amber-100 text-amber-800"],
    ["closed", "Closed", "bg-slate-200 text-slate-700"],
  ];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-600" /> My Jobs
          <span className="text-slate-400 text-xs font-normal">({filtered.length} of {allJobs.length})</span>
        </h3>
      </div>
      {/* Status chip bar — doubles as filter and at-a-glance breakdown. No new
          navigation surface; uses existing counts already computed above. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {chips.map(([k, label, cls]) => (
          <button key={k} onClick={() => setStatusFilter(k)}
            aria-pressed={statusFilter === k}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition ${
              statusFilter === k ? `${cls} border-slate-500 shadow-sm` : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>
            {label} <span className="text-slate-500 tabular-nums ml-0.5">{counts[k]}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <input type="text" placeholder="Search title, company, location, skill…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] h-9 text-xs rounded-md border border-slate-200 px-3" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as JobSort)}
          className="h-9 text-xs rounded-md border border-slate-200 px-2 bg-white">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="deadline">Deadline (soonest)</option>
          <option value="priority">Priority (high→low)</option>
        </select>
        {countries.length > 1 && (
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 text-xs rounded-md border border-slate-200 px-2 bg-white">
            <option value="all">All countries</option>
            {countries.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {companies.length > 1 && (
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-9 text-xs rounded-md border border-slate-200 px-2 bg-white max-w-[200px]">
            <option value="all">All companies</option>
            {companies.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["all", "critical", "urgent", "standard"] as const).map((p) => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            aria-pressed={priorityFilter === p}
            className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition ${
              priorityFilter === p
                ? (p === "critical" ? "bg-red-100 text-red-800 border-red-400"
                  : p === "urgent" ? "bg-amber-100 text-amber-800 border-amber-400"
                  : p === "standard" ? "bg-slate-100 text-slate-700 border-slate-400"
                  : "bg-blue-50 text-blue-700 border-blue-300")
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}>
            {p === "all" ? "All priorities" : p[0].toUpperCase() + p.slice(1)}
          </button>
        ))}
        {(countryFilter !== "all" || companyFilter !== "all" || priorityFilter !== "all" || sortBy !== "newest") && (
          <button onClick={() => { setCountryFilter("all"); setCompanyFilter("all"); setPriorityFilter("all"); setSortBy("newest"); }}
            className="text-[11px] text-slate-500 hover:text-slate-900 hover:underline">Clear</button>
        )}
      </div>
      {allJobs.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-xl border border-dashed border-slate-200">
          <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-sm text-slate-600">No jobs posted yet</p>
          <p className="text-xs text-slate-400 mt-1">{isVerified ? "Click 'Post Job' in the sidebar to create your first listing." : "Your agency needs HPSEDC verification first."}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No jobs match the current filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job: any) => (
            <AgentJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Candidates Content ──
function CandidatesContent({ candidates, candidateTotal, loading, searchSkill, setSearchSkill }: any) {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<any>(null);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [expBucket, setExpBucket] = useState<"all" | "junior" | "mid" | "senior">("all");
  const [profileFilter, setProfileFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [outreachOnly, setOutreachOnly] = useState(false);
  type CandSort = "newest" | "oldest" | "most_exp" | "complete_first";
  const [sortBy, setSortBy] = useState<CandSort>("newest");

  const locations = Array.from(new Set((candidates || []).map((c: any) => c.location).filter(Boolean))).sort();
  const allCountries = Array.from(new Set(
    (candidates || []).flatMap((c: any) => c.preferredCountries ?? [])
  )).sort();
  const expMatch = (c: any) => {
    const y = c.experience ?? 0;
    if (expBucket === "junior") return y < 3;
    if (expBucket === "mid")    return y >= 3 && y < 7;
    if (expBucket === "senior") return y >= 7;
    return true;
  };
  const filtered = (candidates || []).filter((c: any) => {
    if (locationFilter !== "all" && c.location !== locationFilter) return false;
    if (countryFilter !== "all" && !(c.preferredCountries ?? []).includes(countryFilter)) return false;
    if (!expMatch(c)) return false;
    if (profileFilter === "complete" && !c.profileComplete) return false;
    if (profileFilter === "incomplete" && c.profileComplete) return false;
    if (outreachOnly && !c.openToOutreach) return false;
    return true;
  });
  filtered.sort((a: any, b: any) => {
    switch (sortBy) {
      case "oldest":         return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      case "most_exp":       return (b.experience ?? 0) - (a.experience ?? 0);
      case "complete_first": return Number(!!b.profileComplete) - Number(!!a.profileComplete);
      case "newest":
      default:               return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
  });
  const expChips: Array<["all" | "junior" | "mid" | "senior", string]> = [
    ["all",    "All experience"],
    ["junior", "Junior (<3y)"],
    ["mid",    "Mid (3–6y)"],
    ["senior", "Senior (7y+)"],
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by skill (e.g. React)" value={searchSkill}
            onChange={(e) => setSearchSkill(e.target.value)} className="pl-10 rounded-lg" />
        </div>
        <p className="text-xs text-slate-400 font-medium">{filtered.length} of {candidateTotal}</p>
      </div>

      {/* Experience chips + location / country selects. All filters compose —
          no new nav elements, just existing data re-surfaced as interactive
          affordances. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {expChips.map(([k, label]) => (
          <button key={k} onClick={() => setExpBucket(k)}
            aria-pressed={expBucket === k}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border transition ${
              expBucket === k ? "bg-blue-100 text-blue-800 border-blue-400" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}>{label}</button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as CandSort)}
          className="h-9 text-xs rounded-md border border-slate-200 px-2 bg-white">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="most_exp">Most experience</option>
          <option value="complete_first">Complete profiles first</option>
        </select>
        {locations.length > 1 && (
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
            className="h-9 text-xs rounded-md border border-slate-200 px-2 bg-white">
            <option value="all">All locations</option>
            {locations.map((l: any) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {allCountries.length > 1 && (
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 text-xs rounded-md border border-slate-200 px-2 bg-white">
            <option value="all">All preferred countries</option>
            {allCountries.map((c: any) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {(["all", "complete", "incomplete"] as const).map((v) => (
          <button key={v} onClick={() => setProfileFilter(v)}
            aria-pressed={profileFilter === v}
            className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition ${
              profileFilter === v ? "bg-emerald-100 text-emerald-800 border-emerald-400" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}>
            {v === "all" ? "All profiles" : v === "complete" ? "Profile complete" : "Incomplete"}
          </button>
        ))}
        <button onClick={() => setOutreachOnly(v => !v)}
          aria-pressed={outreachOnly}
          className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition ${
            outreachOnly ? "bg-blue-500 text-white border-blue-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
          }`}
          title="Show only candidates who opted in to agent outreach">
          Open to outreach only
        </button>
        {(locationFilter !== "all" || countryFilter !== "all" || expBucket !== "all" || profileFilter !== "all" || outreachOnly || sortBy !== "newest") && (
          <button onClick={() => { setLocationFilter("all"); setCountryFilter("all"); setExpBucket("all"); setProfileFilter("all"); setOutreachOnly(false); setSortBy("newest"); }}
            className="text-[11px] text-slate-500 hover:text-slate-900 hover:underline">Clear</button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{candidates?.length === 0 ? "No candidates found" : "No candidates match the current filters"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c: any) => (
            <div key={c.id} onClick={() => setLocation(`/agent/candidates/${c.id}`)}
              className="border border-slate-100 rounded-xl p-4 flex items-start justify-between hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <PhotoAvatar photoUrl={c.photoUrl} name={c.fullName || "?"}
                  size="w-9 h-9" rounded="rounded-xl" textSize="text-xs" className="shadow" />
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm truncate group-hover:text-blue-700 transition-colors">{c.fullName}</h4>
                  <p className="text-xs text-slate-500 truncate">{c.email}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                    {c.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {c.location}</span>}
                    {c.experience != null && <span>{c.experience} yrs exp</span>}
                    {c.preferredCountries?.length > 0 && <span className="flex items-center gap-0.5"><Globe className="w-3 h-3" /> {c.preferredCountries.length} countries</span>}
                  </div>
                  {c.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {c.skills.slice(0, 5).map((s: string) => <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>)}
                      {c.skills.length > 5 && <Badge variant="outline" className="text-[11px]">+{c.skills.length - 5}</Badge>}
                    </div>
                  )}
                </div>
              </div>
              <Button size="sm" variant="outline" className="text-xs rounded-lg flex-shrink-0" onClick={(e) => { e.stopPropagation(); setSelected(c); }}>
                <Eye className="w-3.5 h-3.5 mr-1" /> View
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Detail Dialog */}
      <CandidateDetailDialog candidate={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ── Candidate Detail Dialog ──
function CandidateDetailDialog({ candidate, onClose }: { candidate: any; onClose: () => void }) {
  if (!candidate) return null;
  return (
    <Dialog open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <PhotoAvatar photoUrl={candidate.photoUrl} name={candidate.fullName || "?"}
              size="w-14 h-14" rounded="rounded-xl" textSize="text-base" />
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold text-slate-900">{candidate.fullName || "Candidate"}</DialogTitle>
              <DialogDescription asChild>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-1.5">
                  {candidate.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {candidate.email}</span>}
                  {candidate.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {candidate.phone}</span>}
                  {candidate.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {candidate.location}</span>}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Experience & Profile Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide mb-1">Experience</p>
              <p className="text-lg font-bold text-slate-800">{candidate.experience != null ? `${candidate.experience} years` : "—"}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Skills</p>
              <p className="text-lg font-bold text-slate-800">{candidate.skills?.length || 0}</p>
            </div>
          </div>

          {/* Skills */}
          {candidate.skills?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> Skills
              </p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
              </div>
            </div>
          )}

          {/* Preferred Countries */}
          {candidate.preferredCountries?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Preferred Countries
              </p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.preferredCountries.map((c: string) => (
                  <Badge key={c} variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Summary / Bio */}
          {candidate.summary && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">About</p>
              <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">{candidate.summary}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-slate-100">
            {candidate.email && (
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => window.location.href = `mailto:${candidate.email}`}>
                <Mail className="w-4 h-4 mr-1.5" /> Email
              </Button>
            )}
            {candidate.phone && (
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => window.location.href = `tel:${candidate.phone}`}>
                <Phone className="w-4 h-4 mr-1.5" /> Call
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Open Requisitions (from employers) ──────────────────────────────
function RequisitionsContent({ isVerified }: { isVerified: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/agent/requisitions"],
    queryFn: () => fetchJson("/api/v1/agent/requisitions"),
  });

  const pickup = useMutation({
    mutationFn: async (reqId: string) => {
      const r = await fetch(`/api/v1/agent/requisitions/${reqId}/pickup`, { method: "POST", credentials: "include" });
      const body = await r.json();
      if (!r.ok) throw new Error(body?.error?.message || body?.message || "Pick-up failed");
      return body;
    },
    onSuccess: (body) => {
      qc.invalidateQueries({ queryKey: ["/api/v1/agent/requisitions"] });
      qc.invalidateQueries({ queryKey: ["/api/v1/jobs"] });
      toast({ title: "Requisition picked up", description: "Derivative job added to My Jobs — candidates can now apply." });
      setLocation(`/agent/jobs/${body.data.id}`);
    },
    onError: (e: any) => toast({ title: "Couldn't pick up", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;
  const reqs: any[] = res?.data ?? [];
  const pairingMode: string = res?.pairingMode ?? "open";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Handshake className="w-4 h-4 text-purple-600" /> Open Employer Requisitions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Pair mode: <Badge variant="outline" className="text-[10px]">{pairingMode}</Badge>
            {" · "}Candidates do not see these directly. Pick one up to publish a derivative job candidates can apply to.
          </p>
        </div>
      </div>
      {!isVerified && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
          <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
          Your agency must be verified by HPSEDC before you can pick up requisitions.
        </div>
      )}
      {reqs.length === 0 ? (
        <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-purple-50/30 rounded-xl border border-dashed border-slate-200">
          <Handshake className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-600">No open requisitions</p>
          <p className="text-xs text-slate-400 mt-1">When employers post requisitions, they'll appear here for verified agencies to pick up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reqs.map((r) => (
            <div key={r.id} className="border border-slate-200 rounded-xl p-4 hover:border-purple-400 hover:shadow-sm transition">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 text-sm">{r.title}</h4>
                    {r.priority && r.priority !== "standard" && (
                      <Badge className={`text-[10px] ${r.priority === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.priority}
                      </Badge>
                    )}
                    {r.pinnedAgentId && (
                      <Badge className="text-[10px] bg-indigo-100 text-indigo-700">pinned to you</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1"><Building className="w-3 h-3" />{r.company}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[r.location, r.country].filter(Boolean).join(", ")}</span>
                    {r.salary && <span>· {r.salary}</span>}
                    {r.targetHires > 1 && <span>· {r.targetHires} hires</span>}
                    {r.hiringDeadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.hiringDeadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                  </div>
                  {r.description && <p className="text-xs text-slate-600 mt-2 line-clamp-2">{r.description}</p>}
                  {r.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.skills.slice(0, 6).map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                    </div>
                  )}
                </div>
                {r.pickedUpByMe ? (
                  <Link href={`/agent/jobs/${r.myDerivativeJobId}`}>
                    <Button size="sm" variant="outline"
                      className="border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      Already picked up — open
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" disabled={!isVerified || pickup.isPending}
                    onClick={() => pickup.mutate(r.id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white">
                    {pickup.isPending && pickup.variables === r.id
                      ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      : <Handshake className="w-3.5 h-3.5 mr-1" />}
                    {pickup.isPending && pickup.variables === r.id ? "Picking up…" : "Pick Up"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drives Content ──
function DrivesContent({ drives, isVerified }: { drives: any[]; isVerified: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-amber-600" /> Recruitment Drives ({drives.length})
        </h3>
        {isVerified && <DriveCreationForm />}
      </div>
      {drives.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-sm">No recruitment drives yet</p>
          <p className="text-xs mt-1">{isVerified ? "Click 'Create Drive' to organize a recruitment event" : "Get verified first to create drives"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drives.map((d: any) => (
            <Link key={d.id} href={`/agent/drives/${d.id}`}
              className="block border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition cursor-pointer group">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{d.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-0.5"><Calendar className="w-3.5 h-3.5" /> {d.date ? new Date(d.date).toLocaleDateString('en-IN') : '—'}</span>
                    <span className="flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5" /> {d.location}</span>
                  </div>
                  {d.targetRoles?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {d.targetRoles.map((r: string) => <Badge key={r} variant="outline" className="text-[11px]">{r}</Badge>)}
                    </div>
                  )}
                </div>
                <Badge className={`text-[11px] flex-shrink-0 ${
                  d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  d.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  d.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-500'
                }`}>{d.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Activity Content ──
function ActivityContent({ notifications }: { notifications: any[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-blue-600" /> Recent Activity
      </h3>
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n.id} className={`p-3 rounded-xl ${n.read ? 'bg-slate-50' : 'bg-blue-50 border-l-4 border-blue-500'}`}>
              <p className="text-sm font-medium text-slate-900">{n.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
              <p className="text-[11px] text-slate-400 mt-1">{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact row used in Recent Jobs. Drafts open the editor; active jobs link to detail.
function RecentJobRow({ job }: { job: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const isDraft = job.status === "draft";
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-700">{job.title}</p>
        <p className="text-xs text-slate-400">
          {[job.location, job.country].filter(Boolean).join(", ") || <span className="italic">No location yet</span>}
        </p>
      </div>
      <Badge className={`text-[11px] ${
        job.status === "active" ? "bg-emerald-100 text-emerald-700"
        : isDraft ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-500"
      }`}>{isDraft ? "draft — tap to continue" : job.status}</Badge>
    </>
  );
  const cls = "flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition-colors group cursor-pointer";
  if (isDraft) {
    return (
      <>
        <button type="button" onClick={() => setEditOpen(true)} className={cls + " w-full text-left"}>
          {content}
        </button>
        <JobPoster isVerified={true} editJob={job} controlledOpen={editOpen} onOpenChange={setEditOpen}
          trigger={<span style={{ display: "none" }} />} />
      </>
    );
  }
  return (
    <Link href={`/agent/jobs/${job.id}`} className={cls}>{content}</Link>
  );
}

// ── Agent Job Card (click → /agent/jobs/:id, or editor if draft) ─────
function AgentJobCard({ job }: { job: any }) {
  const [editOpen, setEditOpen] = useState(false);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isDraft = job.status === "draft";
  const { data: appsRes } = useQuery({
    queryKey: [`/api/v1/jobs/${job.id}/applicants`],
    queryFn: () => fetchJson(`/api/v1/jobs/${job.id}/applicants`),
    enabled: !isDraft,
  });
  const applicants: any[] = appsRes?.data ?? [];
  const shortlisted = applicants.filter((a) => ["shortlisted", "interview_scheduled", "selected"].includes(a.status)).length;

  const deleteMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/v1/jobs/${job.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error((await r.json())?.error?.message || "Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/jobs"] });
      toast({ title: isDraft ? "Draft deleted" : "Job deleted" });
    },
    onError: (e: any) => toast({ title: "Couldn't delete", description: e.message, variant: "destructive" }),
  });

  const cloneMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/v1/jobs/${job.id}/clone`, { method: "POST" });
      if (!r.ok) throw new Error((await r.json())?.error?.message || "Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/v1/jobs"] });
      toast({ title: "Cloned as new draft", description: "Edit and publish when ready." });
    },
    onError: (e: any) => toast({ title: "Couldn't clone", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <div onClick={() => isDraft ? setEditOpen(true) : setLocation(`/agent/jobs/${job.id}`)}
        className="border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition cursor-pointer group">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{job.title}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5" />{job.location}, {job.country}
              {job.salary && <span>· {job.salary}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge className={`text-[11px] ${
              job.status === "active" ? "bg-emerald-100 text-emerald-700"
              : job.status === "draft" ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
            }`}>{job.status}</Badge>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-700"
              onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
              title={job.status === "draft" ? "Continue draft" : "Edit job"}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-emerald-700"
              onClick={(e) => { e.stopPropagation(); cloneMut.mutate(); }}
              disabled={cloneMut.isPending}
              title="Clone as new draft">
              <Copy className="w-4 h-4" />
            </Button>
            {(isDraft || applicants.length === 0) && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  const msg = isDraft ? "Delete this draft?" : "Delete this job? It has no applicants, so this is permanent.";
                  if (window.confirm(msg)) deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
                title={isDraft ? "Delete draft" : "Delete job"}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        {job.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {job.skills.slice(0, 5).map((s: string) => <Badge key={s} variant="secondary" className="text-[11px]">{s}</Badge>)}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
          {isDraft ? (
            <>
              <span className="flex items-center gap-1 text-amber-700"><Edit className="w-3.5 h-3.5" /> Not yet published</span>
              <span className="ml-auto text-blue-600 font-medium group-hover:underline">Continue editing →</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-500" /> <span className="font-bold tabular-nums">{applicants.length}</span> applicant{applicants.length !== 1 ? "s" : ""}</span>
              {shortlisted > 0 && <span className="flex items-center gap-1 text-purple-700"><Star className="w-3.5 h-3.5" /> {shortlisted} in pipeline</span>}
              <span className="ml-auto text-blue-600 font-medium group-hover:underline">Manage →</span>
            </>
          )}
        </div>
      </div>
      <JobPoster isVerified={true} editJob={job} controlledOpen={editOpen} onOpenChange={setEditOpen}
        trigger={<span style={{ display: "none" }} />} />
    </>
  );
}

// ── Agent aggregate pipeline funnel — sums applicant counts across all jobs ──
function AgentPipelineFunnel({ allJobs, setActiveView }: { allJobs: any[]; setActiveView: (v: string) => void }) {
  // Fetch applicants for each of the agent's jobs in parallel.
  const queries = useQuery({
    queryKey: ["agent-aggregate-applicants", allJobs.map((j) => j.id).join(",")],
    queryFn: async () => {
      if (allJobs.length === 0) return [];
      const results = await Promise.all(
        allJobs.map((j) => fetch(`/api/v1/jobs/${j.id}/applicants`).then((r) => r.ok ? r.json() : { data: [] }))
      );
      return results.flatMap((r: any) => r.data ?? []);
    },
    enabled: allJobs.length > 0,
  });
  const all: any[] = queries.data ?? [];

  const funnel = [
    { key: "submitted",           label: "New",         color: "bg-blue-50 text-blue-700",       dot: "bg-blue-500" },
    { key: "reviewed",            label: "Reviewed",    color: "bg-amber-50 text-amber-700",     dot: "bg-amber-500" },
    { key: "shortlisted",         label: "Shortlisted", color: "bg-purple-50 text-purple-700",   dot: "bg-purple-500" },
    { key: "interview_scheduled", label: "Interview",   color: "bg-cyan-50 text-cyan-700",       dot: "bg-cyan-500" },
    { key: "selected",            label: "Selected",    color: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
    { key: "placed",              label: "Placed",      color: "bg-green-50 text-green-700",     dot: "bg-green-500" },
  ];
  const counts: Record<string, number> = {};
  for (const f of funnel) counts[f.key] = 0;
  for (const a of all) counts[a.status] = (counts[a.status] || 0) + 1;
  const total = all.length;
  const rejected = all.filter((a) => a.status === "rejected").length;
  const withdrawn = all.filter((a) => a.status === "withdrawn").length;

  if (allJobs.length === 0) return null;

  return (
    <motion.div variants={fadeUp} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-600" /> Applicant Pipeline
          {/* v0.4.24: label now includes withdrawn so the math
              reconciles. Active stages (submitted→placed) + rejected
              + withdrawn = total. The empty tail of the bar above is
              precisely rejected + withdrawn. */}
          <Badge variant="outline" className="ml-1 text-[10px]">
            {total} total
            {rejected > 0 && ` · ${rejected} rejected`}
            {withdrawn > 0 && ` · ${withdrawn} withdrawn`}
          </Badge>
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setActiveView("jobs")} className="text-xs text-blue-600 font-semibold">
          Manage Jobs <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>

      {/* Stacked bar visualisation */}
      {total > 0 && (
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
          {funnel.map((f) => (
            counts[f.key] > 0 && (
              <div key={f.key} className={f.dot}
                style={{ width: `${(counts[f.key] / total) * 100}%` }}
                title={`${f.label}: ${counts[f.key]}`} />
            )
          ))}
        </div>
      )}

      {/* Per-stage pills — each links into the aggregate applicants page with
          that stage pre-filtered. Previously dead divs; no new UI elements
          added, just added interactivity to existing affordances. */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {funnel.map((f) => (
          <Link key={f.key} href={`/agent/applicants?status=${encodeURIComponent(f.key)}`}
            className={`${f.color} rounded-lg px-3 py-2 hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 transition block`}
            title={`View ${f.label} applicants across all your jobs`}>
            <div className="text-[10px] font-medium opacity-90">{f.label}</div>
            <div className="text-xl font-bold tabular-nums">{counts[f.key] || 0}</div>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}

// ── Agent Job Edit dialog (reuses JobPoster in edit mode via props, OR direct form) ──
// Left as a follow-up; wiring the Edit icon in AgentJobCard header is deferred until
// JobPoster component is extended to accept an `initial` prop.

// ── Agent Reports / BI ───────────────────────────────────────────────
// v0.4.26: comprehensive rewrite into 5 tiered sections.
//   1. KPI tiles (top of fold)
//   2. Pipeline health: drop-off + stale + period comparison
//   3. Operations: welfare SLA + compliance + grievances
//   4. Strategic: top employers + skill demand-supply + time-in-stage
//   5. HPSEDC compliance: PBBY + PDO + ECR
// Each section is self-contained, server provides all aggregates so
// the client doesn't recompute anything from raw data.
function AgentReports() {
  const { data: res, isLoading } = useQuery({
    queryKey: ["/api/v1/agent/reports"],
    queryFn: () => fetchJson("/api/v1/agent/reports"),
  });
  if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600 inline" /></div>;
  const empty = {
    jobs: { total: 0, active: 0 },
    applicants: { total: 0, funnel: {}, conversionPct: 0, dropoff: [], stale: { warning: 0, critical: 0 } },
    placements: { total: 0, accepted: 0, avgTimeToPlaceDays: 0, topCountries: [] },
    welfareSla: { due30: 0, due60: 0, due90: 0, overdue: 0 },
    compliance: { passportExpiringSoon: 0, passportExpired: 0, pccPending: 0, medicalPending: 0, ecrPending: 0 },
    hpsedc: { pbbyEnrolled: 0, pbbyPending: 0, pdoCompleted: 0, pdoPending: 0, ecr: 0, ecnr: 0 },
    grievances: { open: 0, avgResolutionDays: 0 },
    topEmployers: [],
    skillGap: [],
    avgTimeInStage: [],
    periodCompare: { thisMonth: 0, lastMonth: 0 },
    trend: [],
  };
  const d = (res?.data ?? empty) as typeof empty;
  const maxTrend = Math.max(1, ...d.trend.map((t: any) => t.count));
  const momDelta = d.periodCompare.lastMonth === 0
    ? null
    : Math.round(((d.periodCompare.thisMonth - d.periodCompare.lastMonth) / d.periodCompare.lastMonth) * 100);

  return (
    <div className="space-y-6">
      {/* ═══ 1. KPI tiles ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ReportCard label="Jobs (active)" value={`${d.jobs.active} / ${d.jobs.total}`} subtitle="Active of total posted" />
        <ReportCard label="Applicants" value={d.applicants.total} subtitle="Across all your jobs" />
        <ReportCard label="Placements (accepted)" value={d.placements.accepted} subtitle={d.placements.total > d.placements.accepted ? `${d.placements.total} offered · ${d.placements.accepted} accepted` : "Candidates who accepted"} />
        <ReportCard label="Conversion rate" value={`${d.applicants.conversionPct}%`} subtitle="Applied → Accepted placement" />
      </div>

      {/* ═══ 2. Pipeline health ════════════════════════════════════════ */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pipeline health</h2>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Stage drop-off — where candidates fall out
          </h3>
          {d.applicants.dropoff.length === 0 ? (
            <p className="text-xs text-slate-400">Not enough data yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {d.applicants.dropoff.map((s: any) => {
                const pct = s.conversionPct;
                const color = pct >= 70 ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : pct >= 40 ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-red-50 border-red-200 text-red-800";
                return (
                  <div key={`${s.from}-${s.to}`} className={`rounded-lg border p-3 ${color}`}>
                    <div className="text-[10px] uppercase font-bold opacity-75 capitalize truncate">
                      {s.from.replace(/_/g, " ")} → {s.to.replace(/_/g, " ")}
                    </div>
                    <div className="text-2xl font-bold tabular-nums mt-1">{pct}%</div>
                    <div className="text-[11px] mt-0.5 opacity-75">{s.fromCount} → {s.toCount}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Stale applicants
            </p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-1">
              {d.applicants.stale.warning + d.applicants.stale.critical}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              <span className="text-amber-700 font-semibold">{d.applicants.stale.warning}</span> ≥7d ·{" "}
              <span className="text-red-700 font-semibold">{d.applicants.stale.critical}</span> ≥14d
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Time to placement
            </p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-1">{d.placements.avgTimeToPlaceDays}<span className="text-base font-medium text-slate-500"> days</span></p>
            <p className="text-[11px] text-slate-400 mt-1">From first application to start date</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1">
              <Activity className="w-3 h-3" /> This month vs last
            </p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums mt-1">
              {d.periodCompare.thisMonth}
              {momDelta !== null && (
                <span className={`text-xs font-bold ml-2 ${momDelta >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {momDelta >= 0 ? "▲" : "▼"} {Math.abs(momDelta)}%
                </span>
              )}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{d.periodCompare.lastMonth} apps last month</p>
          </div>
        </div>
      </section>

      {/* ═══ 3. Operations — welfare / compliance / grievances ════════ */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Operations &amp; SLA</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Welfare SLA */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-600" /> Welfare check-ins
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Post-placement check-ins due or overdue (30/60/90 day milestones).</p>
            <div className="space-y-1.5">
              <Row label="30-day due" value={d.welfareSla.due30} tone={d.welfareSla.due30 > 0 ? "warn" : "ok"} />
              <Row label="60-day due" value={d.welfareSla.due60} tone={d.welfareSla.due60 > 0 ? "warn" : "ok"} />
              <Row label="90-day due" value={d.welfareSla.due90} tone={d.welfareSla.due90 > 0 ? "warn" : "ok"} />
              <Row label="Overdue (≥5d late)" value={d.welfareSla.overdue} tone={d.welfareSla.overdue > 0 ? "alert" : "ok"} />
            </div>
          </div>

          {/* Compliance alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" /> Compliance alerts
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Document expiry &amp; missing clearance on placed candidates.</p>
            <div className="space-y-1.5">
              <Row label="Passport expired" value={d.compliance.passportExpired} tone={d.compliance.passportExpired > 0 ? "alert" : "ok"} />
              <Row label="Passport expiring ≤60d" value={d.compliance.passportExpiringSoon} tone={d.compliance.passportExpiringSoon > 0 ? "warn" : "ok"} />
              <Row label="PCC pending / unset" value={d.compliance.pccPending} tone={d.compliance.pccPending > 0 ? "warn" : "ok"} />
              <Row label="Medical pending" value={d.compliance.medicalPending} tone={d.compliance.medicalPending > 0 ? "warn" : "ok"} />
              <Row label="ECR status unknown" value={d.compliance.ecrPending} tone={d.compliance.ecrPending > 0 ? "warn" : "ok"} />
            </div>
          </div>

          {/* Grievances */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600" /> Grievances
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Open complaints from candidates on your jobs.</p>
            <div className="space-y-1.5">
              <Row label="Open / unresolved" value={d.grievances.open} tone={d.grievances.open > 0 ? "alert" : "ok"} />
              <Row label="Avg resolution time" value={`${d.grievances.avgResolutionDays}d`} tone="muted" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. Strategic — employers / skills / time-in-stage ════════ */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Strategic insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Top employers */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-600" /> Top employers
            </h3>
            {d.topEmployers.length === 0 ? <p className="text-xs text-slate-400">No employer data yet.</p> : (
              <div className="space-y-1.5">
                {d.topEmployers.map((e: any) => (
                  <div key={e.company} className="flex items-center justify-between text-xs">
                    <span className="text-slate-800 font-medium truncate flex-1">{e.company}</span>
                    <span className="text-slate-500 mx-3">{e.jobs} jobs · {e.applications} apps</span>
                    <span className="font-bold text-emerald-700 tabular-nums w-8 text-right">{e.placements}</span>
                  </div>
                ))}
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">Sorted by placements. Last column = accepted placements.</p>
              </div>
            )}
          </div>

          {/* Skill demand vs supply */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-600" /> Skill gap — demand vs supply
            </h3>
            {d.skillGap.length === 0 ? <p className="text-xs text-slate-400">No skill data yet.</p> : (
              <div className="space-y-1.5">
                {d.skillGap.map((s: any) => {
                  const max = Math.max(s.demand, s.supply, 1);
                  return (
                    <div key={s.skill} className="text-xs">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-800 font-medium capitalize">{s.skill}</span>
                        <span className="text-slate-500">D {s.demand} · S {s.supply}</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                        <div className="bg-indigo-400" style={{ width: `${(s.demand / max) * 50}%` }} />
                        <div className="bg-emerald-400 ml-px" style={{ width: `${(s.supply / max) * 50}%` }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                  <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full mr-1" /> Demand (jobs that list this skill) ·{" "}
                  <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full mr-1 ml-2" /> Supply (candidates with this skill)
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mt-3">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600" /> Time in stage — pipeline drag
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {d.avgTimeInStage.map((s: any) => (
              <div key={s.stage} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-500 capitalize truncate">{s.stage.replace(/_/g, " ")}</p>
                <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">{s.avgDays}<span className="text-xs font-medium text-slate-500"> d</span></p>
                <p className="text-[10px] text-slate-400 mt-0.5">{s.count} in stage</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 5. HPSEDC compliance — PBBY, PDO, ECR ═══════════════════ */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">HPSEDC compliance (Emigration Act §1983)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-indigo-600" /> PBBY Insurance
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Pravasi Bharatiya Bima Yojana — mandatory before departure.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded p-2">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Enrolled</p>
                <p className="text-2xl font-bold text-emerald-900 tabular-nums">{d.hpsedc.pbbyEnrolled}</p>
              </div>
              <div className="bg-amber-50 rounded p-2">
                <p className="text-[10px] uppercase font-bold text-amber-700">Pending</p>
                <p className="text-2xl font-bold text-amber-900 tabular-nums">{d.hpsedc.pbbyPending}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl border border-purple-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" /> Pre-Departure Orientation
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">PDO completion is mandatory for ECR-eligible candidates.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50 rounded p-2">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Completed</p>
                <p className="text-2xl font-bold text-emerald-900 tabular-nums">{d.hpsedc.pdoCompleted}</p>
              </div>
              <div className="bg-amber-50 rounded p-2">
                <p className="text-[10px] uppercase font-bold text-amber-700">Pending</p>
                <p className="text-2xl font-bold text-amber-900 tabular-nums">{d.hpsedc.pdoPending}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl border border-amber-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-amber-600" /> ECR / Non-ECR mix
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">Emigration Check Required vs Not Required.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-amber-100 rounded p-2">
                <p className="text-[10px] uppercase font-bold text-amber-800">ECR</p>
                <p className="text-2xl font-bold text-amber-900 tabular-nums">{d.hpsedc.ecr}</p>
              </div>
              <div className="bg-blue-50 rounded p-2">
                <p className="text-[10px] uppercase font-bold text-blue-700">ECNR</p>
                <p className="text-2xl font-bold text-blue-900 tabular-nums">{d.hpsedc.ecnr}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Trend chart at bottom ═════════════════════════════════════ */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-600" /> Top destination countries
          </h3>
          {d.placements.topCountries.length === 0 ? (
            <p className="text-xs text-slate-400">No placements recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {d.placements.topCountries.map((c: any) => (
                <div key={c.country} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{c.country}</span>
                  <span className="font-bold text-slate-900">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" /> Applications over time (last 6 months)
          </h3>
          {d.trend.length === 0 ? (
            <p className="text-xs text-slate-400">Not enough data yet.</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {d.trend.map((t: any) => (
                <div key={t.month} className="flex-1 flex flex-col items-center">
                  <div className="text-[10px] text-slate-500 mb-1 tabular-nums">{t.count}</div>
                  <div className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t"
                       style={{ height: `${(t.count / maxTrend) * 100}%`, minHeight: "4px" }}
                       title={`${t.month}: ${t.count}`} />
                  <span className="text-[10px] text-slate-400 mt-1">{t.month.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tiny utility row used by SLA / compliance / grievance panels.
function Row({ label, value, tone }: { label: string; value: any; tone: "ok" | "warn" | "alert" | "muted" }) {
  const cls = tone === "alert" ? "text-red-700 font-bold"
            : tone === "warn"  ? "text-amber-700 font-bold"
            : tone === "muted" ? "text-slate-500"
            : "text-emerald-700 font-semibold";
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className={`tabular-nums ${cls}`}>{value}</span>
    </div>
  );
}

function ReportCard({ label, value, subtitle }: { label: string; value: any; subtitle?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">{value}</p>
      {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}
