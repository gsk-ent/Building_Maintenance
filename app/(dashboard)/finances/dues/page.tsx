import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManager } from "@/lib/permissions";
import { PropertyPicker } from "@/components/finance/property-picker";
import { GenerateDuesForm } from "@/components/finance/generate-dues-form";
import { RecordPaymentForm } from "@/components/finance/record-payment-form";
import { dueStatus, formatCurrency, formatPeriod } from "@/lib/finance/dues";

export const metadata = { title: "Dues — Building Maintenance" };

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  pending: "bg-red-100 text-red-700",
};

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; building?: string; period?: string }>;
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

  const sp = await searchParams;
  const propertyId = sp.property && properties.some((p) => p.id === sp.property) ? sp.property : properties[0].id;

  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("property_id", propertyId)
    .order("name");

  const buildingId =
    sp.building && buildings?.some((b) => b.id === sp.building) ? sp.building : buildings?.[0]?.id;

  const period = /^\d{4}-\d{2}$/.test(sp.period ?? "") ? sp.period! : currentPeriod();
  const periodDate = `${period}-01`;

  let dues: {
    id: string;
    period: string;
    amount_due: number;
    amount_paid: number;
    unit_id: string;
    unit_number: string;
  }[] = [];

  if (buildingId) {
    const { data: units } = await supabase.from("units").select("id, unit_number").eq("building_id", buildingId);
    const ids = (units ?? []).map((u) => u.id);
    const unitNumber = new Map((units ?? []).map((u) => [u.id, u.unit_number]));
    if (ids.length) {
      const { data } = await supabase
        .from("monthly_dues")
        .select("id, period, amount_due, amount_paid, unit_id")
        .in("unit_id", ids)
        .eq("period", periodDate)
        .order("unit_id");
      dues = (data ?? []).map((d) => ({ ...d, unit_number: unitNumber.get(d.unit_id) ?? "?" }));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Dues</h1>
      <PropertyPicker properties={properties} basePath="/finances/dues" activeId={propertyId} />

      {buildings?.length ? (
        <div className="flex flex-wrap items-center gap-3">
          <form method="get" className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="property" value={propertyId} />
            <select
              name="building"
              defaultValue={buildingId}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              type="month"
              name="period"
              defaultValue={period}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">
              View
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No buildings yet — add one under Properties.</p>
      )}

      {buildingId && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <GenerateDuesForm propertyId={propertyId} buildingId={buildingId} period={period} />
        </div>
      )}

      {dues.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Month</th>
                <th className="px-4 py-2">Due</th>
                <th className="px-4 py-2">Paid</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Record payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dues.map((d) => {
                const status = dueStatus(d);
                return (
                  <tr key={d.id}>
                    <td className="px-4 py-2 font-medium text-slate-800">{d.unit_number}</td>
                    <td className="px-4 py-2 text-slate-600">{formatPeriod(d.period)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatCurrency(d.amount_due)}</td>
                    <td className="px-4 py-2 text-slate-600">{formatCurrency(d.amount_paid)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <RecordPaymentForm dueId={d.id} amountDue={d.amount_due} amountPaid={d.amount_paid} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {buildingId && dues.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No dues generated for this month yet — click &quot;Generate dues&quot; above.
        </div>
      )}
    </div>
  );
}
