import { redirect } from "next/navigation";
import { DashboardNav, type NavItem } from "@/components/dashboard/nav";
import { getCurrentUser, hasRole, isAdmin, isManager } from "@/lib/permissions";
import { signOut } from "@/lib/auth/actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/maintenance", label: "Maintenance" },
  ];
  if (isManager(user) || hasRole(user, "technician", "vendor")) {
    items.push({ href: "/work-orders", label: "Work orders" });
  }
  if (isManager(user)) {
    items.push({ href: "/properties", label: "Properties" });
    items.push({ href: "/finances/dues", label: "Dues" });
    items.push({ href: "/finances/expenses", label: "Expenses" });
    items.push({ href: "/finances/payment-settings", label: "Payment settings" });
  } else {
    items.push({ href: "/finances/my-dues", label: "My Dues" });
  }
  items.push({ href: "/notifications", label: "Notifications" });
  items.push({ href: "/profile", label: "Profile" });
  if (isAdmin(user)) {
    items.push({ href: "/finances/reports", label: "Reports" });
    items.push({ href: "/admin/activity", label: "Activity log" });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav
        items={items}
        userName={user.profile?.full_name || user.email}
        signOutAction={signOut}
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
