"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity/log";
import { accumulatePayment } from "@/lib/finance/dues";
import {
  expenseCategorySchema,
  expenseSchema,
  fieldErrors,
  generateDuesSchema,
  paymentSettingsSchema,
  recordDuePaymentSchema,
  setDueAmountSchema,
} from "@/lib/validation";
import type { ActionState } from "@/lib/actions/properties";

export async function updatePaymentSettings(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = paymentSettingsSchema.safeParse({
    propertyId: formData.get("propertyId"),
    upiId: formData.get("upiId"),
    upiNumber: formData.get("upiNumber"),
    bankAccountName: formData.get("bankAccountName"),
    bankAccountNumber: formData.get("bankAccountNumber"),
    bankIfsc: formData.get("bankIfsc"),
    bankName: formData.get("bankName"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const d = parsed.data;
  const { error } = await supabase.from("property_payment_settings").upsert(
    {
      property_id: d.propertyId,
      upi_id: d.upiId || null,
      upi_number: d.upiNumber || null,
      bank_account_name: d.bankAccountName || null,
      bank_account_number: d.bankAccountNumber || null,
      bank_ifsc: d.bankIfsc || null,
      bank_name: d.bankName || null,
      notes: d.notes || null,
      updated_by: user.id,
    },
    { onConflict: "property_id" }
  );
  if (error) return { errors: { _form: "Could not save payment settings." } };

  await logActivity({
    userId: user.id,
    action: "payment_settings.updated",
    entityType: "property",
    entityId: d.propertyId,
  });

  revalidatePath("/finances/payment-settings");
  return { success: true, message: "Payment details saved." };
}

export async function createExpenseCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = expenseCategorySchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("expense_categories").insert({
    property_id: parsed.data.propertyId,
    name: parsed.data.name,
  });
  if (error)
    return {
      errors: { _form: "Could not add category (maybe it already exists)." },
    };

  revalidatePath("/finances/expenses");
  return { success: true, message: "Category added." };
}

export async function createExpense(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = expenseSchema.safeParse({
    propertyId: formData.get("propertyId"),
    categoryId: formData.get("categoryId") ?? "",
    period: formData.get("period"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const d = parsed.data;
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      property_id: d.propertyId,
      category_id: d.categoryId || null,
      period: d.period,
      amount: d.amount,
      description: d.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { errors: { _form: "Could not record the expense." } };

  await logActivity({
    userId: user.id,
    action: "expense.created",
    entityType: "expense",
    entityId: expense.id,
    metadata: { property_id: d.propertyId, period: d.period, amount: d.amount },
  });

  revalidatePath("/finances/expenses");
  return { success: true, message: "Expense recorded." };
}

/**
 * Creates a monthly_dues row for every unit in a building for the given
 * period, using each unit's default_monthly_amount (falls back to 0).
 * Existing rows for that unit/period are left untouched.
 */
export async function generateDuesForPeriod(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = generateDuesSchema.safeParse({
    propertyId: formData.get("propertyId"),
    buildingId: formData.get("buildingId"),
    period: formData.get("period"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const { data: units, error: unitsError } = await supabase
    .from("units")
    .select("id, default_monthly_amount")
    .eq("building_id", parsed.data.buildingId);
  if (unitsError || !units?.length) {
    return { errors: { _form: "No units found for that building." } };
  }

  const rows = units.map((u) => ({
    property_id: parsed.data.propertyId,
    unit_id: u.id,
    period: parsed.data.period,
    amount_due: u.default_monthly_amount ?? 0,
  }));

  // Idempotent: unique(unit_id, period) means re-running for the same month
  // simply skips units that already have a due row.
  const { error } = await supabase
    .from("monthly_dues")
    .upsert(rows, { onConflict: "unit_id,period", ignoreDuplicates: true });
  if (error)
    return { errors: { _form: "Could not generate dues for this period." } };

  revalidatePath("/finances/dues");
  return {
    success: true,
    message: `Dues generated for ${units.length} unit(s).`,
  };
}

export async function recordDuePayment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = recordDuePaymentSchema.safeParse({
    dueId: formData.get("dueId"),
    amountPaid: formData.get("amountPaid"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const { data: due } = await supabase
    .from("monthly_dues")
    .select("id, property_id, unit_id, period, amount_due, amount_paid")
    .eq("id", parsed.data.dueId)
    .maybeSingle();
  if (!due) return { errors: { _form: "Due record not found." } };

  // Accumulate — never overwrite. A second partial payment adds to the
  // first instead of erasing it (P0-2).
  const accumulated = accumulatePayment(
    due.amount_paid,
    due.amount_due,
    parsed.data.amountPaid
  );
  if ("error" in accumulated) {
    return { errors: { _form: accumulated.error } };
  }
  const newTotal = accumulated.newTotal;

  const { error } = await supabase
    .from("monthly_dues")
    .update({
      amount_paid: newTotal,
      payment_method: parsed.data.paymentMethod || null,
      notes: parsed.data.notes || null,
      paid_at: newTotal >= due.amount_due ? new Date().toISOString() : null,
      recorded_by: user.id,
    })
    .eq("id", parsed.data.dueId);
  if (error) return { errors: { _form: "Could not update the payment." } };

  // The DB trigger also logs 'dues.payment_recorded' on amount_paid
  // change; this app-level entry records the incremental payment itself.
  await logActivity({
    userId: user.id,
    action: "due.payment_recorded",
    entityType: "monthly_due",
    entityId: due.id,
    metadata: {
      property_id: due.property_id,
      unit_id: due.unit_id,
      period: due.period,
      amount_paid_now: parsed.data.amountPaid,
      amount_paid_total: newTotal,
      amount_due: due.amount_due,
    },
  });

  revalidatePath("/finances/dues");
  return { success: true, message: "Payment recorded." };
}

export async function setDueAmount(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = setDueAmountSchema.safeParse({
    dueId: formData.get("dueId"),
    amountDue: formData.get("amountDue"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("monthly_dues")
    .update({ amount_due: parsed.data.amountDue })
    .eq("id", parsed.data.dueId);
  if (error) return { errors: { _form: "Could not update the amount due." } };

  revalidatePath("/finances/dues");
  return { success: true };
}
