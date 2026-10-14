import { describe, expect, it } from "vitest";
import { formatAmount } from "./format";

describe("formatAmount", () => {
  it("shows dollars as currency, with cents only when there are any", () => {
    expect(formatAmount(1234.56, "USD")).toBe("$1,234.56");
    expect(formatAmount(60000, "USD")).toBe("$60,000");
    expect(formatAmount(-162, "USD")).toBe("-$162");
  });
  it("keeps other units as a number and unit", () => {
    expect(formatAmount(199.44, "lb")).toBe("199.4 lb");
    expect(formatAmount(12, "places")).toBe("12 places");
  });
});
