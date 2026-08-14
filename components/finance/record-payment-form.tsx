"use client";

import { useActionState } from "react";
import { recordDuePayment } from "@/lib/actions/finances";
import type { ActionState } from "@/lib/actions/properties";
import { SubmitButton } from "@/components/ui/form";

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
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="dueId" value={dueId} />
      <label className="sr-only" htmlFor={`amount-${dueId}`}>
        Amount paid
      </label>
      <input
        id={`amount-${dueId}`}
        name="amountPaid"
        type="number"
        step="0.01"
        min={0}
        defaultValue={amountPaid || amountDue}
        className="w-24 rounded-none border border-line px-2 py-1 text-sm"
      />
      <select
        name="paymentMethod"
        defaultValue="UPI"
        className="rounded-none border border-line px-2 py-1 text-xs"
      >
        <option value="UPI">UPI</option>
        <option value="Cash">Cash</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Cheque">Cheque</option>
      </select>
      <SubmitButton variant="secondary">Save</SubmitButton>
      {state.errors?._form && (
        <span className="text-xs text-bad">{state.errors._form}</span>
      )}
    </form>
  );
}
