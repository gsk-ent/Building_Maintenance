import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canManageProperties, getCurrentUser } from "@/lib/permissions";
import { PaymentSettingsForm } from "@/components/finance/payment-settings-form";
import { PropertyPicker } from "@/components/finance/property-picker";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeader title="Payment settings" />
        <EmptyState
          icon={Building2}
          title="Add a property first"
          description="Payment details are set per property, so create one before configuring them."
        />
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
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Payment settings"
        description="These details are shown to residents on their “My Dues” page, with a scannable UPI QR code."
      />
      <PropertyPicker
        properties={properties}
        basePath="/finances/payment-settings"
        activeId={propertyId}
      />
      <Card>
        <CardHeader title="Payment details" />
        <CardContent>
          <PaymentSettingsForm
            propertyId={propertyId}
            settings={settings ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
