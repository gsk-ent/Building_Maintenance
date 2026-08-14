"use client";

import { useActionState } from "react";
import { createMaintenanceRequest } from "@/lib/actions/maintenance";
import type { ActionState } from "@/lib/actions/properties";
import {
  Field,
  FormError,
  Select,
  SubmitButton,
  TextArea,
} from "@/components/ui/form";

export interface Option {
  id: string;
  label: string;
}

export function RequestForm({
  properties,
  categories,
}: {
  properties: Option[];
  categories: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createMaintenanceRequest,
    {},
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError message={state.errors?._form} />
      <Select
        label="Property"
        name="propertyId"
        error={state.errors?.propertyId}
        defaultValue=""
      >
        <option value="" disabled>
          Select a property…
        </option>
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </Select>
      <Field
        label="Title"
        name="title"
        placeholder="e.g. Lift not working"
        error={state.errors?.title}
      />
      <TextArea
        label="Description"
        name="description"
        rows={5}
        error={state.errors?.description}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Priority"
          name="priority"
          defaultValue="medium"
          error={state.errors?.priority}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
        <Select
          label="Category"
          name="categoryId"
          required={false}
          defaultValue=""
          error={state.errors?.categoryId}
        >
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <SubmitButton>Submit request</SubmitButton>
    </form>
  );
}
