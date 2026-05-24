import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  User, GraduationCap, Briefcase, Globe, FileText,
  Plus, Trash2, Upload, CheckCircle, AlertCircle,
  Lightbulb, Loader2, ArrowLeft, ArrowRight, Check, Home,
  X, Search, MapPin, Mail, Phone, Building, Calendar,
  Award, Sparkles, Shield, Star
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HP_DISTRICTS, INDIAN_STATES, DESTINATION_COUNTRIES, SKILL_CATEGORIES, ALL_SKILLS } from "@/lib/reference-data";

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) return { data: null };
  return res.json();
}

const STEPS = [
  { key: "basic", label: "Personal Info", icon: User, color: "from-blue-500 to-blue-600", bg: "bg-blue-50", ring: "ring-blue-200", text: "text-blue-700" },
  { key: "education", label: "Education", icon: GraduationCap, color: "from-violet-500 to-violet-600", bg: "bg-violet-50", ring: "ring-violet-200", text: "text-violet-700" },
  { key: "experience", label: "Experience", icon: Briefcase, color: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700" },
  { key: "skills", label: "Skills & Prefs", icon: Globe, color: "from-amber-500 to-amber-600", bg: "bg-amber-50", ring: "ring-amber-200", text: "text-amber-700" },
  { key: "documents", label: "Documents", icon: FileText, color: "from-rose-500 to-rose-600", bg: "bg-rose-50", ring: "ring-rose-200", text: "text-rose-700" },
];

// Animation variants
const pageVariants = {
  initial: { opacity: 0, x: 40, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -40, scale: 0.98, transition: { duration: 0.3 } },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function ProfileWizard() {
  // Honor ?step=N from the dashboard smart CTA
  const initialStep = (() => {
    const raw = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("step");
    const n = raw ? parseInt(raw, 10) - 1 : NaN;
    return Number.isFinite(n) && n >= 0 && n < 5 ? n : 0;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profileRes } = useQuery({
    queryKey: ["/api/v1/candidates/profile"],
    queryFn: () => fetchJson("/api/v1/candidates/profile"),
  });
  const { data: completionRes } = useQuery({
    queryKey: ["/api/v1/candidates/profile/completion"],
    queryFn: () => fetchJson("/api/v1/candidates/profile/completion"),
  });

  const profile = profileRes?.data || {};
  const completion = completionRes?.data || { percentage: 0, checks: [] };
  const currentStepData = STEPS[currentStep];

  const goTo = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back to Dashboard */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-8 group transition-colors"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Dashboard
        </motion.button>

        {/* Hero Header with gradient */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 md:p-8 mb-8 shadow-xl shadow-blue-900/10"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-40" />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Complete Your Profile</h1>
              <p className="text-blue-100 text-sm mt-1.5">Each section improves your match scores and visibility to overseas recruiters</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-5 py-3 text-center">
                <p className="text-3xl font-bold text-white tabular-nums">{completion.percentage}<span className="text-lg text-blue-200">%</span></p>
                <p className="text-[11px] text-blue-200 font-medium">Complete</p>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="relative mt-5">
            <div className="h-2 bg-white/15 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-white/90 to-blue-200 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completion.percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Step Navigation — large, premium pill-style */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
          className="flex items-center gap-0 mb-8 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm overflow-x-auto"
        >
          {STEPS.map((step, i) => {
            const StepIcon = step.icon;
            const isCurrent = i === currentStep;
            const checkStatus = completion.checks?.find((c: any) => {
              if (step.key === "basic") return ["fullName", "email", "phone", "location"].includes(c.name);
              if (step.key === "education") return c.name === "education";
              if (step.key === "experience") return c.name === "experience";
              if (step.key === "skills") return c.name === "skills";
              if (step.key === "documents") return c.name === "documents";
              return false;
            });
            const stepDone = step.key === "basic"
              ? completion.checks?.filter((c: any) => ["fullName", "email", "phone", "location"].includes(c.name)).every((c: any) => c.done)
              : checkStatus?.done;

            return (
              <button
                key={step.key}
                onClick={() => goTo(i)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                  isCurrent
                    ? `bg-gradient-to-r ${step.color} text-white shadow-lg shadow-blue-500/20`
                    : stepDone
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCurrent ? "bg-white/20" : stepDone ? "bg-emerald-200" : "bg-slate-200/50"
                }`}>
                  {stepDone && !isCurrent ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden md:inline">{step.label}</span>
              </button>
            );
          })}
        </motion.div>

        {/* Step Content — animated */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-900/[0.04] overflow-hidden"
          >
            {/* Step color bar at top */}
            <div className={`h-1.5 bg-gradient-to-r ${currentStepData.color}`} />

            <div className="p-6 md:p-8">
              {currentStep === 0 && <BasicInfoStep profile={profile} onNext={() => goTo(1)} />}
              {currentStep === 1 && <EducationStep onNext={() => goTo(2)} onBack={() => goTo(0)} />}
              {currentStep === 2 && <ExperienceStep onNext={() => goTo(3)} onBack={() => goTo(1)} />}
              {currentStep === 3 && <SkillsStep profile={profile} onNext={() => goTo(4)} onBack={() => goTo(2)} />}
              {currentStep === 4 && <DocumentsStep onBack={() => goTo(3)} onFinish={() => setLocation("/")} />}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Premium Section Header ──────────────────────────────────────────
function SectionHeader({ icon: Icon, color, title, subtitle }: {
  icon: React.ElementType; color: string; title: string; subtitle: string;
}) {
  return (
    <motion.div variants={fadeUp} className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Hint ─────────────────────────────────────────────────────────────
function Hint({ text }: { text: string }) {
  return (
    <motion.div variants={fadeUp} className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl p-4 mb-6">
      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Lightbulb className="w-4 h-4 text-amber-600" />
      </div>
      <p className="text-sm text-amber-800 leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ── Resume Parse Widget (AI-assisted profile fill) ──────────────────
function ResumeParseWidget({ onApply }: { onApply: (parsed: any) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/resume/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data.extracted);
      } else {
        toast({ title: "Parse failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Parse failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result) return;
    onApply(result);
    toast({ title: "Applied!", description: `Added ${result.skills?.length || 0} skills, ${result.preferredCountries?.length || 0} countries` });
    setOpen(false);
    setText("");
    setResult(null);
  };

  return (
    <motion.div variants={fadeUp} className="bg-gradient-to-br from-indigo-50 via-purple-50/60 to-pink-50/40 border border-indigo-200/50 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-slate-900">AI Resume Parser</p>
            <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px]">Smart</Badge>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">Paste your resume text — we'll extract skills, experience, degrees, and country preferences automatically.</p>
          {!open ? (
            <Button size="sm" onClick={() => setOpen(true)}
              className="mt-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Parse Resume
            </Button>
          ) : (
            <div className="mt-3 space-y-3">
              <textarea
                className="w-full min-h-[140px] p-3 border border-indigo-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                placeholder="Paste your resume text here (or use plain CV content)..."
                value={text} onChange={e => setText(e.target.value)}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={parse} disabled={!text.trim() || loading}
                  className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Sparkles className="w-3.5 h-3.5 mr-1" /> Parse</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setOpen(false); setText(""); setResult(null); }} className="rounded-lg text-xs">
                  Cancel
                </Button>
              </div>

              {result && (
                <div className="bg-white rounded-lg border border-indigo-200 p-3 space-y-2">
                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Extracted Data</p>
                  <div className="text-xs space-y-1.5">
                    {result.name && <p><span className="text-slate-500">Name:</span> <span className="font-semibold">{result.name}</span></p>}
                    {result.experience != null && <p><span className="text-slate-500">Experience:</span> <span className="font-semibold">{result.experience} years</span></p>}
                    {result.degrees?.length > 0 && (
                      <p><span className="text-slate-500">Degrees:</span> <span className="font-semibold">{result.degrees.join(", ")}</span></p>
                    )}
                    {result.skills?.length > 0 && (
                      <div>
                        <p className="text-slate-500 mb-1">Skills ({result.skills.length}):</p>
                        <div className="flex flex-wrap gap-1">
                          {result.skills.slice(0, 15).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700">{s}</Badge>
                          ))}
                          {result.skills.length > 15 && <Badge variant="outline" className="text-[10px]">+{result.skills.length - 15}</Badge>}
                        </div>
                      </div>
                    )}
                    {result.preferredCountries?.length > 0 && (
                      <p><span className="text-slate-500">Countries:</span> <span className="font-semibold">{result.preferredCountries.join(", ")}</span></p>
                    )}
                  </div>
                  <Button size="sm" onClick={apply}
                    className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs mt-2">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Apply to Profile
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Premium Input Field ─────────────────────────────────────────────
function FormField({ label, required, icon: Icon, children, hint }: {
  label: string; required?: boolean; icon?: React.ElementType; children: React.ReactNode; hint?: string;
}) {
  // Plain div — no motion variants. Previous version relied on a parent
  // `variants={staggerContainer}` that doesn't propagate through
  // AnimatePresence branches, leaving fields stuck at opacity 0.
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
        {label}
        {required && <span className="text-red-500 text-xs">*</span>}
      </Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />}
        {children}
      </div>
      {hint && <p className="text-xs text-slate-400 pl-1">{hint}</p>}
    </div>
  );
}

// ── Nav Buttons ──────────────────────────────────────────────────────
function StepNav({ onBack, onNext, nextLabel = "Save & Continue", loading = false, disabled = false }: {
  onBack?: () => void; onNext?: () => void; nextLabel?: string; loading?: boolean; disabled?: boolean;
}) {
  return (
    <motion.div variants={fadeUp} className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
      {onBack ? (
        <Button variant="outline" onClick={onBack} className="gap-2 h-11 px-5 rounded-xl border-slate-200 hover:bg-slate-50">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      ) : <div />}
      {onNext && (
        <Button
          onClick={onNext}
          disabled={disabled || loading}
          className="gap-2 h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:-translate-y-0.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {nextLabel} {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      )}
    </motion.div>
  );
}

// ── Step 1: Basic Info ───────────────────────────────────────────────
function BasicInfoStep({ profile, onNext }: { profile: any; onNext: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile.fullName || "");
  const [email, setEmail] = useState(profile.email || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [username, setUsername] = useState(profile.username || "");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("Himachal Pradesh");
  const [pinCode, setPinCode] = useState("");

  useEffect(() => {
    if (profile.fullName) setFullName(profile.fullName);
    if (profile.email) setEmail(profile.email);
    if (profile.phone) setPhone(profile.phone);
    if (profile.username) setUsername(profile.username);
    if (profile.location) {
      const parts = profile.location.split(",").map((s: string) => s.trim());
      if (parts.length >= 2) { setDistrict(parts[0]); setState(parts[1]); }
      else if (parts.length === 1) { setDistrict(parts[0]); }
    }
    // Rehydrate postal-address fields so editing an existing profile shows what
    // was saved. Previously the wizard state was always blank on reload — users
    // would re-type their address only to see it vanish on save (regression
    // fixed together with the missing-column bug).
    if (profile.addressLine1) setAddressLine1(profile.addressLine1);
    if (profile.addressLine2) setAddressLine2(profile.addressLine2);
    if (profile.city) setCity(profile.city);
    if (profile.pinCode) setPinCode(profile.pinCode);
  }, [profile]);

  const location = [district, state].filter(Boolean).join(", ");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/candidates/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName, email, phone, location, username: username || undefined,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          pinCode: pinCode || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: "Personal info saved" });
      onNext();
    },
  });

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <SectionHeader icon={User} color="from-blue-500 to-blue-600" title="Personal Information" subtitle="Basic details that help agencies identify and contact you" />
      <Hint text="Fill in your complete details. Agencies search candidates by location, so accuracy matters." />

      {/* Identity Section */}
      <motion.div variants={fadeUp} className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 rounded-xl border border-blue-100/60 p-5 mb-6">
        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <User className="w-4 h-4" /> Identity Details
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Full Name" required icon={User}>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full legal name"
              className="pl-11 h-12 rounded-xl border-blue-200/80 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          </FormField>
          <FormField label="Email" required icon={Mail}>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="pl-11 h-12 rounded-xl border-blue-200/80 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
          </FormField>
          <FormField label="Username" icon={User} hint="Your unique login ID">
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. mobiletest"
              className="pl-11 h-12 rounded-xl border-blue-200/80 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </FormField>
          <FormField label="Phone Number" icon={Phone} hint="Digits only (optionally with +country code, spaces, or dashes)">
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              inputMode="tel"
              pattern="^\+?[0-9][0-9\s\-]{5,18}[0-9]$"
              className="pl-11 h-12 rounded-xl border-blue-200/80 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
            {phone && !/^\+?[0-9][0-9\s\-]{5,18}[0-9]$/.test(phone) && (
              <p className="text-[11px] text-red-600 mt-1 pl-2">Phone must be digits only.</p>
            )}
          </FormField>
        </div>
      </motion.div>

      {/* Address Section */}
      <motion.div variants={fadeUp} className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 rounded-xl border border-emerald-100/60 p-5">
        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Address
        </p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Address Line 1">
              <Input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} placeholder="House/Flat No., Street, Colony"
                className="h-12 rounded-xl border-emerald-200/80 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
            </FormField>
            <FormField label="Address Line 2">
              <Input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} placeholder="Landmark, Area (optional)"
                className="h-12 rounded-xl border-emerald-200/80 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="City / Town">
              <Input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Shimla"
                className="h-12 rounded-xl border-emerald-200/80 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
            </FormField>
            <FormField label="State">
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="h-12 rounded-xl border-emerald-200/80 bg-white"><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="PIN Code">
              <Input value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="171001" maxLength={6}
                className="h-12 rounded-xl border-emerald-200/80 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
            </FormField>
          </div>
          <div>
            <FormField label="District" required>
              {state === "Himachal Pradesh" ? (
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger className="h-12 rounded-xl border-emerald-200/80 bg-white">
                    <MapPin className="w-4 h-4 mr-2 text-emerald-500" /><SelectValue placeholder="Select HP district" />
                  </SelectTrigger>
                  <SelectContent>
                    {HP_DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Enter your district"
                  className="h-12 rounded-xl border-emerald-200/80 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all" />
              )}
            </FormField>
            {state === "Himachal Pradesh" && (
              <p className="text-[11px] text-emerald-600 mt-1.5 flex items-center gap-1.5 ml-1">
                <Shield className="w-3.5 h-3.5" /> All 12 HP districts from LGD (Local Government Directory)
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <StepNav onNext={() => mutation.mutate()} loading={mutation.isPending} disabled={!fullName || !email} />
    </motion.div>
  );
}

// ── Step 2: Education ────────────────────────────────────────────────
function EducationStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [degree, setDegree] = useState(""); const [institution, setInstitution] = useState("");
  const [year, setYear] = useState(""); const [percentage, setPercentage] = useState("");

  const { data: eduRes, isLoading } = useQuery({
    queryKey: ["/api/v1/candidates/education"], queryFn: () => fetchJson("/api/v1/candidates/education"),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/candidates/education", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree, institution, year: parseInt(year) || null, percentage }),
      });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/education"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      setAdding(false); setDegree(""); setInstitution(""); setYear(""); setPercentage("");
      toast({ title: "Education added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/v1/candidates/education/${id}`, { method: "DELETE" }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/education"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const records = eduRes?.data || [];

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <SectionHeader icon={GraduationCap} color="from-violet-500 to-violet-600" title="Education" subtitle="Add your academic qualifications — at least one is required" />
      <Hint text="Candidates with education details get 2x more views from recruiters. Include your highest qualification first." />

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-8 text-violet-500" /> : (
        <>
          {/* Existing records */}
          {records.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-3 mb-6">
              {records.map((edu: any, i: number) => (
                <motion.div
                  key={edu.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-violet-50/80 to-purple-50/40 rounded-xl border border-violet-100/60 hover:shadow-md hover:shadow-violet-100/50 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0 shadow-inner">
                      <GraduationCap className="w-6 h-6 text-violet-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">{edu.degree}</p>
                      <p className="text-xs text-slate-500 truncate">{edu.institution}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {edu.year && <Badge variant="outline" className="text-[10px] bg-white text-slate-600 border-slate-200 px-1.5 py-0">{edu.year}</Badge>}
                        {edu.percentage && <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 px-1.5 py-0">{edu.percentage}%</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(edu.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Add form */}
          <AnimatePresence mode="wait">
            {adding ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-br from-violet-50 to-purple-50/50 border border-violet-200/60 rounded-xl p-6 space-y-5">
                  <p className="text-sm font-bold text-violet-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Education Record
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Degree / Qualification" required icon={Award}>
                      <Input value={degree} onChange={e => setDegree(e.target.value)} placeholder="B.Tech, MBA, 12th..."
                        className="pl-11 h-12 rounded-xl border-violet-200/80 bg-white" />
                    </FormField>
                    <FormField label="Institution" required icon={Building}>
                      <Input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="University name..."
                        className="pl-11 h-12 rounded-xl border-violet-200/80 bg-white" />
                    </FormField>
                    <FormField label="Year of Passing" icon={Calendar}>
                      <Input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2024"
                        className="pl-11 h-12 rounded-xl border-violet-200/80 bg-white" />
                    </FormField>
                    <FormField label="Percentage / CGPA" icon={Star}>
                      <Input value={percentage} onChange={e => setPercentage(e.target.value)} placeholder="85.5 or 8.5"
                        className="pl-11 h-12 rounded-xl border-violet-200/80 bg-white" />
                    </FormField>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => addMutation.mutate()} disabled={!degree || !institution || addMutation.isPending}
                      className="gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white shadow-lg shadow-violet-500/25">
                      {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Education
                    </Button>
                    <Button variant="outline" onClick={() => setAdding(false)} className="rounded-xl">Cancel</Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="trigger"
                variants={fadeUp}
                onClick={() => setAdding(true)}
                className="w-full border-2 border-dashed border-violet-300/60 rounded-xl p-6 text-sm text-violet-500 hover:border-violet-400 hover:text-violet-700 hover:bg-violet-50/50 transition-all flex items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium">Add Education Record</span>
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" />
    </motion.div>
  );
}

// ── Step 3: Experience ───────────────────────────────────────────────
function ExperienceStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [company, setCompany] = useState(""); const [role, setRole] = useState("");
  const [years, setYears] = useState(""); const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");

  const { data: expRes, isLoading } = useQuery({
    queryKey: ["/api/v1/candidates/experience"], queryFn: () => fetchJson("/api/v1/candidates/experience"),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/candidates/experience", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, years: parseInt(years) || 0, country, description }),
      });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/experience"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      setAdding(false); setCompany(""); setRole(""); setYears(""); setCountry(""); setDescription("");
      toast({ title: "Experience added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/v1/candidates/experience/${id}`, { method: "DELETE" }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/experience"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const records = expRes?.data || [];

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <SectionHeader icon={Briefcase} color="from-emerald-500 to-emerald-600" title="Work Experience" subtitle="Add your work history — even internships and freelance count" />
      <Hint text="Experience contributes 30% to your match score. Candidates with 3+ years get significantly better matches." />

      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto my-8 text-emerald-500" /> : (
        <>
          {records.length > 0 && (
            <motion.div variants={fadeUp} className="space-y-3 mb-6">
              {records.map((exp: any, i: number) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="group flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 rounded-xl border border-emerald-100/60 hover:shadow-md hover:shadow-emerald-100/50 transition-all"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0 shadow-inner">
                      <Briefcase className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-slate-900 truncate">{exp.role}</p>
                      <p className="text-xs text-slate-600 font-medium truncate">{exp.company}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] bg-white text-slate-600 border-slate-200 px-1.5 py-0">{exp.years} year{exp.years !== 1 ? "s" : ""}</Badge>
                        {exp.country && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0">{exp.country}</Badge>}
                      </div>
                      {exp.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{exp.description}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(exp.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {adding ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/60 rounded-xl p-6 space-y-5">
                  <p className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                    <Plus className="w-4 h-4" /> New Experience Record
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Company" required icon={Building}>
                      <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="TCS, Infosys..."
                        className="pl-11 h-12 rounded-xl border-emerald-200/80 bg-white" />
                    </FormField>
                    <FormField label="Job Role" required icon={Briefcase}>
                      <Input value={role} onChange={e => setRole(e.target.value)} placeholder="Developer, Nurse..."
                        className="pl-11 h-12 rounded-xl border-emerald-200/80 bg-white" />
                    </FormField>
                    <FormField label="Years" icon={Calendar}>
                      <Input type="number" value={years} onChange={e => setYears(e.target.value)} placeholder="3"
                        className="pl-11 h-12 rounded-xl border-emerald-200/80 bg-white" />
                    </FormField>
                    <FormField label="Country" icon={Globe}>
                      <Input value={country} onChange={e => setCountry(e.target.value)} placeholder="India, UAE..."
                        className="pl-11 h-12 rounded-xl border-emerald-200/80 bg-white" />
                    </FormField>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">Brief Description</Label>
                    <textarea
                      className="w-full mt-2 p-4 border border-emerald-200/80 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 min-h-[80px] transition-all"
                      value={description} onChange={e => setDescription(e.target.value)} placeholder="Key responsibilities..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => addMutation.mutate()} disabled={!company || !role || addMutation.isPending}
                      className="gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/25">
                      {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Experience
                    </Button>
                    <Button variant="outline" onClick={() => setAdding(false)} className="rounded-xl">Cancel</Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="trigger"
                variants={fadeUp}
                onClick={() => setAdding(true)}
                className="w-full border-2 border-dashed border-emerald-300/60 rounded-xl p-6 text-sm text-emerald-500 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-medium">Add Experience Record</span>
              </motion.button>
            )}
          </AnimatePresence>
        </>
      )}

      <StepNav onBack={onBack} onNext={onNext} nextLabel="Continue" />
    </motion.div>
  );
}

// ── Step 4: Skills & Preferences ─────────────────────────────────────
function SkillsStep({ profile, onNext, onBack }: { profile: any; onNext: () => void; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [experience, setExperience] = useState(String(profile.experience || 0));
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile.skills || []);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(profile.preferredCountries || []);
  const [skillSearch, setSkillSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(SKILL_CATEGORIES[0].category);
  const [customSkill, setCustomSkill] = useState("");

  useEffect(() => {
    if (profile.skills) setSelectedSkills(profile.skills);
    if (profile.preferredCountries) setSelectedCountries(profile.preferredCountries);
    if (profile.experience != null) setExperience(String(profile.experience));
  }, [profile]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !selectedSkills.includes(customSkill.trim())) {
      setSelectedSkills(prev => [...prev, customSkill.trim()]);
      setCustomSkill("");
    }
  };

  const toggleCountry = (country: string) => {
    setSelectedCountries(prev => prev.includes(country) ? prev.filter(c => c !== country) : [...prev, country]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/candidates/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience: parseInt(experience) || 0,
          skills: selectedSkills,
          preferredCountries: selectedCountries,
        }),
      });
      if (!res.ok) throw new Error("Failed"); return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: "Skills & preferences saved" });
      onNext();
    },
  });

  const searchResults = skillSearch.trim()
    ? ALL_SKILLS.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()) && !selectedSkills.includes(s)).slice(0, 12)
    : [];

  const activeCategorySkills = SKILL_CATEGORIES.find(c => c.category === activeCategory)?.skills || [];

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <SectionHeader icon={Globe} color="from-amber-500 to-amber-600" title="Skills & Preferences" subtitle="Select your skills and preferred countries — these directly determine your match scores" />
      <Hint text="Skills account for 50% of your match score. Select from the categories below or search. Country preference adds 20%." />

      <ResumeParseWidget
        onApply={(parsed) => {
          if (parsed.experience) setExperience(String(parsed.experience));
          if (parsed.skills?.length) {
            setSelectedSkills(prev => Array.from(new Set([...prev, ...parsed.skills])));
          }
          if (parsed.preferredCountries?.length) {
            setSelectedCountries(prev => Array.from(new Set([...prev, ...parsed.preferredCountries])));
          }
        }}
      />

      <div className="space-y-6">
        {/* Experience */}
        <motion.div variants={fadeUp} className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 rounded-xl border border-amber-100/60 p-5">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Total Experience
          </p>
          <div className="flex items-center gap-3">
            <Input type="number" value={experience}
              onChange={e => {
                const v = e.target.value;
                // Reject negatives client-side; coerce to 0 if a user somehow
                // types "-2" in Safari (where min= isn't enforced on type=number).
                if (v === "" || /^\d+$/.test(v)) setExperience(v);
                else setExperience(String(Math.max(0, parseInt(v, 10) || 0)));
              }}
              min={0} max={60} step={1} inputMode="numeric" pattern="[0-9]*"
              placeholder="0"
              className="h-12 rounded-xl border-amber-200/80 bg-white max-w-[140px] text-center text-lg font-bold" />
            <span className="text-sm text-amber-700 font-medium">years</span>
          </div>
          <p className="text-xs text-amber-500 mt-2">Experience contributes 30% to your match score</p>
        </motion.div>

        {/* Selected Skills */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Your Skills <span className="text-red-500 text-xs">*</span>
            </Label>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-0 font-bold">{selectedSkills.length} selected</Badge>
          </div>
          {selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-xl border border-amber-100/50">
              {selectedSkills.map(skill => (
                <motion.span
                  key={skill}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200/80"
                >
                  {skill}
                  <button onClick={() => toggleSkill(skill)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                </motion.span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search skills..." value={skillSearch} onChange={e => setSkillSearch(e.target.value)}
              className="pl-11 h-11 rounded-xl text-sm" />
          </div>

          {searchResults.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100/50">
              <p className="w-full text-[11px] text-blue-600 font-medium mb-1">Click to add:</p>
              {searchResults.map(skill => (
                <button key={skill} onClick={() => { toggleSkill(skill); setSkillSearch(""); }}
                  className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-white hover:bg-blue-100 transition-all font-medium">
                  + {skill}
                </button>
              ))}
            </div>
          )}

          {/* Category Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
            {SKILL_CATEGORIES.map(cat => (
              <button key={cat.category} onClick={() => setActiveCategory(cat.category)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.category
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}>
                {cat.category}
              </button>
            ))}
          </div>

          {/* Category Skills Grid */}
          <div className="flex flex-wrap gap-2 p-4 bg-white rounded-xl border border-slate-200 max-h-[200px] overflow-y-auto">
            {activeCategorySkills.map(skill => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <button key={skill} onClick={() => toggleSkill(skill)}
                  className={`text-xs px-3 py-2 rounded-xl border font-medium transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50"
                  }`}>
                  {isSelected ? <Check className="w-3 h-3 inline mr-1" /> : null}{skill}
                </button>
              );
            })}
          </div>

          {/* Custom Skill */}
          <div className="flex gap-2 mt-3">
            <Input value={customSkill} onChange={e => setCustomSkill(e.target.value)} placeholder="Add custom skill..."
              className="h-10 rounded-xl text-sm" onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }} />
            <Button variant="outline" onClick={addCustomSkill} disabled={!customSkill.trim()} className="h-10 rounded-xl text-xs px-4">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </motion.div>

        {/* Preferred Countries */}
        <motion.div variants={fadeUp} className="bg-gradient-to-br from-sky-50/80 to-blue-50/40 rounded-xl border border-sky-100/60 p-5">
          <p className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Preferred Destination Countries
          </p>
          <p className="text-xs text-sky-500 mb-4">Country match adds 20% to your score. Select all countries you'd consider working in.</p>

          {selectedCountries.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedCountries.map(c => (
                <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200/80">
                  {c}
                  <button onClick={() => toggleCountry(c)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DESTINATION_COUNTRIES.map(c => {
              const isSelected = selectedCountries.includes(c.value);
              return (
                <button key={c.value} onClick={() => toggleCountry(c.value)}
                  className={`text-left px-4 py-3 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? "bg-sky-100 border-sky-300 text-sky-800 shadow-sm"
                      : "bg-white border-sky-200/60 text-slate-600 hover:border-sky-300 hover:bg-sky-50"
                  }`}>
                  <span className="font-semibold">{isSelected ? <Check className="w-3 h-3 inline mr-1" /> : null}{c.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{c.region}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <StepNav onBack={onBack} onNext={() => mutation.mutate()} nextLabel="Save & Continue" loading={mutation.isPending} disabled={selectedSkills.length === 0} />
    </motion.div>
  );
}

// ── Step 5: Documents ────────────────────────────────────────────────
function DocumentsStep({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState("cv");
  const [isDragging, setIsDragging] = useState(false);

  const { data: docsRes, isLoading } = useQuery({
    queryKey: ["/api/v1/candidates/documents"], queryFn: () => fetchJson("/api/v1/candidates/documents"),
  });

  const handleUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast({ title: "File too large", description: "Max 5MB", variant: "destructive" }); return; }
    setUploading(true);
    const formData = new FormData(); formData.append("file", file); formData.append("type", docType);
    try {
      const res = await fetch("/api/v1/candidates/documents", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || "Upload failed"); }
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
      toast({ title: "Document uploaded" });
    } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await fetch(`/api/v1/candidates/documents/${id}`, { method: "DELETE" }); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile/completion"] });
    },
  });

  const docs = docsRes?.data || [];
  const docCategories = [
    { value: "cv", label: "CV / Resume", icon: FileText, color: "text-blue-600 bg-blue-100" },
    { value: "passport", label: "Passport", icon: Shield, color: "text-emerald-600 bg-emerald-100" },
    { value: "certificate", label: "Certificate", icon: Award, color: "text-violet-600 bg-violet-100" },
    { value: "other", label: "Other", icon: FileText, color: "text-slate-600 bg-slate-100" },
  ];

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate">
      <SectionHeader icon={FileText} color="from-rose-500 to-rose-600" title="Documents" subtitle="Upload your CV, passport copy, and certificates for verification" />
      <Hint text="Agencies need these to process your application. Upload at least your CV to be considered for positions. Accepted: PDF, JPG, PNG (max 5MB each)." />

      {/* Upload Zone — premium glassmorphism style */}
      <motion.div variants={fadeUp}>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 mb-6 ${
            isDragging
              ? "border-rose-500 bg-gradient-to-br from-rose-50 to-pink-50 scale-[1.01] shadow-lg shadow-rose-100/50"
              : "border-slate-300/60 bg-gradient-to-br from-slate-50/80 to-white hover:border-rose-400 hover:bg-rose-50/30"
          }`}
        >
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
            isDragging ? "bg-rose-100 scale-110" : "bg-slate-100"
          }`}>
            <Upload className={`w-7 h-7 transition-colors ${isDragging ? "text-rose-600" : "text-slate-400"}`} />
          </div>
          <p className="text-base text-slate-700 font-medium mb-1">
            Drag and drop files here
          </p>
          <p className="text-sm text-slate-400 mb-5">or choose a file from your computer</p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <select value={docType} onChange={e => setDocType(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-white font-medium text-slate-700 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 outline-none">
              {docCategories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
              uploading
                ? 'bg-slate-400'
                : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-lg shadow-rose-500/25 hover:-translate-y-0.5'
            }`}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading..." : "Choose File"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} className="hidden" disabled={uploading} />
            </label>
          </div>
          <p className="text-xs text-slate-400 mt-4">PDF, JPG, PNG — max 5MB each</p>
        </div>
      </motion.div>

      {/* Document List */}
      {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-rose-500" /> : docs.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-2 mb-6">
          {docs.map((doc: any, i: number) => {
            const cat = docCategories.find(c => c.value === doc.type) || docCategories[3];
            const CatIcon = cat.icon;
            return (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center justify-between p-4 bg-gradient-to-r from-rose-50/60 to-pink-50/30 rounded-xl border border-rose-100/60 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center flex-shrink-0`}>
                    <CatIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] capitalize rounded-md">{doc.type}</Badge>
                      {doc.fileSize && <span className="text-[10px] text-slate-400">{(doc.fileSize / 1024).toFixed(0)} KB</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => window.open(`/api/v1/candidates/documents/${doc.id}/download`, "_blank")}
                    className="text-xs h-8 rounded-lg">
                    Download
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(doc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 hover:bg-red-50 h-8 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Finish */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
        <Button variant="outline" onClick={onBack} className="gap-2 h-11 px-5 rounded-xl">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Button onClick={onFinish}
          className="gap-2 h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-xl shadow-emerald-500/25 text-base font-semibold hover:-translate-y-0.5 transition-all">
          <CheckCircle className="w-5 h-5" /> Finish & Go to Dashboard
        </Button>
      </motion.div>
    </motion.div>
  );
}
