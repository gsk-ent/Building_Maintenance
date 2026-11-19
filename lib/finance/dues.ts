import type { MonthlyDue } from "@/types/database";

export type DueStatus = "paid" | "partial" | "pending";

export function dueStatus(
  due: Pick<MonthlyDue, "amount_due" | "amount_paid">
): DueStatus {
  if (due.amount_paid >= due.amount_due && due.amount_due > 0) return "paid";
  if (due.amount_paid > 0) return "partial";
  return "pending";
}

export function outstandingBalance(
  dues: Pick<MonthlyDue, "amount_due" | "amount_paid">[]
): number {
  return dues.reduce(
    (sum, d) => sum + Math.max(0, d.amount_due - d.amount_paid),
    0
  );
}

/**
 * Add a new payment to what has already been paid for a due.
 *
 * Previously recordDuePayment *overwrote* amount_paid with the submitted
 * value, so a second partial payment erased the first. Payments now
 * accumulate, and the new total is capped at amount_due — a payment that
 * would exceed the outstanding balance is rejected with a plain message
 * instead of being silently clamped.
 */
export function accumulatePayment(
  currentPaid: number,
  amountDue: number,
  payment: number
): { newTotal: number } | { error: string } {
  if (!Number.isFinite(payment) || payment <= 0) {
    return { error: "Enter an amount greater than ₹0." };
  }
  const newTotal = currentPaid + payment;
  if (newTotal > amountDue) {
    return {
      error: `Payment of ${formatCurrency(payment)} would exceed the outstanding balance of ${formatCurrency(Math.max(0, amountDue - currentPaid))}.`,
    };
  }
  return { newTotal };
}

export function formatPeriod(period: string): string {
  const [y, m] = period.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
