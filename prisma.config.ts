import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 moved the datasource URL out of schema.prisma and into this file.
//
// This config is only used by the Prisma CLI. The running application never
// reads it: at runtime the app constructs PrismaClient with a Neon driver
// adapter instead, because Cloudflare Workers can't open the TCP connection the
// default client expects. See lib/db.ts.
//
// The datasource block is *conditional* on purpose. `prisma generate` needs no
// database — it only reads the schema — but the `env()` helper throws when the
// variable is missing, which broke CI where no DATABASE_URL exists (and
// shouldn't). Prisma treats `datasource` as optional and only requires it for
// migrate/introspect, so omitting it when there's no URL lets generate succeed
// in CI while migrations still fail loudly and locally with a clear message.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",

  // Use Neon's *direct* (non-pooled) connection string here — migrations run
  // DDL and don't want a connection pooler in front of them. The pooled URL is
  // what the app uses at runtime.
  ...(url ? { datasource: { url } } : {}),

  migrations: {
    path: "prisma/migrations",
  },
});
