// lib/affiliate/types.ts
//
// The network-agnostic contract. Everything above this line in the stack
// (ingest, offer helpers, eventually the UI) is written against these types
// and knows nothing about Awin, Impact or anyone else.
//
// Adding a network means writing one file that satisfies
// `AffiliateNetworkAdapter` and registering it in registry.ts. Adding a
// *retailer* on a network that already has an adapter means inserting a
// Retailer row and a RetailerFeed row -- no code at all.
//
// The enum-shaped values below are string-literal unions rather than
// imports from the generated Prisma client, so this module stays runnable
// in any runtime (Workers, Node, a test) without dragging a database client
// in behind it. ingest.ts maps them onto the Prisma enums through a total
// Record, so the compiler catches any drift between the two.

/** Mirrors the Prisma `OfferAvailability` enum. */
export const OFFER_AVAILABILITY = [
  "IN_STOCK",
  "OUT_OF_STOCK",
  "PRE_ORDER",
  "BACK_ORDER",
  "DISCONTINUED",
  "UNKNOWN",
] as const;
export type OfferAvailability = (typeof OFFER_AVAILABILITY)[number];

/** Mirrors the Prisma `OfferMatchMethod` enum. */
export const OFFER_MATCH_METHOD = [
  "NONE",
  "EAN",
  "GTIN",
  "MPN",
  "MERCHANT_SKU",
  "MANUAL",
] as const;
export type OfferMatchMethod = (typeof OFFER_MATCH_METHOD)[number];

/** Mirrors the Prisma `FeedProductScope` enum. */
export const FEED_PRODUCT_SCOPE = ["COMPONENT", "COMPLETE_BIKE", "MIXED", "UNKNOWN"] as const;
export type FeedProductScope = (typeof FEED_PRODUCT_SCOPE)[number];

// ------------------------------------------------------------
// Configuration passed to an adapter
// ------------------------------------------------------------

/**
 * What an adapter needs to know about a retailer to build links for it.
 * Structurally a subset of the Prisma `Retailer` model, declared separately
 * so an adapter can be unit-tested with a plain object and so the contract
 * doesn't move every time an unrelated column is added.
 */
export interface RetailerConfig {
  readonly slug: string;
  readonly displayName: string;
  /** The network's own merchant id. Awin's `awinmid`; opaque here. */
  readonly advertiserId: string;
  readonly siteUrl: string;
  /**
   * Hostnames the retailer's product URLs must be on. Empty means
   * unchecked, and the link builder refuses to build a link rather than
   * trusting an unvalidated destination.
   */
  readonly linkDomains: readonly string[];
}

/** One feed belonging to a retailer. */
export interface FeedConfig {
  /** The network's feed identifier. Awin's `fid`. */
  readonly externalFeedId: string;
  readonly label?: string | null;
  readonly language: string;
  /** ISO 4217. Anything other than "GBP" is refused at ingest. */
  readonly currencyCode: string;
  readonly scope: FeedProductScope;
}

/**
 * Secrets for one network, read from the environment.
 *
 * `values` is keyed by the adapter's own env var names. Nothing here is
 * ever persisted, logged or included in an error message -- see
 * credentials.ts, which redacts on the way out.
 */
export interface NetworkCredentials {
  readonly networkKey: string;
  readonly values: Readonly<Record<string, string>>;
}

// ------------------------------------------------------------
// Tracked links
// ------------------------------------------------------------

export interface TrackedLinkInput {
  readonly retailer: RetailerConfig;
  /** The merchant's own product URL, exactly as the feed supplied it. */
  readonly destinationUrl: string;
  readonly credentials: NetworkCredentials;
  /**
   * Our own reference passed through to the network's reporting, so a
   * commission can be traced back to the placement that earned it, e.g.
   * "part-row" or "build-checkout". Networks impose their own length and
   * character limits; the adapter sanitises.
   */
  readonly clickRef?: string;
  /** Further reporting slots, where the network supports them. */
  readonly extraRefs?: readonly string[];
}

export interface TrackedLink {
  readonly url: string;
  readonly networkKey: string;
  /** The clickRef actually sent, after the adapter's sanitising. */
  readonly clickRef: string | null;
}

// ------------------------------------------------------------
// Feeds
// ------------------------------------------------------------

/** One raw feed row: column name to value, exactly as delivered. */
export type FeedRow = Readonly<Record<string, string>>;

export interface FetchFeedInput {
  readonly retailer: RetailerConfig;
  readonly feed: FeedConfig;
  readonly credentials: NetworkCredentials;
  /** Stop after this many rows. For a smoke test against a live feed. */
  readonly limit?: number;
  readonly signal?: AbortSignal;
}

export interface FeedFetchResult {
  /**
   * An async iterable rather than an array so a large feed can be consumed
   * as it is parsed. The Awin adapter currently buffers the download before
   * yielding (feeds are gzipped and a bike retailer's is a few MB), but the
   * contract does not require that, and a streaming implementation can
   * replace it without touching ingest.
   */
  readonly rows: AsyncIterable<FeedRow>;
  readonly fetchedAt: Date;
  /** Where it came from, with any credentials in the URL redacted. */
  readonly sourceDescription: string;
  /** Column names seen in the header, for diagnostics. */
  readonly columns: readonly string[];
}

/** A feed the network says this publisher can access. */
export interface FeedDescriptor {
  readonly externalFeedId: string;
  readonly advertiserId: string;
  readonly advertiserName: string;
  readonly label: string | null;
  readonly language: string | null;
  readonly currencyCode: string | null;
  readonly productCount: number | null;
  readonly lastImported: Date | null;
  /**
   * Deliberately absent: any claim about *what kind* of products the feed
   * contains. Networks do not publish that reliably, and guessing it is
   * precisely the mistake the Phase 7 blocker is about. Scope is recorded
   * on RetailerFeed only after a human has looked at real rows.
   */
}

// ------------------------------------------------------------
// Normalised offers
// ------------------------------------------------------------

/**
 * A feed row after normalisation: network-independent, and carrying only
 * what a feed is allowed to tell us.
 *
 * Note what is NOT here. No weight, no dimensions, no axle standard, no
 * speeds, no "specifications" blob. Retailer feeds contain fields with
 * those names and they are frequently wrong; letting one reach a Part row
 * would silently corrupt compatibility results, which is the one failure
 * this project treats as unacceptable. A feed may supply price, stock,
 * imagery and identifiers. That is the whole list.
 */
export interface NormalisedOffer {
  /** Stable per-retailer product id. The ingest idempotency key. */
  readonly externalId: string;
  readonly title: string;
  readonly brandName: string | null;

  // Manufacturer identifiers -- the only trustworthy way to match a feed
  // row to a catalogue part.
  readonly ean: string | null;
  readonly mpn: string | null;
  readonly gtin: string | null;

  readonly categoryPath: string | null;
  readonly imageUrl: string | null;
  /** The merchant's untracked product URL. */
  readonly productUrl: string;
  /** The network's tracked URL, where the feed supplies one ready-made. */
  readonly feedDeepLinkUrl: string | null;

  readonly pricePence: number;
  readonly wasPricePence: number | null;
  readonly deliveryPence: number | null;
  readonly currencyCode: string;
  readonly includesVat: boolean;

  readonly availability: OfferAvailability;
  readonly stockQuantity: number | null;
}

/** Why a row was not turned into an offer. Counted and reported, never silent. */
export type RowRejectionReason =
  | "no-stable-id"
  | "no-title"
  | "no-product-url"
  | "unparseable-price"
  | "wrong-currency"
  | "off-domain-url"
  | "not-for-sale";

export type NormaliseResult =
  | { readonly ok: true; readonly offer: NormalisedOffer }
  | { readonly ok: false; readonly reason: RowRejectionReason; readonly detail?: string };

// ------------------------------------------------------------
// The adapter contract
// ------------------------------------------------------------

export interface CredentialStatus {
  readonly ready: boolean;
  /** Env var names that are missing. Names only -- never values. */
  readonly missing: readonly string[];
}

/**
 * One affiliate network.
 *
 * Three jobs, matching the three things every network does differently:
 * turn a destination URL into a tracked one, fetch a product feed, and
 * translate that feed's columns into our vocabulary.
 */
export interface AffiliateNetworkAdapter {
  /** Matches `AffiliateNetwork.adapterKey` in the database. */
  readonly key: string;
  readonly displayName: string;

  /**
   * Env vars this adapter needs, in the order a human should set them.
   * Used by the ingest script's readiness check and by the error message
   * it prints when credentials are missing.
   */
  readonly requiredEnvVars: readonly string[];
  readonly optionalEnvVars: readonly string[];

  /** Which of the required vars are present. Reads names, not values. */
  credentialStatus(env: Readonly<Record<string, string | undefined>>): CredentialStatus;

  /** Pull credentials out of the environment. Throws if any are missing. */
  readCredentials(env: Readonly<Record<string, string | undefined>>): NetworkCredentials;

  /**
   * Build a tracked deep link to `destinationUrl`.
   *
   * Must refuse (throw `UntrustedDestinationError`) if the destination is
   * not on one of the retailer's declared domains, so a bad feed row can
   * never turn our tracked link into an open redirect.
   */
  buildTrackedLink(input: TrackedLinkInput): TrackedLink;

  /**
   * List the feeds this publisher can access, where the network offers an
   * endpoint for it. Optional: not every network does.
   */
  listFeeds?(credentials: NetworkCredentials, signal?: AbortSignal): Promise<FeedDescriptor[]>;

  /** Download and parse a feed into raw rows. */
  fetchFeed(input: FetchFeedInput): Promise<FeedFetchResult>;

  /** Translate one raw row into a NormalisedOffer, or explain why not. */
  normaliseRow(row: FeedRow, context: { retailer: RetailerConfig; feed: FeedConfig }): NormaliseResult;
}

// ------------------------------------------------------------
// Errors
// ------------------------------------------------------------

/** Missing or malformed configuration/credentials. Actionable by a human. */
export class AffiliateConfigError extends Error {
  readonly missingEnvVars: readonly string[];
  constructor(message: string, missingEnvVars: readonly string[] = []) {
    super(message);
    this.name = "AffiliateConfigError";
    this.missingEnvVars = missingEnvVars;
  }
}

/** The network's feed could not be fetched or parsed. */
export class AffiliateFeedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AffiliateFeedError";
  }
}

/** A destination URL that is not on the retailer's own domains. */
export class UntrustedDestinationError extends Error {
  readonly destinationUrl: string;
  constructor(destinationUrl: string, retailerSlug: string) {
    super(
      `Refusing to build a tracked link to ${destinationUrl}: it is not on a domain declared for retailer "${retailerSlug}". ` +
        `Add the hostname to Retailer.linkDomains if it is genuinely theirs.`,
    );
    this.name = "UntrustedDestinationError";
    this.destinationUrl = destinationUrl;
  }
}
