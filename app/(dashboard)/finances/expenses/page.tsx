import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageProperties, getCurrentUser } from "@/lib/permissions";
import { ExpenseForm } from "@/components/finance/expense-form";
import { ExpenseCategoryForm } from "@/components/finance/expense-category-form";
import { PropertyPicker } from "@/components/finance/property-picker";
import { formatCurrency, formatPeriod } from "@/lib/finance/dues";

export const metadata = { title: "Expenses — Building Maintenance" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const manager = canManageProperties(user);

  const supabase = await createClient();
  // RLS scopes this to properties the user is assigned to (or all, for
  // managers/admins) — residents automatically see only their own building.
  const { data: properties } = await supabase.from("properties").select("id, name").order("name");
  if (!properties?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        {manager
          ? "Add a property first."
          : "You aren't linked to a property yet — ask your manager to add you."}
      </div>
    );
  }
  const { property } = await searchParams;
  const propertyId = property && properties.some((p) => p.id === property) ? property : properties[0].id;

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase.from("expense_categories").select("id, name").eq("property_id", propertyId).order("name"),
    supabase
      .from("expenses")
      .select("id, period, amount, description, category_id, created_at")
      .eq("property_id", propertyId)
      .order("period", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const defaultPeriod = new Date().toISOString().slice(0, 7);
  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
        <p className="text-sm text-slate-500">
          {manager
            ? "Record and review building running costs."
            : "Every expense your maintenance dues fund — open to all residents."}
        </p>
      </div>
      <PropertyPicker properties={properties} basePath="/finances/expenses" activeId={propertyId} />

      <div className={manager ? "grid grid-cols-1 gap-6 lg:grid-cols-3" : ""}>
        {manager && (
          <section className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Record an expense</h2>
              <ExpenseForm propertyId={propertyId} categories={categories ?? []} defaultPeriod={defaultPeriod} />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Categories</h2>
              <ul className="mb-3 flex flex-wrap gap-2">
                {(categories ?? []).map((c) => (
                  <li key={c.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                    {c.name}
                  </li>
                ))}
                {!categories?.length && <li className="text-sm text-slate-500">No categories yet.</li>}
              </ul>
              <ExpenseCategoryForm propertyId={propertyId} />
            </div>
          </section>
        )}

        <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${manager ? "lg:col-span-2" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">All expenses</h2>
            <span className="text-sm font-semibold text-slate-900">
              Total: {formatCurrency(total)}
            </span>
          </div>
          {expenses?.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap py-2 pr-4">Month</th>
                    <th className="whitespace-nowrap py-2 pr-4">Category</th>
                    <th className="whitespace-nowrap py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="whitespace-nowrap py-2">Recorded on</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap py-2 pr-4 font-medium text-slate-800">
                        {formatPeriod(e.period)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 text-slate-700">
                        {e.category_id ? categoryName.get(e.category_id) : "Uncategorised"}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-4 font-semibold text-slate-900">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">{e.description || "—"}</td>
                      <td className="whitespace-nowrap py-2 text-xs text-slate-500">
                        {new Date(e.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No expenses recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
