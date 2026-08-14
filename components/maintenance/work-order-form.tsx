"use client";

import { useActionState } from "react";
import { createWorkOrder } from "@/lib/actions/maintenance";
import type { ActionState } from "@/lib/actions/properties";
import {
  Field,
  FormError,
  FormSuccess,
  Select,
  SubmitButton,
  TextArea,
} from "@/components/ui/form";
import type { Option } from "@/components/maintenance/request-form";

export function WorkOrderForm({
  requestId,
  technicians,
}: {
  requestId: string;
  technicians: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createWorkOrder,
    {}
  );
  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      <FormError message={state.errors?._form} />
      <FormSuccess message={state.success ? state.message : undefined} />
      <Field
        label="Work order title"
        name="title"
        error={state.errors?.title}
      />
      <TextArea
        label="Instructions"
        name="instructions"
        rows={3}
        required={false}
        error={state.errors?.instructions}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Assign to"
          name="assignedTo"
          required={false}
          defaultValue=""
          error={state.errors?.assignedTo}
        >
          <option value="">Unassigned (draft)</option>
          {technicians.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
        <Field
          label="Scheduled for"
          name="scheduledFor"
          type="datetime-local"
          required={false}
          error={state.errors?.scheduledFor}
        />
      </div>
      <Field
        label="Cost estimate"
        name="costEstimate"
        type="number"
        required={false}
        error={state.errors?.costEstimate}
      />
      <SubmitButton variant="secondary">Create work order</SubmitButton>
    </form>
  );
}
