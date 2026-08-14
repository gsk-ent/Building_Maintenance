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
