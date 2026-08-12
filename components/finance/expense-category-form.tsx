"use client";

import { useActionState } from "react";
import { createExpenseCategory } from "@/lib/actions/finances";
import type { ActionState } from "@/lib/actions/properties";
import { Field, SubmitButton } from "@/components/ui/form";

export function ExpenseCategoryForm({ propertyId }: { propertyId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(createExpenseCategory, {});
  return (
    <form action={action} className="flex items-end gap-2" noValidate>
      <input type="hidden" name="propertyId" value={propertyId} />
      <div className="flex-1">
        <Field label="New category" name="name" required error={state.errors?.name} />
      </div>
      <SubmitButton variant="secondary">Add</SubmitButton>
    </form>
  );
}
