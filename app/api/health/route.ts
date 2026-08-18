import { getDb } from "@/lib/db";

// Proves the whole chain works: Next.js running on workerd, reaching Neon over
// the HTTP driver adapter, against the migrated schema.
//
// force-dynamic matters. Without it Next would try to evaluate this at build
// time, where DATABASE_URL isn't set and there's no Worker runtime — the build
// would fail for reasons that have nothing to do with the route being wrong.
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const db = getDb();
    const [parts, bikes, rules] = await Promise.all([
      db.part.count(),
      db.bikeModel.count(),
      db.build.count(),
    ]);

    return Response.json({
      ok: true,
      database: "connected",
      region: process.env.NEXT_PUBLIC_REGION ?? "aws-eu-west-2",
      counts: { parts, bikeModels: bikes, builds: rules },
      queryMs: Date.now() - startedAt,
    });
  } catch (error) {
    // Return the message, not the stack — a stack trace here would leak file
    // paths, and the message alone is enough to tell a connection failure from
    // a missing-table failure.
    return Response.json(
      { ok: false, database: "unreachable", error: (error as Error).message },
      { status: 503 },
    );
  }
}
