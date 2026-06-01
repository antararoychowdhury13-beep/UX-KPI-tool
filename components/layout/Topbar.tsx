"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TITLES: Array<[RegExp, string]> = [
  [/^\/dashboard$/, "Dashboard"],
  [/^\/projects$/, "All projects"],
  [/^\/projects\/new$/, "New project — Setup"],
  [/\/upload$/, "Upload screens"],
  [/\/personas$/, "Persona builder"],
  [/\/testing$/, "Synthetic testing"],
  [/\/kpi$/, "KPI matrix"],
  [/\/report$/, "UX impact report"],
  [/^\/persona-library$/, "Persona library"],
  [/^\/settings$/, "Settings"],
  [/^\/projects\/[^/]+$/, "Project overview"],
];

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "UX KPI Tool";
  const inProject = /^\/projects\/[^/]+\//.test(pathname);

  return (
    <div className="topbar">
      <div className="topbar-title">{title}</div>
      {inProject && (
        <div className="crumb">
          <b>Active project</b>
        </div>
      )}
      <div style={{ display: "flex", gap: 7 }}>
        <Link href="/projects" className="tb-btn">
          <i className="ti ti-folder" /> Projects
        </Link>
        <Link href="/projects/new" className="tb-btn primary">
          <i className="ti ti-plus" /> New Project
        </Link>
      </div>
    </div>
  );
}
