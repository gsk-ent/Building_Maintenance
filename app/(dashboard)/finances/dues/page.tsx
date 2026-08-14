import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageProperties, getCurrentUser } from "@/lib/permissions";
import { PropertyPicker } from "@/components/finance/property-picker";
import { GenerateDuesForm } from "@/components/finance/generate-dues-form";
import { RecordPaymentForm } from "@/components/finance/record-payment-form";
import { dueStatus, formatCurrency, formatPeriod } from "@/lib/finance/dues";

export const metadata = { title: "Dues — Building Maintenance" };

const STATUS_BADGE: Record<string, string> = {
  paid: "bg-good/10 text-good",
  partial: "bg-gold/15 text-gold",
  pending: "bg-bad/10 text-bad",
};

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
      <div className="rounded-none border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
        Add a property first.
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
          ]),
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
      <h1 className="text-xl font-bold text-teal-deep">Dues</h1>
      <PropertyPicker
        properties={properties}
        basePath="/finances/dues"
        activeId={propertyId}
      />

      {buildings?.length ? (
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="property" value={propertyId} />
          <select
            name="building"
            defaultValue={buildingId}
            className="rounded-none border border-line px-2 py-1.5 text-sm"
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
            className="rounded-none border border-line px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="label-mono border border-line bg-white px-3 py-1.5 text-[11px] hover:bg-paper"
          >
            View
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">
          No buildings yet — add one under Properties.
        </p>
      )}

      {buildingId && (
        <div className="rounded-none border border-line bg-white p-4">
          <GenerateDuesForm
            propertyId={propertyId}
            buildingId={buildingId}
            period={period}
          />
        </div>
      )}

      {dues.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dues.map((d) => {
            const status = dueStatus(d);
            return (
              <div
                key={d.id}
                className="rounded-none border border-line bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-bold text-ink">
                      Flat {d.unit_number}
                    </p>
                    <p className="text-sm text-muted">
                      {d.owners.length
                        ? d.owners.join(",")
                        : "No resident linked yet"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-sm px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status]}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {formatPeriod(d.period)}
                </p>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="text-ink">
                    Due{" "}
                    <strong className="text-ink">
                      {formatCurrency(d.amount_due)}
                    </strong>
                  </span>
                  <span className="text-ink">
                    Paid{" "}
                    <strong className="text-ink">
                      {formatCurrency(d.amount_paid)}
                    </strong>
                  </span>
                </div>
                <div className="mt-3 border-t border-line pt-3">
                  <RecordPaymentForm
                    dueId={d.id}
                    amountDue={d.amount_due}
                    amountPaid={d.amount_paid}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
      {buildingId && dues.length === 0 && (
        <div className="rounded-none border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          No dues generated for this month yet — click &quot;Generate dues&quot;
          above.
        </div>
      )}
    </div>
  );
}
