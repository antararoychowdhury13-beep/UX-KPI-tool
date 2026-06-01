"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", icon: "ti-gauge", label: "Overview" },
  { href: "/admin/organisations", icon: "ti-building", label: "Organisations" },
  { href: "/admin/users", icon: "ti-users", label: "Users & quota" },
  { href: "/admin/api-config", icon: "ti-plug-connected", label: "AI services" },
  { href: "/admin/persona-templates", icon: "ti-id-badge-2", label: "Persona templates" },
  { href: "/admin/report-templates", icon: "ti-file-text", label: "Report templates" },
  { href: "/admin/integrations", icon: "ti-puzzle", label: "Integrations" },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark"><span>KPI</span></div>
        <div>
          <div className="logo-text">Admin</div>
          <div className="logo-sub">Control panel</div>
        </div>
      </div>
      <div className="nav-section">
        <div className="nav-label">Administration</div>
        {ITEMS.map((i) => (
          <Link key={i.href} href={i.href} className={`nav-item ${isActive(i.href) ? "active" : ""}`}>
            <i className={`ti ${i.icon}`} /> {i.label}
          </Link>
        ))}
      </div>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <Link href="/dashboard" className="nav-item">
          <i className="ti ti-arrow-left" /> Back to app
        </Link>
      </div>
    </div>
  );
}
