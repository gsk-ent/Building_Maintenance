import { notFound, redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canViewReports, getCurrentUser } from "@/lib/permissions";
import { PrintButton } from "@/components/finance/print-button";
import { Bar } from "@/components/finance/bar";
import { dueStatus, formatCurrency, formatPeriod } from "@/lib/finance/dues";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DueStatusBadge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Report — Building Maintenance" };

const REPORT_TITLES: Record<string, string> = {
  collection: "Collection Status",
  dues: "Outstanding Dues",
  expenses: "Expense Report",
  "income-vs-expense": "Income vs Expense",
};

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{
    property?: string;
    period?: string;
    months?: string;
  }>;
}) {
  const { type } = await params;
  if (!(type in REPORT_TITLES)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canViewReports(user)) redirect("/dashboard");

  const sp = await searchParams;
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");
  const propertyId =
    sp.property && properties?.some((p) => p.id === sp.property)
      ? sp.property
      : properties?.[0]?.id;
  const property = properties?.find((p) => p.id === propertyId);
  if (!propertyId || !property) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader title={REPORT_TITLES[type]} />
        <EmptyState
          icon={BarChart3}
          title="No property found"
          description="Add a property first to view reports."
        />
      </div>
    );
  }

  const period = /^\d{4}-\d{2}$/.test(sp.period ?? "")
    ? sp.period!
    : currentPeriod();
  const periodDate = `${period}-01`;
  const generatedAt = new Date().toLocaleString();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print">
        <PageHeader title={REPORT_TITLES[type]} actions={<PrintButton />} />
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardContent className="py-6">
          <header className="mb-4 border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900">
              {property.name}
            </h2>
            <p className="text-sm text-slate-500">
              {REPORT_TITLES[type]} · Generated {generatedAt}
            </p>
          </header>

          {type === "collection" && (
            <CollectionReport
              propertyId={propertyId}
              periodDate={periodDate}
              period={period}
            />
          )}
          {type === "dues" && <OutstandingDuesReport propertyId={propertyId} />}
          {type === "expenses" && (
            <ExpenseReport
              propertyId={propertyId}
              periodDate={periodDate}
              period={period}
            />
          )}
          {type === "income-vs-expense" && (
            <IncomeVsExpenseReport propertyId={propertyId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function unitsForProperty(propertyId: string) {
  const supabase = await createClient();
  const { data: buildings } = await supabase
    .from("buildings")
    .select("id")
    .eq("property_id", propertyId);
  const buildingIds = (buildings ?? []).map((b) => b.id);
  if (!buildingIds.length) return [];
  const { data: units } = await supabase
    .from("units")
    .select("id, unit_number")
    .in("building_id", buildingIds);
  return units ?? [];
}

/** unit_id → resident name(s), for report readability ("Flat 402 — Satya"). */
async function ownersForProperty(
  propertyId: string
): Promise<Map<string, string[]>> {
  const supabase = await createClient();
  const units = await unitsForProperty(propertyId);
  const unitIds = units.map((u) => u.id);
  const owners = new Map<string, string[]>();
  if (!unitIds.length) return owners;

  const { data: residents } = await supabase
    .from("property_user_assignments")
    .select("unit_id, user_id")
    .in("unit_id", unitIds)
    .eq("relationship", "resident");
  const residentUserIds = [...new Set((residents ?? []).map((r) => r.user_id))];
  if (!residentUserIds.length) return owners;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .in("user_id", residentUserIds);
  const nameByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.full_name || p.email])
  );

  for (const r of residents ?? []) {
    if (!r.unit_id) continue;
    const name = nameByUser.get(r.user_id);
    if (!name) continue;
    const list = owners.get(r.unit_id) ?? [];
    list.push(name);
    owners.set(r.unit_id, list);
  }
  return owners;
}

async function CollectionReport({
  propertyId,
  periodDate,
  period,
}: {
  propertyId: string;
  periodDate: string;
  period: string;
}) {
  const supabase = await createClient();
  const [units, owners] = await Promise.all([
    unitsForProperty(propertyId),
    ownersForProperty(propertyId),
  ]);
  const { data: dues } = await supabase
    .from("monthly_dues")
    .select("id, unit_id, amount_due, amount_paid")
    .eq("property_id", propertyId)
    .eq("period", periodDate);

  const unitNumber = new Map(units.map((u) => [u.id, u.unit_number]));
  const rows = (dues ?? []).map((d) => ({ ...d, status: dueStatus(d) }));
  const totalDue = rows.reduce((s, r) => s + r.amount_due, 0);
  const totalPaid = rows.reduce((s, r) => s + r.amount_paid, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">Period: {formatPeriod(period)}</p>
      <Table caption={`Collection status for ${formatPeriod(period)}`}>
        <TableHead>
          <TableHeaderCell>Flat</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Due</TableHeaderCell>
          <TableHeaderCell>Paid</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-slate-900">
                {unitNumber.get(r.unit_id)}
              </TableCell>
              <TableCell>
                {(owners.get(r.unit_id) ?? []).join(",") || "—"}
              </TableCell>
              <TableCell>{formatCurrency(r.amount_due)}</TableCell>
              <TableCell>{formatCurrency(r.amount_paid)}</TableCell>
              <TableCell>
                <DueStatusBadge status={r.status} />
              </TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-4 text-center text-slate-500"
              >
                No dues generated for this month.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 font-semibold">
            <TableCell className="py-2 text-slate-900">Total</TableCell>
            <TableCell>{""}</TableCell>
            <TableCell className="py-2 text-slate-900">
              {formatCurrency(totalDue)}
            </TableCell>
            <TableCell className="py-2 text-slate-900">
              {formatCurrency(totalPaid)}
            </TableCell>
            <TableCell>{""}</TableCell>
          </tr>
        </tfoot>
      </Table>
    </div>
  );
}

async function OutstandingDuesReport({ propertyId }: { propertyId: string }) {
  const supabase = await createClient();
  const [units, owners] = await Promise.all([
    unitsForProperty(propertyId),
    ownersForProperty(propertyId),
  ]);
  const { data: dues } = await supabase
    .from("monthly_dues")
    .select("unit_id, amount_due, amount_paid")
    .eq("property_id", propertyId);

  const unitNumber = new Map(units.map((u) => [u.id, u.unit_number]));
  const balanceByUnit = new Map<string, number>();
  for (const d of dues ?? []) {
    const bal = Math.max(0, d.amount_due - d.amount_paid);
    balanceByUnit.set(d.unit_id, (balanceByUnit.get(d.unit_id) ?? 0) + bal);
  }
  const rows = [...balanceByUnit.entries()]
    .filter(([, bal]) => bal > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, bal]) => s + bal, 0);

  return (
    <div className="space-y-4">
      <Table caption="Outstanding dues by unit">
        <TableHead>
          <TableHeaderCell>Flat</TableHeaderCell>
          <TableHeaderCell>Owner</TableHeaderCell>
          <TableHeaderCell>Outstanding balance</TableHeaderCell>
        </TableHead>
        <TableBody>
          {rows.map(([unitId, bal]) => (
            <TableRow key={unitId}>
              <TableCell className="font-medium text-slate-900">
                {unitNumber.get(unitId)}
              </TableCell>
              <TableCell>
                {(owners.get(unitId) ?? []).join(",") || "—"}
              </TableCell>
              <TableCell className="text-bad">{formatCurrency(bal)}</TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell
                colSpan={3}
                className="py-4 text-center text-slate-500"
              >
                No outstanding dues — everyone is paid up.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-semibold">
              <TableCell className="py-2 text-slate-900">
                Total outstanding
              </TableCell>
              <TableCell>{""}</TableCell>
              <TableCell className="py-2 text-bad">
                {formatCurrency(total)}
              </TableCell>
            </tr>
          </tfoot>
        )}
      </Table>
    </div>
  );
}

async function ExpenseReport({
  propertyId,
  periodDate,
  period,
}: {
  propertyId: string;
  periodDate: string;
  period: string;
}) {
  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, description, category_id")
    .eq("property_id", propertyId)
    .eq("period", periodDate);

  const categoryIds = [
    ...new Set(
      (expenses ?? [])
        .map((e) => e.category_id)
        .filter((id): id is string => !!id)
    ),
  ];
  const nameById = new Map<string, string>();
  if (categoryIds.length) {
    const { data: cats } = await supabase
      .from("expense_categories")
      .select("id, name")
      .in("id", categoryIds);
    for (const c of cats ?? []) nameById.set(c.id, c.name);
  }
  const byCategory = new Map<string, number>();
  for (const e of expenses ?? []) {
    const name = e.category_id
      ? (nameById.get(e.category_id) ?? "Uncategorised")
      : "Uncategorised";
    byCategory.set(name, (byCategory.get(name) ?? 0) + e.amount);
  }
  const rows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, amt]) => s + amt, 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">Period: {period}</p>
      <Table caption={`Expenses by category for ${period}`}>
        <TableHead>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Amount</TableHeaderCell>
        </TableHead>
        <TableBody>
          {rows.map(([name, amt]) => (
            <TableRow key={name}>
              <TableCell className="font-medium text-slate-900">
                {name}
              </TableCell>
              <TableCell>{formatCurrency(amt)}</TableCell>
            </TableRow>
          ))}
          {!rows.length && (
            <TableRow>
              <TableCell
                colSpan={2}
                className="py-4 text-center text-slate-500"
              >
                No expenses recorded for this month.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-semibold">
              <TableCell className="py-2 text-slate-900">Total</TableCell>
              <TableCell className="py-2 text-slate-900">
                {formatCurrency(total)}
              </TableCell>
            </tr>
          </tfoot>
        )}
      </Table>
    </div>
  );
}

async function IncomeVsExpenseReport({ propertyId }: { propertyId: string }) {
  const supabase = await createClient();
  const [{ data: dues }, { data: expenses }] = await Promise.all([
    supabase
      .from("monthly_dues")
      .select("period, amount_paid")
      .eq("property_id", propertyId),
    supabase
      .from("expenses")
      .select("period, amount")
      .eq("property_id", propertyId),
  ]);

  const incomeByMonth = new Map<string, number>();
  for (const d of dues ?? []) {
    incomeByMonth.set(
      d.period,
      (incomeByMonth.get(d.period) ?? 0) + d.amount_paid
    );
  }
  const expenseByMonth = new Map<string, number>();
  for (const e of expenses ?? []) {
    expenseByMonth.set(
      e.period,
      (expenseByMonth.get(e.period) ?? 0) + e.amount
    );
  }
  const months = [
    ...new Set([...incomeByMonth.keys(), ...expenseByMonth.keys()]),
  ]
    .sort()
    .slice(-6);
  const max = Math.max(
    1,
    ...months.map((m) =>
      Math.max(incomeByMonth.get(m) ?? 0, expenseByMonth.get(m) ?? 0)
    )
  );

  return (
    <div className="space-y-6">
      {months.length ? (
        <>
          <p className="flex items-center gap-4 text-sm text-slate-700">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-teal-deep"
                aria-hidden="true"
              />
              Income
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full bg-rust"
                aria-hidden="true"
              />
              Expense
            </span>
          </p>
          {months.map((m) => (
            <div key={m} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {formatPeriod(m)}
              </p>
              <Bar
                label="Income"
                value={Math.round(incomeByMonth.get(m) ?? 0)}
                max={max}
                tone="income"
              />
              <Bar
                label="Expense"
                value={Math.round(expenseByMonth.get(m) ?? 0)}
                max={max}
                tone="expense"
              />
            </div>
          ))}
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="No income or expense data yet"
          description="Once dues are paid and expenses are recorded, the monthly comparison will appear here."
        />
      )}
    </div>
  );
}
