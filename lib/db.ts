import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "./generated/prisma/client";

// Prisma on Cloudflare Workers.
//
// The default Prisma client opens a TCP connection to Postgres. Workers have no
// TCP sockets, so that client cannot run there at all. The fix is a *driver
// adapter*: PrismaNeon speaks to Neon over HTTP/WebSocket instead.
//
// Two consequences worth knowing:
//   1. The connection string is passed to the PrismaClient constructor, not
//      read from schema.prisma. The schema has no `url` at all under Prisma 7.
//   2. Use Neon's *pooled* connection string here (the one containing
//      `-pooler`). Migrations are the opposite case and use the direct URL --
//      see prisma.config.ts.
//
// ---------------------------------------------------------------------------
// DO NOT CACHE THE CLIENT ACROSS REQUESTS.
//
// This file previously held the client in a module-level variable, on the
// reasoning that a Worker isolate serves many requests and rebuilding the
// client each time throws away its connection pool. That reasoning is right on
// Node and wrong here, and it caused roughly a third of all production requests
// to fail with:
//
//   "Cannot perform I/O on behalf of a different request. I/O objects (such as
//    streams, request/response bodies, and others) created in the context of
//    one request handler cannot be accessed from a different request's handler."
//
// A Prisma client holds an I/O object. Cloudflare scopes I/O to the request
// that created it, so a client built during request A throws the moment
// request B touches it. The failure is intermittent and looks like a data bug,
// because it only fires when an isolate is reused -- and it never reproduces
// locally, since Node has no such restriction.
//
// Creating a client per request is the documented pattern and is cheap: the
// Neon adapter is HTTP-based, so there is no TCP handshake to amortise.
// ---------------------------------------------------------------------------

/**
 * Returns a PrismaClient scoped to the current request.
 *
 * Call this inside a request handler and let it fall out of scope when the
 * handler returns. Never hoist the result into a module-level variable.
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

  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
}
