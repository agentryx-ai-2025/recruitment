import { useEffect, useState } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";

type FBItem = { id: string; referenceCode: string; title: string; status: string; type: string; createdAt: string };

const STATUS_LABEL: Record<string, string> = {
  submitted: "New", triaged: "Triaged", planned: "Planned",
  in_progress: "In progress", shipped: "Shipped", declined: "Declined", duplicate: "Duplicate",
};
const STATUS_TONE: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800", triaged: "bg-sky-100 text-sky-800",
  planned: "bg-sky-100 text-sky-800", in_progress: "bg-blue-100 text-blue-800",
  shipped: "bg-emerald-100 text-emerald-800", declined: "bg-slate-100 text-slate-600",
  duplicate: "bg-slate-100 text-slate-600",
};

// Ideas & Feedback card — sibling of the role cards on ProjectView. Now surfaces
// the most recent suggestions inline (not just counts) so they're visible on the
// dashboard, and links through to /p/:slug/feedback for the full inbox.
export function FeedbackCard({ projectId, projectSlug }: { projectId: string; projectSlug: string }) {
  const [items, setItems] = useState<FBItem[] | null>(null);
  useEffect(() => {
    api.listFeedback({ projectId }).then(setItems).catch(() => setItems([]));
  }, [projectId]);

  const list = items ?? [];
  const byStatus = list.reduce<Record<string, number>>((a, i) => { a[i.status] = (a[i.status] ?? 0) + 1; return a; }, {});
  const newCount = byStatus.submitted ?? 0;
  const triaged = (byStatus.triaged ?? 0) + (byStatus.planned ?? 0);
  const inFlight = byStatus.in_progress ?? 0;
  const shipped = byStatus.shipped ?? 0;
  const recent = list.slice(0, 3);

  return (
    <Link href={`/p/${projectSlug}/feedback`}
      className="block mt-4 bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-agentryx-500 hover:shadow-md transition">
      <div className="h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
      <div className="p-5">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">💡</span>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Future work</div>
                <div className="text-base font-bold text-slate-900">Ideas &amp; Feedback{list.length > 0 && <span className="ml-2 text-sm font-semibold text-amber-700">({list.length})</span>}</div>
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

        {/* Recent suggestions — surfaced inline so they're visible without opening the inbox. */}
        {recent.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Latest suggestions</div>
            {recent.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-[11px] text-slate-400 shrink-0">{it.referenceCode}</span>
                <span className="text-slate-700 truncate flex-1">{it.title}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_TONE[it.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABEL[it.status] ?? it.status}
                </span>
              </div>
            ))}
            {list.length > recent.length && (
              <div className="text-[11px] text-agentryx-600 font-medium pt-0.5">+ {list.length - recent.length} more in the inbox →</div>
            )}
          </div>
        )}
        {items !== null && list.length === 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">No suggestions yet — be the first to submit one.</div>
        )}
      </div>
    </Link>
  );
}

// Compact header affordance: "💡 Ideas (N)" linking straight to the inbox, so
// submitted suggestions are discoverable from the top of the project page.
export function IdeasButton({ projectId, projectSlug }: { projectId: string; projectSlug: string }) {
  const [total, setTotal] = useState<number | null>(null);
  useEffect(() => {
    api.feedbackStats(projectId).then((s) => setTotal(s?.total ?? 0)).catch(() => setTotal(null));
  }, [projectId]);
  return (
    <Link href={`/p/${projectSlug}/feedback`}
      className="inline-flex items-center gap-2 text-sm bg-white border border-slate-200 rounded px-3 py-2 hover:border-agentryx-500"
      title="View submitted ideas & feedback">
      <span>💡</span>Ideas
      {total !== null && total > 0 && (
        <span className="ml-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold px-1.5 min-w-[18px] text-center">{total}</span>
      )}
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
