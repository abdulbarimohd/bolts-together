// scripts/import/purge-unverified-parts.ts
//
// Removes every remaining UNVERIFIED part -- the predecessor's demo seed.
//
// Why they go rather than stay flagged: `dataSource` is metadata. The engine
// reads the spec fields regardless, so an UNVERIFIED row does not make the
// engine abstain -- it makes it assert a guess. The audit found these are
// provably fabricated (fork axle-to-crown = 411 + travel, exactly, across two
// manufacturers; dropper length = travel + 288; the engine's own R-TIR-04
// hookless constant of 72psi copied into a rim's data) and that two guessed
// values were already causing live critical lockouts on real parts.
//
// It also removes the 466 Price rows, which all belong to these parts and are
// invented figures published under real retailers' names, with productUrls
// built from internal UUIDs. Genuinely sourced parts have no price rows at all,
// so nothing verified is lost. Real prices arrive with the Awin feed; until
// then the UI shows "price unknown" rather than a fabricated number.
//
// Bike models are KEPT. Where a seed part can be repointed to an already-
// sourced equivalent, the link is moved rather than dropped.
//
// Run: npx tsx scripts/import/purge-unverified-parts.ts [--dry-run]

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../lib/generated/prisma-node/client';

const DRY = process.argv.includes('--dry-run');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** Pull a manufacturer model number out of a part name, e.g. "CN-M8100". */
function modelNo(name: string): string | null {
  const m = name.match(/\b([A-Z]{2,3}-[A-Z0-9]{2,}[0-9][A-Z0-9-]*)\b/);
  return m ? m[1] : null;
}

async function main() {
  const doomed = await prisma.part.findMany({
    where: { dataSource: 'UNVERIFIED' },
    select: { id: true, type: true, brand: true, name: true },
  });

  if (doomed.length === 0) {
    console.log('No UNVERIFIED parts remain — nothing to do.');
    return;
  }

  const sourced = await prisma.part.findMany({
    where: { dataSource: { not: 'UNVERIFIED' } },
    select: { id: true, type: true, brand: true, name: true },
  });

  const priceCount = await prisma.price.count({ where: { partId: { in: doomed.map((d) => d.id) } } });
  const linkCount = await prisma.bikeModelPart.count({ where: { partId: { in: doomed.map((d) => d.id) } } });

  console.log(`UNVERIFIED parts: ${doomed.length}`);
  console.log(`  fabricated Price rows attached: ${priceCount}`);
  console.log(`  BikeModelPart links attached:   ${linkCount}\n`);

  // Repoint links where an already-sourced part shares type AND model number.
  let repointed = 0;
  let dropped = 0;

  for (const part of doomed) {
    const links = await prisma.bikeModelPart.findMany({
      where: { partId: part.id },
      select: { id: true, bikeModelId: true, slot: true },
    });
    if (links.length === 0) continue;

    const mno = modelNo(part.name);
    const replacement = mno
      ? sourced.find((s) => s.type === part.type && s.name.includes(mno))
      : undefined;

    if (replacement) {
      console.log(`  repoint ${links.length}x  ${part.brand} ${part.name}`);
      console.log(`            -> ${replacement.brand} ${replacement.name}`);
      if (!DRY) {
        for (const l of links) {
          // A bike may already carry the replacement; skip rather than duplicate.
          const exists = await prisma.bikeModelPart.findFirst({
            where: { bikeModelId: l.bikeModelId, partId: replacement.id, slot: l.slot },
          });
          if (exists) await prisma.bikeModelPart.delete({ where: { id: l.id } });
          else await prisma.bikeModelPart.update({ where: { id: l.id }, data: { partId: replacement.id } });
        }
      }
      repointed += links.length;
    } else {
      console.log(`  drop     ${links.length}x  ${part.brand} ${part.name}  (no sourced equivalent)`);
      dropped += links.length;
    }
  }

  if (DRY) {
    console.log(`\n--dry-run: nothing changed. Would repoint ${repointed}, drop ${dropped}, delete ${doomed.length} parts and ${priceCount} prices.`);
    return;
  }

  // Part deletion cascades to the per-category detail row, Price and any
  // remaining BikeModelPart links.
  const del = await prisma.part.deleteMany({ where: { dataSource: 'UNVERIFIED' } });

  console.log(`\nRepointed ${repointed} links, dropped ${dropped}.`);
  console.log(`Deleted ${del.count} parts and ${priceCount} fabricated prices.`);
}

main()
  .catch((e) => { console.error('PURGE FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
