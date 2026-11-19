import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { buildUpiUri } from "@/lib/finance/upi";
import { upiQrDataUrl } from "@/lib/finance/qr";
import {
  dueStatus,
  formatCurrency,
  formatPeriod,
  outstandingBalance,
} from "@/lib/finance/dues";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export const metadata = { title: "My Dues — Building Maintenance" };

export default async function MyDuesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  // RLS (resides_in_unit) restricts this to the current user's own unit(s)
  // — there is no way for a resident to see anyone else's dues.
  const { data: dues } = await supabase
    .from("monthly_dues")
    .select(
      "id, unit_id, period, amount_due, amount_paid, paid_at, payment_method"
    )
    .order("period", { ascending: false });

  if (!dues?.length) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title="My Dues" />
        <EmptyState
          icon={Wallet}
          title="No dues recorded yet"
          description="No dues have been recorded for your unit yet. Contact your property manager if you believe this is incorrect."
        />
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
      ? await supabase
          .from("buildings")
          .select("property_id, name")
          .eq("id", unit.building_id)
          .maybeSingle()
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
      <PageHeader
        title="My Dues"
        description="Your unit’s maintenance dues and outstanding balance."
      />

      <Card>
        <CardContent>
          <p className="text-sm text-slate-500">Outstanding balance</p>
          <p
            className={`mt-1 text-3xl font-bold ${balance > 0 ? "text-bad" : "text-good"}`}
          >
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>

      {qrDataUrl && (
        <Card>
          <CardHeader title="Scan to pay via UPI" />
          <CardContent className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="UPI QR code to pay dues"
              width={200}
              height={200}
              className="mx-auto"
            />
            <p className="mt-2 text-xs text-slate-500">{upiId}</p>
          </CardContent>
        </Card>
      )}

      <Table caption="Monthly dues for your unit">
        <TableHead>
          <TableHeaderCell>Month</TableHeaderCell>
          <TableHeaderCell>Due</TableHeaderCell>
          <TableHeaderCell>Paid</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Paid on</TableHeaderCell>
        </TableHead>
        <TableBody>
          {dues.map((d) => {
            const status = dueStatus(d);
            return (
              <TableRow key={d.id}>
                <TableCell className="font-medium text-slate-900">
                  {formatPeriod(d.period)}
                </TableCell>
                <TableCell>{formatCurrency(d.amount_due)}</TableCell>
                <TableCell>{formatCurrency(d.amount_paid)}</TableCell>
                <TableCell>
                  <DueStatusBadge status={status} />
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {d.paid_at ? new Date(d.paid_at).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
