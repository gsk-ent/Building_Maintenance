import { describe, expect, it } from "vitest";
import {
  assertRole,
  canManageProperties,
  canViewReports,
  hasRole,
  isAdmin,
  isManager,
  needsAssignment,
  type CurrentUser,
} from "@/lib/permissions/core";

const user = (
  roles: CurrentUser["roles"],
  overrides: Partial<Pick<CurrentUser, "isAssigned" | "managesAnyProperty" | "isAdminOfAnyProperty">> = {}
): CurrentUser => ({
  id: "u1",
  email: "u@example.com",
  profile: null,
  roles,
  isAssigned: false,
  managesAnyProperty: false,
  isAdminOfAnyProperty: false,
  ...overrides,
});

describe("role checks", () => {
  it("denies everything for null user", () => {
    expect(hasRole(null, "admin")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isManager(null)).toBe(false);
  });
  it("admin is a manager but resident is not", () => {
    expect(isManager(user(["admin"]))).toBe(true);
    expect(isManager(user(["property_manager"]))).toBe(true);
    expect(isManager(user(["resident"]))).toBe(false);
  });
  it("technician is not admin", () => {
    expect(isAdmin(user(["technician"]))).toBe(false);
  });
  it("assertRole throws for unauthorized users", () => {
    expect(() => assertRole(user(["resident"]), "admin")).toThrow("FORBIDDEN");
    expect(() => assertRole(user(["admin"]), "admin")).not.toThrow();
  });
});

describe("needsAssignment (flat/property mapping gate)", () => {
  it("blocks a null user's implicit access (defensively false, not a bypass)", () => {
    expect(needsAssignment(null)).toBe(false);
  });
  it("blocks a fresh resident with no property_user_assignments row", () => {
    expect(needsAssignment(user(["resident"], { isAssigned: false }))).toBe(true);
  });
  it("unblocks a resident once mapped", () => {
    expect(needsAssignment(user(["resident"], { isAssigned: true }))).toBe(false);
  });
  it("never blocks admins, even unassigned", () => {
    expect(needsAssignment(user(["admin"], { isAssigned: false }))).toBe(false);
  });
  it("never blocks platform managers, even before they've created a property", () => {
    expect(needsAssignment(user(["property_manager"], { isAssigned: false }))).toBe(false);
    expect(needsAssignment(user(["maintenance_manager"], { isAssigned: false }))).toBe(false);
  });
  it("blocks a technician/vendor with no assignment yet", () => {
    expect(needsAssignment(user(["technician"], { isAssigned: false }))).toBe(true);
    expect(needsAssignment(user(["vendor"], { isAssigned: false }))).toBe(true);
  });
});

describe("canManageProperties (platform role OR per-building manager/admin)", () => {
  it("true for platform-wide managers/admins with no building assignment", () => {
    expect(canManageProperties(user(["admin"]))).toBe(true);
    expect(canManageProperties(user(["property_manager"]))).toBe(true);
  });
  it("true for a plain resident who is a building admin or manager of one property", () => {
    expect(canManageProperties(user(["resident"], { managesAnyProperty: true }))).toBe(true);
  });
  it("false for a resident with no platform role and no building management", () => {
    expect(canManageProperties(user(["resident"], { managesAnyProperty: false }))).toBe(false);
  });
});

describe("canViewReports (platform admin OR building admin)", () => {
  it("true for the platform admin", () => {
    expect(canViewReports(user(["admin"]))).toBe(true);
  });
  it("true for a building admin with no platform role", () => {
    expect(canViewReports(user(["resident"], { isAdminOfAnyProperty: true }))).toBe(true);
  });
  it("false for a plain building manager (not admin) with no platform role", () => {
    expect(
      canViewReports(user(["resident"], { managesAnyProperty: true, isAdminOfAnyProperty: false }))
    ).toBe(false);
  });
});
