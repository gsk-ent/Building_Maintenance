import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import { RoleBadge } from "@/components/admin/role-badge";
import { GrantRoleForm } from "@/components/admin/grant-role-form";
import type { AppRole } from "@/types/database";

export const metadata = { title: "Manage users — Building Maintenance" };

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (!isAdmin(current)) redirect("/dashboard");

  const { q } = await searchParams;
  const supabase = await createClient();

  let profileQuery = supabase
    .from("profiles")
    .select("user_id, full_name, email, status, last_login_at, created_at")
    .order("created_at", { ascending: false });
  if (q) profileQuery = profileQuery.ilike("email", `%${q}%`);
  const { data: profiles } = await profileQuery;

  const userIds = (profiles ?? []).map((p) => p.user_id);
  const [{ data: roleRows }, { data: assignments }] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase
          .from("property_user_assignments")
          .select("user_id, property_id, relationship, unit_id")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const propertyIds = [
    ...new Set((assignments ?? []).map((a) => a.property_id)),
  ];
  const unitIds = [
    ...new Set(
      (assignments ?? [])
        .map((a) => a.unit_id)
        .filter((id): id is string => !!id),
    ),
  ];
  const [{ data: properties }, { data: units }] = await Promise.all([
    propertyIds.length
      ? supabase.from("properties").select("id, name").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
    unitIds.length
      ? supabase.from("units").select("id, unit_number").in("id", unitIds)
      : Promise.resolve({ data: [] }),
  ]);
  const propertyName = new Map((properties ?? []).map((p) => [p.id, p.name]));
  const unitNumber = new Map((units ?? []).map((u) => [u.id, u.unit_number]));

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of roleRows ?? []) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  }
  const assignmentsByUser = new Map<string, typeof assignments>();
  for (const a of assignments ?? []) {
    const list = assignmentsByUser.get(a.user_id) ?? [];
    list.push(a);
    assignmentsByUser.set(a.user_id, list);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-teal-deep">Manage users</h1>
        <p className="text-sm text-muted">
          Platform-wide roles. To link someone to a specific building or flat,
          use that property&apos;s Members panel instead.
        </p>
      </div>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by email…"
          className="w-full max-w-xs label-mono border border-line px-3 py-1.5 text-[11px]"
        />
        <button
          type="submit"
          className="label-mono border border-line bg-white px-3 py-1.5 text-[11px] hover:bg-paper"
        >
          Search
        </button>
      </form>

      <div className="space-y-3">
        {(profiles ?? []).map((p) => {
          const roles = rolesByUser.get(p.user_id) ?? [];
          const myAssignments = assignmentsByUser.get(p.user_id) ?? [];
          return (
            <div
              key={p.user_id}
              className="rounded-none border border-line bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">
                    {p.full_name || "(no name set)"}
                  </p>
                  <p className="text-sm text-muted">{p.email}</p>
                </div>
                <span className="text-xs text-muted">
                  {p.last_login_at
                    ? `Last seen ${new Date(p.last_login_at).toLocaleDateString()}`
                    : "Never signed in"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {roles.length ? (
                  roles.map((r) => (
                    <RoleBadge key={r} userId={p.user_id} role={r} />
                  ))
                ) : (
                  <span className="text-xs text-muted">No platform role</span>
                )}
                <GrantRoleForm userId={p.user_id} />
              </div>

              {myAssignments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  {myAssignments.map((a, i) => (
                    <span
                      key={i}
                      className="rounded-sm bg-paper px-2 py-0.5 text-xs text-ink"
                    >
                      {propertyName.get(a!.property_id) ?? "Unknown building"} ·{" "}
                      {ROLE_LABELS_FALLBACK(a!.relationship)}
                      {a!.unit_id
                        ? ` · Unit ${unitNumber.get(a!.unit_id) ?? ""}`
                        : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!profiles?.length && (
          <p className="text-sm text-muted">No users found.</p>
        )}
      </div>
    </div>
  );
}

function ROLE_LABELS_FALLBACK(relationship: string): string {
  const labels: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    resident: "Resident",
    technician: "Technician",
    vendor: "Vendor",
  };
  return labels[relationship] ?? relationship;
}
