"use client";

import { useActionState } from "react";
import { createExpense } from "@/lib/actions/finances";
import type { ActionState } from "@/lib/actions/properties";
import { Field, FormError, FormSuccess, Select, SubmitButton, TextArea } from "@/components/ui/form";

export function ExpenseForm({
  propertyId,
  categories,
  defaultPeriod,
}: {
  propertyId: string;
  categories: { id: string; name: string }[];
  defaultPeriod: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createExpense, {});
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Month" name="period" type="month" defaultValue={defaultPeriod} error={state.errors?.period} />
        <Field label="Amount (₹)" name="amount" type="number" error={state.errors?.amount} />
      </div>
      <Select label="Category" name="categoryId" required={false} defaultValue="" error={state.errors?.categoryId}>
        <option value="">Uncategorised</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <TextArea label="Description" name="description" required={false} rows={2} error={state.errors?.description} />
      <SubmitButton variant="secondary">Add expense</SubmitButton>
    </form>
  );
}
