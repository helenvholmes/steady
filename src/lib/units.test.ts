import { describe, expect, it } from "vitest";
import { formatAmount } from "./format";
import { unsafeWeightPlan } from "./metrics";
import { convertWeight, isCurrency, isWeightUnit, unitSuggestions } from "./units";

describe("units", () => {
  it("treats any ISO currency code as money", () => {
    expect(isCurrency("USD")).toBe(true);
    expect(isCurrency("EUR")).toBe(true);
    expect(isCurrency("lb")).toBe(false);
    expect(isCurrency("books")).toBe(false);
    expect(formatAmount(1234, "EUR")).toBe("€1,234");
    expect(formatAmount(1234.5, "GBP")).toBe("£1,234.50");
    expect(formatAmount(12, "books")).toBe("12 books");
  });

  it("converts weight both ways", () => {
    expect(convertWeight(100, "kg", "lb")).toBeCloseTo(220.46, 2);
    expect(convertWeight(220.46226218, "lb", "kg")).toBeCloseTo(100, 6);
    expect(convertWeight(5, "lb", "lb")).toBe(5);
    expect(isWeightUnit("kg") && isWeightUnit("lb") && !isWeightUnit("USD")).toBe(true);
  });

  it("blocks unsafe loss plans in either unit", () => {
    const plan = { direction: "down" as const, startDate: "2026-01-01", targetDate: "2026-01-29" };
    // 4 weeks: 10 lb is 2.5 lb a week (too fast); 3 kg is 0.75 kg a week (fine); 5 kg is 1.25 kg a week (too fast).
    expect(unsafeWeightPlan({ ...plan, unit: "lb", startValue: 200, targetValue: 190 })).not.toBeNull();
    expect(unsafeWeightPlan({ ...plan, unit: "kg", startValue: 90, targetValue: 87 })).toBeNull();
    expect(unsafeWeightPlan({ ...plan, unit: "kg", startValue: 90, targetValue: 85 })?.perWeek).toBeCloseTo(1.25);
  });

  it("suggests units from Settings", () => {
    expect(unitSuggestions({ currency: "EUR", unitSystem: "metric" })).toEqual(["EUR", "kg", "places", "books"]);
  });
});
