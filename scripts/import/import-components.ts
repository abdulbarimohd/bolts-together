// scripts/import/import-components.ts
//
// Generic component importer. Reads every *.json in scratchpad/components/ and
// writes parts of any category, using the same abstain-not-guess contract as
// the frame importer: a record missing a REQUIRED field for its category is
// rejected and reported, never padded with a plausible default.
//
// Run: npx tsx scripts/import/import-components.ts [--dry-run]

import 'dotenv/config';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PartType } from '../../lib/generated/prisma-node/client';

const IN_DIR = join(process.cwd(), 'scratchpad', 'components');
const DRY = process.argv.includes('--dry-run');

/** category -> [PartType, Prisma relation field, required detail fields] */
const CATEGORIES: Record<string, [PartType, string, string[]]> = {
  FORK:        [PartType.FORK,        'fork',      ['steererTubeTaper', 'frontAxleType', 'brakeMountType', 'wheelDiameter', 'maxTyreWidthMm']],
  WHEELSET:    [PartType.WHEELSET,    'wheelset',  ['wheelDiameter', 'frontAxleType', 'rearAxleType', 'freehubBodyType', 'rotorMountStandard', 'internalRimWidthMm']],
  REAR_SHOCK:  [PartType.REAR_SHOCK,  'rearShock', ['eyeToEyeMm', 'strokeMm', 'mountType', 'sizing']],
  TYRE:        [PartType.TYRE,        'tyre',      ['wheelDiameter', 'widthMm']],
  SEATPOST:    [PartType.SEATPOST,    'seatpost',  ['diameterMm', 'totalLengthMm']],
  HANDLEBAR:   [PartType.HANDLEBAR,   'handlebar', ['clampDiameterMm', 'controlClampDiameterMm', 'barType']],
  STEM:        [PartType.STEM,        'stem',      ['barClampDiameterMm', 'steererClampMm']],
  HEADSET:     [PartType.HEADSET,     'headset',   ['upperStandard', 'lowerStandard']],
  SADDLE:      [PartType.SADDLE,      'saddle',    ['railType']],
  CHAIN_GUIDE: [PartType.CHAIN_GUIDE, 'chainGuide',['mountStandard']],
  ROTOR:       [PartType.ROTOR,       'rotor',     ['diameterMm', 'mountStandard']],
  CASSETTE:    [PartType.CASSETTE,    'cassette',  ['speeds', 'freehubBodyType', 'smallestCogTeeth', 'largestCogTeeth']],
  CHAIN:       [PartType.CHAIN,       'chain',     ['speedsMin', 'speedsMax', 'chainStandard']],
};

/** Drop null values so schema defaults apply — several booleans are non-nullable. */
const stripNulls = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!existsSync(IN_DIR)) throw new Error(`No input directory: ${IN_DIR}`);
  const files = readdirSync(IN_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length) return console.log('No .json files in scratchpad/components.');

  const accepted: Record<string, unknown>[] = [];
  const rejected: string[] = [];

  for (const file of files) {
    let rows: Record<string, unknown>[];
    try {
      rows = JSON.parse(readFileSync(join(IN_DIR, file), 'utf8'));
    } catch (e) {
      rejected.push(`${file}: unparseable JSON — ${(e as Error).message}`);
      continue;
    }
    for (const r of rows) {
      const label = `${r.brand} ${r.name}`;
      const cat = CATEGORIES[r.category as string];
      if (!cat) { rejected.push(`${label}: unknown category "${r.category}"`); continue; }
      if (!r.sourceUrl) { rejected.push(`${label}: no sourceUrl — provenance is mandatory`); continue; }
      const detail = (r.detail ?? {}) as Record<string, unknown>;
      const missing = cat[2].filter((f) => detail[f] === undefined || detail[f] === null);
      if (missing.length) { rejected.push(`${label}: missing required ${missing.join(', ')}`); continue; }
      accepted.push(r);
    }
  }

  console.log(`Parsed ${files.length} file(s): ${accepted.length} accepted, ${rejected.length} rejected.\n`);
  if (rejected.length) {
    console.log('REJECTED (abstaining beats guessing):');
    for (const r of rejected) console.log(`  - ${r}`);
    console.log('');
  }

  if (DRY) {
    const byCat: Record<string, number> = {};
    for (const a of accepted) byCat[a.category as string] = (byCat[a.category as string] ?? 0) + 1;
    console.log('--dry-run, would write:');
    for (const [k, v] of Object.entries(byCat)) console.log(`  ${k.padEnd(12)} ${v}`);
    return;
  }

  let created = 0, skipped = 0;
  for (const r of accepted) {
    const [type, relation] = CATEGORIES[r.category as string];
    const existing = await prisma.part.findFirst({
      where: { type, brand: r.brand as string, name: r.name as string },
    });
    if (existing) { skipped++; continue; }

    await prisma.part.create({
      data: {
        type,
        brand: r.brand as string,
        name: r.name as string,
        weightGrams: (r.weightGrams as number) ?? 0,
        basePricePence: null,
        dataSource: (r.dataSource as never) ?? 'MANUFACTURER_SPEC',
        sourceUrl: r.sourceUrl as string,
        dataNotes: (r.dataNotes as string) ?? null,
        [relation]: { create: stripNulls(r.detail as Record<string, unknown>) },
      } as never,
    });
    created++;
  }

  console.log(`Created ${created}, skipped ${skipped} already present.`);
}

main()
  .catch((e) => { console.error('IMPORT FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
