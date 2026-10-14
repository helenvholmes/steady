import { isCurrency } from "./units";

/** A goal amount with its unit: "$1,234.56" or "€1,234.56" for money (any ISO currency code), "199.4 lb" or "12 places" otherwise. */
export function formatAmount(n: number, unit: string) {
  if (isCurrency(unit)) {
    const cents = Math.round(n * 100) % 100 !== 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: unit,
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    }).format(n);
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n)} ${unit}`;
}
