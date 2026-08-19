// lib/affiliate/ingest.ts
//
// Pull a feed, normalise it, upsert offers. Network-agnostic: everything
// specific to Awin lives behind the adapter.
//
// Idempotent by construction. Every offer is keyed on
// (retailerId, externalId), so a re-run updates rows rather than
// duplicating them, and a run that dies halfway can simply be run again.
//
// What this deliberately does NOT do:
//   * It never writes a spec field on Part. The only catalogue column it
//     can touch is Part.imageUrl, and only where the part has none.
//   * It never creates a Part. A feed row we cannot match stays unmatched;
//     inventing a catalogue entry from retailer marketing copy is the
//     fabrication this project exists not to do.
//   * It never converts a currency or invents a price.

import { buildIdentifierIndex, matchOffer, type IdentifierKind, type IdentifierRow } from "./matching";
import { getAdapter } from "./registry";
import { AffiliateConfigError, type AffiliateNetworkAdapter, type FeedConfig, type NormalisedOffer, type OfferAvailability, type RetailerConfig, type RowRejectionReason } from "./types";
import type { PrismaClient } from "../generated/prisma/client";
import type { OfferAvailability as PrismaOfferAvailability } from "../generated/prisma/enums";

/**
 * Proof that the local union in types.ts still lines up with the Prisma
 * enum. A total Record: if either side gains or loses a value, this stops
 * compiling, which is the point.
 */
const AVAILABILITY_TO_PRISMA: Record<OfferAvailability, PrismaOfferAvailability> = {
  IN_STOCK: "IN_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  PRE_ORDER: "PRE_ORDER",
  BACK_ORDER: "BACK_ORDER",
  DISCONTINUED: "DISCONTINUED",
  UNKNOWN: "UNKNOWN",
};

export interface IngestReport {
  readonly retailerSlug: string;
  readonly feedExternalId: string;
  readonly status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED_NO_CREDENTIALS";
  readonly rowsRead: number;
  readonly rowsSkipped: number;
  readonly offersUpserted: number;
  readonly offersMatched: number;
  readonly offersUnmatched: number;
  readonly pricesRecorded: number;
  readonly imagesFilled: number;
  /** Rejection reason to count, so a bad feed shows its shape at a glance. */
  readonly rejections: Readonly<Record<string, number>>;
  readonly message: string;
  readonly dryRun: boolean;
}

export interface IngestOptions {
  /** Only ingest this retailer. Omit to do every enabled one. */
  readonly retailerSlug?: string;
  /** Only this feed (RetailerFeed.externalFeedId). */
  readonly feedExternalId?: string;
  /** Parse and report, write nothing. */
  readonly dryRun?: boolean;
  /** Stop after N rows. For a smoke test against a live feed. */
  readonly limit?: number;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly now?: Date;
  readonly signal?: AbortSignal;
  readonly log?: (message: string) => void;
}

type OfferRow = {
  id: string;
  externalId: string;
  pricePence: number;
  availability: PrismaOfferAvailability;
  partId: string | null;
};

/**
 * Ingest every enabled feed matching the options.
 *
 * Returns one report per feed. A failure on one feed does not abort the
 * others: one retailer's outage should not stop another's prices updating.
 */
export async function ingestFeeds(prisma: PrismaClient, options: IngestOptions = {}): Promise<IngestReport[]> {
  const log = options.log ?? (() => {});
  const env = options.env ?? (typeof process !== "undefined" ? process.env : {});

  const retailers = await prisma.retailer.findMany({
    where: {
      enabled: true,
      ...(options.retailerSlug ? { slug: options.retailerSlug } : {}),
    },
    include: { network: true, feeds: true },
  });

  if (retailers.length === 0) {
    throw new AffiliateConfigError(
      options.retailerSlug
        ? `No enabled retailer with slug "${options.retailerSlug}". Seed one first — see scripts/affiliate/seed-affiliate-config.ts.`
        : "No enabled retailers are configured, so there is nothing to ingest.",
    );
  }

  const reports: IngestReport[] = [];

  for (const retailer of retailers) {
    if (!retailer.network.enabled) {
      log(`[skip] ${retailer.slug}: network "${retailer.network.key}" is disabled`);
      continue;
    }

    const adapter = getAdapter(retailer.network.adapterKey);
    const status = adapter.credentialStatus(env);

    const feeds = retailer.feeds.filter(
      (feed) =>
        feed.enabled &&
        (options.feedExternalId === undefined || feed.externalFeedId === options.feedExternalId),
    );

    if (feeds.length === 0) {
      log(`[skip] ${retailer.slug}: no enabled feeds configured`);
      continue;
    }

    for (const feed of feeds) {
      if (!status.ready) {
        // Expected state until Awin issue credentials. Recorded as its own
        // status rather than a failure, so a dashboard can tell "not set up
        // yet" from "broken".
        const message =
          `Credentials missing for network "${retailer.network.key}": ${status.missing.join(", ")}. ` +
          `Nothing was fetched.`;
        if (!options.dryRun) {
          await prisma.feedSyncRun.create({
            data: {
              retailerId: retailer.id,
              feedId: feed.id,
              status: "SKIPPED_NO_CREDENTIALS",
              finishedAt: new Date(),
              message,
            },
          });
        }
        reports.push(emptyReport(retailer.slug, feed.externalFeedId, "SKIPPED_NO_CREDENTIALS", message, options.dryRun ?? false));
        continue;
      }

      reports.push(
        await ingestOneFeed(prisma, {
          adapter,
          retailer: {
            id: retailer.id,
            vendorId: retailer.vendorId,
            config: {
              slug: retailer.slug,
              displayName: retailer.displayName,
              advertiserId: retailer.advertiserId,
              siteUrl: retailer.siteUrl,
              linkDomains: retailer.linkDomains,
            },
          },
          feed: {
            id: feed.id,
            config: {
              externalFeedId: feed.externalFeedId,
              label: feed.label,
              language: feed.language,
              currencyCode: feed.currency,
              scope: feed.scope,
            },
            pricesIncludeVat: feed.pricesIncludeVat,
          },
          options,
          env,
        }),
      );
    }
  }

  return reports;
}

function emptyReport(
  retailerSlug: string,
  feedExternalId: string,
  status: IngestReport["status"],
  message: string,
  dryRun: boolean,
): IngestReport {
  return {
    retailerSlug,
    feedExternalId,
    status,
    rowsRead: 0,
    rowsSkipped: 0,
    offersUpserted: 0,
    offersMatched: 0,
    offersUnmatched: 0,
    pricesRecorded: 0,
    imagesFilled: 0,
    rejections: {},
    message,
    dryRun,
  };
}

interface OneFeedInput {
  adapter: AffiliateNetworkAdapter;
  retailer: { id: string; vendorId: string | null; config: RetailerConfig };
  feed: { id: string; config: FeedConfig; pricesIncludeVat: boolean };
  options: IngestOptions;
  env: Readonly<Record<string, string | undefined>>;
}

async function ingestOneFeed(prisma: PrismaClient, input: OneFeedInput): Promise<IngestReport> {
  const { adapter, retailer, feed, options } = input;
  const log = options.log ?? (() => {});
  const dryRun = options.dryRun ?? false;
  const now = options.now ?? new Date();

  const credentials = adapter.readCredentials(input.env);

  // The run row is created up front, so a process that dies mid-feed leaves
  // a FAILED row rather than no evidence at all. It is updated at the end.
  const run = dryRun
    ? null
    : await prisma.feedSyncRun.create({
        data: {
          retailerId: retailer.id,
          feedId: feed.id,
          status: "FAILED",
          message: "In progress. A run left in this state died before finishing.",
        },
      });

  const rejections: Record<string, number> = {};
  let rowsRead = 0;
  let rowsSkipped = 0;
  let offersUpserted = 0;
  let offersMatched = 0;
  let offersUnmatched = 0;
  let pricesRecorded = 0;
  let imagesFilled = 0;

  const reject = (reason: RowRejectionReason) => {
    rejections[reason] = (rejections[reason] ?? 0) + 1;
    rowsSkipped += 1;
  };

  try {
    // One query for the whole match index rather than a lookup per row.
    const identifierRows = await prisma.productIdentifier.findMany({
      where: { OR: [{ retailerId: null }, { retailerId: retailer.id }] },
      select: { kind: true, value: true, retailerId: true, partId: true, bikeModelId: true },
    });
    const index = buildIdentifierIndex(
      identifierRows.map(
        (row): IdentifierRow => ({
          kind: row.kind as IdentifierKind,
          value: row.value,
          retailerId: row.retailerId,
          partId: row.partId,
          bikeModelId: row.bikeModelId,
        }),
      ),
    );

    // Existing offers, so a price change can be detected without a query
    // per row. This is what keeps the append-only Price table meaningful:
    // only genuine movements are recorded.
    const existingOffers = new Map<string, OfferRow>(
      (
        await prisma.retailerOffer.findMany({
          where: { retailerId: retailer.id },
          select: { id: true, externalId: true, pricePence: true, availability: true, partId: true },
        })
      ).map((offer) => [offer.externalId, offer]),
    );

    const result = await adapter.fetchFeed({
      retailer: retailer.config,
      feed: feed.config,
      credentials,
      limit: options.limit,
      signal: options.signal,
    });

    log(`[${retailer.config.slug}] fetched ${result.sourceDescription}`);

    for await (const row of result.rows) {
      rowsRead += 1;

      const normalised = adapter.normaliseRow(row, { retailer: retailer.config, feed: feed.config });
      if (!normalised.ok) {
        reject(normalised.reason);
        continue;
      }

      const offer: NormalisedOffer = {
        ...normalised.offer,
        // The feed cannot tell us this; the operator does, per feed.
        includesVat: feed.pricesIncludeVat,
      };

      const match = matchOffer(offer, index, retailer.id);
      if (match.method === "NONE") offersUnmatched += 1;
      else offersMatched += 1;

      // Built here rather than at render time so an offer is usable even if
      // link building later fails; queries.ts rebuilds it with a
      // placement-specific clickref when it renders.
      let deepLinkUrl: string | null = offer.feedDeepLinkUrl;
      try {
        deepLinkUrl = adapter.buildTrackedLink({
          retailer: retailer.config,
          destinationUrl: offer.productUrl,
          credentials,
        }).url;
      } catch {
        // Off-domain or malformed. The feed's own tracked link stands in if
        // there was one; otherwise the offer is stored without a link and
        // the UI shows the price without a buy button.
      }

      if (dryRun) {
        offersUpserted += 1;
        continue;
      }

      const existing = existingOffers.get(offer.externalId);
      const priceMoved = existing !== undefined && existing.pricePence !== offer.pricePence;

      const data = {
        feedId: feed.id,
        title: offer.title,
        brandName: offer.brandName,
        ean: offer.ean,
        mpn: offer.mpn,
        gtin: offer.gtin,
        categoryPath: offer.categoryPath,
        imageUrl: offer.imageUrl,
        productUrl: offer.productUrl,
        deepLinkUrl,
        pricePence: offer.pricePence,
        wasPricePence: offer.wasPricePence,
        deliveryPence: offer.deliveryPence,
        includesVat: offer.includesVat,
        availability: AVAILABILITY_TO_PRISMA[offer.availability],
        stockQuantity: offer.stockQuantity,
        partId: match.partId,
        bikeModelId: match.bikeModelId,
        matchMethod: match.method,
        matchedAt: match.method === "NONE" ? null : now,
        matchNotes: match.notes,
        lastSeenAt: now,
      };

      await prisma.retailerOffer.upsert({
        where: { retailerId_externalId: { retailerId: retailer.id, externalId: offer.externalId } },
        create: {
          retailerId: retailer.id,
          externalId: offer.externalId,
          firstSeenAt: now,
          ...data,
        },
        update: {
          ...data,
          ...(priceMoved ? { priceChangedAt: now } : {}),
        },
      });
      offersUpserted += 1;

      // ---- Price history ----
      // Only for matched offers with a Vendor behind the retailer: Price
      // requires both a partId and a vendorId. Appended only when something
      // actually changed, so the history stays a record of movements rather
      // than a daily transcript.
      if (
        match.partId !== null &&
        retailer.vendorId !== null &&
        (existing === undefined ||
          existing.pricePence !== offer.pricePence ||
          existing.availability !== AVAILABILITY_TO_PRISMA[offer.availability])
      ) {
        await prisma.price.create({
          data: {
            partId: match.partId,
            vendorId: retailer.vendorId,
            pricePence: offer.pricePence,
            includesVat: offer.includesVat,
            inStock: offer.availability === "IN_STOCK",
            productUrl: deepLinkUrl ?? offer.productUrl,
            recordedAt: now,
          },
        });
        pricesRecorded += 1;
      }

      // ---- Imagery ----
      // The one catalogue column a feed may fill, and only where it is
      // empty. Expressed as a conditional updateMany so the "only if
      // absent" check happens in the database and cannot race another
      // writer. dataSource is untouched: a photograph says nothing about a
      // part's specifications.
      if (match.partId !== null && offer.imageUrl !== null) {
        const updated = await prisma.part.updateMany({
          where: { id: match.partId, OR: [{ imageUrl: null }, { imageUrl: "" }] },
          data: { imageUrl: offer.imageUrl },
        });
        imagesFilled += updated.count;
      }
    }

    const status: IngestReport["status"] = rowsSkipped > 0 ? "PARTIAL" : "SUCCESS";
    const message =
      `Read ${rowsRead} rows, upserted ${offersUpserted} offers ` +
      `(${offersMatched} matched, ${offersUnmatched} unmatched), skipped ${rowsSkipped}. ` +
      (Object.keys(rejections).length > 0 ? `Rejections: ${describeCounts(rejections)}.` : "");

    if (run) {
      await prisma.feedSyncRun.update({
        where: { id: run.id },
        data: {
          status,
          finishedAt: new Date(),
          rowsRead,
          rowsSkipped,
          offersUpserted,
          offersMatched,
          offersUnmatched,
          pricesRecorded,
          message,
        },
      });
      await prisma.retailerFeed.update({
        where: { id: feed.id },
        data: { lastSyncedAt: now, lastRowCount: rowsRead },
      });
    }

    return {
      retailerSlug: retailer.config.slug,
      feedExternalId: feed.config.externalFeedId,
      status,
      rowsRead,
      rowsSkipped,
      offersUpserted,
      offersMatched,
      offersUnmatched,
      pricesRecorded,
      imagesFilled,
      rejections,
      message,
      dryRun,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (run) {
      await prisma.feedSyncRun.update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt: new Date(), rowsRead, rowsSkipped, message },
      });
    }
    return {
      ...emptyReport(retailer.config.slug, feed.config.externalFeedId, "FAILED", message, dryRun),
      rowsRead,
      rowsSkipped,
      rejections,
    };
  }
}

function describeCounts(counts: Readonly<Record<string, number>>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${reason} ${count}`)
    .join(", ");
}
