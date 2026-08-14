import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canViewReports, getCurrentUser } from "@/lib/permissions";
import { PrintButton } from "@/components/finance/print-button";
import { Bar } from "@/components/finance/bar";
import { dueStatus, formatCurrency, formatPeriod } from "@/lib/finance/dues";

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
    return <p className="text-sm text-muted">No property found.</p>;
  }

  const period = /^\d{4}-\d{2}$/.test(sp.period ?? "")
    ? sp.period!
    : currentPeriod();
  const periodDate = `${period}-01`;
  const generatedAt = new Date().toLocaleString();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>
      <div className="no-print flex items-center justify-between">
        <h1 className="text-xl font-bold text-teal-deep">
          {REPORT_TITLES[type]}
        </h1>
        <PrintButton />
      </div>

      <div className="rounded-none border border-line bg-white p-6 print:border-0 print:shadow-none">
        <header className="mb-4 border-b border-line pb-3">
          <h2 className="text-lg font-bold text-ink">{property.name}</h2>
          <p className="text-sm text-muted">
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
      </div>
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
  propertyId: string,
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
    (profiles ?? []).map((p) => [p.user_id, p.full_name || p.email]),
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
      <p className="text-sm text-ink">Period: {formatPeriod(period)}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="py-1">Flat</th>
              <th className="py-1">Owner</th>
              <th className="py-1">Due</th>
              <th className="py-1">Paid</th>
              <th className="py-1">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line">
                <td className="py-1 font-medium">
                  {unitNumber.get(r.unit_id)}
                </td>
                <td className="py-1 text-ink">
                  {(owners.get(r.unit_id) ?? []).join(",") || "—"}
                </td>
                <td className="py-1">{formatCurrency(r.amount_due)}</td>
                <td className="py-1">{formatCurrency(r.amount_paid)}</td>
                <td className="py-1 capitalize">{r.status}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-muted">
                  No dues generated for this month.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line font-semibold">
              <td className="py-2">Total</td>
              <td />
              <td className="py-2">{formatCurrency(totalDue)}</td>
              <td className="py-2">{formatCurrency(totalPaid)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
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
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="py-1">Flat</th>
              <th className="py-1">Owner</th>
              <th className="py-1">Outstanding balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([unitId, bal]) => (
              <tr key={unitId} className="border-b border-line">
                <td className="py-1 font-medium">{unitNumber.get(unitId)}</td>
                <td className="py-1 text-ink">
                  {(owners.get(unitId) ?? []).join(",") || "—"}
                </td>
                <td className="py-1 text-bad">{formatCurrency(bal)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-muted">
                  No outstanding dues — everyone is paid up.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="py-2">Total outstanding</td>
                <td />
                <td className="py-2 text-bad">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
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
        .filter((id): id is string => !!id),
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
      <p className="text-sm text-ink">Period: {period}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-muted">
              <th className="py-1">Category</th>
              <th className="py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, amt]) => (
              <tr key={name} className="border-b border-line">
                <td className="py-1 font-medium">{name}</td>
                <td className="py-1">{formatCurrency(amt)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-muted">
                  No expenses recorded for this month.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line font-semibold">
                <td className="py-2">Total</td>
                <td className="py-2">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
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
      (incomeByMonth.get(d.period) ?? 0) + d.amount_paid,
    );
  }
  const expenseByMonth = new Map<string, number>();
  for (const e of expenses ?? []) {
    expenseByMonth.set(
      e.period,
      (expenseByMonth.get(e.period) ?? 0) + e.amount,
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
      Math.max(incomeByMonth.get(m) ?? 0, expenseByMonth.get(m) ?? 0),
    ),
  );

  return (
    <div className="space-y-6">
      {months.length ? (
        months.map((m) => (
          <div key={m} className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted">
              {formatPeriod(m)}
            </p>
            <Bar
              label="Income"
              value={Math.round(incomeByMonth.get(m) ?? 0)}
              max={max}
            />
            <Bar
              label="Expense"
              value={Math.round(expenseByMonth.get(m) ?? 0)}
              max={max}
            />
          </div>
        ))
      ) : (
        <p className="text-sm text-muted">No income or expense data yet.</p>
      )}
    </div>
  );
}
