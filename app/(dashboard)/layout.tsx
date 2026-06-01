import { getCurrentUser } from "@/lib/auth";
import { initials } from "@/lib/utils/initials";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = getCurrentUser();
  return (
    <div className="app">
      <Sidebar
        userName={user.full_name ?? "User"}
        userRole={user.role === "admin" ? "Design Lead" : "Designer"}
        userInitials={initials(user.full_name ?? "U")}
        isAdmin={user.role === "admin"}
      />
      <div className="main">
        <Topbar />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
