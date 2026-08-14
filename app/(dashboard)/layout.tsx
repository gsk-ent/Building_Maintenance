import { redirect } from "next/navigation";
import {
  DashboardNav,
  type NavGroup,
  type NavItem,
} from "@/components/dashboard/nav";
import { SiteFooter } from "@/components/dashboard/footer";
import { PendingAssignment } from "@/components/dashboard/pending-assignment";
import {
  canManageProperties,
  canViewReports,
  displayName,
  getCurrentUser,
  hasRole,
  isAdmin,
  needsAssignment,
  primaryRoleLabel,
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
        <SiteFooter />
      </div>
    );
  }

  // A handful of primary links stay inline; everything else is grouped into
  // dropdowns so the header never needs to scroll sideways.
  const primary: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/maintenance", label: "Maintenance" },
  ];
  if (canManageProperties(user) || hasRole(user, "technician", "vendor")) {
    primary.push({ href: "/work-orders", label: "Work orders" });
  }

  const financeItems: NavItem[] = canManageProperties(user)
    ? [
        { href: "/finances/dues", label: "Dues" },
        { href: "/finances/payment-settings", label: "Payment settings" },
      ]
    : [{ href: "/finances/my-dues", label: "My Dues" }];
  // Expenses are open to every member for transparency, not just managers.
  financeItems.push({ href: "/finances/expenses", label: "Expenses" });
  // Reports: platform admin, or admin of at least one building.
  if (canViewReports(user)) {
    financeItems.push({ href: "/finances/reports", label: "Reports" });
  }

  const groups: NavGroup[] = [{ label: "Finances", items: financeItems }];

  const manageItems: NavItem[] = [];
  if (canManageProperties(user)) {
    manageItems.push({ href: "/properties", label: "Properties" });
  }
  // The platform-wide activity log stays admin-only (not building-scoped).
  if (isAdmin(user)) {
    manageItems.push({ href: "/admin/users", label: "Manage users" });
    manageItems.push({ href: "/admin/activity", label: "Activity log" });
  }
  if (manageItems.length) {
    groups.push({ label: "Manage", items: manageItems });
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <DashboardNav
        primary={primary}
        groups={groups}
        userName={displayName(user)}
        roleLabel={primaryRoleLabel(user)}
        signOutAction={signOut}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
