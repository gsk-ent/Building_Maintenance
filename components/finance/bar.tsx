export type BarTone = "income" | "expense";

const TONE_CLASSES: Record<BarTone, string> = {
  income: "bg-teal-deep",
  expense: "bg-rust",
};

/**
 * One bar of the Income vs Expense chart. Income renders in teal-deep,
 * expense in rust, so the two series are distinguishable at a glance.
 * `tone` defaults to "income" so existing callers keep working.
 */
export function Bar({
  label,
  value,
  max,
  tone = "income",
}: {
  label: string;
  value: number;
  max: number;
  tone?: BarTone;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-slate-700">{label}</span>
      <div className="h-4 flex-1 rounded bg-slate-100">
        <div
          className={`h-4 rounded ${TONE_CLASSES[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
}
