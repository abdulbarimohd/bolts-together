// scripts/import/fix-topstone-shifter-slots.ts
//
// One-off correction: the original import-topstone-batch.ts RESOLVED_LINKS
// entries for ST-RX400-L/R GRX never set BikeModelPart.slot, unlike every
// other shifter pair in the catalog. Combined with build.service.ts's
// shifter resolution not distinguishing left/right at all (fixed
// separately), this let Topstone 2 GRX-2x and Topstone EQ's builds
// silently pick either lever's `speeds` value depending on query order.
// Both bugs are now fixed at the source; this backfills the two rows this
// script already wrote before the fix existed. Safe to re-run.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../lib/generated/prisma-node/client';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const leftPart = await prisma.part.findFirst({ where: { name: 'ST-RX400-L GRX' } });
  const rightPart = await prisma.part.findFirst({ where: { name: 'ST-RX400-R GRX' } });
  if (!leftPart || !rightPart) throw new Error('ST-RX400-L/R GRX not found in catalog');

  const bikes = await prisma.bikeModel.findMany({
    where: { slug: { in: ['cannondale-topstone-2-grx-2x-2025', 'cannondale-topstone-eq-2025'] } },
  });

  for (const bike of bikes) {
    const l = await prisma.bikeModelPart.updateMany({ where: { bikeModelId: bike.id, partId: leftPart.id }, data: { slot: 'left' } });
    const r = await prisma.bikeModelPart.updateMany({ where: { bikeModelId: bike.id, partId: rightPart.id }, data: { slot: 'right' } });
    console.log(`${bike.slug}: left updated=${l.count}, right updated=${r.count}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
