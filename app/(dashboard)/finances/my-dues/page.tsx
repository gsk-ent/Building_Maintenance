import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { buildUpiUri } from "@/lib/finance/upi";
import { upiQrDataUrl } from "@/lib/finance/qr";
import { dueStatus, formatCurrency, formatPeriod, outstandingBalance } from "@/lib/finance/dues";

export const metadata = { title: "My Dues — Building Maintenance" };

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  partial: "bg-amber-100 text-amber-800",
  pending: "bg-red-100 text-red-700",
};

export default async function MyDuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // RLS (resides_in_unit) restricts this to the current user's own unit(s)
  // — there is no way for a resident to see anyone else's dues.
  const { data: dues } = await supabase
    .from("monthly_dues")
    .select("id, unit_id, period, amount_due, amount_paid, paid_at, payment_method")
    .order("period", { ascending: false });

  if (!dues?.length) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-xl font-bold text-slate-900">My Dues</h1>
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No dues have been recorded for your unit yet. Contact your property
          manager if you believe this is incorrect.
        </div>
      </div>
    );
  }

  const balance = outstandingBalance(dues);

  let qrDataUrl: string | null = null;
  let upiId: string | null = null;
  if (balance > 0) {
    const unitId = dues[0].unit_id;
    const { data: unit } = await supabase
      .from("units")
      .select("building_id")
      .eq("id", unitId)
      .maybeSingle();
    const { data: building } = unit
      ? await supabase.from("buildings").select("property_id, name").eq("id", unit.building_id).maybeSingle()
      : { data: null };
    if (building) {
      const { data: settings } = await supabase
        .from("property_payment_settings")
        .select("upi_id")
        .eq("property_id", building.property_id)
        .maybeSingle();
      if (settings?.upi_id) {
        upiId = settings.upi_id;
        const uri = buildUpiUri({
          vpa: settings.upi_id,
          payeeName: building.name,
          amount: balance,
          note: "Maintenance dues",
        });
        qrDataUrl = await upiQrDataUrl(uri);
      }
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">My Dues</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Outstanding balance</p>
        <p className={`mt-1 text-3xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
          {formatCurrency(balance)}
        </p>
      </div>

      {qrDataUrl && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-900">Scan to pay via UPI</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="UPI QR code to pay dues" width={200} height={200} className="mx-auto" />
          <p className="mt-2 text-xs text-slate-500">{upiId}</p>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Paid</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Paid on</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dues.map((d) => {
              const status = dueStatus(d);
              return (
                <tr key={d.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">{formatPeriod(d.period)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatCurrency(d.amount_due)}</td>
                  <td className="px-4 py-2 text-slate-600">{formatCurrency(d.amount_paid)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {d.paid_at ? new Date(d.paid_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
