import { describe, expect, it } from "vitest";
import {
  loginSchema,
  maintenanceRequestSchema,
  passwordSchema,
  signupSchema,
  uuidSchema,
  fieldErrors,
} from "@/lib/validation";

describe("passwordSchema", () => {
  it("rejects short or weak passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase123").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumbersHere").success).toBe(false);
  });
  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("CorrectHorse42").success).toBe(true);
  });
});

describe("signupSchema", () => {
  const base = {
    fullName: "Satish G",
    email: "satish@example.com",
    password: "CorrectHorse42",
    confirmPassword: "CorrectHorse42",
  };
  it("accepts valid signup", () => {
    expect(signupSchema.safeParse(base).success).toBe(true);
  });
  it("rejects mismatched passwords", () => {
    const r = signupSchema.safeParse({ ...base, confirmPassword: "Different42X" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error).confirmPassword).toMatch(/do not match/i);
    }
  });
  it("rejects invalid email", () => {
    expect(signupSchema.safeParse({ ...base, email: "nope" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires both fields", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(false);
  });
});

describe("maintenanceRequestSchema", () => {
  it("rejects missing property / short title", () => {
    const r = maintenanceRequestSchema.safeParse({
      propertyId: "not-a-uuid",
      title: "ab",
      description: "too short?",
      priority: "medium",
    });
    expect(r.success).toBe(false);
  });
  it("accepts a valid request", () => {
    const r = maintenanceRequestSchema.safeParse({
      propertyId: "11111111-1111-1111-1111-111111111111",
      buildingId: "",
      unitId: "",
      categoryId: "",
      title: "Lift not working",
      description: "The lift is stuck on the third floor since morning.",
      priority: "urgent",
    });
    expect(r.success).toBe(true);
  });
});

describe("uuidSchema", () => {
  it("blocks injection-shaped ids", () => {
    expect(uuidSchema.safeParse("1; drop table users;").success).toBe(false);
  });
});
