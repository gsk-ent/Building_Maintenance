"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";
import { logActivity } from "@/lib/activity/log";
import { addMemberSchema, buildingSchema, fieldErrors, propertySchema, unitSchema } from "@/lib/validation";

export interface ActionState {
  errors?: Record<string, string>;
  message?: string;
  success?: boolean;
}

export async function createProperty(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = propertySchema.safeParse({
    name: formData.get("name"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const d = parsed.data;
  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      name: d.name,
      address_line1: d.addressLine1,
      address_line2: d.addressLine2 || null,
      city: d.city,
      state: d.state || null,
      postal_code: d.postalCode || null,
      country: d.country,
      notes: d.notes || null,
      created_by: user.id,
    })
    .select("id, name")
    .single();

  if (error) {
    // RLS denial or constraint violation — never expose raw SQL errors.
    return { errors: { _form: "Could not create the property. Check your permissions." } };
  }

  // The creator becomes the building's first admin — every building
  // always has at least one (enforced in the database too), and only an
  // existing building admin can grant admin access to anyone else.
  await supabase.from("property_user_assignments").insert({
    property_id: property.id,
    user_id: user.id,
    relationship: "admin",
  });

  await logActivity({
    userId: user.id,
    action: "property.created",
    entityType: "property",
    entityId: property.id,
    description: `Property "${property.name}" created`,
  });

  revalidatePath("/properties");
  redirect(`/properties/${property.id}`);
}

export async function createBuilding(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = buildingSchema.safeParse({
    propertyId: formData.get("propertyId"),
    name: formData.get("name"),
    floorsCount: formData.get("floorsCount") || undefined,
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const { data: building, error } = await supabase
    .from("buildings")
    .insert({
      property_id: parsed.data.propertyId,
      name: parsed.data.name,
      floors_count: parsed.data.floorsCount ?? null,
      notes: parsed.data.notes || null,
    })
    .select("id, name")
    .single();

  if (error) {
    return { errors: { _form: "Could not create the building (duplicate name or no permission)." } };
  }

  await logActivity({
    userId: user.id,
    action: "building.created",
    entityType: "building",
    entityId: building.id,
    description: `Building "${building.name}" created`,
    metadata: { property_id: parsed.data.propertyId },
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { success: true, message: "Building added." };
}

export async function createUnit(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = unitSchema.safeParse({
    buildingId: formData.get("buildingId"),
    unitNumber: formData.get("unitNumber"),
    floor: formData.get("floor") || undefined,
    defaultMonthlyAmount: formData.get("defaultMonthlyAmount") || undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { errors: { _form: "Not signed in." } };

  const { data: unit, error } = await supabase
    .from("units")
    .insert({
      building_id: parsed.data.buildingId,
      unit_number: parsed.data.unitNumber,
      floor: parsed.data.floor ?? null,
      default_monthly_amount: parsed.data.defaultMonthlyAmount ?? null,
    })
    .select("id, unit_number")
    .single();
  if (error) {
    return { errors: { _form: "Could not add the unit (duplicate number or no permission)." } };
  }

  await logActivity({
    userId: user.id,
    action: "unit.created",
    entityType: "unit",
    entityId: unit.id,
    metadata: { building_id: parsed.data.buildingId },
  });

  revalidatePath("/properties");
  return { success: true, message: `Unit ${unit.unit_number} added.` };
}

/**
 * Adds an existing user (looked up by email) to a property with a given
 * relationship — this is what makes RLS resolve a resident's own dues,
 * requests and property visibility. The user must already have an account
 * (self-signup or manually created in Supabase Auth); this only links them.
 */
export async function addPropertyMember(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = addMemberSchema.safeParse({
    propertyId: formData.get("propertyId"),
    email: formData.get("email"),
    relationship: formData.get("relationship"),
    unitId: formData.get("unitId") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) return { errors: { _form: "Not signed in." } };

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .eq("email", parsed.data.email)
    .maybeSingle();
  if (!profile) {
    return {
      errors: {
        email: "No account found for that email yet. Ask them to sign up first.",
      },
    };
  }

  const { error } = await supabase.from("property_user_assignments").insert({
    property_id: parsed.data.propertyId,
    user_id: profile.user_id,
    relationship: parsed.data.relationship,
    unit_id: parsed.data.unitId || null,
  });
  if (error) {
    if (error.message.includes("UNIT_RESIDENT_LIMIT")) {
      return {
        errors: {
          unitId: "This flat/unit already has 2 residents assigned — the maximum allowed.",
        },
      };
    }
    if (error.message.includes("ADMIN_GRANT_FORBIDDEN")) {
      return {
        errors: {
          relationship: "Only an existing building admin can grant admin access.",
        },
      };
    }
    return { errors: { _form: "Could not add member (already added, or no permission)." } };
  }

  // Grant the matching role if they don't already hold it (ignore unique
  // violation if the role is already present).
  const roleMap: Partial<Record<typeof parsed.data.relationship, AppRole>> = {
    resident: "resident",
    technician: "technician",
    vendor: "vendor",
  };
  const roleToGrant = roleMap[parsed.data.relationship];
  if (roleToGrant) {
    await supabase.from("user_roles").insert({ user_id: profile.user_id, role: roleToGrant });
  }

  await logActivity({
    userId: currentUser.id,
    action: "property_member.added",
    entityType: "property",
    entityId: parsed.data.propertyId,
    metadata: { member: profile.user_id, relationship: parsed.data.relationship },
  });

  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { success: true, message: `${profile.full_name || parsed.data.email} added.` };
}
