"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NOTIFICATION_ICON, type AppNotification } from "@/types/notification";

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    setUnread(0);
    setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
  }

  return (
    <div className="notif" ref={ref}>
      <button className="tb-btn" onClick={() => setOpen((o) => !o)} aria-label="Notifications" style={{ position: "relative" }}>
        <i className="ti ti-bell" />
        {unread > 0 && <span className="notif-dot">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <span>Notifications</span>
            {unread > 0 && (
              <button className="notif-markall" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">No notifications yet.</div>
          ) : (
            <div className="notif-list">
              {items.slice(0, 8).map((n) => (
                <div key={n.id} className={`notif-item ${n.is_read ? "" : "unread"}`}>
                  <i className={`ti ${NOTIFICATION_ICON[n.type] ?? "ti-bell"}`} />
                  <div className="notif-msg">{n.message}</div>
                </div>
              ))}
            </div>
          )}
          <Link href="/notifications" className="notif-foot" onClick={() => setOpen(false)}>
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
