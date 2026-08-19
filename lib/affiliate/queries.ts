// lib/affiliate/queries.ts
//
// The UI-facing surface of the affiliate layer. Everything a page needs is
// one of these functions; none of them returns a React element, and none of
// them decides how anything looks.
//
// Two placements are supported, matching what was committed to:
//
//   getBestOfferForPart / getBestOffersForParts  — the buy price on a part
//     row and a part detail page.
//   getBuildCheckout                             — the whole-build,
//     itemised, per-retailer checkout list with a total.
//
// Every returned link arrives wrapped in a DisclosedLink, which carries the
// disclosure text and the `rel` value with it. That is deliberate: it is
// not possible to get a tracked URL out of this module without also
// receiving the labelling the law requires alongside it.

import { toDisclosedLink, type DisclosedLink } from "./disclosure";
import {
  buildCheckout,
  selectAllOffers,
  selectBestOffer,
  type BuildCheckout,
  type CheckoutLineInput,
  type OfferLinkBuilder,
  type OfferRecord,
  type PresentableOffer,
  type SelectOfferOptions,
} from "./offers";
import { getAdapter, hasAdapter } from "./registry";
import type { RetailerConfig } from "./types";
import type { PrismaClient } from "../generated/prisma/client";

/**
 * Where the link is being rendered. Sent to the network as a click
 * reference so revenue can be attributed to a placement.
 *
 * A closed set on purpose. Networks aggregate reporting by distinct click
 * reference and cap how many they will track (Awin stop after 20,000
 * distinct values a year), so these must identify a *placement*, never a
 * build, a session or a user — which would also make the click reference a
 * tracking identifier we have no business sending to a third party.
 */
export type Placement = "part-row" | "part-detail" | "build-checkout" | "bike-detail" | "storefront";

export interface OfferQueryOptions extends SelectOfferOptions {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly placement?: Placement;
}

type RetailerRow = {
  id: string;
  slug: string;
  displayName: string;
  advertiserId: string;
  siteUrl: string;
  linkDomains: string[];
  network: { key: string; adapterKey: string; enabled: boolean };
};

type OfferWithRetailer = {
  id: string;
  partId: string | null;
  bikeModelId: string | null;
  title: string;
  imageUrl: string | null;
  pricePence: number;
  wasPricePence: number | null;
  deliveryPence: number | null;
  availability: string;
  productUrl: string;
  deepLinkUrl: string | null;
  lastSeenAt: Date;
  retailer: RetailerRow;
};

const OFFER_SELECT = {
  id: true,
  partId: true,
  bikeModelId: true,
  title: true,
  imageUrl: true,
  pricePence: true,
  wasPricePence: true,
  deliveryPence: true,
  availability: true,
  productUrl: true,
  deepLinkUrl: true,
  lastSeenAt: true,
  retailer: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      advertiserId: true,
      siteUrl: true,
      linkDomains: true,
      network: { select: { key: true, adapterKey: true, enabled: true } },
    },
  },
} as const;

function toRecord(offer: OfferWithRetailer): OfferRecord {
  return {
    id: offer.id,
    retailerSlug: offer.retailer.slug,
    retailerName: offer.retailer.displayName,
    networkKey: offer.retailer.network.key,
    partId: offer.partId,
    bikeModelId: offer.bikeModelId,
    title: offer.title,
    imageUrl: offer.imageUrl,
    pricePence: offer.pricePence,
    wasPricePence: offer.wasPricePence,
    deliveryPence: offer.deliveryPence,
    availability: offer.availability as OfferRecord["availability"],
    productUrl: offer.productUrl,
    deepLinkUrl: offer.deepLinkUrl,
    lastSeenAt: offer.lastSeenAt,
  };
}

function toConfig(retailer: RetailerRow): RetailerConfig {
  return {
    slug: retailer.slug,
    displayName: retailer.displayName,
    advertiserId: retailer.advertiserId,
    siteUrl: retailer.siteUrl,
    linkDomains: retailer.linkDomains,
  };
}

/**
 * Build the link factory for a set of offers.
 *
 * Order of preference:
 *   1. A link built now, carrying the placement's click reference.
 *   2. The link stored at ingest, which has no click reference but does
 *      earn commission.
 *   3. Nothing. Before credentials exist this is the normal outcome, and
 *      the honest response is a price with no buy button rather than an
 *      untracked link to the retailer — that would send the rider away and
 *      earn the site nothing, which is the one failure mode that quietly
 *      breaks the business model.
 */
function createLinkBuilder(
  retailers: readonly RetailerRow[],
  options: OfferQueryOptions,
): OfferLinkBuilder {
  const env = options.env ?? (typeof process !== "undefined" ? process.env : {});
  const placement = options.placement ?? "part-row";
  const bySlug = new Map(retailers.map((retailer) => [retailer.slug, retailer]));

  return (offer: OfferRecord): DisclosedLink | null => {
    const retailer = bySlug.get(offer.retailerSlug);

    if (retailer && retailer.network.enabled && hasAdapter(retailer.network.adapterKey)) {
      const adapter = getAdapter(retailer.network.adapterKey);
      if (adapter.credentialStatus(env).ready) {
        try {
          const link = adapter.buildTrackedLink({
            retailer: toConfig(retailer),
            destinationUrl: offer.productUrl,
            credentials: adapter.readCredentials(env),
            clickRef: placement,
          });
          return toDisclosedLink(link.url, offer.retailerName);
        } catch {
          // Untrusted destination or a malformed URL. Fall through to the
          // stored link rather than throwing: one bad row must not take a
          // whole build sheet down.
        }
      }
    }

    return offer.deepLinkUrl ? toDisclosedLink(offer.deepLinkUrl, offer.retailerName) : null;
  };
}

/** A tracked click-out to a retailer's storefront. */
export function createStorefrontLinkBuilder(
  retailers: readonly RetailerRow[],
  options: OfferQueryOptions = {},
): (retailerSlug: string) => DisclosedLink | null {
  const env = options.env ?? (typeof process !== "undefined" ? process.env : {});
  const bySlug = new Map(retailers.map((retailer) => [retailer.slug, retailer]));

  return (retailerSlug: string) => {
    const retailer = bySlug.get(retailerSlug);
    if (!retailer || !retailer.network.enabled || !hasAdapter(retailer.network.adapterKey)) return null;

    const adapter = getAdapter(retailer.network.adapterKey);
    if (!adapter.credentialStatus(env).ready) return null;

    try {
      const link = adapter.buildTrackedLink({
        retailer: toConfig(retailer),
        destinationUrl: retailer.siteUrl,
        credentials: adapter.readCredentials(env),
        clickRef: "build-checkout",
      });
      return toDisclosedLink(link.url, retailer.displayName);
    } catch {
      return null;
    }
  };
}

// ------------------------------------------------------------
// Per-part offers
// ------------------------------------------------------------

/** Every usable offer for one part, cheapest first. */
export async function getOffersForPart(
  prisma: PrismaClient,
  partId: string,
  options: OfferQueryOptions = {},
): Promise<PresentableOffer[]> {
  const offers = (await prisma.retailerOffer.findMany({
    where: { partId, retailer: { enabled: true } },
    select: OFFER_SELECT,
  })) as OfferWithRetailer[];

  const buildLink = createLinkBuilder(
    offers.map((offer) => offer.retailer),
    { ...options, placement: options.placement ?? "part-detail" },
  );
  return selectAllOffers(offers.map(toRecord), buildLink, options);
}

/**
 * The single best offer for one part, or null.
 *
 * Null is ordinary. Until feed coverage is known — and permanently, for any
 * part no retailer stocks — this returns null, and the caller must render
 * "price unknown" rather than anything that looks like a price.
 */
export async function getBestOfferForPart(
  prisma: PrismaClient,
  partId: string,
  options: OfferQueryOptions = {},
): Promise<PresentableOffer | null> {
  const offers = await getOffersForPart(prisma, partId, options);
  return offers.length > 0 ? offers[0] : null;
}

/**
 * Best offer for many parts at once, keyed by part id.
 *
 * One query for a whole page of part rows. Parts with no offer are absent
 * from the map, not present with a zero.
 */
export async function getBestOffersForParts(
  prisma: PrismaClient,
  partIds: readonly string[],
  options: OfferQueryOptions = {},
): Promise<Map<string, PresentableOffer>> {
  const result = new Map<string, PresentableOffer>();
  if (partIds.length === 0) return result;

  const offers = (await prisma.retailerOffer.findMany({
    where: { partId: { in: [...partIds] }, retailer: { enabled: true } },
    select: OFFER_SELECT,
  })) as OfferWithRetailer[];

  const buildLink = createLinkBuilder(
    offers.map((offer) => offer.retailer),
    options,
  );

  const byPart = new Map<string, OfferRecord[]>();
  for (const offer of offers) {
    if (offer.partId === null) continue;
    const list = byPart.get(offer.partId) ?? [];
    list.push(toRecord(offer));
    byPart.set(offer.partId, list);
  }

  for (const [partId, list] of byPart) {
    const best = selectBestOffer(list, buildLink, options);
    if (best) result.set(partId, best);
  }
  return result;
}

/**
 * Best offer for a complete bike.
 *
 * This is the path that works regardless of how the feed-coverage question
 * lands: a feed carrying complete bikes only still fills the "Buy a
 * complete bike" section in full.
 */
export async function getBestOfferForBikeModel(
  prisma: PrismaClient,
  bikeModelId: string,
  options: OfferQueryOptions = {},
): Promise<PresentableOffer | null> {
  const offers = (await prisma.retailerOffer.findMany({
    where: { bikeModelId, retailer: { enabled: true } },
    select: OFFER_SELECT,
  })) as OfferWithRetailer[];

  const buildLink = createLinkBuilder(
    offers.map((offer) => offer.retailer),
    { ...options, placement: options.placement ?? "bike-detail" },
  );
  return selectBestOffer(offers.map(toRecord), buildLink, options);
}

// ------------------------------------------------------------
// Whole-build checkout list
// ------------------------------------------------------------

/**
 * The itemised checkout list for a build: every part, grouped by retailer,
 * with a subtotal per retailer, a total, and one click-out per retailer.
 *
 * Parts with nothing buyable are returned in `unbuyable` and counted in
 * `missingCount` rather than being dropped, so the total can never be
 * mistaken for the price of the whole bike when it isn't.
 */
export async function getBuildCheckout(
  prisma: PrismaClient,
  buildId: string,
  options: OfferQueryOptions = {},
): Promise<BuildCheckout | null> {
  const build = await prisma.build.findUnique({
    where: { id: buildId },
    select: {
      id: true,
      buildParts: {
        select: {
          quantity: true,
          slot: true,
          part: { select: { id: true, name: true, brand: true, basePricePence: true } },
        },
      },
    },
  });
  if (!build) return null;

  const partIds = build.buildParts.map((buildPart) => buildPart.part.id);
  const offers =
    partIds.length === 0
      ? []
      : ((await prisma.retailerOffer.findMany({
          where: { partId: { in: partIds }, retailer: { enabled: true } },
          select: OFFER_SELECT,
        })) as OfferWithRetailer[]);

  const retailers = offers.map((offer) => offer.retailer);
  const buildLink = createLinkBuilder(retailers, { ...options, placement: "build-checkout" });
  const buildStorefrontLink = createStorefrontLinkBuilder(retailers, options);

  const byPart = new Map<string, OfferRecord[]>();
  for (const offer of offers) {
    if (offer.partId === null) continue;
    const list = byPart.get(offer.partId) ?? [];
    list.push(toRecord(offer));
    byPart.set(offer.partId, list);
  }

  const lines: CheckoutLineInput[] = build.buildParts.map((buildPart) => ({
    partId: buildPart.part.id,
    partName: buildPart.part.name,
    partBrand: buildPart.part.brand,
    slot: buildPart.slot,
    quantity: buildPart.quantity,
    basePricePence: buildPart.part.basePricePence,
    offers: byPart.get(buildPart.part.id) ?? [],
  }));

  return buildCheckout(lines, buildLink, { ...options, buildStorefrontLink });
}
