import type { AppRole, Profile } from "@/types/database";

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  property_manager: "Property Manager",
  maintenance_manager: "Maintenance Manager",
  technician: "Technician",
  resident: "Resident",
  vendor: "Vendor",
};

export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile | null;
  roles: AppRole[];
}

export function hasRole(user: CurrentUser | null, ...roles: AppRole[]) {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r));
}

export const isAdmin = (u: CurrentUser | null) => hasRole(u, "admin");
export const isManager = (u: CurrentUser | null) =>
  hasRole(u, "admin", "property_manager", "maintenance_manager");

export function assertRole(user: CurrentUser | null, ...roles: AppRole[]) {
  if (!hasRole(user, ...roles)) {
    throw new Error("FORBIDDEN");
  }
}
