/**
 * Money and weight units, set in Settings. A metric's unit is what its numbers are stored in, and stored is
 * always what's shown: switching currency relabels money metrics (amounts aren't converted), and switching
 * between imperial and metric converts weight metrics between lb and kg.
 */

export type UnitSystem = "imperial" | "metric";

/** Offered in Settings. Any ISO 4217 code works as a metric's unit. */
export const CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "NZD", "CHF", "JPY", "CNY", "HKD", "SGD", "INR", "KRW",
  "SEK", "NOK", "DKK", "PLN", "CZK", "MXN", "BRL", "ZAR",
] as const;

const ISO_CURRENCIES = new Set<string>(Intl.supportedValuesOf("currency"));

export function isCurrency(unit: string) {
  return ISO_CURRENCIES.has(unit);
}

export const weightUnit = (system: UnitSystem) => (system === "metric" ? "kg" : "lb");

export function isWeightUnit(unit: string) {
  return unit === "lb" || unit === "kg";
}

const LB_PER_KG = 2.2046226218;

/** A weight in `from` (lb or kg) expressed in `to`. */
export function convertWeight(value: number, from: string, to: string) {
  if (from === to) return value;
  return from === "kg" ? value * LB_PER_KG : value / LB_PER_KG;
}

/** CDC: losing 1–2 lb (about 0.5–0.9 kg) a week is more likely to last. The fastest pace allowed, per unit. */
export function maxSafeLossPerWeek(unit: string) {
  return unit === "kg" ? 0.9 : 2;
}

/** Day-to-day weight noise that shouldn't flip ahead/behind. */
export function weightNoise(unit: string) {
  return unit === "kg" ? 0.25 : 0.5;
}

/** The unit field's suggestions: money in the chosen currency, weight in the chosen system, then counts. */
export function unitSuggestions(s: { currency: string; unitSystem: UnitSystem }) {
  return [s.currency, weightUnit(s.unitSystem), "places", "books"];
}
