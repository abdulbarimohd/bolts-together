// lib/affiliate/money.ts
//
// Money is integer pence, VAT-inclusive, GBP. Floats are never used for a
// price: 0.1 + 0.2 is famously not 0.3, and a build sheet that totals
// twenty parts would drift visibly.
//
// The parser below refuses more than it accepts, on purpose. A price is the
// exact figure a rider is about to pay; a mis-parsed one is worse than no
// price at all, because "no price" shows as "price unknown" while a wrong
// one shows as fact.

/** A feed price the parser would not accept, and why. */
export type PriceParseFailure =
  | "empty"
  | "not-a-number"
  | "too-many-decimals"
  | "not-positive"
  | "unreasonably-large";

export type PriceParseResult =
  | { readonly ok: true; readonly pence: number }
  | { readonly ok: false; readonly reason: PriceParseFailure; readonly input: string };

/**
 * Anything above this is assumed to be a corrupt row rather than a real
 * price. £250,000 is far beyond the most expensive complete bike sold in
 * the UK, so a value over it means the feed put something else in the
 * column (a part number, a price in a minor unit, a concatenation).
 */
const MAX_REASONABLE_PENCE = 25_000_000;

/**
 * Parse a feed's price string into integer pence.
 *
 * Accepts: "1234.56", "1,234.56", "£1234.56", "1234.56 GBP", "1234", "12.5".
 * Rejects: empty, non-numeric, zero or negative, three or more decimal
 * places, absurd magnitudes.
 *
 * Three decimals are rejected rather than rounded because the rounding
 * direction would be a guess about the retailer's intent, and because in
 * practice a three-decimal figure in a UK feed usually means the column
 * holds something other than a GBP price.
 */
export function parsePriceToPence(raw: string | number | null | undefined): PriceParseResult {
  if (raw === null || raw === undefined) return { ok: false, reason: "empty", input: "" };

  const input = String(raw).trim();
  if (input === "") return { ok: false, reason: "empty", input };

  // Strip currency symbols, an ISO code suffix, thousands separators and
  // any whitespace (including the non-breaking spaces feeds sometimes use
  // as a thousands separator).
  const cleaned = input
    .replace(/[£$€]/g, "")
    .replace(/\b(?:GBP|gbp)\b/g, "")
    .replace(/[\s  ]/g, "")
    .replace(/,/g, "");

  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) {
    return { ok: false, reason: "not-a-number", input };
  }

  const [whole, fraction = ""] = cleaned.split(".");
  if (fraction.length > 2) return { ok: false, reason: "too-many-decimals", input };

  // Build pence from the digits themselves rather than multiplying a float
  // by 100, which is where 19.99 * 100 = 1998.9999999999998 comes from.
  const sign = whole.startsWith("-") ? -1 : 1;
  const wholeDigits = whole.replace("-", "");
  const pencePart = fraction.padEnd(2, "0");
  const pence = sign * (Number(wholeDigits) * 100 + Number(pencePart));

  if (!Number.isFinite(pence)) return { ok: false, reason: "not-a-number", input };
  if (pence <= 0) return { ok: false, reason: "not-positive", input };
  if (pence > MAX_REASONABLE_PENCE) return { ok: false, reason: "unreasonably-large", input };

  return { ok: true, pence };
}

/**
 * Same parser, for fields where absence is normal and a bad value should
 * simply be dropped rather than reported: delivery cost, "was" price.
 * Never invents a value.
 */
export function parseOptionalPriceToPence(raw: string | number | null | undefined): number | null {
  const result = parsePriceToPence(raw);
  return result.ok ? result.pence : null;
}

/** "£1,234.56". Sterling only, because Currency has one value. */
export function formatPence(pence: number): string {
  const negative = pence < 0;
  const abs = Math.abs(Math.trunc(pence));
  const pounds = Math.floor(abs / 100).toLocaleString("en-GB");
  const remainder = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}£${pounds}.${remainder}`;
}

/**
 * Sum a list of pence values.
 *
 * `null` entries are not treated as zero: a total that silently skips the
 * parts with no known price reads as a complete total when it isn't. The
 * caller gets both the sum and the count of unpriced items so it can say
 * "£2,140 plus 3 items with no price".
 */
export function sumPence(values: readonly (number | null)[]): {
  readonly total: number;
  readonly missing: number;
} {
  let total = 0;
  let missing = 0;
  for (const value of values) {
    if (value === null) missing += 1;
    else total += value;
  }
  return { total, missing };
}
