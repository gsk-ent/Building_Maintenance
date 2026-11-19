import { describe, expect, it } from "vitest";
import { formatStatus } from "@/lib/format";

describe("formatStatus", () => {
  it("title-cases every underscore-separated word", () => {
    expect(formatStatus("in_progress")).toBe("In Progress");
    expect(formatStatus("on_hold")).toBe("On Hold");
    expect(formatStatus("open")).toBe("Open");
    expect(formatStatus("completed")).toBe("Completed");
  });

  it('does not drop characters the way replace("_", "") did', () => {
    // The old code only replaced the FIRST underscore, so
    // "in_progress" rendered as "inprogress".
    expect(formatStatus("in_progress")).not.toBe("inprogress");
    expect(formatStatus("on_hold")).not.toBe("onhold");
  });
});
