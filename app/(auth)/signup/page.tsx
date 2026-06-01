"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CONFIGURED = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      // Email confirmation is enabled on the project.
      setNotice("Account created. Check your email to confirm, then sign in.");
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 16 }}>
      <form onSubmit={signUp} className="card" style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="logo-mark"><span>KPI</span></div>
          <div>
            <div className="logo-text">UX KPI Tool</div>
            <div className="logo-sub">Intelligence Engine</div>
          </div>
        </div>
        <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Create account</h1>

        {!CONFIGURED ? (
          <>
            <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>Demo mode is active — jump straight in.</p>
            <Link href="/dashboard" className="tb-btn primary" style={{ width: "100%", justifyContent: "center" }}>
              Get started <i className="ti ti-arrow-right" />
            </Link>
          </>
        ) : (
          <>
            <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ marginBottom: 8 }} />
            <input className="input" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginBottom: 8 }} />
            <input className="input" type="password" required placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 12 }} />
            {error && <p style={{ fontSize: 11, color: "var(--red-text)", marginBottom: 10 }}>{error}</p>}
            {notice && <p style={{ fontSize: 11, color: "var(--green-text)", marginBottom: 10 }}>{notice}</p>}
            <button type="submit" className="tb-btn primary" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              {busy ? "Creating…" : "Get started"} <i className="ti ti-arrow-right" />
            </button>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
          Have an account? <Link href="/login" style={{ textDecoration: "underline" }}>Sign in</Link>
        </p>
      </form>
    </main>
  );
}
