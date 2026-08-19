// scripts/affiliate/ingest-feed.ts
//
// Pull affiliate product feeds, normalise them, upsert offers.
//
//   npx tsx scripts/affiliate/ingest-feed.ts --check
//   npx tsx scripts/affiliate/ingest-feed.ts --retailer ribble-cycles --dry-run --limit 200
//   npx tsx scripts/affiliate/ingest-feed.ts --retailer ribble-cycles
//   npx tsx scripts/affiliate/ingest-feed.ts --list-feeds --network awin
//
// Safe to run before any credentials exist. That is not incidental: this
// script will be scheduled long before Awin issue anything, and a cron job
// that dies with a stack trace every night is a cron job everyone learns to
// ignore. With credentials missing it prints what to set and exits 0.
//
// Idempotent. Offers are keyed on (retailer, merchant product id), so
// running it twice changes nothing the second time.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma-node/client";
import type { PrismaClient as AffiliatePrismaClient } from "../../lib/generated/prisma/client";
import { describeMissingCredentials } from "../../lib/affiliate/credentials";
import { ingestFeeds, type IngestReport } from "../../lib/affiliate/ingest";
import { getAdapter, listAdapters } from "../../lib/affiliate/registry";
import { AffiliateConfigError } from "../../lib/affiliate/types";

interface Args {
  retailer?: string;
  feed?: string;
  network?: string;
  limit?: number;
  dryRun: boolean;
  check: boolean;
  listFeeds: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { dryRun: false, check: false, listFeeds: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case "--retailer":
        args.retailer = next();
        break;
      case "--feed":
        args.feed = next();
        break;
      case "--network":
        args.network = next();
        break;
      case "--limit":
        args.limit = Number(next());
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--check":
        args.check = true;
        break;
      case "--list-feeds":
        args.listFeeds = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printUsage();
        process.exit(2);
    }
  }
  return args;
}

function printUsage(): void {
  console.log(
    [
      "Usage: npx tsx scripts/affiliate/ingest-feed.ts [options]",
      "",
      "  --check              Report credential readiness and exit. Touches no database.",
      "  --list-feeds         Ask the network which feeds this publisher can access.",
      "  --network <key>      Adapter key, for --list-feeds. Default: every registered adapter.",
      "  --retailer <slug>    Only this retailer. Default: every enabled retailer.",
      "  --feed <id>          Only this feed id.",
      "  --dry-run            Fetch and parse, write nothing.",
      "  --limit <n>          Stop after n rows. Useful with --dry-run.",
    ].join("\n"),
  );
}

/**
 * Credential readiness for every registered network.
 *
 * Reads names, never values, and prints only names. Exit code 0 either way:
 * "not configured yet" is a state, not a failure.
 */
function reportReadiness(): boolean {
  let allReady = true;
  console.log("Affiliate credential check\n");

  for (const adapter of listAdapters()) {
    const status = adapter.credentialStatus(process.env);
    console.log(`  ${adapter.displayName} (${adapter.key})`);
    console.log(`    required: ${adapter.requiredEnvVars.join(", ")}`);
    if (adapter.optionalEnvVars.length > 0) {
      console.log(`    optional: ${adapter.optionalEnvVars.join(", ")}`);
    }
    console.log(`    status:   ${status.ready ? "ready" : `missing ${status.missing.join(", ")}`}\n`);
    if (!status.ready) allReady = false;
  }

  if (!allReady) {
    console.log("Nothing can be ingested until the missing variables are set.");
    console.log("Set them in .env for scripts, and with `wrangler secret put NAME` for the Worker.\n");
  }
  return allReady;
}

async function listFeeds(networkKey?: string): Promise<void> {
  const adapters = networkKey ? [getAdapter(networkKey)] : listAdapters();

  for (const adapter of adapters) {
    const status = adapter.credentialStatus(process.env);
    if (!status.ready) {
      console.log(describeMissingCredentials(adapter.key, status.missing));
      continue;
    }
    if (!adapter.listFeeds) {
      console.log(`${adapter.displayName} has no feed-list endpoint.`);
      continue;
    }

    const feeds = await adapter.listFeeds(adapter.readCredentials(process.env));
    console.log(`\n${adapter.displayName}: ${feeds.length} feed(s) available\n`);
    for (const feed of feeds) {
      console.log(
        `  fid=${feed.externalFeedId}  advertiser=${feed.advertiserId} ${feed.advertiserName}` +
          `  lang=${feed.language ?? "?"}  lastImported=${feed.lastImported?.toISOString() ?? "unknown"}`,
      );
      if (feed.label) console.log(`      ${feed.label}`);
    }
    // Worth stating plainly, because it is the open question this whole
    // phase is blocked on: the list says nothing about what is *in* a feed.
    console.log(
      "\n  The list does not say whether a feed holds components or complete bikes.",
    );
    console.log(
      "  Run with --dry-run --limit 200 and read the sampled categories, then set",
    );
    console.log("  RetailerFeed.scope accordingly.\n");
  }
}

function printReport(report: IngestReport): void {
  const prefix = report.dryRun ? "[dry-run] " : "";
  console.log(
    `${prefix}${report.retailerSlug} / feed ${report.feedExternalId}: ${report.status}\n` +
      `    rows read       ${report.rowsRead}\n` +
      `    offers upserted ${report.offersUpserted}\n` +
      `    matched         ${report.offersMatched}\n` +
      `    unmatched       ${report.offersUnmatched}\n` +
      `    rows skipped    ${report.rowsSkipped}\n` +
      `    prices recorded ${report.pricesRecorded}\n` +
      `    images filled   ${report.imagesFilled}`,
  );
  const rejections = Object.entries(report.rejections);
  if (rejections.length > 0) {
    console.log(`    rejections      ${rejections.map(([r, n]) => `${r}=${n}`).join(", ")}`);
  }
  if (report.message) console.log(`    ${report.message}`);
  console.log("");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.check) {
    reportReadiness();
    return;
  }

  if (args.listFeeds) {
    await listFeeds(args.network);
    return;
  }

  // Check credentials before touching the database, so the "not set up yet"
  // path never needs a connection at all.
  const unreadyAdapters = listAdapters().filter((a) => !a.credentialStatus(process.env).ready);
  if (unreadyAdapters.length === listAdapters().length) {
    for (const adapter of unreadyAdapters) {
      console.log(describeMissingCredentials(adapter.key, adapter.credentialStatus(process.env).missing));
      console.log("");
    }
    console.log("Nothing to do. Exiting cleanly — this is expected before credentials are issued.");
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "DATABASE_URL is not set. Scripts use the direct (non-pooled) Neon URL from .env — see prisma.config.ts.",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const reports = await ingestFeeds(
      // The node-targeted and workerd-targeted clients are generated from
      // one schema and have identical shapes, but they are separate
      // declarations, so TypeScript treats them as unrelated types. The
      // library is written against the workerd client (it is the one the
      // app uses); this is the single documented cast at the boundary,
      // rather than duplicating every signature for both.
      prisma as unknown as AffiliatePrismaClient,
      {
        retailerSlug: args.retailer,
        feedExternalId: args.feed,
        dryRun: args.dryRun,
        limit: args.limit,
        log: (message) => console.log(message),
      },
    );

    if (reports.length === 0) {
      console.log("No enabled retailer/feed matched. Nothing ingested.");
      return;
    }

    console.log("");
    for (const report of reports) printReport(report);

    if (reports.some((report) => report.status === "FAILED")) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  // A configuration problem is a message, not a stack trace: it is
  // something a human has to go and fix, and the trace tells them nothing.
  if (error instanceof AffiliateConfigError) {
    console.error(error.message);
    process.exit(1);
  }
  console.error(error);
  process.exit(1);
});
