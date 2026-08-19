// lib/affiliate/affiliate.test.ts
//
//   npx tsx --test lib/affiliate/affiliate.test.ts
//
// Covers the parts that are pure and load-bearing: the money parser, the
// Awin link format, the stock reading, identifier matching, and the build
// checkout's honesty about what it can't price. Nothing here touches a
// database or the network.

import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCsvRecords } from "./csv";
import { formatPence, parsePriceToPence, sumPence } from "./money";
import { buildCheckout, selectBestOffer, type OfferRecord } from "./offers";
import { buildIdentifierIndex, canonicaliseIdentifier, matchOffer } from "./matching";
import { awinAdapter, readAvailability, sanitiseClickRef } from "./networks/awin";
import { toDisclosedLink } from "./disclosure";
import { UntrustedDestinationError, type NormalisedOffer, type RetailerConfig } from "./types";

const RETAILER: RetailerConfig = {
  slug: "test-shop",
  displayName: "Test Shop",
  advertiserId: "1234",
  siteUrl: "https://www.example-shop.co.uk",
  linkDomains: ["example-shop.co.uk"],
};

const CREDENTIALS = { networkKey: "awin", values: { AWIN_PUBLISHER_ID: "999999" } };

// ---------------------------------------------------------------- money

test("prices parse to exact pence without float drift", () => {
  assert.deepEqual(parsePriceToPence("19.99"), { ok: true, pence: 1999 });
  assert.deepEqual(parsePriceToPence("£1,234.50"), { ok: true, pence: 123450 });
  assert.deepEqual(parsePriceToPence("1234.56 GBP"), { ok: true, pence: 123456 });
  assert.deepEqual(parsePriceToPence("12.5"), { ok: true, pence: 1250 });
  assert.deepEqual(parsePriceToPence("340"), { ok: true, pence: 34000 });
});

test("ambiguous or impossible prices are refused, not rounded", () => {
  for (const bad of ["", "0.00", "-5.00", "12.345", "call for price", "N/A"]) {
    assert.equal(parsePriceToPence(bad).ok, false, `expected refusal for ${JSON.stringify(bad)}`);
  }
});

test("totals report what they could not price", () => {
  assert.deepEqual(sumPence([1000, null, 2500, null]), { total: 3500, missing: 2 });
  assert.equal(formatPence(123450), "£1,234.50");
  assert.equal(formatPence(5), "£0.05");
});

// ------------------------------------------------------------ awin links

test("Awin deep links use the documented cread.php format with single-encoded ued", () => {
  const link = awinAdapter.buildTrackedLink({
    retailer: RETAILER,
    destinationUrl: "https://www.example-shop.co.uk/products/thing?size=54",
    credentials: CREDENTIALS,
    clickRef: "part-row",
  });

  const url = new URL(link.url);
  assert.equal(url.origin + url.pathname, "https://www.awin1.com/cread.php");
  assert.equal(url.searchParams.get("awinmid"), "1234");
  assert.equal(url.searchParams.get("awinaffid"), "999999");
  assert.equal(url.searchParams.get("clickref"), "part-row");
  // Single encoding: reading the param back gives the plain URL.
  assert.equal(
    url.searchParams.get("ued"),
    "https://www.example-shop.co.uk/products/thing?size=54",
  );
  // References precede the destination, per Awin's guidance.
  assert.ok(link.url.indexOf("clickref=") < link.url.indexOf("ued="));
});

test("a destination off the retailer's domains is refused, not tracked", () => {
  assert.throws(
    () =>
      awinAdapter.buildTrackedLink({
        retailer: RETAILER,
        destinationUrl: "https://evil.example.net/phish",
        credentials: CREDENTIALS,
      }),
    UntrustedDestinationError,
  );
});

test("click references are sanitised to Awin's allowed characters", () => {
  assert.equal(sanitiseClickRef("Build#Checkout&now+please"), "buildcheckoutnowplease");
  assert.equal(sanitiseClickRef("part row"), "part-row");
  assert.equal(sanitiseClickRef("x".repeat(80)).length, 50);
});

// ------------------------------------------------------------ feed rows

test("stock is only claimed when the feed actually says so", () => {
  assert.equal(readAvailability({ in_stock: "1" }).availability, "IN_STOCK");
  assert.equal(readAvailability({ in_stock: "0" }).availability, "OUT_OF_STOCK");
  // Awin's spec says unrecognised text means in stock. We abstain instead.
  assert.equal(readAvailability({ in_stock: "ask us" }).availability, "UNKNOWN");
  assert.equal(readAvailability({}).availability, "UNKNOWN");
  assert.equal(readAvailability({ stock_quantity: "0" }).availability, "OUT_OF_STOCK");
  assert.equal(readAvailability({ in_stock: "1", stock_quantity: "7" }).stockQuantity, 7);
});

test("normalising a feed row keeps price, stock and identifiers and nothing else", () => {
  const result = awinAdapter.normaliseRow(
    {
      merchant_product_id: "SKU-1",
      product_name: "Shimano 105 R7100 Rear Derailleur",
      brand_name: "Shimano",
      ean: "4550170532888",
      mpn: "RD-R7100-SS",
      merchant_deep_link: "https://www.example-shop.co.uk/p/1",
      search_price: "84.99",
      currency: "GBP",
      in_stock: "1",
      // Fields we deliberately do not request or read:
      specifications: "148mm Boost spacing",
      description: "The best derailleur ever made",
    },
    { retailer: RETAILER, feed: { externalFeedId: "1", language: "en", currencyCode: "GBP", scope: "UNKNOWN" } },
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.offer.pricePence, 8499);
  assert.equal(result.offer.ean, "4550170532888");
  assert.equal(result.offer.availability, "IN_STOCK");
  // No spec fields survive normalisation at all.
  assert.equal("specifications" in result.offer, false);
  assert.equal("description" in result.offer, false);
});

test("rows in the wrong currency are rejected rather than converted", () => {
  const result = awinAdapter.normaliseRow(
    {
      merchant_product_id: "SKU-2",
      product_name: "Thing",
      merchant_deep_link: "https://www.example-shop.co.uk/p/2",
      search_price: "84.99",
      currency: "EUR",
    },
    { retailer: RETAILER, feed: { externalFeedId: "1", language: "en", currencyCode: "GBP", scope: "UNKNOWN" } },
  );
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "wrong-currency");
});

test("CSV parsing survives quoted delimiters and embedded newlines", () => {
  const { columns, records } = parseCsvRecords(
    'a,b,c\n1,"has, comma","line\nbreak"\n2,"say ""hi""",x\n',
  );
  assert.deepEqual(columns, ["a", "b", "c"]);
  assert.equal(records.length, 2);
  assert.equal(records[0].b, "has, comma");
  assert.equal(records[0].c, "line\nbreak");
  assert.equal(records[1].b, 'say "hi"');
});

// ------------------------------------------------------------- matching

test("GTIN forms of the same barcode canonicalise together", () => {
  assert.equal(canonicaliseIdentifier("EAN", "4550170532888"), "004550170532888".slice(1));
  assert.equal(canonicaliseIdentifier("GTIN", "04550170532888"), canonicaliseIdentifier("EAN", "4550170532888"));
  assert.equal(canonicaliseIdentifier("MPN", "rd-r7100 ss"), "RDR7100SS");
  assert.equal(canonicaliseIdentifier("EAN", "0000000000000"), null);
  assert.equal(canonicaliseIdentifier("MPN", "N/A"), null);
});

const offerWith = (fields: Partial<NormalisedOffer>): NormalisedOffer => ({
  externalId: "SKU-1",
  title: "Thing",
  brandName: null,
  ean: null,
  mpn: null,
  gtin: null,
  categoryPath: null,
  imageUrl: null,
  productUrl: "https://www.example-shop.co.uk/p/1",
  feedDeepLinkUrl: null,
  pricePence: 1000,
  wasPricePence: null,
  deliveryPence: null,
  currencyCode: "GBP",
  includesVat: true,
  availability: "IN_STOCK",
  stockQuantity: null,
  ...fields,
});

test("an offer matches on a manufacturer identifier and abstains without one", () => {
  const index = buildIdentifierIndex([
    { kind: "EAN", value: "4550170532888", retailerId: null, partId: "part-1", bikeModelId: null },
  ]);

  const matched = matchOffer(offerWith({ ean: "4550170532888" }), index, "retailer-1");
  assert.equal(matched.method, "EAN");
  assert.equal(matched.partId, "part-1");

  const unmatched = matchOffer(offerWith({ title: "Shimano 105 Rear Derailleur" }), index, "retailer-1");
  assert.equal(unmatched.method, "NONE");
  assert.equal(unmatched.partId, null);
});

test("a barcode claimed by two catalogue rows matches neither", () => {
  const index = buildIdentifierIndex([
    { kind: "EAN", value: "4550170532888", retailerId: null, partId: "part-1", bikeModelId: null },
    { kind: "EAN", value: "4550170532888", retailerId: null, partId: "part-2", bikeModelId: null },
  ]);
  const result = matchOffer(offerWith({ ean: "4550170532888" }), index, "retailer-1");
  assert.equal(result.method, "NONE");
  assert.match(result.notes, /Ambiguous/);
});

// ------------------------------------------------------------- checkout

const NOW = new Date("2026-08-19T12:00:00Z");

const offerRecord = (over: Partial<OfferRecord> = {}): OfferRecord => ({
  id: "offer-1",
  retailerSlug: "test-shop",
  retailerName: "Test Shop",
  networkKey: "awin",
  partId: "part-1",
  bikeModelId: null,
  title: "Thing",
  imageUrl: null,
  pricePence: 5000,
  wasPricePence: null,
  deliveryPence: null,
  availability: "IN_STOCK",
  productUrl: "https://www.example-shop.co.uk/p/1",
  deepLinkUrl: "https://www.awin1.com/cread.php?awinmid=1234&awinaffid=999999&ued=x",
  lastSeenAt: NOW,
  ...over,
});

const linkBuilder = (offer: OfferRecord) =>
  offer.deepLinkUrl ? toDisclosedLink(offer.deepLinkUrl, offer.retailerName) : null;

test("the cheapest in-stock offer wins, and every link carries its disclosure", () => {
  const best = selectBestOffer(
    [
      offerRecord({ id: "a", pricePence: 6000 }),
      offerRecord({ id: "b", pricePence: 4500, retailerSlug: "other", retailerName: "Other Shop" }),
    ],
    linkBuilder,
    { now: NOW },
  );
  assert.equal(best?.offer.id, "b");
  assert.equal(best?.priceLabel, "£45.00");
  assert.match(best?.link?.disclosure ?? "", /Other Shop/);
  assert.equal(best?.link?.rel, "sponsored nofollow noopener");
});

test("an offer with no tracked link is shown without a buy button, not linked untracked", () => {
  const best = selectBestOffer([offerRecord({ deepLinkUrl: null })], linkBuilder, { now: NOW });
  assert.equal(best?.link, null);
  assert.equal(best?.offer.productUrl, "https://www.example-shop.co.uk/p/1");
});

test("stale offers are withheld entirely", () => {
  const old = new Date(NOW.getTime() - 40 * 24 * 3600 * 1000);
  assert.equal(selectBestOffer([offerRecord({ lastSeenAt: old })], linkBuilder, { now: NOW }), null);
});

test("the build total never quietly omits the parts it cannot price", () => {
  const checkout = buildCheckout(
    [
      {
        partId: "part-1",
        partName: "Rear Derailleur",
        partBrand: "Shimano",
        slot: null,
        quantity: 1,
        basePricePence: 9999,
        offers: [offerRecord({ pricePence: 8000 })],
      },
      {
        partId: "part-2",
        partName: "Frameset",
        partBrand: "Ribble",
        slot: null,
        quantity: 1,
        basePricePence: 150000,
        offers: [],
      },
      {
        partId: "part-3",
        partName: "Tyre",
        partBrand: "Continental",
        slot: "front",
        quantity: 2,
        basePricePence: null,
        offers: [offerRecord({ id: "t", partId: "part-3", pricePence: 4000 })],
      },
    ],
    linkBuilder,
    { now: NOW },
  );

  assert.equal(checkout.baskets.length, 1);
  assert.equal(checkout.baskets[0].lines.length, 2);
  // 80.00 + (2 x 40.00)
  assert.equal(checkout.totalPence, 16000);
  assert.equal(checkout.missingCount, 1);
  assert.equal(checkout.unbuyable[0].partId, "part-2");
  assert.equal(checkout.unbuyable[0].reason, "no-offer");
  assert.match(checkout.neutralityStatement, /never influences compatibility/i);
});

test("a build whose parts are all unpriced still returns a coherent, honest result", () => {
  const checkout = buildCheckout(
    [
      {
        partId: "part-1",
        partName: "Frameset",
        partBrand: "Ribble",
        slot: null,
        quantity: 1,
        basePricePence: null,
        offers: [],
      },
    ],
    linkBuilder,
    { now: NOW },
  );
  // This is the bikes-only-feed world: no component offers exist at all.
  assert.equal(checkout.baskets.length, 0);
  assert.equal(checkout.totalPence, 0);
  assert.equal(checkout.missingCount, 1);
});
