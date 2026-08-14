"use client";

import { useActionState } from "react";
import { generateDuesForPeriod } from "@/lib/actions/finances";
import type { ActionState } from "@/lib/actions/properties";
import { FormError, FormSuccess, SubmitButton } from "@/components/ui/form";

export function GenerateDuesForm({
  propertyId,
  buildingId,
  period,
}: {
  propertyId: string;
  buildingId: string;
  period: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    generateDuesForPeriod,
    {}
  );
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="propertyId" value={propertyId} />
      <input type="hidden" name="buildingId" value={buildingId} />
      <input type="hidden" name="period" value={period} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <SubmitButton variant="secondary">
        Generate dues for this month
      </SubmitButton>
    </form>
  );
}
