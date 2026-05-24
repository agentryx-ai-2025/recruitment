import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown, ChevronRight, CheckCircle2, X, MessageSquare, Lightbulb, AlertCircle, GitBranch, LogIn, RefreshCw } from "lucide-react";
import { api } from "../lib/api";

// Activity feed for a project. Renders the last 20 audit_log rows, joined
// with reviewer name + org. Filter chips collapse the list to a single
// event family. Admins land expanded by default; everyone else collapsed
// so the matrix stays the focus.
//
// Uses the existing audit_log table — Phase 1 starter that ships immediate
// value without schema changes. As more write paths instrument audit_log
// inserts, this view gets richer automatically.

type Filter = "all" | "signoff" | "sprint" | "feedback" | "issue" | "auth";

interface ActivityRow {
  id: string;
  action: string;
  meta: any;
  createdAt: string;
  reviewerName?: string | null;
  reviewerOrg?: string | null;
  reviewerRole?: string | null;
}

const FILTERS: { key: Filter; label: string; prefix: string | null }[] = [
  { key: "all",      label: "All",       prefix: null },
  { key: "signoff",  label: "Sign-offs", prefix: "signoff." },
  { key: "sprint",   label: "Sprints",   prefix: "sprint." },
  { key: "feedback", label: "Feedback",  prefix: "feedback." },
  { key: "issue",    label: "Issues",    prefix: "issue." },
  { key: "auth",     label: "Logins",    prefix: "auth." },
];

export function ActivityFeed({ slug, me }: { slug: string; me?: any }) {
  const isAdmin = me?.role === "admin" || me?.role === "delivery";
  const [expanded, setExpanded] = useState<boolean>(!!isAdmin);
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [refreshing, setRefreshing] = useState(false);

  function reload() {
    setRefreshing(true);
    api.listActivity(slug, 20).then((r) => setRows(r)).catch(() => setRows([])).finally(() => setRefreshing(false));
  }

  useEffect(() => { if (expanded && rows === null) reload(); }, [expanded]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const sel = FILTERS.find((f) => f.key === filter);
    if (!sel?.prefix) return rows;
    return rows.filter((r) => r.action.startsWith(sel.prefix!));
  }, [rows, filter]);

  return (
    <div className="mt-10 bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 text-left">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          {rows && (
            <span className="text-[10px] uppercase tracking-wide text-slate-400 font-mono">
              ({rows.length})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <span onClick={(e) => { e.stopPropagation(); reload(); }}
              className={`text-slate-400 hover:text-agentryx-600 cursor-pointer ${refreshing ? "animate-spin" : ""}`}
              title="Refresh">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* Filter chips */}
          <div className="px-5 py-2.5 flex flex-wrap gap-1.5 bg-slate-50">
            {FILTERS.map((f) => {
              const isActive = filter === f.key;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`text-[11px] font-medium px-2 py-1 rounded-full border transition ${
                    isActive
                      ? "bg-agentryx-600 border-agentryx-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-agentryx-300 hover:bg-slate-50"
                  }`}>
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* Event list */}
          <div className="divide-y divide-slate-100">
            {rows === null && (
              <div className="px-5 py-6 text-center text-xs text-slate-400">Loading…</div>
            )}
            {rows !== null && filtered.length === 0 && (
              <div className="px-5 py-6 text-center text-xs text-slate-400">
                {filter === "all"
                  ? "No activity recorded yet — events will appear here as reviewers sign off, deploy sprints, and triage feedback."
                  : "No matching events. Try a different filter."}
              </div>
            )}
            {filtered.map((row) => <ActivityRowView key={row.id} row={row} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityRowView({ row }: { row: ActivityRow }) {
  const [icon, color, summary] = describe(row);
  const when = formatWhen(row.createdAt);
  return (
    <div className="px-5 py-2.5 flex items-start gap-3 hover:bg-slate-50">
      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${color}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-slate-700 leading-snug">
          <span className="font-medium text-slate-900">{row.reviewerName ?? "Unknown"}</span>
          {row.reviewerOrg && <span className="text-slate-400"> · {row.reviewerOrg}</span>}
          {" "}
          <span className="text-slate-600">{summary}</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
          {when} <span className="text-slate-300">·</span> <span className="text-slate-500">{row.action}</span>
        </div>
      </div>
    </div>
  );
}

function describe(row: ActivityRow): [JSX.Element, string, string] {
  const meta = row.meta || {};
  if (row.action === "signoff.created") {
    return [
      <CheckCircle2 className="w-4 h-4 text-emerald-700" />, "bg-emerald-100",
      `signed off ${meta.itemRef ?? "a row"} at ${humanLevel(meta.level)} as ${humanDecision(meta.decision)}`,
    ];
  }
  if (row.action === "signoff.updated") {
    return [
      <RefreshCw className="w-4 h-4 text-amber-700" />, "bg-amber-100",
      `updated signoff on ${meta.itemRef ?? "a row"} at ${humanLevel(meta.level)} to ${humanDecision(meta.decision)}`,
    ];
  }
  if (row.action === "signoff.cleared") {
    return [
      <X className="w-4 h-4 text-slate-600" />, "bg-slate-200",
      `cleared signoff on ${meta.itemRef ?? "a row"} at ${humanLevel(meta.level)}`,
    ];
  }
  if (row.action.startsWith("sprint.")) {
    return [
      <GitBranch className="w-4 h-4 text-indigo-700" />, "bg-indigo-100",
      describeSprint(row.action, meta),
    ];
  }
  if (row.action.startsWith("feedback.")) {
    return [
      <Lightbulb className="w-4 h-4 text-orange-700" />, "bg-orange-100",
      describeFeedback(row.action, meta),
    ];
  }
  if (row.action.startsWith("issue.")) {
    return [
      <AlertCircle className="w-4 h-4 text-rose-700" />, "bg-rose-100",
      describeIssue(row.action, meta),
    ];
  }
  if (row.action.startsWith("auth.")) {
    return [
      <LogIn className="w-4 h-4 text-slate-600" />, "bg-slate-200",
      `signed in${meta.method ? ` (${meta.method})` : ""}`,
    ];
  }
  return [
    <MessageSquare className="w-4 h-4 text-slate-500" />, "bg-slate-100",
    row.action,
  ];
}

function describeSprint(action: string, meta: any) {
  if (action === "sprint.created")  return `created sprint "${meta.name ?? ""}"`;
  if (action === "sprint.deployed") return `deployed sprint "${meta.name ?? ""}"${meta.buildRef ? ` as ${meta.buildRef}` : ""}`;
  if (action === "sprint.closed")   return `closed sprint "${meta.name ?? ""}"`;
  if (action === "sprint.deleted")  return `deleted sprint "${meta.name ?? ""}"`;
  return action.replace("sprint.", "sprint ");
}

function describeFeedback(action: string, meta: any) {
  if (action === "feedback.created")        return `submitted feedback ${meta.referenceCode ?? ""}`;
  if (action === "feedback.status_changed") return `triaged feedback ${meta.referenceCode ?? ""} → ${meta.status}`;
  return action.replace("feedback.", "feedback ");
}

function describeIssue(action: string, meta: any) {
  if (action === "issue.created")         return `raised issue ${meta.shortId ?? ""}`;
  if (action === "issue.status_changed")  return `set issue ${meta.shortId ?? ""} → ${meta.status}`;
  return action.replace("issue.", "issue ");
}

function humanLevel(l?: string) {
  return l === "agentryx" ? "Agentryx"
    : l === "htis" ? "HTIS"
    : l === "hpsedc_staging" ? "HPSEDC Staging"
    : l === "hpsedc_final" ? "HPSEDC Final"
    : l ?? "?";
}
function humanDecision(d?: string) {
  return d === "accepted" ? "Pass"
    : d === "rejected" ? "Fail"
    : d === "waived"   ? "Partial"
    : d ?? "?";
}

function formatWhen(iso: string) {
  const t = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - t);
  const min = 60_000, hour = 3600_000, day = 86400_000;
  if (diff < min)        return "just now";
  if (diff < hour)       return `${Math.floor(diff / min)}m ago`;
  if (diff < day)        return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day)    return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
