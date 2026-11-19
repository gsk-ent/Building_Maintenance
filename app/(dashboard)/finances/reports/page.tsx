import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  Building2,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canViewReports, getCurrentUser } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Reports — Building Maintenance" };

const REPORTS: { id: string; icon: LucideIcon; title: string; sub: string }[] =
  [
    {
      id: "collection",
      icon: ReceiptText,
      title: "Collection Status",
      sub: "Paid / pending by unit, this month",
    },
    {
      id: "dues",
      icon: AlertTriangle,
      title: "Outstanding Dues",
      sub: "Total balance owed, by unit",
    },
    {
      id: "expenses",
      icon: Banknote,
      title: "Expense Report",
      sub: "Itemised, grouped by category",
    },
    {
      id: "income-vs-expense",
      icon: BarChart3,
      title: "Income vs Expense",
      sub: "Monthly collection vs spend",
    },
  ];

export default async function ReportsIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewReports(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");
  const propertyId = properties?.[0]?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Collection, dues, and expense reports for your properties."
      />
      {!propertyId ? (
        <EmptyState
          icon={Building2}
          title="Add a property first"
          description="Reports are generated per property."
          action={<ButtonLink href="/properties/new">Add property</ButtonLink>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.id}
                href={`/finances/reports/${r.id}?property=${propertyId}`}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-deep"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-deep/10 text-teal-deep">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="mt-3 text-base font-semibold text-slate-900">
                  {r.title}
                </h2>
                <p className="text-sm text-slate-500">{r.sub}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
