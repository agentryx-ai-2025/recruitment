import { useParams, useLocation, Link } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, MapPin, Mail, Phone, GraduationCap, Briefcase, FileText,
  Globe, Star, Award, Loader2, Download, CheckCircle, Shield, ShieldAlert,
  Plane, Heart, BookOpen, Save,
} from "lucide-react";
import { PhotoAvatar } from "@/components/shared/PhotoAvatar";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: null };
  return res.json();
}

export default function AgentCandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: res, isLoading } = useQuery({
    queryKey: [`/api/v1/agencies/candidates/${id}`],
    queryFn: () => fetchJson(`/api/v1/agencies/candidates/${id}`),
  });

  const c = res?.data;

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!c) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Candidate not found</h1>
        <Button className="mt-6" onClick={() => setLocation("/")}>Back to dashboard</Button>
      </div>
    );
  }

  const initials = (c.fullName || "?").split(/\s+/).slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-4 flex items-center gap-3 text-sm">
        <button onClick={() => history.length > 1 ? history.back() : setLocation("/")}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-slate-300">/</span>
        <Link href="/" className="text-slate-500 hover:text-blue-600">Dashboard</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium">{c.fullName}</span>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
        <div className="flex items-start gap-5 flex-wrap">
          <PhotoAvatar photoUrl={c.photoUrl} name={c.fullName || "?"}
            size="w-20 h-20" rounded="rounded-2xl" textSize="text-3xl" />
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-2xl font-bold text-slate-900">{c.fullName}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-2">
              {c.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" />{c.location}</span>}
              {c.experience > 0 && <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-slate-400" />{c.experience} yrs experience</span>}
              {c.preferredCountries?.length > 0 && (
                <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-slate-400" />{c.preferredCountries.join(", ")}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => window.location.href = `mailto:${c.email}`}>
                <Mail className="w-4 h-4 mr-1.5" /> {c.email}
              </Button>
              {c.phone && (
                <Button size="sm" variant="outline" onClick={() => window.location.href = `tel:${c.phone}`}>
                  <Phone className="w-4 h-4 mr-1.5" /> Call
                </Button>
              )}
            </div>
          </div>
        </div>

        {c.skills?.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {c.skills.map((s: string) => <Badge key={s} variant="secondary" className="text-xs rounded-lg px-3 py-1">{s}</Badge>)}
            </div>
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your private tags</h2>
          <PrivateTagsEditor candidateId={c.id} />
        </section>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-violet-600" /> Education
          </h2>
          {c.education?.length === 0 && <p className="text-sm text-slate-400">No records.</p>}
          <div className="space-y-2">
            {c.education.map((e: any) => (
              <div key={e.id} className="bg-violet-50/40 border border-violet-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-900">{e.degree}</p>
                <p className="text-xs text-slate-500">{e.institution}</p>
                <div className="flex items-center gap-2 mt-1">
                  {e.year && <Badge variant="outline" className="text-[10px] bg-white">{e.year}</Badge>}
                  {e.percentage && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">{e.percentage}%</Badge>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-emerald-600" /> Experience
          </h2>
          {c.experience?.length === 0 && <p className="text-sm text-slate-400">No records.</p>}
          <div className="space-y-2">
            {(c.experience ?? []).map((e: any) => (
              <div key={e.id} className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-900">{e.role}</p>
                <p className="text-xs text-slate-600 font-medium">{e.company}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-white">{e.years} yrs</Badge>
                  {e.country && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">{e.country}</Badge>}
                </div>
                {e.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{e.description}</p>}
              </div>
            ))}
          </div>
        </section>
      </div>

      {c.documents?.length > 0 && (
        <section className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-purple-600" /> Documents
          </h2>
          <div className="grid md:grid-cols-2 gap-2">
            {c.documents.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{d.fileName}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] capitalize">{d.type}</Badge>
                      {d.verified && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle className="w-2.5 h-2.5 mr-0.5" /> Verified</Badge>}
                    </div>
                  </div>
                </div>
                <a href={`/api/v1/candidates/documents/${d.id}/download`} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-1"><Download className="w-3.5 h-3.5" /></Button>
                </a>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Compliance & pre-departure panel — overseas-placement essential */}
      <ComplianceAndWelfarePanel candidate={c} applications={c.applications ?? []} />

      {c.applications?.length > 0 && (
        <section className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-amber-600" /> Applications ({c.applications.length})
          </h2>
          <div className="space-y-2">
            {c.applications.map((a: any) => (
              <Link key={a.id} href={`/agent/jobs/${a.jobId}`}
                className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 transition">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{a.jobTitle}</p>
                  <p className="text-xs text-slate-500">{a.company} · {a.country}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">{a.status?.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className={`text-[10px] font-semibold ${a.matchScore >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50"}`}>
                    {a.matchScore}%
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Compliance & Welfare Panel ───────────────────────────────────────
function ComplianceAndWelfarePanel({ candidate, applications }: { candidate: any; applications: any[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    passportNumber: candidate.passportNumber ?? "",
    passportExpiry: candidate.passportExpiry ?? "",
    ecrStatus: candidate.ecrStatus ?? "",
    pccStatus: candidate.pccStatus ?? "",
    medicalStatus: candidate.medicalStatus ?? "",
    ieltsBand: candidate.ieltsBand ?? "",
    pdoCompleted: !!candidate.pdoCompleted,
    pdoDate: candidate.pdoDate ?? "",
    pbbyInsuranceStatus: candidate.pbbyInsuranceStatus ?? "",
    pbbyPolicyNumber: candidate.pbbyPolicyNumber ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/v1/agent/candidates/${candidate.id}/compliance`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ieltsBand: form.ieltsBand === "" ? null : Number(form.ieltsBand),
          passportExpiry: form.passportExpiry || null,
          pdoDate: form.pdoDate || null,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Compliance record saved" });
      qc.invalidateQueries({ queryKey: [`/api/v1/agencies/candidates/${candidate.id}`] });
    },
    onError: () => toast({ title: "Couldn't save", variant: "destructive" }),
  });

  const statusBadge = (status: string, ok: string, pending: string, bad: string) => {
    if (!status) return <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">Not set</Badge>;
    const cls = status === ok ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === pending ? "bg-amber-50 text-amber-700 border-amber-200"
      : status === bad ? "bg-red-50 text-red-700 border-red-200"
      : "bg-slate-50 text-slate-700";
    return <Badge variant="outline" className={`text-[10px] capitalize ${cls}`}>{status.replace(/_/g, " ")}</Badge>;
  };

  const activePlacement = applications.find((a) => a.status === "selected" || a.status === "placed");

  return (
    <section className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5" />
          <div>
            <h2 className="font-bold">Pre-Departure Compliance (MEA / Emigration Act)</h2>
            <p className="text-xs text-slate-300">Mandatory regulatory data for overseas placement. Agent-maintained.</p>
          </div>
        </div>
      </div>

      <div className="p-5 grid md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Passport */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Passport</h3>
            {candidate.passportNumber && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">On file</Badge>}
          </div>
          <Input placeholder="Passport number" value={form.passportNumber}
            onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
            className="h-9 text-sm mb-2" />
          <label className="text-[10px] text-slate-500">Expiry</label>
          <Input type="date" value={form.passportExpiry}
            onChange={(e) => setForm({ ...form, passportExpiry: e.target.value })}
            min={new Date().toISOString().slice(0, 10)}
            className="h-9 text-sm" />
        </div>

        {/* ECR Status */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">ECR Status</h3>
            {statusBadge(candidate.ecrStatus ?? "", "ecnr", "", "ecr")}
          </div>
          <Select value={form.ecrStatus} onValueChange={(v) => setForm({ ...form, ecrStatus: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ecnr">ECNR (no clearance needed)</SelectItem>
              <SelectItem value="ecr">ECR (emigration clearance required)</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400 mt-1">ECR holders need POE clearance for 18 Gulf + Malaysia countries.</p>
        </div>

        {/* PCC */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-2">Police Clearance (PCC)</h3>
          <Select value={form.pccStatus} onValueChange={(v) => setForm({ ...form, pccStatus: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="not_required">Not required</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Medical */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Medical Fitness</h3>
          </div>
          <Select value={form.medicalStatus} onValueChange={(v) => setForm({ ...form, medicalStatus: v })}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fit">Fit</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="unfit">Unfit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* IELTS */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-2">IELTS band (if applicable)</h3>
          <Input type="number" step="0.5" min="0" max="9" placeholder="e.g. 7.5"
            value={form.ieltsBand}
            onChange={(e) => setForm({ ...form, ieltsBand: e.target.value })}
            className="h-9 text-sm" />
        </div>

        {/* PDO */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-4 h-4 text-cyan-600" />
            <h3 className="text-sm font-bold text-slate-900">Pre-Departure Orientation (PDO)</h3>
            {candidate.pdoCompleted && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Completed</Badge>}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.pdoCompleted}
                onChange={(e) => setForm({ ...form, pdoCompleted: e.target.checked })}
                className="w-4 h-4" />
              Completed
            </label>
            <Input type="date" value={form.pdoDate}
              onChange={(e) => setForm({ ...form, pdoDate: e.target.value })}
              className="h-9 text-sm flex-1" />
          </div>
        </div>

        {/* PBBY */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">PBBY Insurance (Pravasi Bharatiya Bima Yojana)</h3>
            {statusBadge(candidate.pbbyInsuranceStatus ?? "", "enrolled", "pending", "")}
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Select value={form.pbbyInsuranceStatus} onValueChange={(v) => setForm({ ...form, pbbyInsuranceStatus: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="not_required">Not required</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Policy number" value={form.pbbyPolicyNumber}
              onChange={(e) => setForm({ ...form, pbbyPolicyNumber: e.target.value })}
              className="h-9 text-sm" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Mandatory for ECR-category emigrants under Emigration Act §10.</p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-50 px-5 py-3 rounded-b-2xl border-t border-slate-100">
        <p className="text-xs text-slate-500">Changes here are written to the audit log.</p>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending} className="gap-1">
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save compliance
        </Button>
      </div>

      {/* Welfare panel if candidate has an active placement */}
      {activePlacement?.placementId && <WelfarePanel placementId={activePlacement.placementId} />}
    </section>
  );
}

function WelfarePanel({ placementId }: { placementId: string }) {
  // Minimal UI scaffolding — full 30/60/90 check-in cards; agent records status + notes
  const { toast } = useToast();
  const qc = useQueryClient();
  const record = useMutation({
    mutationFn: async ({ milestone, status, notes }: { milestone: string; status: string; notes?: string }) => {
      const r = await fetch(`/api/v1/agent/placements/${placementId}/welfare`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone, status, notes: notes ?? null }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { toast({ title: "Welfare check-in recorded" }); qc.invalidateQueries({}); },
  });
  const ask = (milestone: string) => {
    const status = window.prompt("Status: ok / concerns / no_response / not_applicable");
    if (!status || !["ok", "concerns", "no_response", "not_applicable"].includes(status)) return;
    const notes = window.prompt("Any notes? (optional)") || undefined;
    record.mutate({ milestone, status, notes });
  };
  return (
    <div className="border-t border-slate-100 p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Heart className="w-4 h-4 text-rose-600" /> Post-placement welfare check-ins
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {["30", "60", "90"].map(m => (
          <button key={m} onClick={() => ask(m)}
            className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-lg p-4 text-left hover:border-rose-400 transition">
            <p className="text-xs font-semibold text-rose-800">{m}-day check-in</p>
            <p className="text-[10px] text-rose-600 mt-1">Click to record status</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Private per-agent tags on a candidate ────────────────────────────
// LinkedIn Recruiter-style: the agent's personal annotations ("good-english",
// "passport-expires-aug"). Visible only to the agent who wrote them.
function PrivateTagsEditor({ candidateId }: { candidateId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data: res } = useQuery({
    queryKey: [`/api/v1/agent/candidates/${candidateId}/tags`],
    queryFn: async () => (await fetch(`/api/v1/agent/candidates/${candidateId}/tags`)).json(),
  });
  const tags: any[] = res?.data ?? [];

  const add = useMutation({
    mutationFn: async () => {
      const tag = text.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      if (!tag) return;
      const r = await fetch(`/api/v1/agent/candidates/${candidateId}/tags`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tag }),
      });
      if (!r.ok) throw new Error("Could not add tag");
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: [`/api/v1/agent/candidates/${candidateId}/tags`] }); },
  });
  const del = useMutation({
    mutationFn: async (tagId: string) => {
      await fetch(`/api/v1/agent/candidates/${candidateId}/tags/${tagId}`, { method: "DELETE" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/v1/agent/candidates/${candidateId}/tags`] }); },
  });

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.length === 0 && <p className="text-xs text-slate-400 italic">No tags yet. Add private notes like <span className="font-mono">good-english</span> or <span className="font-mono">gulf-ready</span>.</p>}
        {tags.map((t: any) => (
          <span key={t.id} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-1">
            <span>#{t.tag}</span>
            <button onClick={() => del.mutate(t.id)} className="text-slate-400 hover:text-red-600 ml-0.5" title="Remove tag" aria-label={`Remove ${t.tag}`}>×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add.mutate(); } }}
          placeholder="Add a tag (letters, digits, dashes) — press Enter"
          className="text-sm h-9"
          maxLength={40}
        />
        <Button size="sm" variant="outline" onClick={() => add.mutate()} disabled={!text.trim() || add.isPending}>
          Add
        </Button>
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">Private to your agency. Other agencies looking at this candidate won't see your tags.</p>
    </div>
  );
}
