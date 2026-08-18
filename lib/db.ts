import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client";

// Prisma on Cloudflare Workers.
//
// The default Prisma client opens a TCP connection to Postgres. Workers have no
// TCP sockets, so that client cannot run there at all — this is the one real
// gotcha of the Cloudflare route. The fix is a *driver adapter*: PrismaNeon
// speaks to Neon over HTTP/WebSocket instead, which Workers do support.
//
// Two consequences worth knowing:
//   1. The connection string is passed to the PrismaClient constructor, not
//      read from schema.prisma. The schema has no `url` at all under Prisma 7.
//   2. Use Neon's *pooled* connection string here (the one containing
//      `-pooler`). Workers scale to many short-lived isolates, which would
//      exhaust a direct Postgres connection limit quickly. Migrations are the
//      opposite case and use the direct URL — see prisma.config.ts.

let cached: PrismaClient | undefined;
let cachedUrl: string | undefined;

/**
 * Returns a PrismaClient for this isolate.
 *
 * Cached per connection string rather than created per request: a Worker
 * isolate serves many requests, and rebuilding the client each time would
 * throw away the connection pool. The URL is part of the cache key so that a
 * preview branch pointing at a different database can't silently reuse
 * production's client.
 */
export function getDb(databaseUrl?: string): PrismaClient {
  const url = databaseUrl ?? process.env.DATABASE_URL;

  if (!url) {
    // Fail loudly. A missing database URL that falls through to a default
    // would either connect to the wrong database or produce a confusing
    // runtime error much later, far from the actual cause.
    throw new Error(
      "DATABASE_URL is not set. Locally, put it in .dev.vars; in production, " +
        "set it with `wrangler secret put DATABASE_URL`.",
    );
  }

  if (cached && cachedUrl === url) return cached;

  cached = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  cachedUrl = url;
  return cached;
}
