import { describe, expect, it } from "vitest";
import {
  accumulatePayment,
  dueStatus,
  outstandingBalance,
  formatPeriod,
  formatCurrency,
} from "@/lib/finance/dues";
import { buildUpiUri } from "@/lib/finance/upi";
import {
  paymentSettingsSchema,
  expenseSchema,
  periodSchema,
} from "@/lib/validation";

describe("accumulatePayment", () => {
  it("adds a new payment to what was already paid", () => {
    expect(accumulatePayment(400, 1000, 300)).toEqual({ newTotal: 700 });
  });
  it("allows paying the exact remaining balance", () => {
    expect(accumulatePayment(400, 1000, 600)).toEqual({ newTotal: 1000 });
  });
  it("rejects a payment that would exceed the amount due", () => {
    const result = accumulatePayment(400, 1000, 700);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toMatch(/exceed/);
  });
  it("rejects zero and negative payments", () => {
    expect(accumulatePayment(0, 1000, 0)).toHaveProperty("error");
    expect(accumulatePayment(0, 1000, -50)).toHaveProperty("error");
  });
  it("does not erase the first payment when a second one arrives", () => {
    // Regression test for P0-2: the old action overwrote amount_paid,
    // so a second partial payment erased the first.
    const first = accumulatePayment(0, 1000, 400);
    expect(first).toEqual({ newTotal: 400 });
    if (!("error" in first)) {
      expect(accumulatePayment(first.newTotal, 1000, 300)).toEqual({
        newTotal: 700,
      });
    }
  });
});

describe("dueStatus", () => {
  it("classifies paid/partial/pending correctly", () => {
    expect(dueStatus({ amount_due: 1000, amount_paid: 1000 })).toBe("paid");
    expect(dueStatus({ amount_due: 1000, amount_paid: 400 })).toBe("partial");
    expect(dueStatus({ amount_due: 1000, amount_paid: 0 })).toBe("pending");
    expect(dueStatus({ amount_due: 0, amount_paid: 0 })).toBe("pending");
  });
});

describe("outstandingBalance", () => {
  it("sums only positive shortfalls, ignoring overpayments", () => {
    const total = outstandingBalance([
      { amount_due: 1000, amount_paid: 400 },
      { amount_due: 500, amount_paid: 500 },
      { amount_due: 300, amount_paid: 500 }, // overpaid — should not go negative
    ]);
    expect(total).toBe(600);
  });
});

describe("formatPeriod / formatCurrency", () => {
  it("formats a YYYY-MM-DD period as month/year", () => {
    expect(formatPeriod("2026-08-01")).toMatch(/August 2026/);
  });
  it("formats currency as INR", () => {
    expect(formatCurrency(1500)).toContain("1,500");
  });
});

describe("buildUpiUri", () => {
  it("includes payee, amount and currency", () => {
    const uri = buildUpiUri({
      vpa: "building@upi",
      payeeName: "Thripura Sadan",
      amount: 2500,
    });
    expect(uri).toContain("upi://pay?");
    expect(uri).toContain("pa=building%40upi");
    expect(uri).toContain("am=2500.00");
    expect(uri).toContain("cu=INR");
  });
  it("omits the amount param when not provided", () => {
    const uri = buildUpiUri({
      vpa: "building@upi",
      payeeName: "Thripura Sadan",
    });
    expect(uri).not.toContain("am=");
  });
});

describe("periodSchema", () => {
  it("accepts YYYY-MM and normalizes to the 1st of the month", () => {
    const r = periodSchema.safeParse("2026-08");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("2026-08-01");
  });
  it("rejects malformed periods", () => {
    expect(periodSchema.safeParse("2026/08").success).toBe(false);
    expect(periodSchema.safeParse("not-a-period").success).toBe(false);
  });
});

describe("expenseSchema", () => {
  it("rejects negative amounts", () => {
    const r = expenseSchema.safeParse({
      propertyId: "11111111-1111-1111-1111-111111111111",
      categoryId: "",
      period: "2026-08",
      amount: -5,
      description: "",
    });
    expect(r.success).toBe(false);
  });
});

describe("paymentSettingsSchema", () => {
  it("allows all optional fields blank except propertyId", () => {
    const r = paymentSettingsSchema.safeParse({
      propertyId: "11111111-1111-1111-1111-111111111111",
      upiId: "",
      upiNumber: "",
      bankAccountName: "",
      bankAccountNumber: "",
      bankIfsc: "",
      bankName: "",
      notes: "",
    });
    expect(r.success).toBe(true);
  });
});
