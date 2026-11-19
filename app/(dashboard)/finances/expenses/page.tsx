import { redirect } from "next/navigation";
import { Building2, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canManageProperties, getCurrentUser } from "@/lib/permissions";
import { ExpenseForm } from "@/components/finance/expense-form";
import { ExpenseCategoryForm } from "@/components/finance/expense-category-form";
import { PropertyPicker } from "@/components/finance/property-picker";
import { formatCurrency, formatPeriod } from "@/lib/finance/dues";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

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
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");
  if (!properties?.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Expenses" />
        <EmptyState
          icon={Building2}
          title="Add a property first"
          description={
            manager
              ? "Expenses are recorded per property, so create one before recording any."
              : "You aren’t linked to a property yet — ask your manager to add you."
          }
        />
      </div>
    );
  }
  const { property } = await searchParams;
  const propertyId =
    property && properties.some((p) => p.id === property)
      ? property
      : properties[0].id;

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("id, name")
      .eq("property_id", propertyId)
      .order("name"),
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
      <PageHeader
        title="Expenses"
        description={
          manager
            ? "Record and review building running costs."
            : "Every expense your maintenance dues fund — open to all residents."
        }
      />
      <PropertyPicker
        properties={properties}
        basePath="/finances/expenses"
        activeId={propertyId}
      />

      <div className={manager ? "grid grid-cols-1 gap-6 lg:grid-cols-3" : ""}>
        {manager && (
          <section className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader title="Record an expense" />
              <CardContent>
                <ExpenseForm
                  propertyId={propertyId}
                  categories={categories ?? []}
                  defaultPeriod={defaultPeriod}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Categories" />
              <CardContent>
                <ul className="mb-4 flex flex-wrap gap-2">
                  {(categories ?? []).map((c) => (
                    <li
                      key={c.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {c.name}
                    </li>
                  ))}
                  {!categories?.length && (
                    <li className="text-sm text-slate-500">
                      No categories yet.
                    </li>
                  )}
                </ul>
                <ExpenseCategoryForm propertyId={propertyId} />
              </CardContent>
            </Card>
          </section>
        )}

        <section className={manager ? "lg:col-span-2" : ""}>
          <Card>
            <CardHeader
              title="All expenses"
              action={
                <span className="text-sm font-semibold text-slate-900">
                  Total: {formatCurrency(total)}
                </span>
              }
            />
            <CardContent>
              {expenses?.length ? (
                <Table caption="All recorded expenses for this property">
                  <TableHead>
                    <TableHeaderCell>Month</TableHeaderCell>
                    <TableHeaderCell>Category</TableHeaderCell>
                    <TableHeaderCell>Amount</TableHeaderCell>
                    <TableHeaderCell>Description</TableHeaderCell>
                    <TableHeaderCell>Recorded on</TableHeaderCell>
                  </TableHead>
                  <TableBody>
                    {expenses.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap font-medium text-slate-900">
                          {formatPeriod(e.period)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {e.category_id
                            ? categoryName.get(e.category_id)
                            : "Uncategorised"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-slate-900">
                          {formatCurrency(e.amount)}
                        </TableCell>
                        <TableCell>{e.description || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">
                          {new Date(e.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={ReceiptText}
                  title="No expenses recorded yet"
                  description={
                    manager
                      ? "Record your first expense to start tracking building running costs."
                      : "No expenses have been recorded for this property yet."
                  }
                />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
