// scripts/import/link-trim-components.ts
//
// Run with: npx tsx scripts/import/link-trim-components.ts
//
// Links real, sourced components onto the 19 trims across the 6 frame
// platforms researched trim-by-trim against manufacturer spec pages
// (Cannondale SuperSix EVO SE, Synapse Carbon, SuperX Carbon; Trek
// Checkmate SLR, Domane AL Gen 4; Canyon Grail CF/CF SLX) — see the
// session's research transcripts for full per-trim sourcing detail.
// Every row below is a component the manufacturer's own spec page
// states for that exact trim AND that has a genuine, brand+model
// matching row already in the Part catalog. Everything else on these
// bikes (wheels, tyres, cockpit, most groupset electronics, several
// mechanical parts with no catalog match) is a real, honest gap —
// left unlinked rather than guessed, same rule as the frame import.
//
// Every row here was independently re-verified against the raw
// research text and a live catalog dump by a separate audit pass
// before this script was written (zero rejections across all 64
// proposed rows) — see SESSION_LOG.md for that process.
//
// Two components (SuperSix EVO SE 1's chain, SE 2's chain) have a
// second, duplicate catalog Part row for the exact same physical
// product under a slightly different name (pre-existing catalog
// data debt, not introduced here) — only one is linked per bike,
// since linking both would show the bike as having two chains.

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PartType } from '../../lib/generated/prisma-node/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type Link = { category: PartType; partId: string; slot?: string | null };

const TRIM_LINKS: { bikeSlug: string; links: Link[] }[] = [
  // --- Cannondale SuperSix EVO SE (2024) ---
  {
    bikeSlug: 'cannondale-supersix-evo-se-1-2024',
    links: [
      { category: PartType.CASSETTE, partId: 'a8254ea2-ee62-4914-b7e3-45653b90c844' }, // CS-M8100-12 DEORE XT 10-45T
      { category: PartType.CHAIN, partId: '314df9e7-63ec-4d88-97b3-ee95f1c3956f' }, // CN-M8100 XT 12-Speed
      { category: PartType.BRAKE_CALIPER, partId: '3045428c-7a47-46c3-b7a6-65d41a7f8131' }, // BR-RX820 GRX
      { category: PartType.ROTOR, partId: '0aa9cf3e-352c-4cb7-bb3e-31c91a5b0098' }, // RT-CL800 160mm (front+rear, same part)
    ],
  },
  {
    bikeSlug: 'cannondale-supersix-evo-se-2-2024',
    links: [
      { category: PartType.CHAIN, partId: 'b26da952-6b52-4ae8-b728-0b02add1b944' }, // CN-HG601 11-Speed
      { category: PartType.SHIFTER, partId: '8a8a9fb0-1c9c-4329-b9e8-1e7af8e375c3', slot: 'front' }, // ST-RX600-L GRX
      { category: PartType.SHIFTER, partId: '8ab2a8a1-c0af-4d7c-b292-6d156847ad8f', slot: 'rear' }, // ST-RX600-R GRX
      { category: PartType.REAR_DERAILLEUR, partId: 'c2f06248-332f-424d-8585-d2a882343805' }, // RD-RX810 GRX
    ],
  },
  // --- Cannondale Synapse Carbon (2025) ---
  {
    bikeSlug: 'cannondale-synapse-carbon-4-2025',
    links: [
      { category: PartType.CRANKSET, partId: 'c0bf0af1-cec3-42c5-b69a-295be7da528e' }, // FC-R7100 SHIMANO 105
      { category: PartType.CASSETTE, partId: '19b9cb77-ed41-452a-b527-e660cb72a081' }, // CS-R7101-12 SHIMANO 105 11-34T
      { category: PartType.BRAKE_CALIPER, partId: '11eab4f1-c91b-4bfc-b333-19be1437fef3' }, // BR-R7170 SHIMANO 105
    ],
  },
  {
    bikeSlug: 'cannondale-synapse-carbon-5-2025',
    links: [
      { category: PartType.CRANKSET, partId: 'c0bf0af1-cec3-42c5-b69a-295be7da528e' }, // FC-R7100 SHIMANO 105
      { category: PartType.SHIFTER, partId: '99769d0a-2234-43fa-a593-31e702c27be3', slot: 'front' }, // ST-R7120-L SHIMANO 105
      { category: PartType.SHIFTER, partId: '95cc96bd-6d5c-4b66-adf7-adb61b59d7f5', slot: 'rear' }, // ST-R7120-R SHIMANO 105
      { category: PartType.REAR_DERAILLEUR, partId: '45b7ddc0-fafe-4bbf-87b9-990fc92fd11b' }, // RD-R7100 SHIMANO 105
      { category: PartType.BRAKE_CALIPER, partId: '11eab4f1-c91b-4bfc-b333-19be1437fef3' }, // BR-R7170 SHIMANO 105
    ],
  },
  {
    bikeSlug: 'cannondale-synapse-carbon-2-2025',
    links: [
      { category: PartType.CRANKSET, partId: 'fc1c70de-92d1-449c-80fd-b5c89e228b99' }, // FC-R8100 ULTEGRA
      { category: PartType.CASSETTE, partId: '6093822f-b804-4481-8aaa-c80989eb3e9e' }, // CS-R8101-12 ULTEGRA 11-34T
      { category: PartType.BRAKE_CALIPER, partId: 'dc78e9fc-daa5-4a5b-9a24-ec1f464332fe' }, // BR-R8170 ULTEGRA
      { category: PartType.ROTOR, partId: '0aa9cf3e-352c-4cb7-bb3e-31c91a5b0098' }, // RT-CL800 160mm
    ],
  },
  {
    bikeSlug: 'cannondale-synapse-carbon-1-2025',
    links: [
      { category: PartType.CRANKSET, partId: 'fc1c70de-92d1-449c-80fd-b5c89e228b99' }, // FC-R8100 ULTEGRA
      { category: PartType.CASSETTE, partId: '6093822f-b804-4481-8aaa-c80989eb3e9e' }, // CS-R8101-12 ULTEGRA 11-34T
      { category: PartType.BRAKE_CALIPER, partId: 'dc78e9fc-daa5-4a5b-9a24-ec1f464332fe' }, // BR-R8170 ULTEGRA
      { category: PartType.ROTOR, partId: '0aa9cf3e-352c-4cb7-bb3e-31c91a5b0098' }, // RT-CL800 160mm
    ],
  },
  {
    bikeSlug: 'cannondale-synapse-lab71-smartsense-2025',
    links: [
      { category: PartType.CASSETTE, partId: 'e3d0365a-3d98-466c-876f-b41f3b9b6c3a' }, // CS-XG-1391-E1 RED XPLR
    ],
  },
  // --- Cannondale SuperX Carbon (2025) ---
  {
    bikeSlug: 'cannondale-superx-3-2025',
    links: [
      { category: PartType.CRANKSET, partId: 'cf3bc139-7b0c-4a5c-9fce-56d7fc3e4f20' }, // FC-RX820-2 GRX
      { category: PartType.CHAIN, partId: '2ab9fb11-d572-451c-a735-2b2590ae4144' }, // CN-M8100 SHIMANO
      { category: PartType.REAR_DERAILLEUR, partId: '6dd191ed-4a77-4ab7-b709-9bb9d21e7448' }, // RD-RX820 GRX
      { category: PartType.SHIFTER, partId: '4626a71e-0eac-48ce-b533-e3406d7c5158', slot: 'front' }, // ST-RX820-L GRX
      { category: PartType.SHIFTER, partId: 'e7461562-73a9-4ed0-b43f-1d1c958ac376', slot: 'rear' }, // ST-RX820-R GRX
      { category: PartType.BRAKE_CALIPER, partId: '3045428c-7a47-46c3-b7a6-65d41a7f8131' }, // BR-RX820 GRX
      { category: PartType.ROTOR, partId: '0aa9cf3e-352c-4cb7-bb3e-31c91a5b0098' }, // RT-CL800 160mm
    ],
  },
  {
    bikeSlug: 'cannondale-superx-2-2025',
    links: [
      { category: PartType.CRANKSET, partId: 'cf3bc139-7b0c-4a5c-9fce-56d7fc3e4f20' }, // FC-RX820-2 GRX
      { category: PartType.CASSETTE, partId: '6093822f-b804-4481-8aaa-c80989eb3e9e' }, // CS-R8101-12 ULTEGRA 11-34T
      { category: PartType.CHAIN, partId: '2ab9fb11-d572-451c-a735-2b2590ae4144' }, // CN-M8100 SHIMANO
      { category: PartType.BRAKE_CALIPER, partId: '3045428c-7a47-46c3-b7a6-65d41a7f8131' }, // BR-RX820 GRX
      { category: PartType.ROTOR, partId: '0aa9cf3e-352c-4cb7-bb3e-31c91a5b0098' }, // RT-CL800 160mm
    ],
  },
  {
    bikeSlug: 'cannondale-superx-lab71-2025',
    links: [
      { category: PartType.CRANKSET, partId: '1fe94b0e-6b0e-4884-8006-f01fcbd64daa' }, // FC-RED-1WP-E1 RED XPLR AXS Power Meter
      { category: PartType.CASSETTE, partId: 'e3d0365a-3d98-466c-876f-b41f3b9b6c3a' }, // CS-XG-1391-E1 RED XPLR
    ],
  },
  // --- Trek Checkmate SLR (2025) ---
  {
    bikeSlug: 'trek-checkmate-slr-9-axs-2025',
    links: [
      { category: PartType.CRANKSET, partId: '1fe94b0e-6b0e-4884-8006-f01fcbd64daa' }, // FC-RED-1WP-E1 RED XPLR AXS Power Meter
      { category: PartType.CASSETTE, partId: 'e3d0365a-3d98-466c-876f-b41f3b9b6c3a' }, // CS-XG-1391-E1 RED XPLR
      { category: PartType.CHAIN, partId: '9a88749f-4ec6-4ea2-b3ea-0e65c9bf789a' }, // CN-RED-E1 RED Chain
      { category: PartType.ROTOR, partId: '4af66bde-9385-4e88-ab63-b26bfaf570a3' }, // RT-PLN-X-A1 160mm CL
    ],
  },
  {
    bikeSlug: 'trek-checkmate-slr-8-axs-2025',
    links: [
      { category: PartType.CASSETTE, partId: '074a8767-67ed-4d5f-9673-31c345bd6e02' }, // CS-XG-1271-D1 XPLR
      { category: PartType.ROTOR, partId: '1bfd6034-ed8a-4a97-b447-4cf2789a9d8c' }, // RT-CLN-X-A1 160mm CL
    ],
  },
  {
    bikeSlug: 'trek-checkmate-slr-7-axs-2025',
    links: [
      { category: PartType.CASSETTE, partId: '074a8767-67ed-4d5f-9673-31c345bd6e02' }, // CS-XG-1271-D1 XPLR
      { category: PartType.ROTOR, partId: '1bfd6034-ed8a-4a97-b447-4cf2789a9d8c' }, // RT-CLN-X-A1 160mm CL
    ],
  },
  // --- Trek Domane AL Gen 4 (2025) ---
  {
    bikeSlug: 'trek-domane-al-2-gen-4-2025',
    links: [
      { category: PartType.BOTTOM_BRACKET, partId: '2da8e20e-960d-4256-b46d-30992c85d746' }, // BB-UN300 SHIMANO
      { category: PartType.REAR_DERAILLEUR, partId: '0bd44c09-8a4b-4f7d-9143-6dcd60515a3e' }, // RD-R2000-GS SHIMANO CLARIS
      // Left lever only: Trek's page states the right-side ST-R2000-R,
      // but no matching Part exists in the catalog — a real gap, not
      // guessed. See dataNotes discussion in the research transcript.
      { category: PartType.SHIFTER, partId: '05819d84-7002-416b-864b-c75cf8af3579', slot: 'front' }, // ST-R2000-L SHIMANO CLARIS
    ],
  },
  {
    bikeSlug: 'trek-domane-al-4-gen-4-2025',
    links: [
      { category: PartType.CHAIN, partId: 'b20d18c4-c301-41be-af0e-17d0ff21f3b5' }, // CN-HG54 SHIMANO
    ],
  },
  {
    bikeSlug: 'trek-domane-al-5-gen-4-2025',
    links: [
      { category: PartType.CRANKSET, partId: 'c0bf0af1-cec3-42c5-b69a-295be7da528e' }, // FC-R7100 SHIMANO 105
      { category: PartType.CASSETTE, partId: '19b9cb77-ed41-452a-b527-e660cb72a081' }, // CS-R7101-12 SHIMANO 105 11-34T
      { category: PartType.CHAIN, partId: '5375404b-5e56-4146-a169-f4e5746c0303' }, // CN-M7100 SHIMANO
      { category: PartType.SHIFTER, partId: '99769d0a-2234-43fa-a593-31e702c27be3', slot: 'front' }, // ST-R7120-L SHIMANO 105
      { category: PartType.SHIFTER, partId: '95cc96bd-6d5c-4b66-adf7-adb61b59d7f5', slot: 'rear' }, // ST-R7120-R SHIMANO 105
      { category: PartType.REAR_DERAILLEUR, partId: '45b7ddc0-fafe-4bbf-87b9-990fc92fd11b' }, // RD-R7100 SHIMANO 105
    ],
  },
  // --- Canyon Grail CF / CF SLX (2026) ---
  {
    bikeSlug: 'canyon-grail-cf-slx-8-di2-2026',
    links: [
      { category: PartType.CASSETTE, partId: '6093822f-b804-4481-8aaa-c80989eb3e9e' }, // CS-R8101-12 ULTEGRA 11-34T
      { category: PartType.ROTOR, partId: '0aa9cf3e-352c-4cb7-bb3e-31c91a5b0098' }, // RT-CL800 160mm
      // Crankset deliberately unlinked: Canyon's own page lists two
      // conflicting crank line-items (plain FC-RX820-2 vs a 4iiii
      // powermeter variant) with no way to tell which actually ships.
    ],
  },
  {
    bikeSlug: 'canyon-grail-cf-8-1by-2026',
    links: [
      { category: PartType.CRANKSET, partId: '0d1bd167-3081-49a1-b350-06d3640113f0' }, // FC-RX820-1 GRX
      { category: PartType.CASSETTE, partId: '4aa61944-58e7-4325-a3c7-a253e736766e' }, // CS-M7100-12 SLX 10-45T
      { category: PartType.CHAIN, partId: '5375404b-5e56-4146-a169-f4e5746c0303' }, // CN-M7100 SHIMANO
    ],
  },
  {
    bikeSlug: 'canyon-grail-cf-7-2026',
    links: [
      { category: PartType.CASSETTE, partId: '19b9cb77-ed41-452a-b527-e660cb72a081' }, // CS-R7101-12 SHIMANO 105 11-34T
      { category: PartType.CHAIN, partId: '02e10233-96cb-454b-8ff7-39ba93f315f0' }, // CN-M6100 SHIMANO
      { category: PartType.REAR_DERAILLEUR, partId: '6dd191ed-4a77-4ab7-b709-9bb9d21e7448' }, // RD-RX820 GRX
    ],
  },
];

async function main() {
  let bikesNotFound = 0;
  let partsNotFound = 0;
  let partsWrongType = 0;
  let linksCreated = 0;
  let linksSkipped = 0;

  for (const trim of TRIM_LINKS) {
    const bike = await prisma.bikeModel.findUnique({ where: { slug: trim.bikeSlug } });
    if (!bike) {
      console.error(`! bike not found, skipping entirely: ${trim.bikeSlug}`);
      bikesNotFound++;
      continue;
    }

    for (const link of trim.links) {
      const part = await prisma.part.findUnique({ where: { id: link.partId } });
      if (!part) {
        console.error(`! part not found, skipping: ${link.partId} (${trim.bikeSlug})`);
        partsNotFound++;
        continue;
      }
      if (part.type !== link.category) {
        console.error(
          `! part ${part.brand} ${part.name} is type ${part.type}, expected ${link.category} — skipping (${trim.bikeSlug})`
        );
        partsWrongType++;
        continue;
      }

      const slot = link.slot ?? null;
      const existing = await prisma.bikeModelPart.findFirst({
        where: { bikeModelId: bike.id, partId: part.id, slot },
      });
      if (existing) {
        linksSkipped++;
        continue;
      }

      await prisma.bikeModelPart.create({
        data: { bikeModelId: bike.id, partId: part.id, slot },
      });
      linksCreated++;
      console.log(`+ ${bike.brand} ${bike.model}: ${part.brand} ${part.name}`);
    }
  }

  console.log(
    `\nDone. Links: ${linksCreated} created, ${linksSkipped} already existed. ` +
    `Problems: ${bikesNotFound} bikes not found, ${partsNotFound} parts not found, ${partsWrongType} type mismatches.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
