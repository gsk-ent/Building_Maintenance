import { redirect } from "next/navigation";
import { Building2, ReceiptText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canManageProperties, getCurrentUser } from "@/lib/permissions";
import { PropertyPicker } from "@/components/finance/property-picker";
import { GenerateDuesForm } from "@/components/finance/generate-dues-form";
import { RecordPaymentForm } from "@/components/finance/record-payment-form";
import { dueStatus, formatCurrency, formatPeriod } from "@/lib/finance/dues";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DueStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Dues — Building Maintenance" };

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{
    property?: string;
    building?: string;
    period?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user || !canManageProperties(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .order("name");
  if (!properties?.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dues" />
        <EmptyState
          icon={Building2}
          title="Add a property first"
          description="Dues are generated per building, so create a property before recording any."
          action={<ButtonLink href="/properties/new">Add property</ButtonLink>}
        />
      </div>
    );
  }

  const sp = await searchParams;
  const propertyId =
    sp.property && properties.some((p) => p.id === sp.property)
      ? sp.property
      : properties[0].id;

  const { data: buildings } = await supabase
    .from("buildings")
    .select("id, name")
    .eq("property_id", propertyId)
    .order("name");

  const buildingId =
    sp.building && buildings?.some((b) => b.id === sp.building)
      ? sp.building
      : buildings?.[0]?.id;

  const period = /^\d{4}-\d{2}$/.test(sp.period ?? "")
    ? sp.period!
    : currentPeriod();
  const periodDate = `${period}-01`;

  let dues: {
    id: string;
    period: string;
    amount_due: number;
    amount_paid: number;
    unit_id: string;
    unit_number: string;
    owners: string[];
  }[] = [];

  if (buildingId) {
    const { data: units } = await supabase
      .from("units")
      .select("id, unit_number")
      .eq("building_id", buildingId)
      .order("unit_number");
    const ids = (units ?? []).map((u) => u.id);
    const unitNumber = new Map((units ?? []).map((u) => [u.id, u.unit_number]));

    // Look up who lives in each unit so the board reads"Flat 402 — Satya"
    // instead of a bare unit code.
    const ownersByUnit = new Map<string, string[]>();
    if (ids.length) {
      const { data: residents } = await supabase
        .from("property_user_assignments")
        .select("unit_id, user_id")
        .in("unit_id", ids)
        .eq("relationship", "resident");
      const residentUserIds = [
        ...new Set((residents ?? []).map((r) => r.user_id)),
      ];
      let nameByUser = new Map<string, string>();
      if (residentUserIds.length) {
        const { data: residentProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", residentUserIds);
        nameByUser = new Map(
          (residentProfiles ?? []).map((p) => [
            p.user_id,
            p.full_name || p.email,
          ])
        );
      }
      for (const r of residents ?? []) {
        if (!r.unit_id) continue;
        const list = ownersByUnit.get(r.unit_id) ?? [];
        const name = nameByUser.get(r.user_id);
        if (name) list.push(name);
        ownersByUnit.set(r.unit_id, list);
      }
    }

    if (ids.length) {
      const { data } = await supabase
        .from("monthly_dues")
        .select("id, period, amount_due, amount_paid, unit_id")
        .in("unit_id", ids)
        .eq("period", periodDate);
      const byUnit = new Map((data ?? []).map((d) => [d.unit_id, d]));
      // Iterate in unit-number order (not raw insert order) so the board
      // reads top-to-bottom the way a resident list naturally would.
      dues = ids
        .map((unitId) => byUnit.get(unitId))
        .filter((d): d is NonNullable<typeof d> => !!d)
        .map((d) => ({
          ...d,
          unit_number: unitNumber.get(d.unit_id) ?? "?",
          owners: ownersByUnit.get(d.unit_id) ?? [],
        }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dues"
        description="Monthly maintenance dues per flat, for the selected building and month."
      />
      <PropertyPicker
        properties={properties}
        basePath="/finances/dues"
        activeId={propertyId}
      />

      {buildings?.length ? (
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="property" value={propertyId} />
          <div>
            <label
              htmlFor="building"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Building
            </label>
            <select
              id="building"
              name="building"
              defaultValue={buildingId}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-deep focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="period"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Month
            </label>
            <input
              id="period"
              type="month"
              name="period"
              defaultValue={period}
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-deep focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <Button type="submit" variant="secondary">
            View
          </Button>
        </form>
      ) : (
        <p className="text-sm text-slate-500">
          No buildings yet — add one under Properties.
        </p>
      )}

      {buildingId && (
        <Card>
          <CardHeader title="Generate dues" />
          <CardContent>
            <GenerateDuesForm
              propertyId={propertyId}
              buildingId={buildingId}
              period={period}
            />
          </CardContent>
        </Card>
      )}

      {dues.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dues.map((d) => {
            const status = dueStatus(d);
            return (
              <Card key={d.id}>
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        Flat {d.unit_number}
                      </p>
                      <p className="text-sm text-slate-500">
                        {d.owners.length
                          ? d.owners.join(",")
                          : "No resident linked yet"}
                      </p>
                    </div>
                    <DueStatusBadge status={status} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {formatPeriod(d.period)}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-slate-700">
                      Due{" "}
                      <strong className="text-slate-900">
                        {formatCurrency(d.amount_due)}
                      </strong>
                    </span>
                    <span className="text-slate-700">
                      Paid{" "}
                      <strong className="text-slate-900">
                        {formatCurrency(d.amount_paid)}
                      </strong>
                    </span>
                  </div>
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <RecordPaymentForm
                      dueId={d.id}
                      amountDue={d.amount_due}
                      amountPaid={d.amount_paid}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {buildingId && dues.length === 0 && (
        <EmptyState
          icon={ReceiptText}
          title="No dues generated for this month yet"
          description="Click “Generate dues” above to create this month’s dues for every flat in the building."
        />
      )}
    </div>
  );
}
