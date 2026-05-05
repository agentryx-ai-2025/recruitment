/**
 * NotificationsDrawer — the header bell opens a right-side drawer with two
 * tabs: Active (current) and Saved (bookmarked for later).
 *
 * Replaces the older amber-heavy popover. Each item has two explicit actions:
 *   • ✕ Dismiss  — never resurfaces for this user
 *   • 🔖 Save    — moves to Saved (toggle). From Saved, the same icon unsaves.
 *
 * Severity drives color, not the type:
 *   info      → sky-blue  (default, non-alarming)
 *   positive  → emerald   (shortlist, offer, selected)
 *   warning   → amber     (deadline, minor issue)
 *   urgent    → red       (rejection, position filled)
 *
 * Used for candidate, agent, employer — role-agnostic.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, X, Bookmark, CheckCheck, Inbox, Archive } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

type Severity = "info" | "positive" | "warning" | "urgent";
interface Notif {
  id: string; type: string; title: string; message: string;
  severity: Severity; createdAt?: string;
  savedAt?: string | null; dismissedAt?: string | null;
  read?: boolean;
}

function severityStyle(s: Severity) {
  switch (s) {
    case "positive": return { border: "border-emerald-200", bg: "bg-emerald-50", dot: "bg-emerald-500", text: "text-emerald-900" };
    case "warning":  return { border: "border-amber-200",   bg: "bg-amber-50",   dot: "bg-amber-500",   text: "text-amber-900" };
    case "urgent":   return { border: "border-red-200",     bg: "bg-red-50",     dot: "bg-red-500",     text: "text-red-900" };
    default:         return { border: "border-sky-200",     bg: "bg-sky-50",     dot: "bg-sky-500",     text: "text-sky-900" };
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationsDrawer() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "saved">("active");

  const { data: res } = useQuery({
    queryKey: ["/api/v1/notifications", tab],
    queryFn: async () => {
      const r = await fetch(`/api/v1/notifications?view=${tab}&limit=50`);
      if (!r.ok) return { data: [], unreadCount: 0, savedCount: 0 };
      return r.json();
    },
    refetchInterval: open ? 1000 * 30 : 1000 * 60,
  });

  const items: Notif[] = res?.data ?? [];
  const unread = res?.unreadCount ?? 0;
  const savedCount = res?.savedCount ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/v1/notifications"] });

  const dismissOne = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/v1/notifications/${id}/dismiss`, { method: "POST" }); },
    onSuccess: invalidate,
  });
  const toggleSave = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/v1/notifications/${id}/save`, { method: "POST" }); },
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: async () => { await fetch(`/api/v1/notifications/mark-all-read`, { method: "POST" }); },
    onSuccess: invalidate,
  });
  const dismissAll = useMutation({
    mutationFn: async () => { await fetch(`/api/v1/notifications/dismiss-all`, { method: "POST" }); },
    onSuccess: invalidate,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={`Notifications (${unread} unread)`}
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unread > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unread > 9 ? "9+" : unread}
              </span>
              <span className="absolute -top-0.5 -right-0.5 bg-red-500/40 rounded-full min-w-[18px] h-[18px] animate-ping" />
            </>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-slate-200">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bell className="w-5 h-5 text-slate-700" /> Notifications
          </SheetTitle>
          <div className="flex gap-1 mt-3 bg-slate-100 rounded-lg p-1 text-xs">
            <button onClick={() => setTab("active")}
              className={`flex-1 px-3 py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                tab === "active" ? "bg-white shadow-sm text-slate-900 font-medium" : "text-slate-600 hover:text-slate-900"
              }`}>
              <Inbox className="w-3.5 h-3.5" /> Active
              {unread > 0 && <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{unread}</span>}
            </button>
            <button onClick={() => setTab("saved")}
              className={`flex-1 px-3 py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                tab === "saved" ? "bg-white shadow-sm text-slate-900 font-medium" : "text-slate-600 hover:text-slate-900"
              }`}>
              <Archive className="w-3.5 h-3.5" /> Saved
              {savedCount > 0 && <span className="bg-slate-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{savedCount}</span>}
            </button>
          </div>
        </SheetHeader>

        {tab === "active" && items.length > 0 && (
          <div className="px-5 py-2 flex gap-2 border-b border-slate-100 bg-slate-50/50">
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-slate-600 hover:text-slate-900"
              onClick={() => markAllRead.mutate()}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-[11px] text-slate-600 hover:text-slate-900"
              onClick={() => { if (window.confirm("Dismiss all unsaved notifications?")) dismissAll.mutate(); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Dismiss all
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <NotificationCard
                  key={n.id}
                  n={n}
                  inSavedTab={tab === "saved"}
                  onDismiss={() => dismissOne.mutate(n.id)}
                  onToggleSave={() => toggleSave.mutate(n.id)}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 text-[11px] text-slate-400 text-center">
          {tab === "active"
            ? "Dismissed items never appear again. Save important ones to keep them here."
            : "Saved items stay here until you unsave or dismiss them."}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NotificationCard({ n, inSavedTab, onDismiss, onToggleSave }: {
  n: Notif; inSavedTab: boolean; onDismiss: () => void; onToggleSave: () => void;
}) {
  const style = severityStyle(n.severity);
  const isSaved = !!n.savedAt;
  return (
    <li className={`px-5 py-3 ${style.bg} border-l-4 ${style.border}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold ${style.text} truncate`}>{n.title}</p>
            <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
          </div>
          <p className="text-xs text-slate-700 mt-0.5 whitespace-pre-wrap">{n.message}</p>
          <div className="flex gap-1 mt-2">
            <button onClick={onToggleSave}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded ${
                isSaved ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-400"
              }`}
              title={isSaved ? "Remove from Saved" : "Save for later"}>
              <Bookmark className="w-3 h-3" />
              {isSaved ? (inSavedTab ? "Unsave" : "Saved") : "Save"}
            </button>
            <button onClick={onDismiss}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-white text-slate-500 border border-slate-200 hover:border-red-300 hover:text-red-700"
              title="Dismiss — never show again">
              <X className="w-3 h-3" /> Dismiss
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyState({ tab }: { tab: "active" | "saved" }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10">
      {tab === "active" ? (
        <>
          <Inbox className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-700">You're all caught up</p>
          <p className="text-xs text-slate-500 mt-1">New notifications will land here.</p>
        </>
      ) : (
        <>
          <Archive className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-700">Nothing saved yet</p>
          <p className="text-xs text-slate-500 mt-1">Hit 🔖 on a notification to keep it here for later.</p>
        </>
      )}
    </div>
  );
}
