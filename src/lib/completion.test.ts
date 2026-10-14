import { describe, expect, it } from "vitest";
import { durationText } from "./completion";

describe("durationText", () => {
  it("counts years, months, and days", () => {
    expect(durationText("2026-10-13", "2027-12-17")).toBe("1 year, 2 months, 4 days");
    expect(durationText("2026-10-13", "2026-10-13")).toBe("0 days");
    expect(durationText("2026-10-13", "2026-10-14")).toBe("1 day");
    expect(durationText("2026-01-31", "2026-03-01")).toBe("1 month, 1 day");
    expect(durationText("2026-10-13", "2027-10-13")).toBe("1 year");
  });
});
