import { useState } from "react";
import { api } from "@/lib/api";

type FeedbackType = "new_feature" | "enhancement" | "bug" | "ux" | "similar_sw" | "other";
const TYPES: Array<{ key: FeedbackType; label: string; hint: string }> = [
  { key: "new_feature", label: "New feature",    hint: "Something new we don't have yet" },
  { key: "enhancement", label: "Enhancement",    hint: "Make an existing thing better" },
  { key: "bug",         label: "Bug",            hint: "Something's wrong and reproducible" },
  { key: "ux",          label: "UX improvement", hint: "Layout / flow / wording" },
  { key: "similar_sw",  label: "Similar to…",    hint: "How Naukri / Greenhouse / etc. does it" },
  { key: "other",       label: "Other",          hint: "Doesn't fit above" },
];
const AREAS = ["candidate", "agent", "employer", "admin", "platform"] as const;

export function FeedbackDialog({ open, onClose, projectId, onSubmitted }: {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  onSubmitted?: (referenceCode: string) => void;
}) {
  const [type, setType] = useState<FeedbackType>("enhancement");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState<string>("");
  const [similarTo, setSimilarTo] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const reset = () => {
    setType("enhancement"); setTitle(""); setDescription(""); setArea("");
    setSimilarTo(""); setFiles([]); setError(null); setSubmitted(null);
  };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    setError(null);
    if (title.trim().length < 5 || title.trim().length > 150) {
      setError("Title must be 5–150 characters"); return;
    }
    if (description.trim().length < 20 || description.trim().length > 4000) {
      setError("Description must be 20–4000 characters"); return;
    }
    if (type === "similar_sw" && !similarTo.trim()) {
      setError("Please say which product/portal"); return;
    }
    setBusy(true);
    try {
      const item = await api.createFeedback({
        projectId,
        type,
        title: title.trim(),
        description: description.trim(),
        area: area || undefined,
        similarTo: type === "similar_sw" ? similarTo.trim() : undefined,
      });
      if (files.length > 0) {
        try { await api.uploadFeedbackAttachments(item.id, files); }
        catch (e: any) { setError(`Saved but attachment upload failed: ${e.message}`); }
      }
      setSubmitted(item.referenceCode);
      onSubmitted?.(item.referenceCode);
    } catch (e: any) {
      setError(e.message || "Submit failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center overflow-y-auto p-4"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mt-10 mb-10 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            💡 Suggest an idea
          </h3>
          <button onClick={close} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
        </div>

        {submitted ? (
          <div className="p-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <p className="text-sm text-emerald-800 font-semibold mb-1">Thanks — your idea is in the inbox.</p>
              <p className="text-xs text-emerald-700 mb-3">Reference code</p>
              <p className="text-3xl font-bold text-emerald-900 tabular-nums">{submitted}</p>
              <p className="text-xs text-emerald-700 mt-3">The delivery team will triage and update the status. You can add comments or attachments from the Ideas inbox on the project page.</p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={close}
                className="text-xs font-semibold px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50">
                Close
              </button>
              <button onClick={() => { reset(); }}
                className="text-xs font-semibold px-3 py-1.5 rounded bg-agentryx-600 text-white hover:bg-agentryx-700">
                Submit another
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Type chips */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button key={t.key} onClick={() => setType(t.key)} type="button"
                    className={`text-left rounded-lg border p-2 transition ${
                      type === t.key
                        ? "border-agentryx-500 bg-agentryx-50 text-agentryx-900"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}>
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[10px] text-slate-500">{t.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="One-line summary"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
              <p className="text-[10px] text-slate-400 mt-0.5">{title.length}/150</p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={5} placeholder="What should change, why, and what value it brings"
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
              <p className="text-[10px] text-slate-400 mt-0.5">{description.length}/4000</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Area (optional)</label>
                <select value={area} onChange={(e) => setArea(e.target.value)}
                  className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm bg-white">
                  <option value="">—</option>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {type === "similar_sw" && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Similar to which product</label>
                  <input value={similarTo} onChange={(e) => setSimilarTo(e.target.value)}
                    placeholder="e.g. Naukri, Greenhouse, Workday"
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm" />
                </div>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Attachments (images, max 5, 10 MB each)</label>
              <input type="file" multiple accept="image/*"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                className="text-xs" />
              {files.length > 0 && (
                <p className="text-[10px] text-slate-500 mt-1">{files.map((f) => f.name).join(", ")}</p>
              )}
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={close} disabled={busy}
                className="text-xs font-semibold px-3 py-2 rounded border border-slate-200 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={submit} disabled={busy}
                className="text-xs font-semibold px-4 py-2 rounded bg-agentryx-600 text-white hover:bg-agentryx-700 disabled:opacity-50">
                {busy ? "Submitting…" : "Submit idea"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
