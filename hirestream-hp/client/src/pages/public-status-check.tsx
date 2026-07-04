/**
 * Public application status-check page — no login required.
 * Rural users and families can check where an application is.
 */
import { useState } from "react";
import { Link } from "wouter";
import { Loader2, ShieldCheck, Phone, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PublicStatusCheckPage() {
  const [step, setStep] = useState<"phone" | "otp" | "result">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function requestOtp() {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/v1/public/status/request-otp", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Couldn't send OTP");
      setStep("otp");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function check() {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/v1/public/status/check", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, otp, reference: reference.trim() }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Check failed");
      setResult(j.data); setStep("result");
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  const statusLabel: Record<string, string> = {
    submitted: "Application received",
    reviewed: "Under review by the agency",
    shortlisted: "Shortlisted — agency is submitting to employer",
    interview_scheduled: "Interview scheduled",
    selected: "Selected — offer coming soon",
    rejected: "Not selected this time",
    placed: "Placed",
  };

  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link href="/">
          <a className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back to HireStream
          </a>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Check application status</h1>
            <p className="text-xs text-slate-500">No login needed. We'll SMS you a one-time code.</p>
          </div>
        </div>

        {step === "phone" && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone number
              </span>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210" className="mt-1" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={requestOtp} disabled={busy || !phone} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send OTP
            </Button>
            <p className="text-[11px] text-slate-400 text-center">
              Only phone numbers on file with HPSEDC receive an OTP. Rate limit: 3 per 10 minutes.
            </p>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              OTP sent to {phone}. Enter the 6-digit code + your application reference (first 8 characters of your Application ID — shown in the confirmation SMS).
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">6-digit OTP</span>
              <Input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric" maxLength={6} className="mt-1 font-mono tracking-widest text-center" />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Application reference</span>
              <Input value={reference} onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. a8d99428" className="mt-1 font-mono" />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button onClick={check} disabled={busy || !otp || !reference} className="w-full">
              {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Check status
            </Button>
          </div>
        )}

        {step === "result" && result && (
          <div className="space-y-3">
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">{statusLabel[result.status] ?? result.status}</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  <span className="font-medium">{result.jobTitle}</span> — {result.jobCountry}
                </p>
              </div>
            </div>
            <dl className="text-xs grid grid-cols-2 gap-2 text-slate-600">
              <dt className="text-slate-400">Reference</dt><dd className="font-mono">{result.reference}</dd>
              <dt className="text-slate-400">Applied</dt><dd>{result.appliedAt ? new Date(result.appliedAt).toLocaleDateString("en-IN") : "—"}</dd>
              {result.placement && <>
                <dt className="text-slate-400">Placement</dt><dd className="capitalize">{result.placement.status}</dd>
                <dt className="text-slate-400">Country</dt><dd>{result.placement.country}</dd>
                {result.placement.startDate && <>
                  <dt className="text-slate-400">Start date</dt><dd>{new Date(result.placement.startDate).toLocaleDateString("en-IN")}</dd>
                </>}
              </>}
            </dl>
            <Button variant="outline" onClick={() => { setStep("phone"); setOtp(""); setReference(""); setResult(null); setError(null); }} className="w-full">
              Check another application
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
