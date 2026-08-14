import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewReports, getCurrentUser } from "@/lib/permissions";

export const metadata = { title: "Reports — Building Maintenance" };

const REPORTS = [
  { id: "collection", icon: "🧾", title: "Collection Status", sub: "Paid / pending by unit, this month" },
  { id: "dues", icon: "⚠️", title: "Outstanding Dues", sub: "Total balance owed, by unit" },
  { id: "expenses", icon: "💸", title: "Expense Report", sub: "Itemised, grouped by category" },
  { id: "income-vs-expense", icon: "📊", title: "Income vs Expense", sub: "Monthly collection vs spend" },
];

export default async function ReportsIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewReports(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: properties } = await supabase.from("properties").select("id, name").order("name");
  const propertyId = properties?.[0]?.id;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Reports</h1>
      {!propertyId ? (
        <p className="text-sm text-slate-500">Add a property first.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REPORTS.map((r) => (
            <Link
              key={r.id}
              href={`/finances/reports/${r.id}?property=${propertyId}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
            >
              <span className="text-2xl">{r.icon}</span>
              <h2 className="mt-2 font-semibold text-slate-900">{r.title}</h2>
              <p className="text-sm text-slate-500">{r.sub}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
