import { describe, expect, it } from "vitest";
import { sanitizeMetadata, safeRedirectPath } from "@/lib/activity/sanitize";

describe("sanitizeMetadata", () => {
  it("strips credential-like keys, including nested ones", () => {
    const out = sanitizeMetadata({
      provider: "google",
      password: "hunter2",
      access_token: "abc",
      refreshToken: "def",
      api_key: "xyz",
      nested: { secret: "s", ok: 1 },
    });
    expect(out).toEqual({ provider: "google", nested: { ok: 1 } });
  });
  it("handles undefined", () => {
    expect(sanitizeMetadata(undefined)).toEqual({});
  });
});

describe("safeRedirectPath (open-redirect guard)", () => {
  it("allows same-site relative paths", () => {
    expect(safeRedirectPath("/maintenance/123")).toBe("/maintenance/123");
  });
  it("blocks absolute URLs and protocol-relative URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath(null)).toBe("/dashboard");
  });
});
