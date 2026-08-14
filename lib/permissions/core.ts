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
  /** True once an admin/manager has linked this user to at least one property. */
  isAssigned: boolean;
  /** Holds relationship 'manager' or 'admin' on at least one property. */
  managesAnyProperty: boolean;
  /** Holds relationship 'admin' (building admin) on at least one property. */
  isAdminOfAnyProperty: boolean;
}

/**
 * Residents/technicians/vendors see nothing until a manager links their
 * account to a property (and, for residents, a specific unit). Admins and
 * managers are exempt — admins need access to do the linking, and a
 * brand-new manager must be able to reach "Add property" (which
 * self-assigns them) before they have any assignment row at all.
 */
export function needsAssignment(user: CurrentUser | null): boolean {
  if (!user) return false;
  return !isAdmin(user) && !isManager(user) && !user.isAssigned;
}

/**
 * A human name for the header/greeting. Profiles created straight from the
 * Supabase dashboard (or via Google accounts without a name claim) have an
 * empty `full_name`, and showing a raw email in the header reads poorly —
 * so fall back to a prettified email local-part ("satish.gunjute@..." →
 * "Satish Gunjute") before ever showing the address itself.
 */
export function displayName(user: CurrentUser | null): string {
  if (!user) return "";
  const fullName = user.profile?.full_name?.trim();
  if (fullName) return fullName;

  const localPart = user.email.split("@")[0] ?? "";
  const words = localPart
    .split(/[._\-+]+/)
    .filter(Boolean)
    // Drop pure-digit fragments like the "92" in "satish.92".
    .filter((w) => !/^\d+$/.test(w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  return words.length ? words.join(" ") : user.email;
}

/** Role ordered by seniority, for the caption under the user's name. */
const ROLE_PRIORITY: AppRole[] = [
  "admin",
  "property_manager",
  "maintenance_manager",
  "technician",
  "vendor",
  "resident",
];

export function primaryRoleLabel(user: CurrentUser | null): string {
  if (!user) return "";
  const role = ROLE_PRIORITY.find((r) => user.roles.includes(r));
  if (role) return ROLE_LABELS[role];
  // No platform role, but they may still administer/manage a building.
  if (user.isAdminOfAnyProperty) return "Building Admin";
  if (user.managesAnyProperty) return "Building Manager";
  return "Member";
}

export function hasRole(user: CurrentUser | null, ...roles: AppRole[]) {
  if (!user) return false;
  return user.roles.some((r) => roles.includes(r));
}

export const isAdmin = (u: CurrentUser | null) => hasRole(u, "admin");
export const isManager = (u: CurrentUser | null) =>
  hasRole(u, "admin", "property_manager", "maintenance_manager");

/**
 * "Manages properties" for UI purposes — either a platform-wide role
 * (property_manager/maintenance_manager/admin) OR being a manager/admin of
 * at least one specific building via property_user_assignments. This is
 * deliberately broader than isManager(): a building admin who holds no
 * platform-wide role should still see the Dues/Payment settings/Properties
 * nav for their own building. Creating brand-new properties, however,
 * remains gated by the platform-wide role (see the RLS policy and
 * `/properties/new`) — per-building admin status does not grant that.
 */
export const canManageProperties = (u: CurrentUser | null) =>
  isManager(u) || (u?.managesAnyProperty ?? false);

/** Platform admin, or a building admin of at least one property. */
export const canViewReports = (u: CurrentUser | null) =>
  isAdmin(u) || (u?.isAdminOfAnyProperty ?? false);

export function assertRole(user: CurrentUser | null, ...roles: AppRole[]) {
  if (!hasRole(user, ...roles)) {
    throw new Error("FORBIDDEN");
  }
}
