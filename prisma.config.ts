// Prisma 7 no longer loads .env automatically — the config file has to do it,
// and this import must come before defineConfig runs or env() finds nothing.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved the datasource URL out of schema.prisma and into this file.
//
// This config is only used by the Prisma CLI — `migrate`, `db push`,
// `introspect`, `studio`. The running application never reads it: at runtime
// the app constructs PrismaClient with a Neon driver adapter instead, because
// Cloudflare Workers can't open the TCP connection the default client expects.
// See lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    // Read from .env locally. Use Neon's *direct* (non-pooled) connection
    // string here — migrations run DDL and don't want a connection pooler in
    // front of them. The pooled URL is what the app uses at runtime.
    url: env("DATABASE_URL"),
  },

  migrations: {
    path: "prisma/migrations",
  },
});
