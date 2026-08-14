const SENSITIVE_KEYS =
  /pass(word)?|token|secret|api[_-]?key|authorization|credential|cookie/i;

/** Strips anything that looks like a credential from metadata before storage. */
export function sanitizeMetadata(
  metadata: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!metadata) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.test(key)) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      out[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Only allow same-site relative redirect targets (open-redirect guard). */
export function safeRedirectPath(
  next: unknown,
  fallback = "/dashboard"
): string {
  if (
    typeof next === "string" &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.includes("\\")
  ) {
    return next;
  }
  return fallback;
}
