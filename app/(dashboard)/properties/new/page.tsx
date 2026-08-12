import { redirect } from "next/navigation";
import { PropertyForm } from "@/components/dashboard/property-form";
import { getCurrentUser, isManager } from "@/lib/permissions";

export const metadata = { title: "Add property — Building Maintenance" };

export default async function NewPropertyPage() {
  const user = await getCurrentUser();
  if (!user || !isManager(user)) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Add property</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <PropertyForm />
      </div>
    </div>
  );
}
