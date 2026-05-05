import { useEffect, useState } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";

// Ideas & Feedback card — sibling of the role cards on ProjectView. Summarises
// the feedback inbox and links through to /p/:slug/feedback for the full list.
export function FeedbackCard({ projectId, projectSlug }: { projectId: string; projectSlug: string }) {
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);
  useEffect(() => {
    api.feedbackStats(projectId).then(setStats).catch(() => setStats({ total: 0, byStatus: {} }));
  }, [projectId]);

  const s = stats?.byStatus ?? {};
  const newCount = (s.submitted ?? 0);
  const triaged = (s.triaged ?? 0) + (s.planned ?? 0);
  const inFlight = (s.in_progress ?? 0);
  const shipped = (s.shipped ?? 0);

  return (
    <Link href={`/p/${projectSlug}/feedback`}
      className="block mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-agentryx-500 hover:shadow-md transition">
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
      <div className="p-5 flex items-center gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Future work</div>
              <div className="text-base font-bold text-slate-900">Ideas &amp; Feedback</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">Reviewers can submit enhancement ideas. Delivery triage converts them into backlog items.</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Pill label="New" value={newCount} tone="amber" />
          <Pill label="Triaged" value={triaged} tone="sky" />
          <Pill label="In progress" value={inFlight} tone="blue" />
          <Pill label="Shipped" value={shipped} tone="emerald" />
        </div>
        <span className="text-agentryx-600 text-xs font-medium">Open inbox →</span>
      </div>
    </Link>
  );
}

function Pill({ label, value, tone }: { label: string; value: number; tone: "amber" | "sky" | "blue" | "emerald" }) {
  const tones: Record<string, string> = {
    amber:   "bg-amber-50 text-amber-800",
    sky:     "bg-sky-50 text-sky-800",
    blue:    "bg-blue-50 text-blue-800",
    emerald: "bg-emerald-50 text-emerald-800",
  };
  return (
    <div className={`${tones[tone]} rounded-lg px-2 py-1 text-center min-w-[58px]`}>
      <div className="text-[9px] uppercase tracking-wide opacity-80 font-semibold">{label}</div>
      <div className="text-sm font-bold tabular-nums">{value}</div>
    </div>
  );
}
