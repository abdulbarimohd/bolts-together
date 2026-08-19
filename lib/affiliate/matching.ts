// lib/affiliate/matching.ts
//
// Deciding which catalogue row a feed product is.
//
// This is the affiliate layer's equivalent of a spec claim, and it gets the
// same treatment: match on a published identifier or abstain. A wrong match
// is not a cosmetic bug — it puts a price and a buy button on the wrong
// product, and there is nothing on the page that would reveal it. A feed
// row that cannot be matched is kept as an unmatched offer (re-matching
// later is free; re-downloading is not) and shown against nothing.
//
// There is deliberately no fuzzy name matching. "Shimano 105 R7100 Rear
// Derailleur" appears in feeds as a dozen strings covering four cage
// lengths and two generations, and a string-similarity score cannot tell
// them apart. If a part has no identifier on file, the honest outcome is no
// price, exactly as the catalogue shows "price unknown" rather than an
// estimate.
//
// Pure functions over an in-memory index, so this is testable without a
// database and the lookup is one pass over the feed rather than a query per
// row.

import type { NormalisedOffer, OfferMatchMethod } from "./types";

export type IdentifierKind = "EAN" | "GTIN" | "UPC" | "MPN" | "MERCHANT_SKU";

/** What an identifier points at. Exactly one field is non-null. */
export interface IdentifierTarget {
  readonly partId: string | null;
  readonly bikeModelId: string | null;
}

/**
 * Canonical form for an identifier, used on both sides of the lookup.
 *
 * GTIN-family codes are padded to 14 digits, which is the GS1 convention
 * for comparing a UPC-A (12), an EAN-13 and a GTIN-14 that all denote the
 * same product — without it, the same barcode written two ways looks like
 * two different products.
 *
 * MPNs are uppercased with separators removed, because "RD-R8150",
 * "RD R8150" and "RDR8150" are one part number written three ways and
 * feeds use all three.
 *
 * Returns null when the input cannot be a valid identifier at all, which
 * is common: feeds put "N/A", "0", "-" and the product title in these
 * columns.
 */
export function canonicaliseIdentifier(kind: IdentifierKind, raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  if (kind === "EAN" || kind === "GTIN" || kind === "UPC") {
    const digits = trimmed.replace(/\D/g, "");
    // Valid GTIN lengths only. Anything else is a placeholder or a
    // truncated value, not a barcode.
    if (![8, 12, 13, 14].includes(digits.length)) return null;
    // All-zero and single-repeated-digit values are placeholders.
    if (/^(\d)\1*$/.test(digits)) return null;
    return digits.padStart(14, "0");
  }

  const cleaned = trimmed.toUpperCase().replace(/[\s\-_./]/g, "");
  if (cleaned.length < 3) return null;
  if (/^(?:NA|N\/A|NONE|NULL|UNKNOWN|0+)$/.test(cleaned)) return null;
  return cleaned;
}

/** Key under which an identifier is filed in the index. */
export function identifierKey(kind: IdentifierKind, canonicalValue: string, retailerId?: string | null): string {
  // A merchant SKU only means anything alongside the merchant it belongs
  // to: two retailers' SKU "12345" are unrelated products.
  return kind === "MERCHANT_SKU"
    ? `MERCHANT_SKU:${retailerId ?? ""}:${canonicalValue}`
    : `${kind}:${canonicalValue}`;
}

/**
 * key -> targets. More than one target means the catalogue contains
 * conflicting identifier claims, which is a data error; the matcher
 * abstains rather than picking one.
 */
export type IdentifierIndex = ReadonlyMap<string, readonly IdentifierTarget[]>;

export interface IdentifierRow {
  readonly kind: IdentifierKind;
  readonly value: string;
  readonly retailerId: string | null;
  readonly partId: string | null;
  readonly bikeModelId: string | null;
}

/** Build the lookup index from catalogue identifier rows. */
export function buildIdentifierIndex(rows: readonly IdentifierRow[]): IdentifierIndex {
  const index = new Map<string, IdentifierTarget[]>();
  for (const row of rows) {
    const canonical = canonicaliseIdentifier(row.kind, row.value);
    if (canonical === null) continue;
    const key = identifierKey(row.kind, canonical, row.retailerId);
    const target: IdentifierTarget = { partId: row.partId, bikeModelId: row.bikeModelId };
    const existing = index.get(key);
    if (existing) {
      // Same target recorded twice (e.g. an MPN and a GTIN row both
      // pointing at one part) is not ambiguity.
      const duplicate = existing.some(
        (t) => t.partId === target.partId && t.bikeModelId === target.bikeModelId,
      );
      if (!duplicate) existing.push(target);
    } else {
      index.set(key, [target]);
    }
  }
  return index;
}

export interface MatchOutcome {
  readonly method: OfferMatchMethod;
  readonly partId: string | null;
  readonly bikeModelId: string | null;
  /** Why this match was made, or why none was. Stored on the offer. */
  readonly notes: string;
}

const UNMATCHED = (notes: string): MatchOutcome => ({
  method: "NONE",
  partId: null,
  bikeModelId: null,
  notes,
});

/**
 * Match one normalised offer against the catalogue.
 *
 * Tried in descending order of evidence: EAN, then GTIN, then MPN, then a
 * hand-made SKU mapping. The first identifier that resolves to exactly one
 * catalogue row wins.
 */
export function matchOffer(
  offer: NormalisedOffer,
  index: IdentifierIndex,
  retailerId: string,
): MatchOutcome {
  const attempts: { kind: IdentifierKind; raw: string | null }[] = [
    { kind: "EAN", raw: offer.ean },
    { kind: "GTIN", raw: offer.gtin },
    { kind: "MPN", raw: offer.mpn },
    { kind: "MERCHANT_SKU", raw: offer.externalId },
  ];

  const tried: string[] = [];

  for (const attempt of attempts) {
    const canonical = canonicaliseIdentifier(attempt.kind, attempt.raw);
    if (canonical === null) continue;
    tried.push(attempt.kind);

    const targets = index.get(identifierKey(attempt.kind, canonical, retailerId));
    if (!targets || targets.length === 0) continue;

    if (targets.length > 1) {
      return UNMATCHED(
        `Ambiguous: ${attempt.kind} ${canonical} is recorded against ${targets.length} catalogue rows. ` +
          `Abstained rather than picking one. Fix the duplicate ProductIdentifier rows.`,
      );
    }

    const [target] = targets;
    return {
      method: attempt.kind === "UPC" ? "GTIN" : attempt.kind,
      partId: target.partId,
      bikeModelId: target.bikeModelId,
      notes: `Matched on ${attempt.kind} ${canonical}.`,
    };
  }

  return UNMATCHED(
    tried.length === 0
      ? "No usable identifier in the feed row (no EAN, GTIN or MPN). Kept unmatched."
      : `No catalogue row carries any of this product's identifiers (tried ${tried.join(", ")}). Kept unmatched.`,
  );
}

/**
 * Fields a feed is permitted to write onto a catalogue Part.
 *
 * Exhaustive and short by design. Price and stock live on the offer, not on
 * Part, so the only thing a feed can contribute to the catalogue row itself
 * is licensed imagery — and only where the row has none, so a manufacturer
 * press-kit image is never replaced by a retailer's cutout.
 *
 * Typed as a const tuple so a future edit that adds, say, "weightGrams"
 * here is a visible, reviewable change rather than a quiet one.
 */
export const FEED_WRITABLE_PART_FIELDS = ["imageUrl"] as const;
export type FeedWritablePartField = (typeof FEED_WRITABLE_PART_FIELDS)[number];

/**
 * Whether a feed image may be written to this part.
 *
 * Only when the part has no image at all. Note that this does not touch
 * `dataSource`: supplying a picture says nothing about the specs, and
 * downgrading a MANUFACTURER_SPEC part to DATA_FEED because a photo arrived
 * from a feed would misreport the provenance of everything else on the row.
 */
export function mayWriteFeedImage(part: { imageUrl: string | null }): boolean {
  return part.imageUrl === null || part.imageUrl.trim() === "";
}
