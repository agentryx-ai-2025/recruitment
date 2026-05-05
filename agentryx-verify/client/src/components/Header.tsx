import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, LogOut } from "lucide-react";
import { api } from "../lib/api";

export function Header() {
  const [reviewer, setReviewer] = useState<any>(null);

  useEffect(() => { api.me().then(({ reviewer }) => setReviewer(reviewer)).catch(() => {}); }, []);

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-agentryx-700">
          <CheckCircle2 className="w-5 h-5" />
          <span>Agentryx <span className="font-light">Verify</span></span>
        </Link>
        <div className="text-sm">
          {reviewer ? (
            <div className="flex items-center gap-3">
              <span className="text-slate-600">{reviewer.name} · <span className="text-slate-400">{reviewer.organization}</span></span>
              <button
                onClick={async () => { await api.logout(); location.reload(); }}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"
              ><LogOut className="w-4 h-4" /> Sign out</button>
            </div>
          ) : (
            <Link href="/login" className="text-agentryx-600 hover:underline">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
