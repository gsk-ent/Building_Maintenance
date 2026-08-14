"use client";

import { useActionState } from "react";
import { updatePaymentSettings } from "@/lib/actions/finances";
import type { ActionState } from "@/lib/actions/properties";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  TextArea,
} from "@/components/ui/form";
import type { PropertyPaymentSettings } from "@/types/database";

export function PaymentSettingsForm({
  propertyId,
  settings,
}: {
  propertyId: string;
  settings: PropertyPaymentSettings | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    updatePaymentSettings,
    {}
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <Field
        label="UPI ID (VPA)"
        name="upiId"
        required={false}
        placeholder="building@upi"
        defaultValue={settings?.upi_id ?? ""}
        error={state.errors?.upiId}
      />
      <Field
        label="UPI-linked mobile number"
        name="upiNumber"
        required={false}
        defaultValue={settings?.upi_number ?? ""}
        error={state.errors?.upiNumber}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Bank account name"
          name="bankAccountName"
          required={false}
          defaultValue={settings?.bank_account_name ?? ""}
          error={state.errors?.bankAccountName}
        />
        <Field
          label="Bank account number"
          name="bankAccountNumber"
          required={false}
          defaultValue={settings?.bank_account_number ?? ""}
          error={state.errors?.bankAccountNumber}
        />
        <Field
          label="IFSC"
          name="bankIfsc"
          required={false}
          defaultValue={settings?.bank_ifsc ?? ""}
          error={state.errors?.bankIfsc}
        />
        <Field
          label="Bank name"
          name="bankName"
          required={false}
          defaultValue={settings?.bank_name ?? ""}
          error={state.errors?.bankName}
        />
      </div>
      <TextArea
        label="Notes for residents"
        name="notes"
        required={false}
        defaultValue={settings?.notes ?? ""}
        error={state.errors?.notes}
      />
      <SubmitButton>Save payment details</SubmitButton>
    </form>
  );
}
