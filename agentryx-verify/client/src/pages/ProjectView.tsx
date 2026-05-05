import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { Download, FileText, MessageSquare, AlertCircle, Filter, LogIn, ChevronRight, Lightbulb, MousePointerClick, CircleDot, X, Paperclip } from "lucide-react";
import { Link } from "wouter";
import { Header } from "../components/Header";
import { api } from "../lib/api";
import { useRequireAuth } from "../lib/useRequireAuth";
import { FeedbackCard } from "../components/FeedbackCard";
import { FeedbackDialog } from "../components/FeedbackDialog";
import { SprintSection } from "../components/SprintSection";

type LevelKey = "agentryx" | "htis" | "hpsedc_staging" | "hpsedc_final";
type RoleKey = "candidate" | "agent" | "employer" | "officer" | "cross";

// Sequence of approval gates — left-to-right. Each must pass before the next
// pipeline meaningfully begins (though the portal doesn't enforce ordering;
// it's a process convention).
const LEVELS: { key: LevelKey; label: string; short: string }[] = [
  { key: "agentryx",        label: "Agentryx Internal",      short: "AGX" },
  { key: "htis",            label: "HTIS Review",            short: "HTIS" },
  { key: "hpsedc_staging",  label: "HPSEDC Staging",         short: "STG" },
  { key: "hpsedc_final",    label: "HPSEDC Final UAT",       short: "Final" },
];

const ROLES: { key: RoleKey; label: string; sections: number[]; accent: string }[] = [
  { key: "candidate", label: "Candidate",   sections: [1],                                    accent: "from-blue-500 to-blue-600" },
  { key: "agent",     label: "Agency",      sections: [2],                                    accent: "from-emerald-500 to-emerald-600" },
  { key: "employer",  label: "Employer",    sections: [3],                                    accent: "from-purple-500 to-purple-600" },
  { key: "officer",   label: "Officer",     sections: [4],                                    accent: "from-rose-500 to-rose-600" },
  { key: "cross",     label: "Cross-cutting (Sec 5–17)", sections: [5,6,7,8,9,10,11,12,13,14,15,16,17], accent: "from-slate-500 to-slate-700" },
  // Section 18 is a synthetic bucket for HTIS-reported field defects appended
  // post-v1.4.2. Kept as its own role so the "Field Defects" label is visible
  // on the overview strip — not buried inside Cross-cutting.
  { key: "htis" as any, label: "HTIS Findings (Sec 18)", sections: [18], accent: "from-purple-500 to-purple-700" },
];

type Decision = "accepted" | "rejected" | "waived";
interface Stat { total: number; reviewable: number; pass: number; partial: number; fail: number; pending: number; deferred: number; pct: number; }

// Returns true when this requirement's signoff needs a re-verify flag — i.e.
// the signoff is a rejection/waive that predates a deployed sprint which lists
// this item's ref as fixed. Reviewers see a 🔁 chip on the cell and can flip
// the decision without admin help.
function needsReverify(req: any, signoff: any | undefined, deployedSprints: any[] | undefined) {
  if (!signoff || !deployedSprints?.length) return false;
  if (!["rejected", "waived"].includes(signoff.decision)) return false;
  const signedAt = new Date(signoff.signedAt).getTime();
  return deployedSprints.some((sp) =>
    sp.deployedAt &&
    (sp.fixedItemRefs ?? []).includes(req.itemRef) &&
    new Date(sp.deployedAt).getTime() > signedAt
  );
}

function statFor(reqs: any[], signoffs: any[], level: LevelKey): Stat {
  const active = reqs.filter(r => r.status !== "deferred" && r.status !== "n_a");
  const deferred = reqs.filter(r => r.status === "deferred" || r.status === "n_a").length;
  let pass = 0, partial = 0, fail = 0;
  for (const r of active) {
    const so = signoffs.find(s => s.requirementId === r.id && s.level === level);
    if (so?.decision === "accepted") pass++;
    else if (so?.decision === "waived") partial++;
    else if (so?.decision === "rejected") fail++;
  }
  const reviewable = active.length;
  const total = reqs.length; // includes deferred + n_a — the full inventory
  const pending = reviewable - pass - partial - fail;
  // Percent stays measured against reviewable items — deferred can't be passed so they
  // shouldn't drag the percentage down.
  const pct = reviewable === 0 ? 0 : Math.round(((pass + partial * 0.5) / reviewable) * 100);
  return { total, reviewable, pass, partial, fail, pending, deferred, pct };
}

export function ProjectView() {
  const { slug } = useParams<{ slug: string }>();
  const { reviewer: me, loading: authLoading } = useRequireAuth();
  const [data, setData] = useState<any>(null);
  const [level, setLevel] = useState<LevelKey>("agentryx");
  const [activeRole, setActiveRole] = useState<RoleKey | null>(null);

  // Which pipeline levels can the current reviewer actually sign off on?
  const allowedLevels: LevelKey[] = useMemo(() => {
    if (!me) return [];
    if (me.role === "admin" || me.role === "delivery") return ["agentryx", "htis", "hpsedc_staging", "hpsedc_final"];
    if (me.role === "agentryx" || me.role === "htis" || me.role === "hpsedc_staging" || me.role === "hpsedc_final") return [me.role];
    return [];
  }, [me]);

  // Default the tab to the reviewer's own level when they log in
  useEffect(() => {
    if (me && allowedLevels.length === 1) setLevel(allowedLevels[0]);
  }, [me, allowedLevels]);

  useEffect(() => { if (me) reload(); }, [slug, me]);
  function reload() { api.getProject(slug).then(setData); }

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (authLoading || !data) return <div><Header /><div className="p-10 text-slate-400">Loading…</div></div>;

  return (
    <div>
      <Header />
      <div className="max-w-[1500px] mx-auto px-6 py-8">
        {/* Project header */}
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{data.project.name}</h1>
            <div className="text-sm text-slate-500 mt-1">
              {data.project.contractor} → {data.project.client} · build {data.project.buildRef}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFeedbackOpen(true)}
              className="inline-flex items-center gap-1.5 text-sm bg-amber-500 text-white rounded px-3 py-2 hover:bg-amber-600 shadow"
              title="Submit an enhancement idea or suggestion">
              💡 Suggest an idea
            </button>
            <a href={`/api/export/projects/${slug}/csv`} className="inline-flex items-center gap-2 text-sm bg-white border border-slate-200 rounded px-3 py-2 hover:border-agentryx-500"><Download className="w-4 h-4" />CSV</a>
            <a href={`/api/export/projects/${slug}/pdf`} className="inline-flex items-center gap-2 text-sm bg-white border border-slate-200 rounded px-3 py-2 hover:border-agentryx-500"><FileText className="w-4 h-4" />PDF</a>
          </div>
        </div>
        <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} projectId={data.project.id} />

        {/* Pipeline tabs + reviewer role badge.
            Only admin and delivery see all four pipelines. Other reviewers
            see exclusively their own tab (keeps each stage's sign-off
            confidential from the others). */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
            {LEVELS
              .filter((l) => {
                const isAdminLike = me.role === "admin" || me.role === "delivery";
                return isAdminLike || allowedLevels.includes(l.key);
              })
              .map((l) => {
                const canEdit = allowedLevels.includes(l.key);
                return (
                  <button key={l.key} onClick={() => { setLevel(l.key); setActiveRole(null); }}
                    className={`px-5 py-2 text-sm font-medium rounded transition flex items-center gap-2 ${
                      level === l.key
                        ? "bg-agentryx-600 text-white shadow"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}>
                    {l.label}
                    {me && !canEdit && <span title="Read-only for your role" className="text-[10px] opacity-70">🔒</span>}
                  </button>
                );
              })}
          </div>
          {me && <ReviewerBadge me={me} />}
        </div>

        {/* Subtle onboarding tip — role-aware, dismissible */}
        <ReviewerTip me={me} allowedLevels={allowedLevels} activeRole={activeRole} />

        {/* Persistent context strip — always visible so the user never loses place */}
        <ContextStrip
          data={data} level={level} activeRole={activeRole}
          onPickRole={setActiveRole}
        />

        {/* Sign-in banner when un-authed on a role (so disabled circles aren't a mystery) */}
        {activeRole && !me && <SignInBanner />}

        {activeRole ? (
          <RoleDetail
            key={`${activeRole}-${level}`}
            slug={slug} data={data} me={me} level={level}
            canEditLevel={allowedLevels.includes(level)}
            role={ROLES.find(r => r.key === activeRole)!}
            onChanged={reload}
          />
        ) : (
          <PipelineOverview
            data={data} level={level} onOpenRole={setActiveRole}
          />
        )}

        <IssuesPanel slug={slug} canEdit={!!me} me={me} />
      </div>
    </div>
  );
}

function ReviewerTip({ me, allowedLevels, activeRole }: {
  me: any; allowedLevels: LevelKey[]; activeRole: RoleKey | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const isAdmin = me?.role === "admin" || me?.role === "delivery";
  const levelLabel = allowedLevels.length === 1
    ? LEVELS.find(l => l.key === allowedLevels[0])!.label
    : "all pipelines";

  if (activeRole) {
    return (
      <div className="mt-4 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-300 px-5 py-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-sm">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-bold text-indigo-900">Signing off requirements</h3>
          </div>
          <button onClick={() => setDismissed(true)} className="text-indigo-300 hover:text-indigo-500 transition"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2.5 bg-white/60 rounded-lg px-3 py-2.5">
            <CircleDot className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-indigo-900">Click the signoff circle</div>
              <div className="text-indigo-600 mt-0.5">Mark each requirement as <span className="text-emerald-600 font-bold">Pass</span>, <span className="text-amber-600 font-bold">Partial</span>, or <span className="text-red-600 font-bold">Fail</span></div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/60 rounded-lg px-3 py-2.5">
            <MessageSquare className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-indigo-900">Add comments</div>
              <div className="text-indigo-600 mt-0.5">Click the chat icon to discuss a requirement or flag an issue</div>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/60 rounded-lg px-3 py-2.5">
            <Filter className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-indigo-900">Filter & navigate</div>
              <div className="text-indigo-600 mt-0.5">Use the search bar and section tabs to find specific requirements</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-amber-900">
            {isAdmin ? "You can review all pipelines" : `You're reviewing at ${levelLabel}`}
          </h3>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-300 hover:text-amber-500 transition"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-start gap-2.5 bg-white/60 rounded-lg px-3 py-2.5">
          <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shadow">1</span>
          <div>
            <div className="font-semibold text-amber-900">Pick a role card below</div>
            <div className="text-amber-700 mt-0.5">Start with Candidate, then Agency, Employer, and so on</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5 bg-white/60 rounded-lg px-3 py-2.5">
          <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shadow">2</span>
          <div>
            <div className="font-semibold text-amber-900">Review each requirement</div>
            <div className="text-amber-700 mt-0.5">Read the description, check the test steps, then sign off</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5 bg-white/60 rounded-lg px-3 py-2.5">
          <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shadow">3</span>
          <div>
            <div className="font-semibold text-amber-900">Mark Pass / Partial / Fail</div>
            <div className="text-amber-700 mt-0.5">Click the signoff circle next to each requirement to record your decision</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineOverview({ data, level, onOpenRole }: {
  data: any; level: LevelKey; onOpenRole: (r: RoleKey) => void;
}) {
  return (
    <>
      {/* Role cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ROLES.filter(r => r.key !== "cross").map((role) => {
          const reqs = data.requirements.filter((r: any) => role.sections.includes(r.section));
          const s = statFor(reqs, data.signoffs, level);
          return <RoleCard key={role.key} role={role} stat={s} onClick={() => onOpenRole(role.key)} />;
        })}
      </div>

      {/* Cross-cutting card (wider, full-width) */}
      <div className="mt-4">
        {(() => {
          const role = ROLES.find(r => r.key === "cross")!;
          const reqs = data.requirements.filter((r: any) => role.sections.includes(r.section));
          const s = statFor(reqs, data.signoffs, level);
          return <RoleCard role={role} stat={s} onClick={() => onOpenRole("cross")} wide />;
        })()}
      </div>
      {/* Ideas & Feedback — sibling of the sign-off cards. Distinct gradient
          (amber→orange) and "Future work" label signal that this is forward-
          looking, not signoff-tracking. */}
      <FeedbackCard projectId={data.project.id} projectSlug={data.project.slug} />
      {/* Sprint Releases — delivery-cycle tracking for post-feedback rework. */}
      <SprintSectionWrapper data={data} onChange={() => api.getProject(data.project.slug).then(() => {/* parent reload via reload() below */})} />
    </>
  );
}

// Thin wrapper so the section gets the reviewer's role from the outer scope.
function SprintSectionWrapper({ data, onChange }: { data: any; onChange?: () => void }) {
  const { reviewer: me } = useRequireAuth();
  const canManage = !!me && ["admin", "delivery", "agentryx"].includes(me.role);
  return (
    <SprintSection
      projectSlug={data.project.slug}
      canManage={canManage}
      currentBuildRef={data.project.buildRef}
      onSprintChange={onChange}
    />
  );
}

function GradientMeter({ pct }: { pct: number }) {
  // Fill spans amber (at 0%) → lime (50%) → emerald (100%).
  return (
    <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 30%, #84cc16 60%, #10b981 100%)",
          backgroundSize: `${Math.max(100, 10000 / Math.max(pct, 1))}% 100%`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-700 mix-blend-luminosity">
        {pct}%
      </div>
    </div>
  );
}

function RoleCard({ role, stat, onClick, wide }: {
  role: (typeof ROLES)[number]; stat: Stat; onClick: () => void; wide?: boolean;
}) {
  // Headline metric reviewers asked for: at a glance, how many passed out of
  // total (+ what percent). Raw percent alone hides the denominator — 50% of
  // 24 is very different from 50% of 2.
  const signedOff = stat.pass + stat.partial + stat.fail;
  return (
    <button onClick={onClick}
      className={`group text-left bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-agentryx-500 hover:shadow-md transition ${wide ? "w-full" : ""}`}>
      <div className={`h-1.5 bg-gradient-to-r ${role.accent}`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-slate-500">Role</div>
            <div className="text-lg font-semibold text-slate-900 mt-0.5">{role.label}</div>
            <div className="text-xs text-slate-400 mt-1">Sections {role.sections.join(", ")}</div>

            {/* Headline ratio — the primary number a reviewer scans for.
                Denominator is the reviewable count (active items a reviewer can actually
                sign off); deferred items are surfaced separately below so total inventory
                stays visible without distorting the pass-rate denominator. */}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 tabular-nums">{stat.pass}</span>
              <span className="text-lg font-medium text-slate-400 tabular-nums">/ {stat.reviewable}</span>
              <span className="text-xs text-slate-500 ml-1">passed</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {signedOff} of {stat.reviewable} signed off · {stat.pending} pending
              {stat.deferred > 0 && (
                <span className="text-slate-400"> · <span className="text-slate-600 font-medium">{stat.deferred}</span> deferred</span>
              )}
            </div>
          </div>
          {/* Donut + total count directly under it — so the denominator is
              visible anywhere your eye lands on the card, not just next to the
              headline number. */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <Donut pct={stat.pct} />
            <div className="text-[10px] text-slate-500 font-medium tabular-nums">
              <span className="text-slate-900 font-semibold">{stat.pass}</span>
              <span className="text-slate-400"> / {stat.reviewable}</span>
            </div>
          </div>
        </div>

        <div className={`grid ${stat.deferred > 0 ? "grid-cols-5" : "grid-cols-4"} gap-2 mt-5`}>
          <StatPill label="Pass"    count={stat.pass}    color="text-emerald-700 bg-emerald-50" />
          <StatPill label="Partial" count={stat.partial} color="text-amber-700 bg-amber-50" />
          <StatPill label="Fail"    count={stat.fail}    color="text-red-700 bg-red-50" />
          <StatPill label="Pending" count={stat.pending} color="text-slate-600 bg-slate-100" />
          {stat.deferred > 0 && (
            <StatPill label="Deferred" count={stat.deferred} color="text-slate-500 bg-slate-50" />
          )}
        </div>

        <div className="mt-4 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
          <MousePointerClick className="w-3.5 h-3.5 text-slate-400 group-hover:text-agentryx-500 transition" />
          <span className="font-medium text-slate-700">{stat.total} total</span>
          {stat.deferred > 0 && (
            <span className="text-[10px] text-slate-400">
              ({stat.reviewable} reviewable + {stat.deferred} deferred)
            </span>
          )}
          <span className="text-slate-300">·</span>
          <span className="text-agentryx-600 font-medium group-hover:underline">click to review →</span>
        </div>
      </div>
    </button>
  );
}

function StatPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`${color} rounded-lg px-2 py-2 text-center`}>
      <div className="text-[10px] uppercase tracking-wide opacity-75">{label}</div>
      <div className="text-xl font-semibold">{count}</div>
    </div>
  );
}

function Donut({ pct }: { pct: number }) {
  const size = 56, stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const color = pct >= 80 ? "#10b981" : pct >= 50 ? "#84cc16" : pct >= 25 ? "#fbbf24" : "#f59e0b";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle"
        className="fill-slate-800" fontSize="13" fontWeight="600">{pct}%</text>
    </svg>
  );
}

function RoleDetail({ slug, data, me, level, canEditLevel, role, onChanged }: {
  slug: string; data: any; me: any; level: LevelKey; canEditLevel: boolean;
  role: (typeof ROLES)[number]; onChanged: () => void;
}) {
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openReq, setOpenReq] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<number>(role.sections[0]);

  const reqsInRole = data.requirements.filter((r: any) => role.sections.includes(r.section));
  const reqsInSection = reqsInRole.filter((r: any) => r.section === activeSection);
  const stat = statFor(reqsInRole, data.signoffs, level);

  const filtered = reqsInSection.filter((r: any) => {
    const matchesText = !filter || r.itemRef.includes(filter) || r.description.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesText && matchesStatus;
  }).sort((a: any, b: any) => {
    const aDeferred = a.status === "deferred" || a.status === "n_a" ? 1 : 0;
    const bDeferred = b.status === "deferred" || b.status === "n_a" ? 1 : 0;
    return aDeferred - bDeferred;
  });

  const activeCount = filtered.filter((r: any) => r.status !== "deferred" && r.status !== "n_a").length;
  const deferredCount = filtered.filter((r: any) => r.status === "deferred").length;

  const sectionLabel = (n: number) => {
    const first = reqsInRole.find((r: any) => r.section === n);
    return first ? `§${n} — ${first.sectionTitle}` : `§${n}`;
  };

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
      <div className="min-w-0">
      {/* Section tabs — avoids one long scrolling list */}
      {role.sections.length > 1 && (
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200 max-w-full">
          {role.sections.map((n) => {
            const reqs = reqsInRole.filter((r: any) => r.section === n);
            const s = statFor(reqs, data.signoffs, level);
            const isActive = activeSection === n;
            return (
              <button key={n} onClick={() => setActiveSection(n)}
                className={`px-3 py-2 text-xs whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? "border-agentryx-600 text-agentryx-700 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}>
                {sectionLabel(n)} <span className="ml-1 text-[10px] text-slate-400">({s.pass}/{s.reviewable}{s.deferred > 0 ? ` +${s.deferred}⛔` : ""})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex gap-2 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <input placeholder="Filter by ID or text…" value={filter} onChange={(e) => setFilter(e.target.value)}
          className="flex-1 border border-slate-200 rounded px-3 py-1.5 text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded px-3 py-1.5 text-sm bg-white">
          <option value="all">All statuses</option>
          <option value="delivered">✅ Delivered</option>
          <option value="partial">🟡 Partial</option>
          <option value="not_delivered">❌ Missing</option>
          <option value="deferred">⛔ Deferred</option>
        </select>
      </div>

      <div className="mt-4 bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left w-16">ID</th>
              <th className="px-3 py-2 text-left">Requirement</th>
              <th className="px-3 py-2 w-16 text-center">Status</th>
              <th className="px-3 py-2 w-40 text-center">{LEVELS.find(l => l.key === level)!.label}</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No requirements match.</td></tr>
            )}
            {filtered.map((r: any, idx: number) => {
              const isDeferred = r.status === "deferred" || r.status === "n_a";
              const so = data.signoffs.find((s: any) => s.requirementId === r.id && s.level === level);
              const isAdminLike = me?.role === "admin" || me?.role === "delivery";
              const otherLevels = isAdminLike
                ? LEVELS.filter(l => l.key !== level).map(l => ({
                    l, so: data.signoffs.find((s: any) => s.requirementId === r.id && s.level === l.key),
                  }))
                : [];
              const showDeferredDivider = isDeferred && idx > 0 && filtered[idx - 1]?.status !== "deferred" && filtered[idx - 1]?.status !== "n_a";
              return (
                <>
                  {showDeferredDivider && (
                    <tr key={`divider-${r.id}`}>
                      <td colSpan={5} className="bg-slate-100 px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-slate-300" />
                          <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Future phase — {deferredCount} items pending external integration</span>
                          <div className="h-px flex-1 bg-slate-300" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr key={r.id} className={[
                    isDeferred
                      ? "border-t border-slate-100 bg-slate-50/70 opacity-50"
                      : "border-t border-slate-100 hover:bg-slate-50",
                    // Colour-coded left border keyed on row origin / external
                    // tracker refs. Precedence: htis_new > htis_smoke > FRS-
                    // with-external-refs (amber). isDeferred suppresses all
                    // colours so the deferred rendering stays consistent.
                    !isDeferred && r.source === "htis_new"   ? "border-l-4 border-l-purple-500 bg-purple-50/30" : "",
                    !isDeferred && r.source === "htis_smoke" ? "border-l-4 border-l-sky-500" : "",
                    !isDeferred && r.source === "frs" && Array.isArray(r.externalRefs) && r.externalRefs.length > 0
                      ? "border-l-4 border-l-amber-500 bg-amber-50/30" : "",
                  ].filter(Boolean).join(" ")}>
                    <td className={`px-3 py-2 font-mono text-xs ${isDeferred ? "text-slate-300" : "text-slate-500"}`}>
                      {r.itemRef}
                      {!isDeferred && Array.isArray(r.externalRefs) && r.externalRefs.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-0.5">
                          {r.externalRefs.map((ref: string) => (
                            <span key={ref}
                              className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold border ${
                                r.source === "htis_new"
                                  ? "bg-purple-100 text-purple-800 border-purple-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              }`}
                              title="HTIS bug reference">
                              {ref}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`px-3 py-2 ${isDeferred ? "text-slate-400" : ""}`}>
                      <span className={isDeferred ? "line-through decoration-slate-300" : ""}>{r.description}</span>
                      {isDeferred && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
                            Planned for future phase
                          </span>
                        </div>
                      )}
                      {!isDeferred && r.evidence && <div className="text-xs text-slate-400 mt-1">{r.evidence}</div>}
                      {!isDeferred && otherLevels.length > 0 && (
                        <div className="flex gap-2 mt-1">
                          {otherLevels.map(({ l, so }) => (
                            <span key={l.key} className="text-[10px] text-slate-400">
                              {l.short}: <DecisionDot d={so?.decision} />
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-lg">{isDeferred ? <span className="text-slate-300">⛔</span> : (STATUS_GLYPH[r.status] ?? "—")}</td>
                    {isDeferred ? (
                      <td className="px-3 py-2 text-center text-[10px] text-slate-400 italic">N/A</td>
                    ) : (
                      <SignoffCell slug={slug} reqId={r.id} level={level} current={so}
                        canEdit={!!me && canEditLevel}
                        reverify={needsReverify(r, so, data.deployedSprints)}
                        onChanged={onChanged} />
                    )}
                    <td className="text-center">
                      {!isDeferred && (
                        <button onClick={() => setOpenReq(openReq === r.id ? null : r.id)}
                          className="text-slate-400 hover:text-agentryx-600">
                          <MessageSquare className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                  {openReq === r.id && !isDeferred && (
                    <tr><td colSpan={5} className="bg-slate-50 px-6 py-4">
                      <RequirementInstructions slug={slug} req={r} me={me} onChanged={onChanged} />
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <CommentThread slug={slug} reqId={r.id} canPost={!!me} />
                      </div>
                    </td></tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      </div>

      {/* Role dashboard sidebar — live stats for the selected role */}
      <aside className="lg:sticky lg:top-4 self-start">
        <RoleDashboard role={role} reqsInRole={reqsInRole} data={data} level={level} canEditLevel={canEditLevel} me={me} />
      </aside>
    </div>
  );
}

function RoleDashboard({ role, reqsInRole, data, level, canEditLevel, me }: {
  role: (typeof ROLES)[number]; reqsInRole: any[]; data: any;
  level: LevelKey; canEditLevel: boolean; me: any;
}) {
  const stat = statFor(reqsInRole, data.signoffs, level);
  const bySection = role.sections.map((n) => {
    const reqs = reqsInRole.filter((r: any) => r.section === n);
    return { n, title: reqs[0]?.sectionTitle ?? `Section ${n}`, s: statFor(reqs, data.signoffs, level) };
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className={`h-1.5 bg-gradient-to-r ${role.accent}`} />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Reviewing</div>
            <div className="text-lg font-semibold text-slate-900">{role.label}</div>
            <div className="text-[11px] text-slate-400">
              at {LEVELS.find(l => l.key === level)!.short}
              {me && !canEditLevel && <span className="ml-1 text-amber-600">· read-only</span>}
            </div>
          </div>
          {/* Donut + N/M count directly underneath — mirrors the role-card
              pattern so the denominator is visible everywhere. */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <Donut pct={stat.pct} />
            <div className="text-[10px] text-slate-500 font-medium tabular-nums">
              <span className="text-slate-900 font-semibold">{stat.pass}</span>
              <span className="text-slate-400"> / {stat.reviewable}</span>
            </div>
          </div>
        </div>

        {/* Headline ratio + meter */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{stat.pass}</span>
          <span className="text-base font-medium text-slate-400 tabular-nums">/ {stat.reviewable}</span>
          <span className="text-xs text-slate-500 ml-1">passed</span>
        </div>
        <div className="mt-2"><GradientMeter pct={stat.pct} /></div>

        <div className={`grid ${stat.deferred > 0 ? "grid-cols-3" : "grid-cols-2"} gap-2 mt-4`}>
          <StatPill label="Pass"    count={stat.pass}    color="text-emerald-700 bg-emerald-50" />
          <StatPill label="Partial" count={stat.partial} color="text-amber-700 bg-amber-50" />
          <StatPill label="Fail"    count={stat.fail}    color="text-red-700 bg-red-50" />
          <StatPill label="Pending" count={stat.pending} color="text-slate-600 bg-slate-100" />
          {stat.deferred > 0 && (
            <StatPill label="Deferred" count={stat.deferred} color="text-slate-500 bg-slate-50" />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px]">
          <span className="uppercase tracking-wide text-slate-500 font-medium">
            {reqsInRole.length} requirements{stat.deferred > 0 && <span className="text-slate-400 normal-case"> ({stat.reviewable} reviewable, {stat.deferred} deferred)</span>}
          </span>
          <span className="text-slate-500">
            <span className="font-semibold text-slate-700 tabular-nums">{stat.pass + stat.partial + stat.fail}</span>
            <span className="text-slate-400"> / {stat.reviewable}</span> signed off
          </span>
        </div>

        {role.sections.length > 1 && (
          <div className="mt-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-2">Per section</div>
            <div className="space-y-2">
              {bySection.map(({ n, title, s }) => (
                <div key={n}>
                  <div className="flex items-baseline justify-between text-[11px]">
                    <span className="text-slate-700 font-medium truncate pr-2">§{n} {title}</span>
                    <span className="text-slate-500 font-mono shrink-0">{s.pass}/{s.reviewable}{s.deferred > 0 && <span className="text-slate-400"> +{s.deferred}⛔</span>}</span>
                  </div>
                  <div className="mt-0.5"><GradientMeter pct={s.pct} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status breakdown — how the delivery team classified each req */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium mb-2">Delivery status</div>
          <div className="space-y-1 text-xs">
            {([
              ["delivered", "✅ Delivered", "text-emerald-700"],
              ["partial", "🟡 Partial", "text-amber-700"],
              ["not_delivered", "❌ Missing", "text-red-700"],
              ["deferred", "⛔ Deferred", "text-slate-600"],
            ] as const).map(([k, label, cls]) => {
              const count = reqsInRole.filter((r: any) => r.status === k).length;
              return (
                <div key={k} className="flex items-center justify-between">
                  <span className={cls}>{label}</span>
                  <span className="font-mono text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Persistent context strip ─────────────────────────────────────────
// Always visible once the user is past the project header. Shows the
// breadcrumb, overall approval meter for the active pipeline, and a
// one-click chip per role so switching never requires going "back".
function ContextStrip({ data, level, activeRole, onPickRole }: {
  data: any; level: LevelKey; activeRole: RoleKey | null;
  onPickRole: (r: RoleKey | null) => void;
}) {
  const overall = useMemo(() => statFor(data.requirements, data.signoffs, level), [data, level]);
  const levelLabel = LEVELS.find(l => l.key === level)!.label;

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <button onClick={() => onPickRole(null)}
          className="hover:text-agentryx-600 hover:underline">Overview</button>
        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="text-slate-700 font-medium">{levelLabel}</span>
        {activeRole && (<>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-slate-900 font-semibold">{ROLES.find(r => r.key === activeRole)!.label}</span>
        </>)}
      </div>

      {/* Overall meter — compact, always visible.
          Headline ratio on the left makes the denominator explicit; without it
          a bare "17%" begs the question "of how many?". */}
      <div className="mt-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Overall {levelLabel}</span>
        </div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-2xl font-bold text-slate-900 tabular-nums">{overall.pass}</span>
          <span className="text-base font-medium text-slate-400 tabular-nums">/ {overall.reviewable}</span>
          <span className="text-xs text-slate-500 ml-0.5">passed</span>
          <span className="text-xs font-semibold text-slate-900 ml-2 px-1.5 py-0.5 rounded bg-slate-100 tabular-nums">{overall.pct}%</span>
        </div>
        <div className="flex-1 min-w-[180px]"><GradientMeter pct={overall.pct} /></div>
        <div className="text-xs text-slate-500 whitespace-nowrap">
          <span className="text-emerald-600 font-medium">{overall.pass}</span> pass ·
          <span className="text-amber-600 font-medium"> {overall.partial}</span> partial ·
          <span className="text-red-600 font-medium"> {overall.fail}</span> fail ·
          <span className="text-slate-500"> {overall.pending}</span> pending
          {overall.deferred > 0 && (
            <> · <span className="text-slate-600 font-medium">{overall.deferred}</span> deferred</>
          )}
          <span className="text-slate-400"> · </span>
          <span className="font-semibold text-slate-700 tabular-nums">{overall.total} total</span>
        </div>
      </div>

      {/* Role chips — click to open or switch */}
      <div className="mt-3 flex flex-wrap gap-2">
        {ROLES.map((role) => {
          const reqs = data.requirements.filter((r: any) => role.sections.includes(r.section));
          const s = statFor(reqs, data.signoffs, level);
          const isActive = activeRole === role.key;
          return (
            <button key={role.key} onClick={() => onPickRole(role.key)}
              className={`group flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-xs transition ${
                isActive
                  ? "border-agentryx-500 bg-agentryx-50 text-agentryx-900 shadow-sm"
                  : "border-slate-200 text-slate-600 hover:border-agentryx-300 hover:bg-slate-50"
              }`}>
              <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${role.accent}`} />
              <span className="font-medium">{role.label}</span>
              <span className="text-slate-400 font-mono">{s.pass}/{s.reviewable}{s.deferred > 0 ? ` +${s.deferred}⛔` : ""}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                s.pct >= 80 ? "bg-emerald-100 text-emerald-700"
                : s.pct >= 50 ? "bg-lime-100 text-lime-700"
                : s.pct >= 25 ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
              }`}>{s.pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Reviewer badge (who am I signed in as, and what can I touch) ──────
function ReviewerBadge({ me }: { me: any }) {
  const roleMeta: Record<string, { label: string; scope: string; color: string }> = {
    admin:           { label: "Admin",          scope: "All pipelines",          color: "bg-slate-900 text-white" },
    delivery:        { label: "Delivery",       scope: "All pipelines",          color: "bg-agentryx-600 text-white" },
    agentryx:        { label: "Agentryx",       scope: "Internal review only",   color: "bg-indigo-600 text-white" },
    htis:            { label: "HTIS",           scope: "HTIS review only",       color: "bg-blue-600 text-white" },
    hpsedc_staging:  { label: "HPSEDC STG",     scope: "Staging only",           color: "bg-emerald-600 text-white" },
    hpsedc_final:    { label: "HPSEDC Final",   scope: "Final UAT only",         color: "bg-purple-600 text-white" },
    observer:        { label: "Observer",       scope: "Read-only",              color: "bg-slate-500 text-white" },
  };
  const rm = roleMeta[me.role] ?? { label: me.role, scope: "—", color: "bg-slate-500 text-white" };
  return (
    <div className="flex items-center gap-2">
      <div className="text-right">
        <div className="text-xs font-medium text-slate-700">{me.name}</div>
        <div className="text-[10px] text-slate-500">{rm.scope}</div>
      </div>
      <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded ${rm.color}`}>{rm.label}</span>
    </div>
  );
}

// ── Sign-in banner when unauthenticated on a role detail ──────────────
function SignInBanner() {
  return (
    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
      <LogIn className="w-5 h-5 text-amber-700" />
      <div className="flex-1 text-sm text-amber-900">
        <div className="font-medium">You're browsing in read-only mode.</div>
        <div className="text-xs text-amber-800/80">Sign in as a reviewer to record Pass / Partial / Fail decisions on each requirement.</div>
      </div>
      <Link href="/login"
        className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded px-4 py-2">
        Sign in
      </Link>
    </div>
  );
}

const STATUS_GLYPH: Record<string, string> = {
  delivered: "✅", partial: "🟡", not_delivered: "❌", deferred: "⛔", n_a: "—",
};

function DecisionDot({ d }: { d?: Decision | string }) {
  const cls = d === "accepted" ? "bg-emerald-500"
    : d === "rejected" ? "bg-red-500"
    : d === "waived" ? "bg-amber-500"
    : "bg-slate-300";
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`} />;
}

function SignoffCell({ slug, reqId, level, current, canEdit, onChanged, reverify }: any) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(current?.comment ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mac users typically screenshot to clipboard (Cmd+Ctrl+Shift+4) or drag
  // the floating thumbnail. Handle both so file-picker isn't the only way in.
  function addFiles(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...images].slice(0, 5));
  }
  function onPaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const images = items
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (images.length > 0) {
      e.preventDefault();
      addFiles(images);
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (dropped.length > 0) addFiles(dropped);
  }

  const glyph = current?.decision === "accepted" ? "✓"
    : current?.decision === "rejected" ? "✗"
    : current?.decision === "waived" ? "~" : "·";
  const cls = current?.decision === "accepted" ? "bg-emerald-600 text-white"
    : current?.decision === "rejected" ? "bg-red-600 text-white"
    : current?.decision === "waived" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400";
  const existingAttachments: any[] = current?.attachments ?? [];

  function cancel() {
    setComment(current?.comment ?? "");
    setFiles([]);
    setOpen(false);
  }
  async function decide(decision: string) {
    setBusy(true);
    try {
      await api.signoff(slug, reqId, level, decision, comment || undefined, files);
      setFiles([]); setOpen(false); onChanged();
    } catch (err: any) {
      // Surface the real reason — previously we swallowed errors via
      // try/finally, leaving the user clicking Pass/Partial with no feedback.
      // 413s can come from either nginx (client_max_body_size) or multer
      // (MAX_FILE_SIZE); the server message is the authoritative one, so
      // show it verbatim rather than guessing a byte count.
      const raw = String(err?.message ?? "");
      const msg = raw.includes("<!DOCTYPE")
        ? "The server rejected the upload before it reached the app (likely a size limit on the reverse proxy). Try a smaller screenshot."
        : raw || "Couldn't save — please try again.";
      alert(`Sign-off failed:\n\n${msg}`);
      console.error("signoff failed", err);
    } finally { setBusy(false); }
  }
  async function clear() {
    try { await api.clearSignoff(slug, reqId, level); } catch (e: any) { alert(e?.message ?? "Clear failed"); return; }
    setComment(""); setFiles([]); setOpen(false); onChanged();
  }
  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") cancel(); }
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) cancel();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <td className="px-3 py-2 text-center relative">
      <button disabled={!canEdit} onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-base font-semibold ${cls} ${canEdit ? "hover:ring-2 hover:ring-agentryx-300 cursor-pointer" : "cursor-not-allowed"}`}
        title={canEdit ? (current ? current.decision : "Not signed off") : "Your role cannot sign off at this level"}>{glyph}</button>
      {/* Re-verify chip — appears when a deployed sprint has listed this item as
          fixed and the reviewer's decision predates that deploy. Signals the
          reviewer should re-test the item with the new build. */}
      {reverify && (
        <div className="mt-1 inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap"
          title="This item was fixed in a recent sprint. Please re-verify.">
          🔁 re-verify
        </div>
      )}
      {open && canEdit && (
        <div ref={popoverRef}
          onPaste={onPaste}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`absolute right-2 mt-1 z-20 bg-white border rounded-lg shadow-lg p-3 text-left w-72 transition ${
            dragOver ? "border-agentryx-500 ring-2 ring-agentryx-200" : "border-slate-200"
          }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Sign off</span>
            <button onClick={cancel} title="Close (Esc)" className="text-slate-400 hover:text-slate-700 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} onPaste={onPaste}
            placeholder="Comment (optional). You can paste a screenshot here (Cmd/Ctrl + V)."
            className="w-full border border-slate-200 rounded px-2 py-1 text-xs h-16" />

          {existingAttachments.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Previously attached</div>
              <div className="flex flex-wrap gap-1">
                {existingAttachments.map((a: any) => (
                  <a key={a.id} href={api.attachmentUrl(a.id)} target="_blank" rel="noopener"
                    className="block w-10 h-10 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-agentryx-400"
                    title={a.originalName}>
                    <img src={api.attachmentUrl(a.id)} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2">
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFilePick} />
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 text-xs border border-dashed border-slate-300 text-slate-600 hover:border-agentryx-400 hover:bg-slate-50 rounded px-2 py-1.5 transition">
              <Paperclip className="w-3 h-3" />
              Attach screenshots {files.length > 0 && <span className="text-agentryx-600 font-medium">({files.length}/5)</span>}
            </button>
            <p className="text-[10px] text-slate-400 mt-1 text-center">
              Click to pick · paste (Cmd/Ctrl + V) · or drag-drop here
            </p>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {files.map((f, i) => (
                  <div key={i} className="relative w-10 h-10 rounded border border-slate-200 overflow-hidden">
                    <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-slate-700 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-1 mt-2">
            <button disabled={busy} onClick={() => decide("accepted")} className="flex-1 bg-emerald-600 text-white rounded px-2 py-1 text-xs disabled:opacity-50">Pass</button>
            <button disabled={busy} onClick={() => decide("waived")}   className="flex-1 bg-amber-500 text-white rounded px-2 py-1 text-xs disabled:opacity-50">Partial</button>
            <button disabled={busy} onClick={() => decide("rejected")} className="flex-1 bg-red-600 text-white rounded px-2 py-1 text-xs disabled:opacity-50">Fail</button>
          </div>
          <div className="flex gap-1 mt-2">
            <button onClick={cancel}
              className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded px-2 py-1 text-xs">
              Cancel
            </button>
            {current && (
              <button onClick={clear}
                className="flex-1 border border-red-200 text-red-600 hover:bg-red-50 rounded px-2 py-1 text-xs">
                Clear decision
              </button>
            )}
          </div>
        </div>
      )}
    </td>
  );
}

function RequirementInstructions({ slug, req, me, onChanged }: {
  slug: string; req: any; me: any; onChanged: () => void;
}) {
  const canEdit = me && (me.role === "admin" || me.role === "delivery");
  const [editing, setEditing] = useState(false);
  const [steps, setSteps] = useState(req.testSteps ?? "");
  const [expected, setExpected] = useState(req.expectedResult ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.updateRequirement(slug, req.id, { testSteps: steps, expectedResult: expected });
      setEditing(false);
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase text-slate-500">How to test</div>
        {canEdit && !editing && (
          <button onClick={() => setEditing(true)}
            className="text-xs text-agentryx-600 hover:underline">Edit</button>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-slate-200 rounded p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Steps</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {req.testSteps || <span className="text-slate-400 italic">No steps recorded.</span>}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded p-3">
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Expected</div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {req.expectedResult || <span className="text-slate-400 italic">No expected outcome recorded.</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Steps</div>
            <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={3}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Expected</div>
            <textarea value={expected} onChange={(e) => setExpected(e.target.value)} rows={3}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setSteps(req.testSteps ?? ""); setExpected(req.expectedResult ?? ""); }}
              className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
            <button onClick={save} disabled={saving}
              className="px-3 py-1 text-xs bg-agentryx-600 text-white rounded disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CommentThread({ slug, reqId, canPost }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.getComments(slug, reqId).then(setItems); }, [reqId]);

  async function post() {
    if (!body.trim() && files.length === 0) return;
    setBusy(true);
    try {
      await api.postComment(slug, reqId, body, files);
      setBody(""); setFiles([]);
      api.getComments(slug, reqId).then(setItems);
    } finally { setBusy(false); }
  }
  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles(prev => [...prev, ...picked].slice(0, 5));
    e.target.value = "";
  }
  // Paste-from-clipboard + drag-drop for screenshots (Mac-friendly).
  function addFiles(incoming: File[]) {
    const images = incoming.filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...images].slice(0, 5));
  }
  function onPaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgs = items
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (imgs.length > 0) { e.preventDefault(); addFiles(imgs); }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer?.files ?? []);
    if (dropped.length > 0) addFiles(dropped);
  }

  return (
    <div onPaste={onPaste} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
      <div className="text-xs uppercase text-slate-500 mb-2">Discussion</div>
      <div className="space-y-2">
        {items.length === 0 && <div className="text-xs text-slate-400">No comments yet.</div>}
        {items.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded p-2 text-sm">
            <div className="text-xs text-slate-500">{c.reviewerName} <span className="text-slate-400">· {c.reviewerOrg} · {new Date(c.createdAt).toLocaleString()}</span></div>
            {c.body && <div className="mt-1 whitespace-pre-wrap">{c.body}</div>}
            {c.attachments?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {c.attachments.map((a: any) => (
                  <a key={a.id} href={api.attachmentUrl(a.id)} target="_blank" rel="noopener"
                    className="block w-16 h-16 rounded border border-slate-200 overflow-hidden hover:ring-2 hover:ring-agentryx-400 transition"
                    title={a.originalName}>
                    <img src={api.attachmentUrl(a.id)} alt={a.originalName} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {canPost && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Add a comment… (paste Cmd/Ctrl+V to include a screenshot)"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); post(); } }}
              onPaste={onPaste}
              className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm" />
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={onFilePick} />
            <button onClick={() => fileInputRef.current?.click()} title="Attach screenshots"
              className="flex items-center gap-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded px-2 py-1 text-sm">
              <Paperclip className="w-3.5 h-3.5" />
              {files.length > 0 && <span className="text-[10px] text-agentryx-600 font-medium">{files.length}</span>}
            </button>
            <button disabled={busy} onClick={post} className="bg-agentryx-600 text-white rounded px-3 py-1 text-sm disabled:opacity-50">
              {busy ? "..." : "Post"}
            </button>
          </div>
          {files.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <div key={i} className="relative w-12 h-12 rounded border border-slate-200 overflow-hidden">
                  <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                  <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-slate-700 text-white rounded-full text-[10px] flex items-center justify-center hover:bg-red-600">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssuesPanel({ slug, canEdit, me }: { slug: string; canEdit: boolean; me?: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ severity: "minor", description: "", itemRef: "" });
  // Per-row save state: "saving" → "saved" (ticker) → cleared, or "error".
  // Gives the reviewer visible confirmation the dropdown change was persisted
  // instead of a silent onChange → API call → no UI feedback.
  const [rowState, setRowState] = useState<Record<string, "saving" | "saved" | "error">>({});

  useEffect(() => { api.listIssues(slug).then(setItems); }, [slug]);
  async function create() {
    if (!form.description.trim()) return;
    await api.createIssue(slug, form);
    setForm({ severity: "minor", description: "", itemRef: "" });
    api.listIssues(slug).then(setItems);
  }
  async function setStatus(id: string, status: string) {
    setRowState((s) => ({ ...s, [id]: "saving" }));
    try {
      await api.updateIssue(slug, id, { status });
      const rows = await api.listIssues(slug);
      setItems(rows);
      setRowState((s) => ({ ...s, [id]: "saved" }));
      setTimeout(() => setRowState((s) => { const { [id]: _, ...rest } = s; return rest; }), 1500);
    } catch (e) {
      setRowState((s) => ({ ...s, [id]: "error" }));
      alert(`Couldn't update status: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const isAdmin = me?.role === "admin" || me?.role === "delivery";
  const canEditRow = (i: any) => canEdit && (isAdmin || i.reportedById === me?.id);

  const sevColor: Record<string, string> = {
    blocker: "bg-red-100 text-red-800",
    major: "bg-orange-100 text-orange-800",
    minor: "bg-yellow-100 text-yellow-800",
    trivial: "bg-slate-100 text-slate-700",
  };
  const statusColor: Record<string, string> = {
    open: "bg-amber-50 text-amber-800 border-amber-200",
    in_progress: "bg-blue-50 text-blue-800 border-blue-200",
    needs_info: "bg-purple-50 text-purple-800 border-purple-200",
    resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
    closed: "bg-slate-100 text-slate-600 border-slate-200",
    wont_fix: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="mt-10">
      <h2 className="text-xl font-semibold flex items-center gap-2"><AlertCircle className="w-5 h-5" /> Issues log</h2>
      <div className="mt-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">Severity</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">Reporter</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-slate-400 text-center">No issues raised yet.</td></tr>}
            {items.map((i) => {
              const editable = canEditRow(i);
              const state = rowState[i.id];
              return (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-mono text-xs">{i.shortId}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500">{i.itemRef ?? "—"}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded ${sevColor[i.severity]}`}>{i.severity}</span></td>
                  <td className="px-3 py-2">{i.description}{i.resolution && <div className="text-xs text-slate-500 mt-1">→ {i.resolution}</div>}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-medium text-slate-700">{i.reporterUsername || "—"}</div>
                    {i.reporterOrg && <div className="text-slate-400">{i.reporterOrg}</div>}
                    {i.createdAt && <div className="text-slate-400">{fmtDate(i.createdAt)}</div>}
                  </td>
                  <td className="px-3 py-2">
                    {editable ? (
                      <div className="flex items-center gap-2">
                        <select value={i.status} onChange={(e) => setStatus(i.id, e.target.value)}
                          disabled={state === "saving"}
                          className={`border rounded px-2 py-1 text-xs bg-white ${statusColor[i.status] ?? "border-slate-200"}`}>
                          <option value="open">Open</option><option value="in_progress">In progress</option>
                          <option value="needs_info">Needs info</option><option value="resolved">Resolved</option>
                          <option value="closed">Closed</option><option value="wont_fix">Won't fix</option>
                        </select>
                        {state === "saving" && <span className="text-[10px] text-slate-400">Saving…</span>}
                        {state === "saved"  && <span className="text-[10px] text-emerald-600 font-semibold">✓ Saved</span>}
                        {state === "error"  && <span className="text-[10px] text-red-600 font-semibold">Failed</span>}
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${statusColor[i.status] ?? "border-slate-200 text-slate-600"}`}
                        title={canEdit ? "Only the reporter or an admin can change this status" : ""}>
                        {i.status.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="mt-3 flex gap-2 items-end">
          <input placeholder="Item ref (e.g. 1.18)" value={form.itemRef}
            onChange={(e) => setForm({ ...form, itemRef: e.target.value })}
            className="border border-slate-200 rounded px-2 py-1 text-sm w-28" />
          <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
            className="border border-slate-200 rounded px-2 py-1 text-sm bg-white">
            <option value="blocker">Blocker</option><option value="major">Major</option>
            <option value="minor">Minor</option><option value="trivial">Trivial</option>
          </select>
          <input placeholder="Describe the issue…" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm" />
          <button onClick={create} className="bg-agentryx-600 text-white rounded px-3 py-1 text-sm">Add</button>
        </div>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Issues are project-wide — every reviewer can see them. Only the reporter or an admin can change the status of a given entry.
      </p>
    </div>
  );
}
