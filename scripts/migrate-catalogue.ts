// One-off catalogue migration: predecessor's Postgres -> Neon.
//
// Moves only the *catalogue*: vendors, parts and their per-category detail
// tables, prices, bike models and their part links. Deliberately does NOT move
// User, Build, BuildPart or StockAlert -- those are 1,600-odd rows of test
// sessions from development, not data worth carrying into a new database.
//
// Source rows come from JSON exported with pg's json_agg (see the export step
// in scratchpad/export). This script only writes.
//
// Idempotent: every insert is ON CONFLICT DO NOTHING, so a partial run can be
// re-run safely.

import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const EXPORT_DIR = join(process.cwd(), "scratchpad", "export");

// FK order. Parts before their detail tables; vendors and parts before prices;
// bike models before the links that join them to parts.
const ORDER = [
  "Vendor",
  "Part",
  "Frame", "Fork", "BottomBracket", "Crankset", "Chainring", "Wheelset",
  "Tyre", "Tube", "BrakeCaliper", "BrakeLever", "Rotor", "Shifter",
  "RearDerailleur", "FrontDerailleur", "Cassette", "Chain", "Headset",
  "RearShock", "Handlebar", "Stem", "Seatpost", "SeatClamp", "Saddle",
  "Pedal", "Shoe", "ChainGuide", "DerailleurHanger",
  "Price",
  "BikeModel", "BikeModelPart",
];

/** Schema changes made during the port. Source rows are reshaped to match. */
function transform(table: string, row: Record<string, unknown>): Record<string, unknown> {
  if (table === "Chain") {
    // `speeds` became a range so SRAM's 12/13-speed chains can be expressed.
    // Every existing row was single-rated, so both ends take the old value.
    const { speeds, ...rest } = row as { speeds?: number };
    return { ...rest, speedsMin: speeds, speedsMax: speeds };
  }
  return row;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — expected the direct Neon URL in .env");

  const client = new pg.Client({ connectionString: url });
  await client.connect();

  let totalIn = 0;
  let totalWritten = 0;
  const report: string[] = [];

  for (const table of ORDER) {
    const file = join(EXPORT_DIR, `${table}.json`);
    if (!existsSync(file)) {
      report.push(`  ${table.padEnd(20)} SKIPPED (no export file)`);
      continue;
    }

    const rows: Record<string, unknown>[] = JSON.parse(readFileSync(file, "utf8"));
    if (rows.length === 0) {
      report.push(`  ${table.padEnd(20)} 0`);
      continue;
    }

    // Only write columns that exist on the target. A column dropped or renamed
    // during the port would otherwise abort the whole insert.
    const { rows: cols } = await client.query<{ column_name: string }>(
      `select column_name from information_schema.columns
       where table_schema = 'public' and table_name = $1`,
      [table],
    );
    const targetCols = new Set(cols.map((c) => c.column_name));

    const shaped = rows.map((r) => transform(table, r));
    const keys = Object.keys(shaped[0]).filter((k) => targetCols.has(k));
    const dropped = Object.keys(shaped[0]).filter((k) => !targetCols.has(k));

    const quoted = keys.map((k) => `"${k}"`).join(", ");
    let written = 0;

    // Chunked so a wide table doesn't exceed Postgres' bind-parameter limit.
    const CHUNK = 100;
    for (let i = 0; i < shaped.length; i += CHUNK) {
      const batch = shaped.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const tuples = batch.map((row, n) => {
        const ph = keys.map((k, j) => {
          values.push(row[k] ?? null);
          return `$${n * keys.length + j + 1}`;
        });
        return `(${ph.join(", ")})`;
      });

      const res = await client.query(
        `insert into "${table}" (${quoted}) values ${tuples.join(", ")} on conflict do nothing`,
        values,
      );
      written += res.rowCount ?? 0;
    }

    totalIn += rows.length;
    totalWritten += written;
    const note = dropped.length ? `  (dropped: ${dropped.join(", ")})` : "";
    report.push(`  ${table.padEnd(20)} ${String(written).padStart(4)} / ${rows.length}${note}`);
  }

  console.log("table                written / source");
  console.log(report.join("\n"));
  console.log(`\n  ${"TOTAL".padEnd(20)} ${totalWritten} / ${totalIn}`);

  await client.end();
}

main().catch((e) => {
  console.error("MIGRATION FAILED:", e.message);
  process.exit(1);
});
