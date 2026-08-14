import { redirect } from "next/navigation";
import { DashboardNav, type NavItem } from "@/components/dashboard/nav";
import { PendingAssignment } from "@/components/dashboard/pending-assignment";
import {
  canManageProperties,
  canViewReports,
  getCurrentUser,
  hasRole,
  isAdmin,
  needsAssignment,
} from "@/lib/permissions";
import { signOut } from "@/lib/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Nobody sees requests, dues or expenses until a manager links their
  // account to a property/unit. This is a UX gate — RLS already enforces
  // the same restriction at the data layer, so there is no bypass.
  if (needsAssignment(user)) {
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <header className="border-b-[3px] border-double border-teal-deep bg-paper px-4 py-3">
          <span className="text-base font-bold text-teal-deep">
            🏢 Building Maintenance
          </span>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-10">
          <PendingAssignment email={user.email} />
        </main>
      </div>
    );
  }

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/maintenance", label: "Maintenance" },
  ];
  if (canManageProperties(user) || hasRole(user, "technician", "vendor")) {
    items.push({ href: "/work-orders", label: "Work orders" });
  }
  if (canManageProperties(user)) {
    items.push({ href: "/properties", label: "Properties" });
    items.push({ href: "/finances/dues", label: "Dues" });
    items.push({
      href: "/finances/payment-settings",
      label: "Payment settings",
    });
  } else {
    items.push({ href: "/finances/my-dues", label: "My Dues" });
  }
  // Expenses are open to every member for transparency, not just managers.
  items.push({ href: "/finances/expenses", label: "Expenses" });
  items.push({ href: "/notifications", label: "Notifications" });
  items.push({ href: "/profile", label: "Profile" });
  // Reports: platform admin, or admin of at least one building.
  if (canViewReports(user)) {
    items.push({ href: "/finances/reports", label: "Reports" });
  }
  // The platform-wide activity log stays admin-only (not building-scoped).
  if (isAdmin(user)) {
    items.push({ href: "/admin/users", label: "Manage users" });
    items.push({ href: "/admin/activity", label: "Activity log" });
  }

  return (
    <div className="min-h-screen bg-paper">
      <DashboardNav
        items={items}
        userName={user.profile?.full_name || user.email}
        signOutAction={signOut}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
