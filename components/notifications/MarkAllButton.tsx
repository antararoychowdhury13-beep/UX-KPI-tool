"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkAllButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="tb-btn"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/notifications/read-all", { method: "PATCH" });
        router.refresh();
        setBusy(false);
      }}
    >
      <i className="ti ti-checks" /> Mark all read
    </button>
  );
}
