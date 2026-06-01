import Link from "next/link";

// Mock auth placeholder — see login/page.tsx.
export default function SignupPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 16 }}>
      <div className="card" style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div className="logo-mark"><span>KPI</span></div>
          <div>
            <div className="logo-text">UX KPI Tool</div>
            <div className="logo-sub">Intelligence Engine</div>
          </div>
        </div>
        <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Create account</h1>
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 14 }}>
          Demo mode is active — jump straight in.
        </p>
        <input className="input" placeholder="Full name" style={{ marginBottom: 8 }} />
        <input className="input" placeholder="you@company.com" style={{ marginBottom: 8 }} />
        <input className="input" type="password" placeholder="Password" style={{ marginBottom: 14 }} />
        <Link href="/dashboard" className="tb-btn primary" style={{ width: "100%", justifyContent: "center" }}>
          Get started <i className="ti ti-arrow-right" />
        </Link>
        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text3)", marginTop: 12 }}>
          Have an account? <Link href="/login" style={{ textDecoration: "underline" }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
