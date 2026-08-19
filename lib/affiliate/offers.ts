// lib/affiliate/offers.ts
//
// Choosing what to show: the best current offer for a part, and the
// itemised checkout list for a whole build.
//
// Pure functions over plain records — no database, no React. queries.ts
// fetches the rows and builds the tracked links; this module decides what
// they mean. Keeping the decision logic pure is what makes the neutrality
// promise checkable: the ranking below is the only place an ordering
// decision is made, and it reads price and freshness, nothing else.
//
// NOTHING HERE RANKS BY COMMISSION. There is no commission field on
// OfferRecord for it to read even if someone tried.

import {
  AFFILIATE_DISCLOSURE_SECTION,
  COMMISSION_NEUTRALITY_STATEMENT,
  type DisclosedLink,
} from "./disclosure";
import { formatPence, sumPence } from "./money";
import type { OfferAvailability } from "./types";

/**
 * How long a feed price stays presentable.
 *
 * Awin-style feeds refresh daily, so anything past two days means the
 * ingest is not running. Past three weeks the price is likely wrong in a
 * way that would annoy a rider at the checkout, so the offer is withheld
 * rather than shown with a caveat.
 */
export const PRICE_STALE_AFTER_HOURS = 48;
export const OFFER_WITHHELD_AFTER_DAYS = 21;

/** One offer, flattened from the database for the UI layer. */
export interface OfferRecord {
  readonly id: string;
  readonly retailerSlug: string;
  readonly retailerName: string;
  readonly networkKey: string;
  readonly partId: string | null;
  readonly bikeModelId: string | null;
  readonly title: string;
  readonly imageUrl: string | null;
  readonly pricePence: number;
  readonly wasPricePence: number | null;
  readonly deliveryPence: number | null;
  readonly availability: OfferAvailability;
  readonly productUrl: string;
  /** Null when no publisher ID was available to build a tracked link. */
  readonly deepLinkUrl: string | null;
  readonly lastSeenAt: Date;
}

/** An offer plus the judgements made about it. */
export interface PresentableOffer {
  readonly offer: OfferRecord;
  readonly priceLabel: string;
  /** Older than PRICE_STALE_AFTER_HOURS. Show an "as of" caveat. */
  readonly isStale: boolean;
  readonly checkedAt: Date;
  /**
   * Null when the offer has no tracked link yet — before credentials
   * exist, every offer is in this state. The UI shows the price and the
   * retailer's name without a clickable buy button rather than linking
   * untracked (which would give away the commission the site runs on).
   */
  readonly link: DisclosedLink | null;
}

export interface SelectOfferOptions {
  readonly now?: Date;
  /**
   * Include offers the retailer reports as out of stock. Off by default:
   * sending a rider to a sold-out page is the most common way an affiliate
   * site wastes their time.
   */
  readonly includeOutOfStock?: boolean;
}

/** Builds the disclosed link for an offer. Supplied by queries.ts. */
export type OfferLinkBuilder = (offer: OfferRecord) => DisclosedLink | null;

function hoursBetween(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 3_600_000;
}

function isBuyable(offer: OfferRecord, options: SelectOfferOptions): boolean {
  if (options.includeOutOfStock) return true;
  // UNKNOWN is included: plenty of feeds omit stock entirely, and excluding
  // every such offer would empty the list for whole retailers. The UI is
  // expected to say "stock not reported" rather than "in stock".
  return offer.availability === "IN_STOCK" || offer.availability === "UNKNOWN";
}

function isFreshEnough(offer: OfferRecord, now: Date): boolean {
  return hoursBetween(now, offer.lastSeenAt) <= OFFER_WITHHELD_AFTER_DAYS * 24;
}

/**
 * Rank offers for one product.
 *
 * Cheapest first. Delivery cost is deliberately not folded into the
 * comparison: it is basket-dependent (free over £X, different per courier
 * option) so a single-item delivery figure would rank two retailers on a
 * number that won't apply at the checkout. It is carried on the record for
 * the UI to display instead.
 *
 * Ties break on retailer slug purely for determinism — so the same build
 * renders the same way twice — and not on anything we earn from.
 */
export function rankOffers(offers: readonly OfferRecord[], options: SelectOfferOptions = {}): OfferRecord[] {
  const now = options.now ?? new Date();
  return offers
    .filter((offer) => isFreshEnough(offer, now) && isBuyable(offer, options))
    .slice()
    .sort((a, b) => a.pricePence - b.pricePence || a.retailerSlug.localeCompare(b.retailerSlug));
}

/** Present one offer, with staleness worked out and its link built. */
export function toPresentable(
  offer: OfferRecord,
  buildLink: OfferLinkBuilder,
  now: Date = new Date(),
): PresentableOffer {
  return {
    offer,
    priceLabel: formatPence(offer.pricePence),
    isStale: hoursBetween(now, offer.lastSeenAt) > PRICE_STALE_AFTER_HOURS,
    checkedAt: offer.lastSeenAt,
    link: buildLink(offer),
  };
}

/**
 * The best current offer for one product, or null.
 *
 * Null is a normal outcome, not an error: most of the catalogue will have
 * no offer at all until feed coverage is known, and if Ribble's feed turns
 * out to carry complete bikes only then every component returns null
 * indefinitely. Callers must render "price unknown", never a placeholder
 * price.
 */
export function selectBestOffer(
  offers: readonly OfferRecord[],
  buildLink: OfferLinkBuilder,
  options: SelectOfferOptions = {},
): PresentableOffer | null {
  const ranked = rankOffers(offers, options);
  if (ranked.length === 0) return null;
  return toPresentable(ranked[0], buildLink, options.now ?? new Date());
}

/** Every usable offer for a product, cheapest first. */
export function selectAllOffers(
  offers: readonly OfferRecord[],
  buildLink: OfferLinkBuilder,
  options: SelectOfferOptions = {},
): PresentableOffer[] {
  const now = options.now ?? new Date();
  return rankOffers(offers, options).map((offer) => toPresentable(offer, buildLink, now));
}

// ------------------------------------------------------------
// Whole-build checkout list
// ------------------------------------------------------------

/** One slot in the build, with whatever offers exist for it. */
export interface CheckoutLineInput {
  readonly partId: string;
  readonly partName: string;
  readonly partBrand: string;
  /** 'front' / 'rear' etc., straight from BuildPart.slot. */
  readonly slot: string | null;
  readonly quantity: number;
  /** Manufacturer RRP from Part.basePricePence, if any. */
  readonly basePricePence: number | null;
  readonly offers: readonly OfferRecord[];
}

export interface CheckoutLine {
  readonly partId: string;
  readonly partName: string;
  readonly partBrand: string;
  readonly slot: string | null;
  readonly quantity: number;
  readonly offer: PresentableOffer;
  /** Unit price times quantity. */
  readonly lineTotalPence: number;
  readonly lineTotalLabel: string;
}

/** A part in the build that nothing can be bought for, and why. */
export interface UnbuyableLine {
  readonly partId: string;
  readonly partName: string;
  readonly partBrand: string;
  readonly slot: string | null;
  readonly quantity: number;
  /** RRP where the catalogue knows one — shown as a guide, not a price to pay. */
  readonly basePricePence: number | null;
  readonly reason: "no-offer" | "out-of-stock" | "stale";
}

export interface RetailerBasket {
  readonly retailerSlug: string;
  readonly retailerName: string;
  readonly lines: readonly CheckoutLine[];
  readonly subtotalPence: number;
  readonly subtotalLabel: string;
  /**
   * One tracked click-out for this retailer.
   *
   * It goes to the retailer's storefront, not to a pre-filled basket:
   * building a multi-item basket URL is a retailer-specific feature that
   * affiliate networks do not provide, and inventing one that half works
   * would break the checkout for the rider. Each line carries its own
   * tracked product link alongside it.
   */
  readonly storefrontLink: DisclosedLink | null;
}

export interface BuildCheckout {
  readonly baskets: readonly RetailerBasket[];
  readonly unbuyable: readonly UnbuyableLine[];
  readonly totalPence: number;
  readonly totalLabel: string;
  /** How many build slots have no buyable offer. Shown, never hidden. */
  readonly missingCount: number;
  /** True when at least one shown offer is past PRICE_STALE_AFTER_HOURS. */
  readonly hasStalePrices: boolean;
  readonly disclosure: string;
  readonly neutralityStatement: string;
}

export interface BuildCheckoutOptions extends SelectOfferOptions {
  /** Builds the storefront click-out for a retailer. From queries.ts. */
  readonly buildStorefrontLink?: (retailerSlug: string) => DisclosedLink | null;
}

/**
 * Turn a build into an itemised, per-retailer checkout list.
 *
 * The total is the sum of what can actually be bought. Parts with no offer
 * are listed separately with their count surfaced on the result, because a
 * total that quietly omits four parts reads as the price of the whole bike
 * and isn't.
 */
export function buildCheckout(
  lines: readonly CheckoutLineInput[],
  buildLink: OfferLinkBuilder,
  options: BuildCheckoutOptions = {},
): BuildCheckout {
  const now = options.now ?? new Date();
  const grouped = new Map<string, { name: string; lines: CheckoutLine[] }>();
  const unbuyable: UnbuyableLine[] = [];
  let hasStalePrices = false;

  for (const line of lines) {
    const best = selectBestOffer(line.offers, buildLink, { ...options, now });

    if (best === null) {
      // Distinguish "we have no offer" from "the offer says sold out", so
      // the UI can say which. Both are honest outcomes; they are not the
      // same message to a rider.
      const anyOffer = line.offers.length > 0;
      const anyInStock = line.offers.some(
        (o) => o.availability === "IN_STOCK" || o.availability === "UNKNOWN",
      );
      unbuyable.push({
        partId: line.partId,
        partName: line.partName,
        partBrand: line.partBrand,
        slot: line.slot,
        quantity: line.quantity,
        basePricePence: line.basePricePence,
        reason: !anyOffer ? "no-offer" : anyInStock ? "stale" : "out-of-stock",
      });
      continue;
    }

    if (best.isStale) hasStalePrices = true;

    const lineTotalPence = best.offer.pricePence * line.quantity;
    const entry = grouped.get(best.offer.retailerSlug) ?? {
      name: best.offer.retailerName,
      lines: [],
    };
    entry.lines.push({
      partId: line.partId,
      partName: line.partName,
      partBrand: line.partBrand,
      slot: line.slot,
      quantity: line.quantity,
      offer: best,
      lineTotalPence,
      lineTotalLabel: formatPence(lineTotalPence),
    });
    grouped.set(best.offer.retailerSlug, entry);
  }

  const baskets: RetailerBasket[] = [...grouped.entries()]
    .map(([slug, entry]) => {
      const { total } = sumPence(entry.lines.map((l) => l.lineTotalPence));
      return {
        retailerSlug: slug,
        retailerName: entry.name,
        lines: entry.lines,
        subtotalPence: total,
        subtotalLabel: formatPence(total),
        storefrontLink: options.buildStorefrontLink?.(slug) ?? null,
      };
    })
    // Largest basket first: it is the one the rider most likely wants to
    // open. Again a display order, not a commercial one.
    .sort((a, b) => b.subtotalPence - a.subtotalPence || a.retailerSlug.localeCompare(b.retailerSlug));

  const { total } = sumPence(baskets.map((b) => b.subtotalPence));

  return {
    baskets,
    unbuyable,
    totalPence: total,
    totalLabel: formatPence(total),
    missingCount: unbuyable.length,
    hasStalePrices,
    disclosure: AFFILIATE_DISCLOSURE_SECTION,
    neutralityStatement: COMMISSION_NEUTRALITY_STATEMENT,
  };
}
