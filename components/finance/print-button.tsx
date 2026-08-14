"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-none bg-teal-deep px-4 py-2 text-sm font-semibold text-white hover:bg-teal"
    >
      🖨 Print / Save as PDF
    </button>
  );
}
