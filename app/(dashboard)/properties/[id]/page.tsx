import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin, isManager } from "@/lib/permissions";
import { BuildingForm } from "@/components/dashboard/building-form";
import { UnitForm } from "@/components/dashboard/unit-form";
import { MemberForm } from "@/components/dashboard/member-form";
import { uuidSchema } from "@/lib/validation";

export const metadata = { title: "Property — Building Maintenance" };

const RELATIONSHIP_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  resident: "Resident",
  technician: "Technician",
  vendor: "Vendor",
};

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: property }, { data: myAssignments }] = await Promise.all([
    supabase.from("properties").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("property_user_assignments")
      .select("relationship")
      .eq("property_id", id)
      .eq("user_id", user.id),
  ]);
  if (!property) notFound(); // also covers RLS denial — no data leak

  const myRelationships = (myAssignments ?? []).map((a) => a.relationship);
  // Manages *this* building specifically — either via a platform-wide role,
  // or by being a 'manager'/'admin' member of this particular property.
  const canManageThisProperty =
    isManager(user) ||
    myRelationships.some((r) => r === "manager" || r === "admin");
  // Only an existing building admin (or the platform admin) may grant
  // admin access to another member of this building.
  const canGrantAdmin = isAdmin(user) || myRelationships.includes("admin");

  const [{ data: buildings }, { data: requests }] = await Promise.all([
    supabase
      .from("buildings")
      .select("id, name, floors_count")
      .eq("property_id", id)
      .order("name"),
    supabase
      .from("maintenance_requests")
      .select("id, title, status, priority, created_at")
      .eq("property_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const buildingIds = (buildings ?? []).map((b) => b.id);
  const [{ data: units }, { data: members }] = await Promise.all([
    buildingIds.length
      ? supabase
          .from("units")
          .select("id, unit_number, building_id, default_monthly_amount")
          .in("building_id", buildingIds)
          .order("unit_number")
      : Promise.resolve({ data: [] }),
    canManageThisProperty
      ? supabase
          .from("property_user_assignments")
          .select("id, user_id, relationship, unit_id")
          .eq("property_id", id)
      : Promise.resolve({ data: [] }),
  ]);

  const unitsByBuilding = new Map<string, typeof units>();
  for (const u of units ?? []) {
    const list = unitsByBuilding.get(u.building_id) ?? [];
    list.push(u);
    unitsByBuilding.set(u.building_id, list);
  }

  let memberProfiles = new Map<string, string>();
  if (canManageThisProperty && members?.length) {
    const ids = [...new Set(members.map((m) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", ids);
    memberProfiles = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.full_name || p.email])
    );
  }
  const unitLabel = new Map((units ?? []).map((u) => [u.id, u.unit_number]));

  // Flat number → resident name(s), so the unit list reads"101 — Satish"
  // instead of a bare unit code.
  const ownersByUnit = new Map<string, string[]>();
  for (const m of members ?? []) {
    if (m.relationship !== "resident" || !m.unit_id) continue;
    const name = memberProfiles.get(m.user_id);
    if (!name) continue;
    const list = ownersByUnit.get(m.unit_id) ?? [];
    list.push(name);
    ownersByUnit.set(m.unit_id, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-teal-deep">{property.name}</h1>
        <p className="text-sm text-muted">
          {property.address_line1}
          {property.address_line2 ? `, ${property.address_line2}` : ""},{""}
          {property.city}, {property.country}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            Buildings &amp; units
          </h2>
          {buildings?.length ? (
            <ul className="mb-4 space-y-3">
              {buildings.map((b) => (
                <li key={b.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{b.name}</span>
                    <span className="text-xs text-muted">
                      {b.floors_count != null ? `${b.floors_count} floors` : ""}
                    </span>
                  </div>
                  {(unitsByBuilding.get(b.id) ?? []).length > 0 && (
                    <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {(unitsByBuilding.get(b.id) ?? [])!.map((u) => {
                        const owners = ownersByUnit.get(u.id) ?? [];
                        return (
                          <li
                            key={u.id}
                            className="flex items-center justify-between rounded-none bg-paper px-2.5 py-1.5 text-xs"
                          >
                            <span>
                              <span className="font-semibold text-ink">
                                Flat {u.unit_number}
                              </span>
                              <span className="ml-1.5 text-muted">
                                {owners.length
                                  ? owners.join(",")
                                  : "Unassigned"}
                              </span>
                            </span>
                            {u.default_monthly_amount != null && (
                              <span className="shrink-0 text-muted">
                                ₹{u.default_monthly_amount}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {canManageThisProperty && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-teal-deep">
                        + Add unit to {b.name}
                      </summary>
                      <div className="mt-2">
                        <UnitForm buildingId={b.id} />
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-muted">No buildings yet.</p>
          )}
          {canManageThisProperty && <BuildingForm propertyId={id} />}
        </section>

        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            Recent maintenance requests
          </h2>
          {requests?.length ? (
            <ul className="divide-y divide-line">
              {requests.map((r) => (
                <li key={r.id} className="py-2">
                  <Link
                    href={`/maintenance/${r.id}`}
                    className="text-sm font-medium text-ink hover:underline"
                  >
                    {r.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted">
                    {r.status} · {r.priority}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No requests for this property.</p>
          )}
        </section>

        {canManageThisProperty && (
          <section className="rounded-none border border-line bg-white p-4 lg:col-span-2">
            <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
              Members
            </h2>
            {members?.length ? (
              <ul className="mb-4 divide-y divide-line">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span className="font-medium text-ink">
                      {memberProfiles.get(m.user_id) ?? m.user_id.slice(0, 8)}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {m.relationship === "admin" ? (
                        <span className="rounded-sm bg-teal-deep/10 px-2 py-0.5 font-medium text-teal-deep">
                          Admin
                        </span>
                      ) : (
                        (RELATIONSHIP_LABELS[m.relationship] ?? m.relationship)
                      )}
                      {m.unit_id
                        ? ` · Unit ${unitLabel.get(m.unit_id) ?? ""}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-muted">No members added yet.</p>
            )}
            <MemberForm
              propertyId={id}
              units={(units ?? []).map((u) => ({
                id: u.id,
                label: u.unit_number,
              }))}
              canGrantAdmin={canGrantAdmin}
            />
          </section>
        )}
      </div>
    </div>
  );
}
