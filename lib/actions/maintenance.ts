"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity/log";
import {
  commentSchema,
  fieldErrors,
  maintenanceRequestSchema,
  requestStatusSchema,
  uuidSchema,
  workOrderSchema,
} from "@/lib/validation";
import type { ActionState } from "@/lib/actions/properties";

export async function createMaintenanceRequest(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = maintenanceRequestSchema.safeParse({
    propertyId: formData.get("propertyId"),
    buildingId: formData.get("buildingId") ?? "",
    unitId: formData.get("unitId") ?? "",
    categoryId: formData.get("categoryId") ?? "",
    title: formData.get("title"),
    description: formData.get("description"),
    priority: formData.get("priority"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const d = parsed.data;
  const { data: request, error } = await supabase
    .from("maintenance_requests")
    .insert({
      property_id: d.propertyId,
      building_id: d.buildingId || null,
      unit_id: d.unitId || null,
      category_id: d.categoryId || null,
      title: d.title,
      description: d.description,
      priority: d.priority,
      requested_by: user.id,
    })
    .select("id, title")
    .single();

  if (error) {
    return {
      errors: {
        _form:
          "Could not create the request. You may not be assigned to this property.",
      },
    };
  }

  await logActivity({
    userId: user.id,
    action: "maintenance_request.created",
    entityType: "maintenance_request",
    entityId: request.id,
    description: `Request "${request.title}" created`,
    metadata: { property_id: d.propertyId, priority: d.priority },
  });

  // Notify property managers (system write via admin client).
  try {
    const admin = createAdminClient();
    const { data: managers } = await admin
      .from("property_user_assignments")
      .select("user_id")
      .eq("property_id", d.propertyId)
      .eq("relationship", "manager");
    if (managers?.length) {
      await admin.from("notifications").insert(
        managers
          .filter((m) => m.user_id !== user.id)
          .map((m) => ({
            user_id: m.user_id,
            title: "New maintenance request",
            body: request.title,
            link: `/maintenance/${request.id}`,
          }))
      );
    }
  } catch (err) {
    console.error("[notify] manager notification failed", err);
  }

  revalidatePath("/maintenance");
  redirect(`/maintenance/${request.id}`);
}

export async function updateRequestStatus(formData: FormData): Promise<void> {
  const id = uuidSchema.safeParse(formData.get("requestId"));
  const status = requestStatusSchema.safeParse(formData.get("status"));
  if (!id.success || !status.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // RLS decides whether this user may update. The DB trigger records the
  // status-change audit event automatically.
  await supabase
    .from("maintenance_requests")
    .update({
      status: status.data,
      closed_at: ["closed", "completed", "cancelled"].includes(status.data)
        ? new Date().toISOString()
        : null,
    })
    .eq("id", id.data);

  if (status.data === "closed") {
    await logActivity({
      userId: user.id,
      action: "maintenance_request.closed",
      entityType: "maintenance_request",
      entityId: id.data,
    });
  }

  revalidatePath(`/maintenance/${id.data}`);
  revalidatePath("/maintenance");
}

export async function assignRequest(formData: FormData): Promise<void> {
  const id = uuidSchema.safeParse(formData.get("requestId"));
  const assignee = uuidSchema.safeParse(formData.get("assigneeId"));
  if (!id.success || !assignee.success) return;

  const supabase = await createClient();
  await supabase
    .from("maintenance_requests")
    .update({ assigned_to: assignee.data, status: "triaged" })
    .eq("id", id.data);

  // Audit trail handled by DB trigger; also notify the assignee.
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: assignee.data,
      title: "A maintenance request was assigned to you",
      link: `/maintenance/${id.data}`,
    });
  } catch (err) {
    console.error("[notify] assignment notification failed", err);
  }

  revalidatePath(`/maintenance/${id.data}`);
}

export async function addComment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = commentSchema.safeParse({
    requestId: formData.get("requestId"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const { error } = await supabase.from("maintenance_request_comments").insert({
    request_id: parsed.data.requestId,
    author_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { errors: { _form: "Could not add the comment." } };

  await logActivity({
    userId: user.id,
    action: "maintenance_request.commented",
    entityType: "maintenance_request",
    entityId: parsed.data.requestId,
  });

  revalidatePath(`/maintenance/${parsed.data.requestId}`);
  return { success: true };
}

export async function createWorkOrder(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = workOrderSchema.safeParse({
    requestId: formData.get("requestId"),
    title: formData.get("title"),
    instructions: formData.get("instructions"),
    assignedTo: formData.get("assignedTo") ?? "",
    scheduledFor: formData.get("scheduledFor") ?? "",
    costEstimate: formData.get("costEstimate") || undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const { data: request } = await supabase
    .from("maintenance_requests")
    .select("id, property_id")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  if (!request) return { errors: { _form: "Request not found." } };

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .insert({
      request_id: request.id,
      property_id: request.property_id,
      title: parsed.data.title,
      instructions: parsed.data.instructions || null,
      assigned_to: parsed.data.assignedTo || null,
      scheduled_for: parsed.data.scheduledFor
        ? new Date(parsed.data.scheduledFor).toISOString()
        : null,
      cost_estimate: parsed.data.costEstimate ?? null,
      status: parsed.data.assignedTo ? "assigned" : "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return {
      errors: {
        _form: "Could not create the work order. Check your permissions.",
      },
    };
  }

  await logActivity({
    userId: user.id,
    action: "work_order.created",
    entityType: "work_order",
    entityId: workOrder.id,
    metadata: { request_id: request.id, property_id: request.property_id },
  });

  revalidatePath(`/maintenance/${request.id}`);
  revalidatePath("/work-orders");
  return { success: true, message: "Work order created." };
}

export async function completeWorkOrder(formData: FormData): Promise<void> {
  const id = uuidSchema.safeParse(formData.get("workOrderId"));
  if (!id.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("work_orders")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id.data);

  if (!error) {
    await logActivity({
      userId: user.id,
      action: "work_order.completed",
      entityType: "work_order",
      entityId: id.data,
    });
  }
  revalidatePath("/work-orders");
}
