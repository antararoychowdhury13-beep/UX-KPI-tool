"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const WORKSPACE = [
  { href: "/dashboard", icon: "ti-layout-dashboard", label: "Dashboard" },
  { href: "/projects", icon: "ti-folder", label: "Projects" },
  { href: "/persona-library", icon: "ti-users", label: "Persona Library" },
];

const PROJECT_STEPS = [
  { seg: "upload", icon: "ti-upload", label: "Upload Screens" },
  { seg: "personas", icon: "ti-users", label: "Personas" },
  { seg: "testing", icon: "ti-test-pipe", label: "Synthetic Testing" },
  { seg: "kpi", icon: "ti-chart-bar", label: "KPI Matrix" },
  { seg: "report", icon: "ti-file-analytics", label: "Report" },
];

export function Sidebar({
  userName,
  userRole,
  userInitials,
  isAdmin = false,
}: {
  userName: string;
  userRole: string;
  userInitials: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  // Contextual "Active project" nav when inside /projects/<id>/...
  const projectMatch = pathname.match(/^\/projects\/([0-9a-f-]{36})(?:\/([^/]+))?/);
  const activeProjectId = projectMatch?.[1];
  const activeSeg = projectMatch?.[2];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <span>KPI</span>
        </div>
        <div>
          <div className="logo-text">UX KPI Tool</div>
          <div className="logo-sub">Intelligence Engine</div>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Workspace</div>
        {WORKSPACE.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive(item.href) ? "active" : ""}`}
          >
            <i className={`ti ${item.icon}`} /> {item.label}
          </Link>
        ))}
      </div>

      {activeProjectId && (
        <div className="nav-section" style={{ marginTop: 8 }}>
          <div className="nav-label">Active project</div>
          {PROJECT_STEPS.map((step) => (
            <Link
              key={step.seg}
              href={`/projects/${activeProjectId}/${step.seg}`}
              className={`nav-item ${activeSeg === step.seg ? "active" : ""}`}
            >
              <i className={`ti ${step.icon}`} /> {step.label}
            </Link>
          ))}
        </div>
      )}

      {isAdmin && (
        <div className="nav-section">
          <div className="nav-label">Admin</div>
          <Link href="/admin" className={`nav-item ${pathname.startsWith("/admin") ? "active" : ""}`}>
            <i className="ti ti-shield-lock" /> Admin panel
          </Link>
        </div>
      )}

      <div className="sidebar-spacer" />

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="user-avatar">{userInitials}</div>
          <div>
            <div className="user-name">{userName}</div>
            <div className="user-role">{userRole}</div>
          </div>
          <Link href="/settings" className="ml-auto" aria-label="Settings">
            <i
              className="ti ti-settings"
              style={{ fontSize: 14, color: "var(--text3)", cursor: "pointer" }}
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
