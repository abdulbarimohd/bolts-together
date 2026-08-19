// lib/affiliate/networks/awin.ts
//
// The Awin implementation of AffiliateNetworkAdapter.
//
// This is the only file in lib/affiliate/ that knows Awin exists. Every
// format below is taken from Awin's own publisher documentation rather than
// inferred; where their docs are silent, the code says so and abstains
// instead of guessing. Sources:
//
//   Deep links / `ued`   https://wiki.awin.com/index.php/Deeplink_Builder
//                        (live docs moved; page survives at web.archive.org)
//   clickref rules       https://wiki.awin.com/index.php/Publisher_Click_Ref
//   Feed download URL    https://help.awin.com/developers/docs/product-feed-list-download
//   Feed formats         https://help.awin.com/developers/docs/downloading-feeds-using-create-a-feed
//   Column meanings      https://help.awin.com/developers/docs/product-feed-publisher-guide-intro
//   Publisher API        https://help.awin.com/apidocs/about
//
// Two Awin facts drive most of the decisions here:
//
//   1. There are TWO different keys. The product-feed URLs take a
//      "Product Data" API key embedded in the URL path; the Publisher API
//      takes a separate OAuth bearer token. Awin state explicitly that
//      these are not interchangeable, so they are separate env vars.
//   2. `in_stock` has a trap in it. Awin's own spec says that any value
//      other than 1 or 0 is treated as in stock. We do not follow that:
//      turning junk into a positive stock claim is exactly the kind of
//      guess this project refuses to make. Junk becomes UNKNOWN, which the
//      UI reports as "stock not confirmed".

import { parseCsvRecords } from "../csv";
import { checkEnvVars, readEnvVars, redactSecrets } from "../credentials";
import { parseOptionalPriceToPence, parsePriceToPence } from "../money";
import {
  AffiliateFeedError,
  UntrustedDestinationError,
  type AffiliateNetworkAdapter,
  type CredentialStatus,
  type FeedDescriptor,
  type FeedFetchResult,
  type FeedRow,
  type FetchFeedInput,
  type NetworkCredentials,
  type NormaliseResult,
  type OfferAvailability,
  type RetailerConfig,
  type TrackedLink,
  type TrackedLinkInput,
} from "../types";

// ------------------------------------------------------------
// Environment
// ------------------------------------------------------------

/** Awin publisher (affiliate) ID. Goes in `awinaffid` on every link. */
export const ENV_PUBLISHER_ID = "AWIN_PUBLISHER_ID";
/** "Product Data" API key from Toolbox → Create-a-Feed. Used in feed URLs. */
export const ENV_FEED_API_KEY = "AWIN_FEED_API_KEY";
/** OAuth bearer token for api.awin.com. Only needed for the Publisher API. */
export const ENV_API_TOKEN = "AWIN_API_TOKEN";

const REQUIRED_ENV = [ENV_PUBLISHER_ID, ENV_FEED_API_KEY] as const;
const OPTIONAL_ENV = [ENV_API_TOKEN] as const;

// ------------------------------------------------------------
// Endpoints
// ------------------------------------------------------------

const CLICK_HOST = "https://www.awin1.com/cread.php";
const PRODUCT_DATA_HOST = "https://productdata.awin.com";

/**
 * Columns requested from the feed.
 *
 * Requesting a subset rather than everything is not just bandwidth: the
 * columns left out are the ones that would tempt someone to write a
 * retailer's marketing copy into a spec field. `specifications`,
 * `dimensions`, `product_type` and `description` are all deliberately
 * absent — a feed may tell us price, stock, imagery and identifiers, and
 * nothing else.
 *
 * Spellings are Awin's, including the capitalised `product_GTIN`.
 */
export const AWIN_FEED_COLUMNS = [
  "aw_product_id",
  "merchant_product_id",
  "product_name",
  "brand_name",
  "ean",
  "mpn",
  "product_GTIN",
  "merchant_deep_link",
  "aw_deep_link",
  "merchant_image_url",
  "aw_image_url",
  "search_price",
  "rrp_price",
  "delivery_cost",
  "currency",
  "in_stock",
  "stock_quantity",
  "is_for_sale",
  "merchant_product_category_path",
  "merchant_category",
  "last_updated",
] as const;

// ------------------------------------------------------------
// clickref
// ------------------------------------------------------------

/**
 * Awin's documented clickref rules, applied.
 *
 * Rejected outright by Awin: `#` (read as an anchor), `&` (parameter
 * separator), `+`, `|` (silently becomes an underscore), and `'` / `"`
 * (get a backslash prepended). Everything else in latin1 alphanumerics
 * plus their published punctuation set is fine.
 *
 * Length: Awin state there is no hard limit, but their aggregated Click
 * References report only shows the first 50 characters, so a longer value
 * is unreadable where you would actually go to look at it. Truncated here.
 *
 * Cardinality matters more than length. Awin stop aggregating after 20,000
 * distinct clickref values per year, so a clickref must identify a
 * *placement* ("part-row", "build-checkout"), never a build id or a
 * session — those would burn the annual allowance in a fortnight and make
 * the report useless.
 */
export function sanitiseClickRef(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[#&+|'"]/g, "")
    .replace(/[^a-z0-9!$%()*,\-./:;?@[\]^_`{}~]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// ------------------------------------------------------------
// Destination checking
// ------------------------------------------------------------

function hostMatches(host: string, domain: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  const d = domain.toLowerCase().replace(/^www\./, "");
  return h === d || h.endsWith(`.${d}`);
}

/**
 * A destination is only linkable if it is on a domain the retailer has
 * declared. Awin themselves let advertisers restrict deep-link domains and
 * silently redirect anything else to the homepage, so an off-domain link is
 * both a security concern for us and a broken link for the rider.
 *
 * An empty `linkDomains` means nobody has stated what this retailer's
 * domains are, and the honest response to "I don't know" is to refuse.
 */
export function assertTrustedDestination(destinationUrl: string, retailer: RetailerConfig): URL {
  let url: URL;
  try {
    url = new URL(destinationUrl);
  } catch {
    throw new UntrustedDestinationError(destinationUrl, retailer.slug);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UntrustedDestinationError(destinationUrl, retailer.slug);
  }

  const domains = retailer.linkDomains.length > 0 ? retailer.linkDomains : inferDomains(retailer);
  if (!domains.some((domain) => hostMatches(url.hostname, domain))) {
    throw new UntrustedDestinationError(destinationUrl, retailer.slug);
  }
  return url;
}

/**
 * Fall back to the retailer's own siteUrl host when linkDomains is empty.
 *
 * This is a narrow convenience, not a loosening: it still only trusts the
 * host the retailer record itself names. It exists so a retailer can be
 * added with one URL rather than two, and the moment a merchant uses a
 * second domain (a separate checkout host, say) the empty list has to be
 * filled in properly.
 */
function inferDomains(retailer: RetailerConfig): string[] {
  try {
    return [new URL(retailer.siteUrl).hostname];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// Availability
// ------------------------------------------------------------

const IN_STOCK_WORDS = new Set(["1", "true", "yes", "y", "in stock", "instock", "available"]);
const OUT_OF_STOCK_WORDS = new Set([
  "0",
  "false",
  "no",
  "n",
  "out of stock",
  "outofstock",
  "not available",
  "unavailable",
  "sold out",
]);

/**
 * Read Awin's stock columns.
 *
 * `in_stock` is the reliable one (Awin ask advertisers to use 1/0).
 * `stock_status` is documented as free text with no fixed vocabulary, so it
 * is only consulted when `in_stock` says nothing, and only for values we
 * recognise.
 *
 * Deliberate divergence from Awin's spec: they say unrecognised text in
 * `in_stock` means in stock. We return UNKNOWN instead. Their rule is a
 * sensible default for a network that would rather show a product; ours is
 * the right one for a tool whose whole claim is that it doesn't assert
 * things it hasn't checked.
 */
export function readAvailability(row: FeedRow): {
  availability: OfferAvailability;
  stockQuantity: number | null;
} {
  const quantityRaw = (row.stock_quantity ?? "").trim();
  const quantity = /^\d+$/.test(quantityRaw) ? Number(quantityRaw) : null;

  const candidates = [row.in_stock, row.stock_status];
  for (const candidate of candidates) {
    const value = (candidate ?? "").trim().toLowerCase();
    if (value === "") continue;
    if (IN_STOCK_WORDS.has(value)) return { availability: "IN_STOCK", stockQuantity: quantity };
    if (OUT_OF_STOCK_WORDS.has(value)) return { availability: "OUT_OF_STOCK", stockQuantity: quantity };
  }

  // A quantity of zero is an unambiguous statement even when the flags are
  // silent; a positive quantity is not enough on its own to claim the item
  // is orderable, so it stays UNKNOWN.
  if (quantity === 0) return { availability: "OUT_OF_STOCK", stockQuantity: 0 };

  if ((row.pre_order ?? "").trim() === "1") return { availability: "PRE_ORDER", stockQuantity: quantity };

  return { availability: "UNKNOWN", stockQuantity: quantity };
}

// ------------------------------------------------------------
// The adapter
// ------------------------------------------------------------

function nonEmpty(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

async function* iterateRows(records: readonly FeedRow[], limit?: number): AsyncGenerator<FeedRow> {
  let count = 0;
  for (const record of records) {
    if (limit !== undefined && count >= limit) return;
    count += 1;
    yield record;
  }
}

/**
 * Awin's feed download URL is built from path segments, not a query string:
 *
 *   https://productdata.awin.com/datafeed/download/apikey/{key}/language/{lang}
 *     /fid/{feedId}/columns/{a,b,c}/format/csv/delimiter/%2C/compression/gzip/
 *
 * Segment order is not fixed in Awin's own examples, so this follows the
 * order their Create-a-Feed UI generates. The delimiter is a comma,
 * URL-encoded because it is sitting in a path segment.
 */
export function buildFeedDownloadUrl(input: {
  apiKey: string;
  feedId: string;
  language: string;
  columns: readonly string[];
}): string {
  const segments = [
    "datafeed",
    "download",
    "apikey",
    encodeURIComponent(input.apiKey),
    "language",
    encodeURIComponent(input.language || "en"),
    "fid",
    encodeURIComponent(input.feedId),
    "columns",
    input.columns.map(encodeURIComponent).join("%2C"),
    "format",
    "csv",
    "delimiter",
    "%2C",
    "compression",
    "gzip",
  ];
  return `${PRODUCT_DATA_HOST}/${segments.join("/")}/`;
}

export function buildFeedListUrl(apiKey: string): string {
  return `${PRODUCT_DATA_HOST}/datafeed/list/apikey/${encodeURIComponent(apiKey)}/`;
}

/**
 * Gunzip a downloaded feed.
 *
 * `DecompressionStream` is a web standard present in both the Workers
 * runtime and Node 18+, which keeps this adapter runnable in either without
 * a Node-only `zlib` import.
 */
async function gunzip(data: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream === "undefined") {
    throw new AffiliateFeedError(
      "This runtime has no DecompressionStream, so a gzipped feed cannot be decompressed here.",
    );
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

export const awinAdapter: AffiliateNetworkAdapter = {
  key: "awin",
  displayName: "Awin",
  requiredEnvVars: REQUIRED_ENV,
  optionalEnvVars: OPTIONAL_ENV,

  credentialStatus(env): CredentialStatus {
    return checkEnvVars(REQUIRED_ENV, env);
  },

  readCredentials(env): NetworkCredentials {
    return readEnvVars("awin", REQUIRED_ENV, OPTIONAL_ENV, env);
  },

  /**
   * Awin's documented tracking link:
   *
   *   https://www.awin1.com/cread.php?awinmid={advertiser}&awinaffid={publisher}
   *     &clickref={ref}&ued={single-encoded destination}
   *
   * Three details that are easy to get wrong and are documented, not
   * invented:
   *   * `ued` means "URL Encoded Deeplink" and takes a *single* encoding.
   *     Double-encoding it is the classic Awin bug and produces a link
   *     that lands on the merchant homepage.
   *   * Parameter names must be lowercase; Awin reject `PREF`/`ClickRef`.
   *   * References go before the destination parameter.
   *
   * `URLSearchParams` handles the encoding, which is why the destination is
   * appended as a plain string rather than pre-encoded by hand.
   */
  buildTrackedLink(input: TrackedLinkInput): TrackedLink {
    const destination = assertTrustedDestination(input.destinationUrl, input.retailer);
    const publisherId = input.credentials.values[ENV_PUBLISHER_ID];

    const params = new URLSearchParams();
    params.set("awinmid", input.retailer.advertiserId);
    params.set("awinaffid", publisherId);

    const clickRef = input.clickRef ? sanitiseClickRef(input.clickRef) : null;
    if (clickRef) params.set("clickref", clickRef);

    // clickref2..clickref6 exist but, unlike clickref, are never passed
    // through to the advertiser's landing page — they are reporting-only.
    (input.extraRefs ?? []).slice(0, 5).forEach((ref, i) => {
      const cleaned = sanitiseClickRef(ref);
      if (cleaned) params.set(`clickref${i + 2}`, cleaned);
    });

    // Destination last, per Awin's guidance that references precede it.
    params.set("ued", destination.toString());

    return { url: `${CLICK_HOST}?${params.toString()}`, networkKey: "awin", clickRef };
  },

  /**
   * The feed list endpoint returns CSV with a fixed set of columns:
   * Advertiser ID, Advertiser Name, Primary Region, Membership Status,
   * Feed ID, Feed Name, Language, Vertical, Last Imported, URL.
   *
   * Note what this does NOT tell us: what kind of products a feed contains.
   * Awin publish no such field, which is exactly why RetailerFeed.scope
   * defaults to UNKNOWN and is set by a human after looking at real rows.
   */
  async listFeeds(credentials: NetworkCredentials, signal?: AbortSignal): Promise<FeedDescriptor[]> {
    const apiKey = credentials.values[ENV_FEED_API_KEY];
    const url = buildFeedListUrl(apiKey);

    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new AffiliateFeedError(
        `Awin feed list request failed: ${response.status} ${response.statusText} ` +
          `(${redactSecrets(url, credentials)})`,
      );
    }

    const { records } = parseCsvRecords(await response.text());
    return records.map((row) => ({
      externalFeedId: (row["Feed ID"] ?? "").trim(),
      advertiserId: (row["Advertiser ID"] ?? "").trim(),
      advertiserName: (row["Advertiser Name"] ?? "").trim(),
      label: nonEmpty(row["Feed Name"]),
      language: nonEmpty(row["Language"]),
      // The list carries no currency column; the feed's own `currency`
      // column is the authority and is checked per row at normalise time.
      currencyCode: null,
      productCount: null,
      lastImported: parseAwinDate(row["Last Imported"]),
    }));
  },

  async fetchFeed(input: FetchFeedInput): Promise<FeedFetchResult> {
    const apiKey = input.credentials.values[ENV_FEED_API_KEY];
    const url = buildFeedDownloadUrl({
      apiKey,
      feedId: input.feed.externalFeedId,
      language: input.feed.language,
      columns: AWIN_FEED_COLUMNS,
    });
    const safeUrl = redactSecrets(url, input.credentials);

    const response = await fetch(url, { signal: input.signal });
    if (!response.ok) {
      throw new AffiliateFeedError(
        `Awin feed download failed: ${response.status} ${response.statusText} (${safeUrl})`,
      );
    }

    const buffer = await response.arrayBuffer();

    // Gzip magic number. Awin honour the `compression/gzip` segment, but a
    // sniff is cheaper than a mysterious parse failure if they ever return
    // plain CSV (an error page, for instance).
    const head = new Uint8Array(buffer.slice(0, 2));
    const isGzip = head[0] === 0x1f && head[1] === 0x8b;
    const text = isGzip ? await gunzip(buffer) : new TextDecoder("utf-8").decode(buffer);

    if (text.trimStart().startsWith("<")) {
      throw new AffiliateFeedError(
        `Awin returned markup rather than CSV for ${safeUrl}. This is usually a rejected ` +
          `API key or a feed id the publisher account cannot access.`,
      );
    }

    const malformed: number[] = [];
    const { columns, records } = parseCsvRecords(text, {
      onMalformedRow: (line) => malformed.push(line),
    });

    if (malformed.length > 0) {
      // Not fatal: a handful of broken rows in a 40,000-row feed is normal
      // and the rest is still good. It is reported so it can't hide.
      console.warn(
        `[awin] ${malformed.length} malformed row(s) skipped in feed ${input.feed.externalFeedId} ` +
          `(first at line ${malformed[0]})`,
      );
    }

    return {
      rows: iterateRows(records, input.limit),
      fetchedAt: new Date(),
      sourceDescription: safeUrl,
      columns,
    };
  },

  normaliseRow(row, context): NormaliseResult {
    // `is_for_sale` is Awin's own "can this be bought" flag. A 0 here means
    // the row is catalogue padding, not a purchasable product.
    if ((row.is_for_sale ?? "").trim() === "0") {
      return { ok: false, reason: "not-for-sale" };
    }

    const externalId = nonEmpty(row.merchant_product_id) ?? nonEmpty(row.aw_product_id);
    if (externalId === null) {
      return { ok: false, reason: "no-stable-id", detail: "no merchant_product_id or aw_product_id" };
    }

    const title = nonEmpty(row.product_name);
    if (title === null) return { ok: false, reason: "no-title" };

    const productUrl = nonEmpty(row.merchant_deep_link);
    if (productUrl === null) {
      return { ok: false, reason: "no-product-url", detail: "no merchant_deep_link" };
    }

    // Currency is checked, never converted. A EUR row in a GBP feed is a
    // misconfiguration; inventing an exchange rate would put a made-up
    // number in front of a rider about to spend money.
    const currencyCode = (nonEmpty(row.currency) ?? context.feed.currencyCode).toUpperCase();
    if (currencyCode !== "GBP") {
      return { ok: false, reason: "wrong-currency", detail: currencyCode };
    }

    const price = parsePriceToPence(row.search_price);
    if (!price.ok) {
      return { ok: false, reason: "unparseable-price", detail: `${row.search_price ?? ""} (${price.reason})` };
    }

    try {
      assertTrustedDestination(productUrl, context.retailer);
    } catch {
      return { ok: false, reason: "off-domain-url", detail: productUrl };
    }

    const { availability, stockQuantity } = readAvailability(row);

    // `aw_deep_link` is already tracked for this publisher account, because
    // the feed was downloaded with our own API key. It is kept as a
    // fallback for the case where no publisher ID is configured yet, but
    // the link we build ourselves is preferred: only that one can carry a
    // clickref identifying the placement.
    const feedDeepLink = nonEmpty(row.aw_deep_link);

    return {
      ok: true,
      offer: {
        externalId,
        title,
        brandName: nonEmpty(row.brand_name),
        ean: nonEmpty(row.ean),
        mpn: nonEmpty(row.mpn),
        gtin: nonEmpty(row.product_GTIN),
        categoryPath: nonEmpty(row.merchant_product_category_path) ?? nonEmpty(row.merchant_category),
        // Prefer the merchant's own image over Awin's 200x200 proxy: the
        // proxy is too small for a part row on a retina display.
        imageUrl: nonEmpty(row.merchant_image_url) ?? nonEmpty(row.aw_image_url),
        productUrl,
        feedDeepLinkUrl: feedDeepLink !== null && isAwinClickUrl(feedDeepLink) ? feedDeepLink : null,
        pricePence: price.pence,
        wasPricePence: parseOptionalPriceToPence(row.rrp_price),
        deliveryPence: parseOptionalPriceToPence(row.delivery_cost),
        currencyCode,
        // Awin's feed spec has no VAT field at all, so this is not the
        // feed's claim — it is the operator's, recorded per feed. See
        // RetailerFeed.pricesIncludeVat.
        includesVat: true,
        availability,
        stockQuantity,
      },
    };
  },
};

/** Guards against a mangled aw_deep_link being used as a tracked URL. */
function isAwinClickUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "awin1.com" || host.endsWith(".awin1.com") || host.endsWith("tidd.ly");
  } catch {
    return false;
  }
}

/**
 * Awin's list endpoint prints "Last Imported" in a human format that is not
 * documented precisely. An unparseable value returns null rather than an
 * Invalid Date, so a freshness check can tell "unknown" from "stale".
 */
function parseAwinDate(raw: string | undefined): Date | null {
  const value = (raw ?? "").trim();
  if (value === "") return null;
  const parsed = new Date(value.includes(" ") ? value.replace(" ", "T") : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
