import { describe, expect, it } from "vitest";
import {
  assertRole,
  hasRole,
  isAdmin,
  isManager,
  type CurrentUser,
} from "@/lib/permissions/core";

const user = (roles: CurrentUser["roles"]): CurrentUser => ({
  id: "u1",
  email: "u@example.com",
  profile: null,
  roles,
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
