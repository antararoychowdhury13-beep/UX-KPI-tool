import Link from "next/link";
import { listNotifications } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { NOTIFICATION_ICON } from "@/types/notification";
import { MarkAllButton } from "@/components/notifications/MarkAllButton";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const userId = await getCurrentUserId();
  const items = await listNotifications(userId);
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Notifications</div>
          <div className="section-sub">{unread} unread · {items.length} total</div>
        </div>
        {unread > 0 && <MarkAllButton />}
      </div>

      {items.length === 0 ? (
        <div className="card" style={{ fontSize: 13, color: "var(--text3)" }}>
          No notifications yet. You&apos;ll be notified when analyses, tests, KPI matrices, and reports complete.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {items.map((n) => {
            const inner = (
              <>
                <i className={`ti ${NOTIFICATION_ICON[n.type] ?? "ti-bell"}`} style={{ fontSize: 16, color: "var(--blue-text)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text)" }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(n.created_at).toLocaleString()}</div>
                </div>
                {!n.is_read && <span className="notif-dot-sm" />}
              </>
            );
            const style: React.CSSProperties = {
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderTop: "1px solid var(--border)",
              background: n.is_read ? "transparent" : "var(--blue-light)",
            };
            return n.project_id ? (
              <Link key={n.id} href={`/projects/${n.project_id}`} style={{ ...style, display: "flex" }}>
                {inner}
              </Link>
            ) : (
              <div key={n.id} style={style}>
                {inner}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
