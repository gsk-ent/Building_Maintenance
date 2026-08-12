import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManager } from "@/lib/permissions";
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
  if (!user || !isManager(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: properties } = await supabase.from("properties").select("id, name").order("name");
  if (!properties?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Add a property first.
      </div>
    );
  }
  const { property } = await searchParams;
  const propertyId = property && properties.some((p) => p.id === property) ? property : properties[0].id;

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase.from("expense_categories").select("id, name").eq("property_id", propertyId).order("name"),
    supabase
      .from("expenses")
      .select("id, period, amount, description, category_id")
      .eq("property_id", propertyId)
      .order("period", { ascending: false })
      .limit(50),
  ]);

  const categoryName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const defaultPeriod = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Expenses</h1>
      <PropertyPicker properties={properties} basePath="/finances/expenses" activeId={propertyId} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-4">
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

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent expenses</h2>
          {expenses?.length ? (
            <ul className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <li key={e.id} className="py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">
                      {e.category_id ? categoryName.get(e.category_id) : "Uncategorised"}
                    </span>
                    <span className="font-semibold text-slate-900">{formatCurrency(e.amount)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {formatPeriod(e.period)}
                    {e.description ? ` · ${e.description}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No expenses recorded yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
