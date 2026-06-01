import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/layout/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Admin-only. Demo user is an admin; real auth enforces this against the users table.
  if (getCurrentUser().role !== "admin") redirect("/dashboard");

  return (
    <div className="app">
      <AdminNav />
      <div className="main">
        <div className="topbar">
          <div className="topbar-title">Admin</div>
          <span className="badge b-proc">admin</span>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
