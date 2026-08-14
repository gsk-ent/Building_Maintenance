import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageProperties, getCurrentUser, isManager } from "@/lib/permissions";

export const metadata = { title: "Properties — Building Maintenance" };

export default async function PropertiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageProperties(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address_line1, city, country, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Properties</h1>
        {isManager(user) && (
          <Link
            href="/properties/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Add property
          </Link>
        )}
      </div>
      {properties?.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
            >
              <h2 className="font-semibold text-slate-900">{p.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {p.address_line1}, {p.city}, {p.country}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No properties yet. Add your first property to get started.
        </div>
      )}
    </div>
  );
}
