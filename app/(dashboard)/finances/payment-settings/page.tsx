import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canManageProperties, getCurrentUser } from "@/lib/permissions";
import { PaymentSettingsForm } from "@/components/finance/payment-settings-form";
import { PropertyPicker } from "@/components/finance/property-picker";

export const metadata = { title: "Payment settings — Building Maintenance" };

export default async function PaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
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

  const { property } = await searchParams;
  const propertyId =
    property && properties.some((p) => p.id === property)
      ? property
      : properties[0].id;

  const { data: settings } = await supabase
    .from("property_payment_settings")
    .select("*")
    .eq("property_id", propertyId)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-teal-deep">Payment settings</h1>
      <PropertyPicker
        properties={properties}
        basePath="/finances/payment-settings"
        activeId={propertyId}
      />
      <p className="text-sm text-muted">
        These details are shown to residents on their &quot;My Dues&quot; page,
        with a scannable UPI QR code.
      </p>
      <div className="rounded-none border border-line bg-white p-5">
        <PaymentSettingsForm
          propertyId={propertyId}
          settings={settings ?? null}
        />
      </div>
    </div>
  );
}
