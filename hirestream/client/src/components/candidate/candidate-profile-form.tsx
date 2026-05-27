import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Edit, Loader2, User, GraduationCap, Briefcase, FileText,
  Globe, Plus, Trash2, Upload, CheckCircle, AlertCircle, Lightbulb, X, Pencil,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: [] };
  return res.json();
}

// Clamp + cast a free-text numeric input. Used by Education year / percentage
// and Experience years so negatives / out-of-range values never reach the
// server — HTIS BUG-003 + BUG-004. Returns undefined when the string isn't a
// number so callers can short-circuit.
const clampNum = (raw: string, min: number, max: number): number | undefined => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, n));
};

// Extract a user-readable error string from a fetch Response. Prefers the
// server-sent validation message, falls back to HTTP status text.
async function readErr(res: Response) {
  try {
    const body = await res.json();
    return body?.error?.message || body?.message || res.statusText || "Save failed";
  } catch {
    return res.statusText || "Save failed";
  }
}

export function CandidateProfileForm({ initialData }: { initialData?: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          <Edit className="mr-2 h-4 w-4" /> Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Complete Your Profile</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basic" className="text-xs"><User className="w-3 h-3 mr-1" />Basic</TabsTrigger>
            <TabsTrigger value="education" className="text-xs"><GraduationCap className="w-3 h-3 mr-1" />Education</TabsTrigger>
            <TabsTrigger value="experience" className="text-xs"><Briefcase className="w-3 h-3 mr-1" />Experience</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs"><Globe className="w-3 h-3 mr-1" />Skills</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs"><FileText className="w-3 h-3 mr-1" />Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <BasicInfoTab initialData={initialData} onSaved={() => setActiveTab("education")} />
          </TabsContent>
          <TabsContent value="education">
            <EducationTab onNext={() => setActiveTab("experience")} />
          </TabsContent>
          <TabsContent value="experience">
            <ExperienceTab onNext={() => setActiveTab("skills")} />
          </TabsContent>
          <TabsContent value="skills">
            <SkillsPreferencesTab initialData={initialData} onSaved={() => setActiveTab("documents")} />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab 1: Basic Info ───────────────────────────────────────────────

function BasicInfoTab({ initialData, onSaved }: { initialData?: any; onSaved: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      fullName: initialData?.fullName || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      location: initialData?.location || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/v1/candidates/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await readErr(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: "Basic info saved" });
      onSaved();
    },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  // HTIS BUG-002 — mirror the server phone regex here so invalid input is
  // caught before the PATCH round-trip. Empty string allowed (field is optional).
  const phoneErr = form.watch("phone") && !/^\+?[0-9][0-9\s\-]{5,18}[0-9]$/.test(form.watch("phone"))
    ? "Digits only (optionally with +country code, spaces, or dashes). Example: +91 9876543210"
    : "";

  return (
    <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-4">
      <Hint text="Complete your basic info to get started. This helps agencies find you." />
      <div className="grid grid-cols-2 gap-4">
        <div><Label>Full Name *</Label><Input {...form.register("fullName")} placeholder="Your full name" /></div>
        <div><Label>Email *</Label><Input type="email" {...form.register("email")} /></div>
        <div>
          <Label>Phone</Label>
          <Input
            inputMode="tel"
            {...form.register("phone", { pattern: /^\+?[0-9][0-9\s\-]{5,18}[0-9]$/ })}
            placeholder="+91 9876543210"
            aria-invalid={!!phoneErr}
          />
          {phoneErr && <p className="text-[11px] text-red-600 mt-1">{phoneErr}</p>}
        </div>
        <div><Label>Location</Label><Input {...form.register("location")} placeholder="City, District" /></div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || !!phoneErr}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Save & Next →
        </Button>
      </div>
    </form>
  );
}

// ── Tab 2: Education ────────────────────────────────────────────────

function EducationTab({ onNext }: { onNext: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // `editingId === "new"` → add form; any other non-null id → edit. Single
  // state var keeps "only one row open at a time" invariant without a second
  // boolean flag.
  const [editingId, setEditingId] = useState<string | null>(null);
  const thisYear = new Date().getFullYear();
  const [form, setForm] = useState({ degree: "", institution: "", year: "", percentage: "" });

  const { data: eduRes, isLoading } = useQuery({
    queryKey: ["/api/v1/candidates/education"],
    queryFn: () => fetchJson("/api/v1/candidates/education"),
  });

  const resetForm = () => setForm({ degree: "", institution: "", year: "", percentage: "" });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Clamp to valid ranges on submit — prevents accidental paste of a
      // negative / absurd value from reaching the wire even if the `min`
      // attribute was bypassed.
      const year = form.year ? clampNum(form.year, 1950, thisYear + 1) : null;
      const pctNum = form.percentage ? clampNum(form.percentage, 0, 100) : null;
      const body = {
        degree: form.degree.trim(),
        institution: form.institution.trim(),
        year,
        percentage: pctNum !== undefined && pctNum !== null ? String(pctNum) : null,
      };
      const isNew = editingId === "new";
      const res = await fetch(
        isNew ? "/api/v1/candidates/education" : `/api/v1/candidates/education/${editingId}`,
        { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      if (!res.ok) throw new Error(await readErr(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/education"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: editingId === "new" ? "Education added" : "Education updated" });
      setEditingId(null); resetForm();
    },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/candidates/education/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/education"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const startEdit = (edu: any) => {
    setForm({
      degree: edu.degree ?? "",
      institution: edu.institution ?? "",
      year: edu.year != null ? String(edu.year) : "",
      percentage: edu.percentage != null ? String(edu.percentage) : "",
    });
    setEditingId(edu.id);
  };
  const startAdd = () => { resetForm(); setEditingId("new"); };

  const records = eduRes?.data || [];

  return (
    <div className="space-y-4 pt-4">
      <Hint text="Add at least 1 education record. Candidates with education details get 2x more recruiter views." />

      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
        <>
          {records.map((edu: any) => (
            <div key={edu.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{edu.degree}</p>
                <p className="text-xs text-gray-500">{edu.institution}{edu.year ? ` (${edu.year})` : ""}{edu.percentage ? ` — ${edu.percentage}%` : ""}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(edu)} title="Edit">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(edu.id)} title="Delete">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}

          {editingId ? (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Degree *</Label><Input value={form.degree} onChange={e => setForm({ ...form, degree: e.target.value })} placeholder="B.Tech, MBA, 12th..." /></div>
                <div><Label>Institution *</Label><Input value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} placeholder="IIT, University..." /></div>
                <div>
                  <Label>Year</Label>
                  <Input type="number" min={1950} max={thisYear + 1} step={1}
                    value={form.year}
                    onChange={e => setForm({ ...form, year: e.target.value })}
                    placeholder={String(thisYear)} />
                </div>
                <div>
                  <Label>Percentage / CGPA</Label>
                  <Input type="number" min={0} max={100} step="0.01"
                    value={form.percentage}
                    onChange={e => setForm({ ...form, percentage: e.target.value })}
                    placeholder="85.5  (or 8.5 on CGPA)" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!form.degree || !form.institution || saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  {editingId === "new" ? "Add" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingId(null); resetForm(); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={startAdd} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> Add Education
            </Button>
          )}
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext}>Next: Experience →</Button>
      </div>
    </div>
  );
}

// ── Tab 3: Experience ───────────────────────────────────────────────

function ExperienceTab({ onNext }: { onNext: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ company: "", role: "", years: "", country: "", description: "" });

  const { data: expRes, isLoading } = useQuery({
    queryKey: ["/api/v1/candidates/experience"],
    queryFn: () => fetchJson("/api/v1/candidates/experience"),
  });
  // Share the country list with Skills + this tab. Served via `content.routes.ts`.
  const { data: countriesRes } = useQuery({
    queryKey: ["/api/v1/content/countries"],
    queryFn: () => fetchJson("/api/v1/content/countries"),
  });
  const countries: { code: string; name: string }[] = countriesRes?.data || [];

  const resetForm = () => setForm({ company: "", role: "", years: "", country: "", description: "" });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const years = form.years ? clampNum(form.years, 0, 70) : 0;
      const body = {
        company: form.company.trim(),
        role: form.role.trim(),
        years,
        country: form.country || null,
        description: form.description.trim() || null,
      };
      const isNew = editingId === "new";
      const res = await fetch(
        isNew ? "/api/v1/candidates/experience" : `/api/v1/candidates/experience/${editingId}`,
        { method: isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      if (!res.ok) throw new Error(await readErr(res));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/experience"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: editingId === "new" ? "Experience added" : "Experience updated" });
      setEditingId(null); resetForm();
    },
    onError: (e: Error) => toast({ title: "Couldn't save", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/candidates/experience/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/experience"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const startEdit = (exp: any) => {
    setForm({
      company: exp.company ?? "",
      role: exp.role ?? "",
      years: exp.years != null ? String(exp.years) : "",
      country: exp.country ?? "",
      description: exp.description ?? "",
    });
    setEditingId(exp.id);
  };
  const startAdd = () => { resetForm(); setEditingId("new"); };

  const records = expRes?.data || [];

  return (
    <div className="space-y-4 pt-4">
      <Hint text="Add every relevant work experience — internships, freelance and contract roles all count." />

      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
        <>
          {records.map((exp: any) => (
            <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">{exp.role} at {exp.company}</p>
                <p className="text-xs text-gray-500">{exp.years} yr(s){exp.country ? ` — ${exp.country}` : ""}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(exp)} title="Edit">
                  <Pencil className="w-4 h-4 text-blue-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(exp.id)} title="Delete">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}

          {editingId ? (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Company *</Label><Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="TCS, Infosys..." /></div>
                <div><Label>Role *</Label><Input value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} placeholder="Developer, Nurse..." /></div>
                <div>
                  <Label>Years</Label>
                  <Input type="number" min={0} max={70} step={1}
                    value={form.years}
                    onChange={e => setForm({ ...form, years: e.target.value })}
                    placeholder="3" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Select value={form.country || undefined} onValueChange={(v) => setForm({ ...form, country: v })}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Description (optional)</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief about your role..." /></div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!form.company || !form.role || saveMutation.isPending}>
                  {saveMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                  {editingId === "new" ? "Add" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setEditingId(null); resetForm(); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={startAdd} className="w-full">
              <Plus className="w-4 h-4 mr-1" /> Add Experience
            </Button>
          )}
        </>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext}>Next: Skills →</Button>
      </div>
    </div>
  );
}

// ── Tab 4: Skills & Preferences ─────────────────────────────────────

function SkillsPreferencesTab({ initialData, onSaved }: { initialData?: any; onSaved: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      experience: initialData?.experience || 0,
      skills: (initialData?.skills || []).join(", "),
      preferredCountries: (initialData?.preferredCountries || []).join(", "),
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        experience: parseInt(data.experience) || 0,
        skills: data.skills.split(",").map((s: string) => s.trim()).filter(Boolean),
        preferredCountries: data.preferredCountries.split(",").map((s: string) => s.trim()).filter(Boolean),
      };
      const res = await fetch("/api/v1/candidates/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: "Skills & preferences saved" });
      onSaved();
    },
  });

  return (
    <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4 pt-4">
      <Hint text="Skills directly affect your match score. Add all relevant skills — the more, the better matches you'll get!" />
      <div>
        <Label>Total Years of Experience</Label>
        <Input type="number" {...form.register("experience")} placeholder="0" />
      </div>
      <div>
        <Label>Skills (comma separated) *</Label>
        <Input {...form.register("skills")} placeholder="React, Node.js, Python, Nursing, Welding..." />
        <p className="text-xs text-gray-400 mt-1">Skills are matched against job requirements for your match score (50% weight)</p>
      </div>
      <div>
        <Label>Preferred Countries (comma separated)</Label>
        <Input {...form.register("preferredCountries")} placeholder="UAE, Canada, Australia, UK..." />
        <p className="text-xs text-gray-400 mt-1">Country match adds 20% to your match score</p>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
          Save & Next →
        </Button>
      </div>
    </form>
  );
}

// ── Tab 5: Documents ────────────────────────────────────────────────

function DocumentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("cv");

  const { data: docsRes, isLoading } = useQuery({
    queryKey: ["/api/v1/candidates/documents"],
    queryFn: () => fetchJson("/api/v1/candidates/documents"),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", docType);

    try {
      const res = await fetch("/api/v1/candidates/documents", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: "Document uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/v1/candidates/documents/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const docs = docsRes?.data || [];

  const docCategories = [
    { value: "cv", label: "CV / Resume", icon: "📄" },
    { value: "passport", label: "Passport", icon: "🛂" },
    { value: "certificate", label: "Certificate", icon: "🎓" },
    { value: "other", label: "Other", icon: "📎" },
  ];

  return (
    <div className="space-y-4 pt-4">
      <Hint text="Upload your CV, passport copy, and certificates. Agencies need these to process your application. Accepted: PDF, JPG, PNG (max 5MB)." />

      {/* Upload area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-3">Select document type, then choose a file</p>
        <div className="flex items-center justify-center gap-3">
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {docCategories.map((c) => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 inline-flex items-center">
            {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
            {uploading ? "Uploading..." : "Choose File"}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Document list */}
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : docs.length === 0 ? (
        <p className="text-center text-gray-500 text-sm py-4">No documents uploaded yet</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg">{docCategories.find(c => c.value === doc.type)?.icon || "📎"}</span>
                <div>
                  <p className="text-sm font-medium truncate max-w-[250px]">{doc.fileName}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs capitalize">{doc.type}</Badge>
                    <span className="text-xs text-gray-400">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ""}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => window.open(`/api/v1/candidates/documents/${doc.id}/download`, "_blank")}>
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(doc.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
        <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-emerald-800">Profile setup complete!</p>
        <p className="text-xs text-emerald-600">Close this dialog. Your profile completion will update automatically.</p>
      </div>
    </div>
  );
}

// ── Hint Component ──────────────────────────────────────────────────

function Hint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-blue-700">{text}</p>
    </div>
  );
}
