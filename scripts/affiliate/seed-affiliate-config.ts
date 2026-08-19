// scripts/affiliate/seed-affiliate-config.ts
//
// Register a network, a retailer and a feed. This is the "adding a retailer
// is configuration, not code" path made concrete: nothing below is
// Awin-specific except the default adapter key, and adding a second network
// means passing --network-key / --adapter-key.
//
//   npx tsx scripts/affiliate/seed-affiliate-config.ts \
//     --retailer-slug ribble-cycles \
//     --retailer-name "Ribble Cycles" \
//     --advertiser-id <awin advertiser id> \
//     --site-url https://www.ribble.co.uk \
//     --link-domains ribble.co.uk,ribblecycles.co.uk \
//     --feed-id <awin fid> \
//     --vendor RIBBLE_CYCLES
//
// Idempotent: every write is an upsert keyed on a natural key, so re-running
// with changed values updates rather than duplicates.
//
// On the advertiser id: Awin's public merchant profile page for Ribble
// Cycles UK (https://ui.awin.com/merchant-profile/5923) shows 5923, and the
// US/CA/DE programmes are separate ids. That is research, not confirmation
// — it is deliberately NOT defaulted here. Take the value from your own
// Awin dashboard, where you can also see that the programme is the one you
// were approved for.
//
// Feed *scope* is not settable from this script on purpose. Whether a feed
// carries components or complete bikes is something you find out by looking
// at real rows (`ingest-feed.ts --dry-run --limit 200`), and the schema
// defaults it to UNKNOWN until someone has.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../lib/generated/prisma-node/client";
import { hasAdapter } from "../../lib/affiliate/registry";
import { ENV_API_TOKEN, ENV_FEED_API_KEY, ENV_PUBLISHER_ID } from "../../lib/affiliate/networks/awin";

interface Args {
  networkKey: string;
  networkName: string;
  adapterKey: string;
  retailerSlug?: string;
  retailerName?: string;
  advertiserId?: string;
  siteUrl?: string;
  linkDomains: string[];
  feedId?: string;
  feedLabel?: string;
  language: string;
  vendor?: string;
}

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    networkKey: "awin",
    networkName: "Awin",
    adapterKey: "awin",
    linkDomains: [],
    language: "en",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const next = () => argv[++i];
    switch (argv[i]) {
      case "--network-key": args.networkKey = next(); break;
      case "--network-name": args.networkName = next(); break;
      case "--adapter-key": args.adapterKey = next(); break;
      case "--retailer-slug": args.retailerSlug = next(); break;
      case "--retailer-name": args.retailerName = next(); break;
      case "--advertiser-id": args.advertiserId = next(); break;
      case "--site-url": args.siteUrl = next(); break;
      case "--link-domains": args.linkDomains = next().split(",").map((d) => d.trim()).filter(Boolean); break;
      case "--feed-id": args.feedId = next(); break;
      case "--feed-label": args.feedLabel = next(); break;
      case "--language": args.language = next(); break;
      case "--vendor": args.vendor = next(); break;
      default:
        console.error(`Unknown argument: ${argv[i]}`);
        process.exit(2);
    }
  }
  return args;
}

/** Env var names recorded on the network row. Names only, never values. */
function envVarNamesFor(adapterKey: string): { publisherIdEnvVar?: string; apiKeyEnvVar?: string } {
  if (adapterKey === "awin") {
    return { publisherIdEnvVar: ENV_PUBLISHER_ID, apiKeyEnvVar: ENV_FEED_API_KEY };
  }
  return {};
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const missing = [
    ["--retailer-slug", args.retailerSlug],
    ["--retailer-name", args.retailerName],
    ["--advertiser-id", args.advertiserId],
    ["--site-url", args.siteUrl],
  ].filter(([, value]) => !value).map(([flag]) => flag);

  if (missing.length > 0) {
    console.error(`Missing required argument(s): ${missing.join(", ")}`);
    console.error("Run with no arguments to see the header of this file for an example.");
    process.exit(2);
  }

  if (!hasAdapter(args.adapterKey)) {
    console.error(
      `No adapter registered for "${args.adapterKey}". Write lib/affiliate/networks/${args.adapterKey}.ts ` +
        `and register it in lib/affiliate/registry.ts first.`,
    );
    process.exit(2);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set — expected the direct Neon URL in .env");
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  try {
    const envVars = envVarNamesFor(args.adapterKey);
    const network = await prisma.affiliateNetwork.upsert({
      where: { key: args.networkKey },
      create: {
        key: args.networkKey,
        name: args.networkName,
        adapterKey: args.adapterKey,
        publisherIdEnvVar: envVars.publisherIdEnvVar ?? null,
        apiKeyEnvVar: envVars.apiKeyEnvVar ?? null,
      },
      update: { name: args.networkName, adapterKey: args.adapterKey, ...envVars },
    });
    console.log(`network  ${network.key} (${network.name}), adapter ${network.adapterKey}`);

    // Optional: attach to an existing Vendor so prices keep flowing into
    // the append-only Price history. Vendor.name is a closed enum, so a
    // name that isn't in it is rejected rather than invented.
    let vendorId: string | null = null;
    if (args.vendor) {
      const vendor = await prisma.vendor.findUnique({
        where: { name: args.vendor as never },
      });
      if (!vendor) {
        console.error(
          `No Vendor row named "${args.vendor}". Create it first, or omit --vendor ` +
            `(the affiliate layer works without one; it just keeps no price history).`,
        );
        process.exit(2);
      }
      vendorId = vendor.id;
      console.log(`vendor   ${args.vendor} linked`);
    }

    const retailer = await prisma.retailer.upsert({
      where: { slug: args.retailerSlug! },
      create: {
        slug: args.retailerSlug!,
        displayName: args.retailerName!,
        networkId: network.id,
        advertiserId: args.advertiserId!,
        siteUrl: args.siteUrl!,
        linkDomains: args.linkDomains,
        vendorId,
      },
      update: {
        displayName: args.retailerName!,
        networkId: network.id,
        advertiserId: args.advertiserId!,
        siteUrl: args.siteUrl!,
        linkDomains: args.linkDomains,
        vendorId,
      },
    });
    console.log(
      `retailer ${retailer.slug} (advertiser ${retailer.advertiserId}), ` +
        `link domains: ${retailer.linkDomains.join(", ") || "(none — links will be refused until set)"}`,
    );

    if (args.feedId) {
      const feed = await prisma.retailerFeed.upsert({
        where: {
          retailerId_externalFeedId: { retailerId: retailer.id, externalFeedId: args.feedId },
        },
        create: {
          retailerId: retailer.id,
          externalFeedId: args.feedId,
          label: args.feedLabel ?? null,
          language: args.language,
        },
        update: { label: args.feedLabel ?? null, language: args.language },
      });
      console.log(`feed     ${feed.externalFeedId} scope=${feed.scope} (set it once you've seen real rows)`);
    } else {
      console.log("feed     none given — add one with --feed-id, or list them with ingest-feed.ts --list-feeds");
    }

    console.log(
      `\nCredentials are not stored here. Set ${ENV_PUBLISHER_ID}, ${ENV_FEED_API_KEY}` +
        `${args.adapterKey === "awin" ? ` (and ${ENV_API_TOKEN} for the Publisher API)` : ""} in the environment.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
