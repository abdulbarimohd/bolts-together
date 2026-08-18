// scripts/import/import-mtb-frames.ts
//
// Ingests MTB frame platforms sourced by the research agents.
// Reads every *.json in scratchpad/mtb/ — each file is an array of platforms
// in the shape the sourcing agents were told to return.
//
// Run: npx tsx scripts/import/import-mtb-frames.ts [--dry-run]
//
// GOVERNING RULE: never write a guessed value. A platform missing any required
// field is REJECTED outright rather than padded with a plausible default. The
// compatibility engine treats null as "unknown, stay quiet", so an absent
// optional field is safe — but an absent *required* field would mean inventing
// a standard, and a wrong standard silently removes legal parts from a build.
//
// Idempotent: existing frames and bike models are skipped, never overwritten.

import 'dotenv/config';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PartType } from '../../lib/generated/prisma-node/client';

const IN_DIR = join(process.cwd(), 'scratchpad', 'mtb');
const DRY = process.argv.includes('--dry-run');

// Every field the engine needs before a frame is useful at all. Anything not
// listed here is optional and may legitimately be null.
const REQUIRED = [
  'material',
  'bbShellStandard',
  'rearAxleType',
  'rearBrakeMountType',
  'wheelDiameter',
  'maxTyreWidthMm',
] as const;

interface Platform {
  brand: string;
  frameName: string;
  sourceUrl: string;
  dataSource: string;
  discipline: string;
  confidence?: string;
  dataNotes?: string;
  detail: Record<string, unknown>;
  bikes: { model: string; year: number; variant?: string | null }[];
}

const slugify = (brand: string, model: string, variant: string, year: number) =>
  [brand, model, variant, String(year)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!existsSync(IN_DIR)) throw new Error(`No input directory: ${IN_DIR}`);

  const files = readdirSync(IN_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No .json files in scratchpad/mtb — nothing to import.');
    return;
  }

  const accepted: Platform[] = [];
  const rejected: { name: string; why: string }[] = [];

  for (const file of files) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(IN_DIR, file), 'utf8'));
    } catch (e) {
      rejected.push({ name: file, why: `unparseable JSON: ${(e as Error).message}` });
      continue;
    }
    if (!Array.isArray(parsed)) {
      rejected.push({ name: file, why: 'top level is not an array' });
      continue;
    }

    for (const p of parsed as Platform[]) {
      const label = `${p.brand} ${p.frameName}`;
      const missing = REQUIRED.filter((f) => p.detail?.[f] === undefined || p.detail?.[f] === null);
      if (missing.length) {
        rejected.push({ name: label, why: `missing required: ${missing.join(', ')}` });
        continue;
      }
      if (!p.sourceUrl) {
        rejected.push({ name: label, why: 'no sourceUrl — provenance is mandatory' });
        continue;
      }
      if (!Array.isArray(p.bikes) || p.bikes.length === 0) {
        rejected.push({ name: label, why: 'no bikes listed for this platform' });
        continue;
      }
      accepted.push(p);
    }
  }

  console.log(`Parsed ${files.length} file(s): ${accepted.length} platforms accepted, ${rejected.length} rejected.\n`);
  if (rejected.length) {
    console.log('REJECTED (not written — abstaining beats guessing):');
    for (const r of rejected) console.log(`  - ${r.name}: ${r.why}`);
    console.log('');
  }
  if (DRY) {
    console.log('--dry-run: nothing written.');
    for (const p of accepted) console.log(`  would write: ${p.brand} ${p.frameName} (${p.bikes.length} bikes)`);
    return;
  }

  let framesCreated = 0, framesSkipped = 0, bikesCreated = 0, bikesSkipped = 0;

  for (const p of accepted) {
    let frameId: string;
    const existing = await prisma.part.findFirst({
      where: { type: PartType.FRAME, brand: p.brand, name: p.frameName },
    });

    if (existing) {
      frameId = existing.id;
      framesSkipped++;
      console.log(`= frame exists: ${p.brand} ${p.frameName}`);
    } else {
      const part = await prisma.part.create({
        data: {
          type: PartType.FRAME,
          brand: p.brand,
          name: p.frameName,
          weightGrams: 0,
          basePricePence: null,
          dataSource: p.dataSource as never,
          sourceUrl: p.sourceUrl,
          dataNotes: p.dataNotes ?? null,
          frame: { create: p.detail as never },
        },
      });
      frameId = part.id;
      framesCreated++;
      console.log(`+ frame: ${p.brand} ${p.frameName}`);
    }

    for (const bike of p.bikes) {
      const variant = bike.variant ?? null;
      const dupe = await prisma.bikeModel.findFirst({
        where: { brand: p.brand, model: bike.model, year: bike.year, variant },
      });
      if (dupe) { bikesSkipped++; continue; }

      await prisma.bikeModel.create({
        data: {
          brand: p.brand,
          model: bike.model,
          year: bike.year,
          variant,
          slug: slugify(p.brand, bike.model, variant ?? '', bike.year),
          msrpPence: null,
          discipline: p.discipline,
          parts: { create: [{ partId: frameId, slot: null }] },
        },
      });
      bikesCreated++;
    }
  }

  console.log(
    `\nDone. Frames: ${framesCreated} created, ${framesSkipped} existed. ` +
    `Bikes: ${bikesCreated} created, ${bikesSkipped} existed.`
  );
  console.log(
    '\nEach bike here carries only its frame. That is deliberate: only frame ' +
    'geometry was verified in this pass. Full stock builds need their own ' +
    'per-trim sourcing and must not be inferred.'
  );
}

main()
  .catch((e) => { console.error('IMPORT FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
