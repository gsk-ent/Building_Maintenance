"use client";

import { useActionState } from "react";
import { recordDuePayment } from "@/lib/actions/finances";
import type { ActionState } from "@/lib/actions/properties";
import { formatCurrency } from "@/lib/finance/dues";
import { Field, FormError, Select, SubmitButton } from "@/components/ui/form";

export function RecordPaymentForm({
  dueId,
  amountDue,
  amountPaid,
}: {
  dueId: string;
  amountDue: number;
  amountPaid: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    recordDuePayment,
    {}
  );
  const outstanding = Math.max(0, amountDue - amountPaid);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="dueId" value={dueId} />
      <p className="text-sm text-slate-500">
        Already paid {formatCurrency(amountPaid)} · Outstanding{" "}
        {formatCurrency(outstanding)}
      </p>
      <FormError message={state.errors?._form} />
      <Field
        label="Amount paid now (₹)"
        name="amountPaid"
        type="number"
        step="0.01"
        min="0"
        defaultValue={String(amountPaid || amountDue)}
        error={state.errors?.amountPaid}
      />
      <Select
        label="Payment method"
        name="paymentMethod"
        defaultValue="UPI"
        error={state.errors?.paymentMethod}
      >
        <option value="UPI">UPI</option>
        <option value="Cash">Cash</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Cheque">Cheque</option>
      </Select>
      <SubmitButton variant="secondary">Save</SubmitButton>
    </form>
  );
}
