"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CONFIGURED = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    if (CONFIGURED) await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="tb-btn" onClick={signOut} disabled={busy}>
      <i className="ti ti-logout" /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
