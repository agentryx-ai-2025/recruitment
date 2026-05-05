import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// Sibling of the Feedback card. Lives under the sign-off cards on ProjectView
// and summarises every dev sprint that has shipped (or is in-flight) against
// this project. The 🔁 re-verify badges on rejected signoffs key off the
// deployedSprints array the parent already fetches.
export function SprintSection({ projectSlug, canManage, onSprintChange, currentBuildRef }: {
  projectSlug: string; canManage: boolean; onSprintChange?: () => void; currentBuildRef?: string;
}) {
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState<"new" | string | null>(null);

  const refresh = () => {
    setLoading(true);
    api.listSprints(projectSlug).then(setSprints).catch(() => setSprints([])).finally(() => setLoading(false));
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [projectSlug]);

  const onChanged = () => { refresh(); onSprintChange?.(); };

  return (
    <div className="mt-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500" />
      <div className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Delivery cycle</div>
                <div className="text-base font-bold text-slate-900">Sprint Releases</div>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Each dev sprint deploys a build, updates the project's buildRef, and flags previously-rejected signoffs for re-verification.
            </p>
          </div>
          {canManage && (
            <button onClick={() => setDialogOpen("new")}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow">
              + Start sprint
            </button>
          )}
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="text-center py-6 text-sm text-slate-400">Loading…</div>
          ) : sprints.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-lg">
              No sprints yet. {canManage ? "Click 'Start sprint' to create the first one." : "Delivery team hasn't cut a sprint yet."}
            </div>
          ) : (
            <div className="space-y-2">
              {sprints.map((s) => (
                <SprintRow key={s.id} sprint={s} canManage={canManage} onChanged={onChanged}
                  onEdit={() => setDialogOpen(s.id)} currentBuildRef={currentBuildRef} />
              ))}
            </div>
          )}
        </div>
      </div>

      {dialogOpen !== null && (
        <SprintDialog
          mode={dialogOpen === "new" ? "create" : "edit"}
          sprintId={dialogOpen !== "new" ? dialogOpen : undefined}
          projectSlug={projectSlug}
          onClose={() => setDialogOpen(null)}
          onChanged={onChanged}
        />
      )}
    </div>
  );
}

function SprintRow({ sprint, canManage, onChanged, onEdit, currentBuildRef }: {
  sprint: any; canManage: boolean; onChanged: () => void; onEdit: () => void; currentBuildRef?: string;
}) {
  const tone: Record<string, string> = {
    draft:       "bg-slate-100 text-slate-600 border-slate-200",
    in_progress: "bg-amber-50 text-amber-800 border-amber-200",
    deployed:    "bg-emerald-50 text-emerald-800 border-emerald-200",
    closed:      "bg-slate-200 text-slate-600 border-slate-300",
  };
  const [busy, setBusy] = useState(false);

  const deploy = async () => {
    const buildRef = window.prompt(
      `Deploy this sprint. Enter the new buildRef (current: ${currentBuildRef ?? "—"}):`,
      bumpPatch(currentBuildRef)
    );
    if (!buildRef) return;
    setBusy(true);
    try { await api.deploySprint(sprint.id, buildRef.trim()); onChanged(); }
    catch (e: any) { alert(`Deploy failed: ${e.message}`); }
    finally { setBusy(false); }
  };
  const close = async () => {
    if (!window.confirm("Close this sprint? The 🔁 re-verify badges will stop appearing for its fixes.")) return;
    setBusy(true);
    try { await api.closeSprint(sprint.id); onChanged(); }
    finally { setBusy(false); }
  };
  const del = async () => {
    if (!window.confirm("Delete this draft sprint?")) return;
    setBusy(true);
    try { await api.deleteSprint(sprint.id); onChanged(); }
    catch (e: any) { alert(`Delete failed: ${e.message}`); }
    finally { setBusy(false); }
  };

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/30">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{sprint.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tone[sprint.status] ?? ""}`}>
              {sprint.status === "in_progress" ? "In progress" : sprint.status[0].toUpperCase() + sprint.status.slice(1)}
            </span>
            {sprint.buildRef && (
              <span className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5">
                {sprint.buildRef}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Started {new Date(sprint.startedAt).toLocaleDateString()}
            {sprint.deployedAt && <> · Deployed {new Date(sprint.deployedAt).toLocaleDateString()}</>}
            {sprint.closedAt && <> · Closed {new Date(sprint.closedAt).toLocaleDateString()}</>}
            {" · "}
            <span className="font-semibold text-slate-700">{sprint.fixedItemRefs?.length ?? 0}</span> fixes
          </div>
          {sprint.notes && (
            <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{sprint.notes}</p>
          )}
          {sprint.fixedItemRefs?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {sprint.fixedItemRefs.map((r: string) => (
                <span key={r} className="text-[10px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5">{r}</span>
              ))}
            </div>
          )}
        </div>
        {canManage && (
          <div className="flex gap-1">
            {(sprint.status === "draft" || sprint.status === "in_progress") && (
              <>
                <button onClick={onEdit} disabled={busy}
                  className="text-[11px] font-semibold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                  Edit
                </button>
                <button onClick={deploy} disabled={busy}
                  className="text-[11px] font-semibold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                  Deploy →
                </button>
              </>
            )}
            {sprint.status === "deployed" && (
              <button onClick={close} disabled={busy}
                className="text-[11px] font-semibold px-2 py-1 rounded border border-slate-200 hover:bg-slate-50">
                Close
              </button>
            )}
            {sprint.status === "draft" && (
              <button onClick={del} disabled={busy}
                className="text-[11px] font-semibold px-2 py-1 rounded text-red-700 border border-red-200 hover:bg-red-50">
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Guess the next buildRef: bump the patch component of v<major>.<minor>.<patch>.
// Admin can edit in the prompt; this just saves typing when following sem-ver.
function bumpPatch(current?: string) {
  if (!current) return "v1.0.0";
  const m = current.match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!m) return current;
  return `v${m[1]}.${m[2]}.${parseInt(m[3], 10) + 1}`;
}

function SprintDialog({ mode, sprintId, projectSlug, onClose, onChanged }: {
  mode: "create" | "edit"; sprintId?: string; projectSlug: string;
  onClose: () => void; onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [fixedItemRefs, setFixedItemRefs] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && sprintId) {
      api.getSprint(sprintId).then((s: any) => {
        setName(s.name || "");
        setNotes(s.notes || "");
        setFixedItemRefs((s.fixedItemRefs ?? []).join(", "));
      }).catch(() => {});
    }
  }, [mode, sprintId]);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 3) { setError("Name must be at least 3 characters"); return; }
    const refs = fixedItemRefs.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    try {
      if (mode === "create") {
        await api.createSprint(projectSlug, { name: name.trim(), notes: notes.trim() || undefined, fixedItemRefs: refs });
      } else if (sprintId) {
        await api.updateSprint(sprintId, { name: name.trim(), notes: notes.trim() || null as any, fixedItemRefs: refs });
      }
      onChanged();
      onClose();
    } catch (e: any) {
      setError(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center overflow-y-auto p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mt-10 mb-10 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{mode === "create" ? "🚀 Start a sprint" : "Edit sprint"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Sprint 1 — tester fixes April 2026"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Release notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="What changed in this sprint"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Fixed item refs
            </label>
            <input value={fixedItemRefs} onChange={(e) => setFixedItemRefs(e.target.value)}
              placeholder="1.4, 1.6, 1.16, 2.10, 2.13"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono" />
            <p className="text-[10px] text-slate-400 mt-0.5">Comma- or space-separated item references (e.g. "1.4, 1.6"). Once deployed, any previously-rejected signoff on these items gets a 🔁 re-verify badge.</p>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} disabled={busy}
              className="text-xs font-semibold px-3 py-2 rounded border border-slate-200 hover:bg-slate-50">Cancel</button>
            <button onClick={submit} disabled={busy}
              className="text-xs font-semibold px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
              {busy ? "Saving…" : mode === "create" ? "Create sprint" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
