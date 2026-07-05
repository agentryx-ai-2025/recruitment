import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Plus, Minus, Pencil, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { QuestionShell } from "./simple-apply/QuestionShell";
import {
  BLUE_COLLAR_TRADES, EDUCATION_LEVELS, SIMPLE_LEVELS, QUICK_LANGUAGES,
  QUICK_COUNTRIES, MicField,
} from "./simple-apply/reference";

const TOTAL = 8;

async function patchProfile(body: any) {
  const res = await fetch("/api/v1/candidates/profile", {
    method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || e?.message || "Save failed"); }
  return res.json();
}

// ── HP-4c: simplified, blue-collar-first application flow. Blue-collar is the
// default; an escape link routes degree-holders to the detailed /profile wizard.
// Every screen writes to the SAME candidate schema (skills / experienceMonths /
// qualificationLevel + candidate_education / candidate_languages / preferredCountries).
export default function SimpleApplyPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Collected answers (prefilled from the profile on mount).
  const [trade, setTrade] = useState<typeof BLUE_COLLAR_TRADES[number] | null>(null);
  const [fullName, setFullName] = useState("");
  const [months, setMonths] = useState(0);
  const [eduKey, setEduKey] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [homeLocation, setHomeLocation] = useState("");
  const [langExpanding, setLangExpanding] = useState<string | null>(null); // lifted from LanguageScreen

  const { data: profileRes } = useQuery<any>({ queryKey: ["/api/v1/candidates/profile"] });
  const { data: langRes } = useQuery<any>({ queryKey: ["/api/v1/candidates/languages"] });
  const languages = langRes?.data || [];

  useEffect(() => {
    if (!user) { setLocation("/auth"); return; }
  }, [user, setLocation]);

  // Prefill from an existing profile so returning candidates don't re-answer.
  useEffect(() => {
    const p = profileRes?.data;
    if (!p) return;
    if (p.fullName) setFullName(p.fullName);
    if (p.experienceMonths != null) setMonths(p.experienceMonths);
    else if (p.experience != null) setMonths(p.experience * 12);
    if (Array.isArray(p.preferredCountries)) setCountries(p.preferredCountries);
    if (p.phone) setPhone(p.phone);
    if (p.location) setHomeLocation(p.location);
    if (p.skills?.[0]) {
      const t = BLUE_COLLAR_TRADES.find((x) => x.label === p.skills[0]);
      if (t) setTrade(t);
    }
  }, [profileRes]);

  const go = (n: number) => setStep(Math.max(0, Math.min(TOTAL - 1, n)));

  const save = async (body: any, next?: number) => {
    setSaving(true);
    try {
      await patchProfile(body);
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/profile"] });
      if (next != null) go(next);
    } catch (e: any) {
      toast({ title: e.message || "Could not save", variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ── Screen 0: trade grid (entry) ───────────────────────────────────────
  const TradeGrid = () => (
    <QuestionShell step={0} totalSteps={TOTAL} question="What work do you do?" help="Tap the card that matches your work.">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {BLUE_COLLAR_TRADES.map((t) => {
          const Icon = t.icon;
          const picked = trade?.key === t.key;
          return (
            <button key={t.key} type="button" disabled={saving}
              onClick={async () => { setTrade(t); await save({ skills: [t.label], preferredCategories: [t.category] }, 1); }}
              className={`relative flex flex-col items-center text-center gap-2 rounded-2xl border p-4 min-h-[7rem] transition-all active:scale-[0.97] ${
                picked ? "border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50/60 ring-2 ring-blue-300 shadow-lg shadow-blue-500/10"
                       : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md"}`}>
              {picked && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center"><Check className="w-4 h-4" strokeWidth={3} /></span>}
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center ${picked ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md" : "bg-blue-50 text-blue-600"}`}>
                <Icon className="w-6 h-6" />
              </span>
              <span className="text-base font-bold text-slate-900 leading-tight">{t.label}</span>
              <span className="text-xs text-slate-500 leading-tight">{t.sub}</span>
            </button>
          );
        })}
      </div>
      <p className="text-center mt-6">
        <button onClick={() => setLocation("/apply/pro")} className="text-sm text-blue-600 hover:text-blue-700 underline underline-offset-4 py-3 px-2">
          Have a degree or professional qualification? Use the detailed form →
        </button>
      </p>
    </QuestionShell>
  );

  // ── Screen 1: name ─────────────────────────────────────────────────────
  const NameScreen = () => (
    <QuestionShell step={1} totalSteps={TOTAL} question="What is your name?"
      onBack={() => go(0)} onNext={() => save({ fullName }, 2)} nextDisabled={!fullName.trim()} loading={saving}>
      <MicField value={fullName} onChange={setFullName} placeholder="e.g. Ramesh Kumar" autoFocus />
    </QuestionShell>
  );

  // ── Screen 2: experience (months stepper + chips) ──────────────────────
  const ExperienceScreen = () => {
    const chips = [{ m: 0, l: "New to this" }, { m: 12, l: "1 year" }, { m: 24, l: "2 years" }, { m: 60, l: "5 years" }, { m: 120, l: "10+ years" }];
    return (
      <QuestionShell step={2} totalSteps={TOTAL} question={`How long have you worked${trade ? ` as a ${trade.label}` : ""}?`}
        help="Use the buttons, or pick below." onBack={() => go(1)} onNext={() => save({ experienceMonths: months, experience: Math.round(months / 12) }, 3)} loading={saving}>
        <div className="flex items-center justify-center gap-4 mb-6">
          <button type="button" onClick={() => setMonths((m) => Math.max(0, m - 6))} className="w-14 h-14 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 active:scale-95"><Minus className="w-6 h-6" /></button>
          <div className="text-center min-w-[7rem]">
            <div className="text-4xl font-bold text-slate-900 tabular-nums">{months}</div>
            <div className="text-sm text-slate-500">months{months >= 12 ? ` ≈ ${(months / 12).toFixed(1)} yrs` : ""}</div>
          </div>
          <button type="button" onClick={() => setMonths((m) => Math.min(600, m + 6))} className="w-14 h-14 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 active:scale-95"><Plus className="w-6 h-6" /></button>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {chips.map((c) => (
            <button key={c.l} type="button" onClick={() => setMonths(c.m)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-semibold transition ${months === c.m ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-400"}`}>{c.l}</button>
          ))}
        </div>
      </QuestionShell>
    );
  };

  // ── Screen 3: education level ──────────────────────────────────────────
  const EducationScreen = () => {
    const chosen = EDUCATION_LEVELS.find((l) => l.key === eduKey);
    const saveEdu = async () => {
      if (!chosen) return;
      setSaving(true);
      try {
        await patchProfile({ qualificationLevel: chosen.qualificationLevel });
        if (chosen.eduRow) {
          await fetch("/api/v1/candidates/education", {
            method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
            body: JSON.stringify({ ...chosen.eduRow, institution: "—", isPassed: true }),
          }); // ignore 409 (already added on a back/forward)
        }
        go(4);
      } catch (e: any) { toast({ title: e.message || "Could not save", variant: "destructive" }); }
      finally { setSaving(false); }
    };
    return (
      <QuestionShell step={3} totalSteps={TOTAL} question="How far did you study?"
        help="Tap one. Every level is fine — jobs exist for all of them." onBack={() => go(2)} onNext={saveEdu} nextDisabled={!chosen} loading={saving}>
        <div className="grid grid-cols-2 gap-3">
          {EDUCATION_LEVELS.map((lvl) => {
            const sel = eduKey === lvl.key; const Icon = lvl.icon;
            return (
              <button key={lvl.key} type="button" onClick={() => setEduKey(lvl.key)}
                className={`relative flex items-center gap-3 rounded-2xl border p-4 min-h-[5rem] text-left transition-all active:scale-[0.98] ${
                  sel ? "border-violet-400 bg-gradient-to-br from-violet-50/80 to-purple-50/40 ring-2 ring-violet-300 shadow-lg shadow-violet-500/10" : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"}`}>
                <span className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${sel ? "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-md" : "bg-violet-50 text-violet-600"}`}>
                  {Icon ? <Icon className="w-6 h-6" /> : <span className="text-base">{lvl.glyph}</span>}
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-bold text-slate-900 leading-tight">{lvl.label}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{lvl.sub}</span>
                </span>
                {sel && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>}
              </button>
            );
          })}
        </div>
      </QuestionShell>
    );
  };

  // ── Screen 4: languages ────────────────────────────────────────────────
  const LanguageScreen = () => {
    const expanding = langExpanding, setExpanding = setLangExpanding;
    const addLang = async (language: string, proficiency: string) => {
      await fetch("/api/v1/candidates/languages", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ language, proficiency }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/languages"] });
      setExpanding(null);
    };
    const removeLang = async (id: string) => {
      await fetch(`/api/v1/candidates/languages/${id}`, { method: "DELETE", credentials: "include" });
      queryClient.invalidateQueries({ queryKey: ["/api/v1/candidates/languages"] });
    };
    const available = QUICK_LANGUAGES.filter((l) => !languages.some((s: any) => s.language.toLowerCase() === l.toLowerCase()));
    return (
      <QuestionShell step={4} totalSteps={TOTAL} question="Which languages can you speak?"
        help="Tap a language, then tap how well you speak it." onBack={() => go(3)} onNext={() => go(5)} nextDisabled={languages.length === 0}>
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {languages.map((l: any) => (
              <span key={l.id} className="inline-flex items-center gap-2 pl-4 pr-2 py-2.5 rounded-xl text-sm font-semibold bg-sky-100 text-sky-800 border border-sky-200/80">
                {l.language}<span className="text-sky-500 font-normal">· {SIMPLE_LEVELS.find((p) => p.v === l.proficiency)?.label || l.proficiency}</span>
                <button onClick={() => removeLang(l.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-sky-200 hover:text-red-500"><X className="w-4 h-4" /></button>
              </span>
            ))}
          </div>
        )}
        <div className="space-y-2.5">
          {available.map((lang) => {
            const open = expanding === lang;
            return (
              <div key={lang} className={`rounded-2xl border transition-all ${open ? "border-sky-300 bg-gradient-to-br from-sky-50/80 to-cyan-50/40 shadow-md" : "border-slate-200 bg-white"}`}>
                <button type="button" onClick={() => setExpanding(open ? null : lang)} className="w-full flex items-center justify-between px-5 py-4 min-h-[3.5rem]">
                  <span className="text-base font-semibold text-slate-800">{lang}</span>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${open ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-400"}`}><Plus className={`w-4 h-4 transition-transform ${open ? "rotate-45" : ""}`} /></span>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="grid grid-cols-3 gap-2 p-4 pt-0">
                        {SIMPLE_LEVELS.map((lv) => (
                          <button key={lv.v} type="button" onClick={() => addLang(lang, lv.v)}
                            className="rounded-xl border border-sky-200/80 bg-white py-3.5 min-h-[3.5rem] text-sm font-semibold text-slate-700 hover:bg-sky-600 hover:text-white hover:border-sky-600 active:scale-95 transition-all">{lv.label}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </QuestionShell>
    );
  };

  // ── Screen 5: preferred country ────────────────────────────────────────
  const CountryScreen = () => {
    const toggle = (name: string) => setCountries((c) => c.includes(name) ? c.filter((x) => x !== name) : [...c, name]);
    return (
      <QuestionShell step={5} totalSteps={TOTAL} question="Where do you want to work?"
        help="Choose one or more countries." onBack={() => go(4)} onNext={() => save({ preferredCountries: countries }, 6)} nextDisabled={countries.length === 0} loading={saving}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_COUNTRIES.map((c) => {
            const sel = countries.includes(c.name);
            return (
              <button key={c.name} type="button" onClick={() => toggle(c.name)}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 min-h-[6rem] transition-all active:scale-[0.97] ${
                  sel ? "border-emerald-400 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 ring-2 ring-emerald-300 shadow-lg" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
                {sel && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>}
                <span className="text-3xl">{c.flag}</span>
                <span className="text-sm font-bold text-slate-900">{c.name}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setCountries(QUICK_COUNTRIES.map((c) => c.name))}
          className="mt-4 w-full text-sm text-emerald-600 hover:text-emerald-700 py-3 font-semibold">Anywhere in the Gulf is fine →</button>
      </QuestionShell>
    );
  };

  // ── Screen 6: review + finish ──────────────────────────────────────────
  // ── Screen 6: contact (phone + home town) ──────────────────────────────
  const ContactScreen = () => (
    <QuestionShell step={6} totalSteps={TOTAL} question="How can HPSEDC reach you?"
      help="We will call or message you on this number when a job opens."
      onBack={() => go(5)} onNext={() => save({ phone, location: homeLocation || null }, 7)} nextDisabled={phone.replace(/\D/g, "").length < 10} loading={saving}>
      <label className="block text-sm font-semibold text-slate-600 mb-1.5">Phone number</label>
      <input type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
        placeholder="e.g. 98765 43210" maxLength={15}
        className="h-14 w-full rounded-xl border border-blue-200/80 bg-white px-4 text-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
      <label className="block text-sm font-semibold text-slate-600 mt-5 mb-1.5">Your town / district (in Himachal)</label>
      <MicField value={homeLocation} onChange={setHomeLocation} placeholder="e.g. Mandi" />
    </QuestionShell>
  );

  const ReviewScreen = () => {
    const chosenEdu = EDUCATION_LEVELS.find((l) => l.key === eduKey);
    const Row = ({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) => (
      <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
        <div className="min-w-0"><p className="text-xs text-slate-400">{label}</p><p className="text-base font-semibold text-slate-800 truncate">{value || "—"}</p></div>
        <button onClick={onEdit} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex-shrink-0"><Pencil className="w-4 h-4" /></button>
      </div>
    );
    return (
      <QuestionShell step={7} totalSteps={TOTAL} question="Check your details" help="Tap the pencil to change anything."
        onBack={() => go(6)} onNext={() => { toast({ title: "Profile saved" }); setLocation("/"); }} nextLabel="Save my profile" loading={saving}>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Row label="Work" value={trade?.label || ""} onEdit={() => go(0)} />
          <Row label="Name" value={fullName} onEdit={() => go(1)} />
          <Row label="Experience" value={months >= 12 ? `${(months / 12).toFixed(1)} years` : `${months} months`} onEdit={() => go(2)} />
          <Row label="Education" value={chosenEdu?.label || ""} onEdit={() => go(3)} />
          <Row label="Languages" value={languages.map((l: any) => l.language).join(", ")} onEdit={() => go(4)} />
          <Row label="Preferred countries" value={countries.join(", ")} onEdit={() => go(5)} />
          <Row label="Phone" value={phone} onEdit={() => go(6)} />
          {homeLocation ? <Row label="Town / district" value={homeLocation} onEdit={() => go(6)} /> : null}
        </div>
        <div className="mt-4 rounded-xl bg-emerald-50/70 border border-emerald-100 p-4 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-emerald-800">HPSEDC will contact you on your phone when a matching job opens. No fees are charged for registration.</p>
        </div>
      </QuestionShell>
    );
  };

  // Render the screen by CALLING the function (not <Current/>). Rendering an
  // inline-defined component via <Current/> gives it a new identity every
  // parent re-render, which remounts its inputs and drops focus after one
  // keystroke. Calling it returns JSX that React reconciles in place.
  const screens = [TradeGrid, NameScreen, ExperienceScreen, EducationScreen, LanguageScreen, CountryScreen, ContactScreen, ReviewScreen];
  return <>{screens[step]()}</>;
}
