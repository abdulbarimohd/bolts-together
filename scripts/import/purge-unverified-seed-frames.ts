// scripts/import/purge-unverified-seed-frames.ts
//
// Removes the three UNVERIFIED seed frames whose geometry was invented
// placeholder data from the original demo seed.
//
// Why this is a deletion and not a flag: the compatibility engine computes
// confident verdicts from whatever numbers it is given. Invented geometry does
// not merely look untrustworthy in the UI -- it silently removes legal parts
// from a rider's list, which is the exact harm the never-fabricate rule exists
// to prevent. Two of the three are already superseded by properly sourced
// platforms (Santa Cruz Hightower 3, Trek Fuel EX Gen 6). The third,
// Specialized Epic 8, was dropped during sourcing because Specialized publish
// no rear brake mount standard anywhere.
//
// Recoverable: these rows originate from the predecessor's prisma/seed.ts.
//
// Run: npx tsx scripts/import/purge-unverified-seed-frames.ts [--dry-run]

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../lib/generated/prisma-node/client';

const DRY = process.argv.includes('--dry-run');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const targets = await prisma.part.findMany({
    where: { type: 'FRAME', dataSource: 'UNVERIFIED' },
    select: { id: true, brand: true, name: true },
  });

  if (targets.length === 0) {
    console.log('No UNVERIFIED frames found — nothing to do.');
    return;
  }

  console.log(`Found ${targets.length} UNVERIFIED frame(s):`);
  for (const t of targets) {
    const links = await prisma.bikeModelPart.findMany({
      where: { partId: t.id },
      select: { bikeModelId: true },
    });
    const models = await prisma.bikeModel.findMany({
      where: { id: { in: links.map((l) => l.bikeModelId) } },
      select: { brand: true, model: true, year: true },
    });
    console.log(`  - ${t.brand} ${t.name}`);
    for (const m of models) console.log(`      also removes bike model: ${m.brand} ${m.model} ${m.year}`);
  }

  if (DRY) {
    console.log('\n--dry-run: nothing deleted.');
    return;
  }

  let removedBikes = 0;
  for (const t of targets) {
    const links = await prisma.bikeModelPart.findMany({
      where: { partId: t.id },
      select: { bikeModelId: true },
    });
    // Delete the bike models that exist only to carry this placeholder frame.
    // Any model that also carries other parts is left alone -- it would still
    // be useful minus the bad frame.
    for (const l of links) {
      const partCount = await prisma.bikeModelPart.count({ where: { bikeModelId: l.bikeModelId } });
      if (partCount === 1) {
        await prisma.bikeModel.delete({ where: { id: l.bikeModelId } });
        removedBikes++;
      }
    }
    // Part deletion cascades to Frame and BikeModelPart via onDelete: Cascade.
    await prisma.part.delete({ where: { id: t.id } });
  }

  console.log(`\nDeleted ${targets.length} frame part(s) and ${removedBikes} bike model(s).`);
}

main()
  .catch((e) => { console.error('PURGE FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
