// lib/affiliate/index.ts
//
// Public surface of the affiliate layer.
//
// The UI should need nothing but `queries` (what to show) and `disclosure`
// (how it must be labelled). The adapter contract, the registry and the
// ingest are exported for scripts and tests.
//
// One rule for anyone importing this: lib/compatibility/ must never appear
// on the other end of an import from here, in either direction. What fits
// is decided without reference to what anything costs, and keeping the two
// halves unaware of each other is what makes that statement checkable
// rather than merely claimed.

export {
  AFFILIATE_DISCLOSURE_INLINE,
  AFFILIATE_DISCLOSURE_PAGE,
  AFFILIATE_DISCLOSURE_SECTION,
  AFFILIATE_LINK_LABEL,
  AFFILIATE_LINK_REL,
  COMMISSION_NEUTRALITY_STATEMENT,
  disclosureForRetailer,
  toDisclosedLink,
  type DisclosedLink,
} from "./disclosure";

export {
  formatPence,
  parseOptionalPriceToPence,
  parsePriceToPence,
  sumPence,
  type PriceParseResult,
} from "./money";

export {
  OFFER_WITHHELD_AFTER_DAYS,
  PRICE_STALE_AFTER_HOURS,
  buildCheckout,
  rankOffers,
  selectAllOffers,
  selectBestOffer,
  type BuildCheckout,
  type CheckoutLine,
  type CheckoutLineInput,
  type OfferRecord,
  type PresentableOffer,
  type RetailerBasket,
  type UnbuyableLine,
} from "./offers";

export {
  createStorefrontLinkBuilder,
  getBestOfferForBikeModel,
  getBestOfferForPart,
  getBestOffersForParts,
  getBuildCheckout,
  getOffersForPart,
  type OfferQueryOptions,
  type Placement,
} from "./queries";

export {
  FEED_WRITABLE_PART_FIELDS,
  buildIdentifierIndex,
  canonicaliseIdentifier,
  matchOffer,
  mayWriteFeedImage,
  type IdentifierIndex,
  type IdentifierRow,
  type MatchOutcome,
} from "./matching";

export { getAdapter, hasAdapter, listAdapters } from "./registry";
export { ingestFeeds, type IngestOptions, type IngestReport } from "./ingest";

export {
  AffiliateConfigError,
  AffiliateFeedError,
  UntrustedDestinationError,
  type AffiliateNetworkAdapter,
  type FeedConfig,
  type FeedDescriptor,
  type NetworkCredentials,
  type NormalisedOffer,
  type OfferAvailability,
  type RetailerConfig,
  type TrackedLink,
} from "./types";
