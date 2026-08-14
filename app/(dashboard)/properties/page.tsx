import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canManageProperties,
  getCurrentUser,
  isManager,
} from "@/lib/permissions";

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
        <h1 className="text-xl font-bold text-teal-deep">Properties</h1>
        {isManager(user) && (
          <Link
            href="/properties/new"
            className="label-mono border border-teal-deep bg-teal-deep px-4 py-2.5 text-[11px] text-white hover:bg-teal"
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
              className="rounded-none border border-line bg-white p-4 transition hover:border-teal"
            >
              <h2 className="font-semibold text-ink">{p.name}</h2>
              <p className="mt-1 text-sm text-muted">
                {p.address_line1}, {p.city}, {p.country}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-none border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          No properties yet. Add your first property to get started.
        </div>
      )}
    </div>
  );
}
