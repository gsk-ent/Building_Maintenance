/** Builds a standard UPI deep-link/QR payload. Pure — safe for client or server. */
export function buildUpiUri(params: {
  vpa: string;
  payeeName: string;
  amount?: number;
  note?: string;
}): string {
  const q = new URLSearchParams({
    pa: params.vpa,
    pn: params.payeeName,
    cu: "INR",
  });
  if (params.amount && params.amount > 0) {
    q.set("am", params.amount.toFixed(2));
  }
  if (params.note) q.set("tn", params.note);
  return `upi://pay?${q.toString()}`;
}
