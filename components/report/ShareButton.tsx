"use client";

import { useState } from "react";

// Copies the public share link to the clipboard (styled for the dark report hero).
export function ShareButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/r/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button className="rh-btn" onClick={copy}>
      <i className="ti ti-share" /> {copied ? "Link copied!" : "Share link"}
    </button>
  );
}
