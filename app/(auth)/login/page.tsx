"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CONFIGURED = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next || "/dashboard");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 16 }}>
      <form onSubmit={signIn} className="card" style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="logo-mark"><span>KPI</span></div>
          <div>
            <div className="logo-text">UX KPI Tool</div>
            <div className="logo-sub">Intelligence Engine</div>
          </div>
        </div>
        <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Sign in</h1>

        {!CONFIGURED ? (
          <>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
              Demo mode is active — no credentials needed.
            </p>
            <Link href="/dashboard" className="tb-btn primary" style={{ width: "100%", justifyContent: "center" }}>
              Continue <i className="ti ti-arrow-right" />
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Sign in to your account.</p>
            <input className="input" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 8 }} />
            <input className="input" type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 12 }} />
            {error && <p style={{ fontSize: 11, color: "var(--red-text)", marginBottom: 10 }}>{error}</p>}
            <button type="submit" className="tb-btn primary" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Signing in…" : "Sign in"} <i className="ti ti-arrow-right" />
            </button>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
          No account? <Link href="/signup" style={{ textDecoration: "underline" }}>Sign up</Link>
        </p>
      </form>
    </main>
  );
}
