// HP-4c: camera-first documents page (the last profile step → 100%). Blue-collar
// principle 5: camera capture default, live thumbnail, simple. Reuses the
// existing POST /api/v1/candidates/documents (multipart file + type).
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Landmark, Camera, FileText, Trash2, CheckCircle2, Loader2, ShieldCheck, ArrowLeft, IdCard, BookUser, GraduationCap, Briefcase, Files,
} from "lucide-react";

const DOC_SLOTS: { type: string; label: string; sub: string; icon: React.ElementType }[] = [
  { type: "identity_proof",         label: "Aadhaar / ID card",       sub: "Front side is enough",        icon: IdCard },
  { type: "passport",               label: "Passport",                sub: "The photo page",             icon: BookUser },
  { type: "educational_certificate",label: "Education certificate",   sub: "10th / 12th / degree",       icon: GraduationCap },
  { type: "experience_certificate", label: "Work experience letter",  sub: "If you have one",            icon: Briefcase },
  { type: "other",                  label: "Other document",          sub: "Anything else useful",       icon: Files },
];

export default function DocumentsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: docsRes } = useQuery<any>({ queryKey: ["/api/v1/candidates/documents"] });
  const docs: any[] = docsRes?.data || [];
  const docFor = (type: string) => docs.find((d) => d.type === type || (type === "other" && d.type === "certificate"));

  const upload = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      const fd = new FormData(); fd.append("file", file); fd.append("type", type);
      const res = await fetch("/api/v1/candidates/documents", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || "Upload failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      setUploading(null);
      toast({ title: "Document added" });
    },
    onError: (e: any) => { setUploading(null); toast({ title: e.message || "Could not upload", variant: "destructive" }); },
  });
  const del = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/v1/candidates/documents/${id}`, { method: "DELETE", credentials: "include" }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const pick = (type: string, file?: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: "File is too large (max 10 MB)", variant: "destructive" }); return; }
    setUploading(type);
    upload.mutate({ file, type });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      <div className="flex items-center justify-center gap-2 py-3 px-4 border-b border-slate-100 bg-white/80">
        <Landmark className="w-4 h-4 text-blue-700" />
        <p className="text-sm font-semibold text-slate-700">HPSEDC <span className="text-slate-400 font-normal">· Government of Himachal Pradesh</span></p>
      </div>
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Your documents</h1>
        <p className="text-base text-slate-500 mb-6">Take a photo of each document with your phone camera. Adding even one completes your profile.</p>

        <div className="space-y-3">
          {DOC_SLOTS.map((slot) => {
            const existing = docFor(slot.type);
            const Icon = slot.icon;
            const busy = uploading === slot.type;
            return (
              <div key={slot.type} className={`flex items-center gap-4 rounded-2xl border p-4 ${existing ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
                <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${existing ? "bg-emerald-100 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                  {existing ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900 leading-tight">{slot.label}</p>
                  <p className="text-xs text-slate-500 truncate">{existing ? existing.fileName || "Uploaded" : slot.sub}</p>
                </div>
                <input ref={(el) => { inputs.current[slot.type] = el; }} type="file" accept="image/*,.pdf" capture="environment" className="hidden"
                  onChange={(e) => pick(slot.type, e.target.files?.[0])} />
                {existing ? (
                  <button onClick={() => del.mutate(existing.id)} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 className="w-5 h-5" /></button>
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => inputs.current[slot.type]?.click()}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shrink-0">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Add
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-emerald-50/70 border border-emerald-100 p-4 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-800">Your documents are private and only seen by HPSEDC. No fees are charged for registration.</p>
        </div>

        <Button onClick={() => setLocation("/")} className="w-full h-14 mt-6 rounded-xl text-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white">
          {docs.length > 0 ? "Done" : "Skip for now"}
        </Button>
        <button onClick={() => setLocation("/")} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 py-3 mt-1 mx-auto"><ArrowLeft className="w-4 h-4" /> Back to dashboard</button>
      </div>
    </div>
  );
}
