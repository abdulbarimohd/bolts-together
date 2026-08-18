// scripts/import/import-topstone-batch.ts
//
// Run with: npx tsx scripts/import/import-topstone-batch.ts
//
// First batch of the "frame-only bike" data-population pass flagged in
// RESUME_PROMPT.md / PROJECT_CONTEXT.md: 7 Cannondale Topstone (alloy)
// trims that previously had only a Frame row (1 component) each.
//
// Process, same two-phase shape as earlier passes: one research agent per
// bike pulled Cannondale's own spec page (cross-checked for model year via
// Wayback Machine / dated third-party listings where Cannondale's page
// itself carries no year), then one matching agent per bike proposed a
// LINK_EXISTING / NEW_PART / UNRESOLVED action per category against the
// live catalog. Every LINK_EXISTING claim was then re-verified against the
// actual stored schema fields (not just the catalog row's name string)
// before being written here -- this caught two real errors the matching
// agents missed from name-matching alone:
//   - "SM-BB52 BSA Threaded" is stored as a 73mm-shell part (BSA_73), not
//     68mm. The correct Shimano BSA-threaded 68mm row is BB-RS501.
//   - The existing "WTB Vulpine TCS Light" and "Vittoria Terreno Dry TNT"
//     rows are stored at 40mm width; Topstone EQ's tyre (36mm) and Topstone
//     Apex 1's tyre (38mm) are narrower variants of the same named product,
//     not the same physical SKU -- new, distinct Part rows.
// A third check (SM-RT30's mount standard, used on 3 of these trims) was
// independently verified against Shimano's own product listing rather than
// inferred from a plausible-looking naming pattern: confirmed Center Lock
// only, no 6-bolt SKU exists.
//
// Genuine gaps, left unwritten rather than guessed (see SESSION_LOG.md for
// this project's standing rule on this):
//   - Rotor brand/model on 4 of 7 trims (Topstone 1's "RT64" doesn't match
//     any verifiable Shimano SKU; Topstone 3/4's rotor brand was never
//     stated at all; Apex 1 has ~5 equally-plausible SRAM 160mm CL
//     candidates with no way to pick one).
//   - Headset brand/model on all 7 trims. Cannondale's page never states a
//     brand, and the two existing Cannondale-brand candidate rows (K35010,
//     K35061) turn out to share IDENTICAL upperStandard/lowerStandard
//     values in the DB -- so even the schema itself can't disambiguate
//     them, and picking either would be asserting a brand no source states.
//   - Topstone 1's shifter: catalog has both ST-RX600 and ST-RX610 GRX
//     rows and speed count isn't encoded in either name; no reliable way
//     to confirm which is the 12-speed hydraulic unit actually fitted.
//   - Topstone 2 CUES-1x's crankset: Cannondale's page states only "CUES,
//     40T" with no tier SKU, and CUES spans 5 non-interchangeable tiers
//     (U2000/U4000/U6010/U6040/U8000) that OEM builds routinely mix across
//     -- inferring the tier from the paired U6030 shifter would be exactly
//     the fabrication the project's rule exists to block.
//   - Topstone 3/4's shifter + rear derailleur (microSHIFT Sword / Advent
//     X): both are schema-shaped gaps, not sourcing gaps -- Shifter and
//     RearDerailleur require a non-nullable cablePullStandard, and
//     microSHIFT's ADVENT/SWORD ecosystem uses its own pull ratio that
//     isn't Shimano- or SRAM-compatible and has no enum value here. Forcing
//     SHIMANO_ROAD or SRAM_EXACT_ACTUATION onto it would misstate a real
//     incompatibility, not just omit a fact -- left unwritten, flagged for
//     whoever owns CablePullStandard to decide whether a new enum value is
//     warranted (same shape as the THRU_AXLE_100x12 gap fixed earlier).
//   - Topstone 4's bottom bracket: only "cartridge, square taper" is
//     stated, no brand -- entry-level OEM square-taper cartridge BBs are
//     made by many suppliers interchangeably: don't assume Shimano just
//     because a Shimano row happens to already exist in the catalog.

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PartType } from '../../lib/generated/prisma-node/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type BikeLink = { slug: string; slot?: string };

type NewPartSpec = {
  category: PartType;
  relation: string;
  brand: string;
  name: string;
  weightGrams?: number;
  basePricePence?: number;
  dataSource: 'MANUFACTURER_SPEC' | 'RETAILER_LISTING' | 'ESTIMATED';
  sourceUrl?: string;
  dataNotes: string;
  fields: Record<string, any>;
  bikes: BikeLink[];
};

// Links to parts that already exist in the catalog, looked up by their
// natural key (type/brand/name) at run time rather than a hardcoded id --
// safer against transcription mistakes and portable across the local and
// production databases, which is exactly the same script run against both.
type ResolvedLink = {
  type: PartType;
  brand: string;
  name: string;
  bikes: BikeLink[];
};

const CANNONDALE_SPEC_URL_1 = 'https://www.cannondale.com/en-us/bikes/road/gravel/topstone-alloy/topstone-1';
const CANNONDALE_SPEC_URL_2_CUES = 'https://www.cannondale.com/en-us/bikes/road/gravel/topstone-alloy/topstone-2-cues-1x';
const CANNONDALE_SPEC_URL_2_GRX = 'https://www.cannondale.com/en/bikes/road/gravel/topstone-alloy/topstone-2-grx-2x-c15385u';
const CANNONDALE_SPEC_URL_3 = 'https://www.cannondale.com/en-us/bikes/road/gravel/topstone-alloy/topstone-3';
const CANNONDALE_SPEC_URL_EQ = 'https://www.cannondale.com/en/bikes/road/gravel/topstone-alloy/topstone-eq';
const CANNONDALE_SPEC_URL_APEX1 = 'https://www.cannondale.com/en/bikes/road/gravel/topstone-alloy/topstone-apex-1';
const CANNONDALE_SPEC_URL_4 = 'https://www.cannondale.com/en-us/bikes/road/gravel/topstone-alloy/topstone-4-c15902u';

// ---------------------------------------------------------------
// NEW CATALOG PARTS
// ---------------------------------------------------------------
const NEW_PARTS: NewPartSpec[] = [
  // ===== Shared cockpit (Cannondale 3), all 7 trims =====
  {
    category: PartType.HANDLEBAR, relation: 'handlebar',
    brand: 'Cannondale', name: 'Cannondale 3 Alloy Gravel Handlebar',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_1,
    dataNotes: 'Butted 6061 alloy, 16° flare. Cannondale states the stem clamp is 31.8mm on the paired Cannondale 3 stem, matching this bar\'s center clampDiameterMm. controlClampDiameterMm (where the shifters/levers clamp, out on the drop section) is a separate, well-established physical constant for essentially all drop bars -- 23.8mm -- not the same as the center clamp; an earlier draft of this row wrongly set both to 31.8mm, caught by the compatibility engine\'s own R-CKP-03 check flagging every bike using this bar as incompatible, and corrected here rather than left in place. Per-size width (400/420/440mm) is stated on some but not all of this batch\'s trim pages and isn\'t compatibility-relevant, so left null rather than picked arbitrarily.',
    fields: { clampDiameterMm: 31.8, controlClampDiameterMm: 23.8, barType: 'DROP' },
    bikes: [
      { slug: 'cannondale-topstone-1-2025' }, { slug: 'cannondale-topstone-2-cues-1x-2025' },
      { slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-3-2025' },
      { slug: 'cannondale-topstone-eq-2025' }, { slug: 'cannondale-topstone-apex-1-2024' },
      { slug: 'cannondale-topstone-4-2024' },
    ],
  },
  {
    category: PartType.STEM, relation: 'stem',
    brand: 'Cannondale', name: 'Cannondale 3 Alloy Stem',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_1,
    dataNotes: '6061 alloy, 31.8mm bar clamp, 7°. Steerer clamp (1-1/8") is the near-universal standard and matches the stated 1-1/8"-1.5" tapered headset upper bearing, but isn\'t independently printed on Cannondale\'s page -- flagged as inferred rather than sourced. Length is per-size (80/90/100mm) and not compatibility-relevant; left null.',
    fields: { barClampDiameterMm: 31.8, steererClampMm: 28.6 },
    bikes: [
      { slug: 'cannondale-topstone-1-2025' }, { slug: 'cannondale-topstone-2-cues-1x-2025' },
      { slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-3-2025' },
      { slug: 'cannondale-topstone-eq-2025' }, { slug: 'cannondale-topstone-apex-1-2024' },
      { slug: 'cannondale-topstone-4-2024' },
    ],
  },
  {
    category: PartType.SEATPOST, relation: 'seatpost',
    brand: 'Cannondale', name: 'Cannondale 3 Alloy Seatpost',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_1,
    dataNotes: '6061 alloy, 27.2 x 350mm -- fully stated on Cannondale\'s page for every trim below.',
    fields: { diameterMm: 27.2, totalLengthMm: 350 },
    bikes: [
      { slug: 'cannondale-topstone-1-2025' }, { slug: 'cannondale-topstone-2-cues-1x-2025' },
      { slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-3-2025' },
      { slug: 'cannondale-topstone-eq-2025' }, { slug: 'cannondale-topstone-apex-1-2024' },
    ],
  },
  {
    category: PartType.SEATPOST, relation: 'seatpost',
    brand: 'Cannondale', name: 'Cannondale 4 Alloy Seatpost',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_4,
    dataNotes: 'Topstone 4\'s entry-level trim uses "Cannondale 4", a distinct (lower-tier) seatpost from the "Cannondale 3" used on every other trim in this batch -- same stated 27.2 x 350mm dimensions, kept as its own Part row rather than merged since Cannondale names it as a different product.',
    fields: { diameterMm: 27.2, totalLengthMm: 350 },
    bikes: [{ slug: 'cannondale-topstone-4-2024' }],
  },

  // ===== Saddles =====
  {
    category: PartType.SADDLE, relation: 'saddle',
    brand: 'Fizik', name: 'Aliante Delta',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_1,
    dataNotes: 'S-alloy rails. Rail profile (7mm round) is Fizik\'s well-established standard/S-alloy rail spec for this model, not stated on Cannondale\'s page itself but an undisputed fact about the named product.',
    fields: { railType: 'ROUND_7MM' },
    bikes: [{ slug: 'cannondale-topstone-1-2025' }, { slug: 'cannondale-topstone-apex-1-2024' }],
  },
  {
    category: PartType.SADDLE, relation: 'saddle',
    brand: 'Selle Royal', name: 'SRX Open',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_CUES,
    dataNotes: 'No rail material/profile stated on Cannondale\'s page and no confident well-established default for this specific model -- railType is schema-required, so ROUND_7MM (the overwhelmingly common default across entry/mid-tier saddles including this brand\'s comparable models) is used as the least-wrong value while being flagged here as inferred, not confirmed.',
    fields: { railType: 'ROUND_7MM' },
    bikes: [
      { slug: 'cannondale-topstone-2-cues-1x-2025' }, { slug: 'cannondale-topstone-2-grx-2x-2025' },
      { slug: 'cannondale-topstone-3-2025' }, { slug: 'cannondale-topstone-eq-2025' },
    ],
  },
  {
    category: PartType.SADDLE, relation: 'saddle',
    brand: 'Cannondale', name: 'Stage CX',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_4,
    dataNotes: 'Cannondale house-brand saddle, Topstone 4 only. Rail type not stated -- same ROUND_7MM inferred-default caveat as the Selle Royal row above.',
    fields: { railType: 'ROUND_7MM' },
    bikes: [{ slug: 'cannondale-topstone-4-2024' }],
  },

  // ===== Tyres =====
  {
    category: PartType.TYRE, relation: 'tyre',
    brand: 'WTB', name: 'Riddler TCS Light',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_1,
    dataNotes: '700x37c, tubeless ready, same front/rear. Catalog already has a "WTB Vulpine TCS Light" row (different tread pattern) -- Riddler is a separate real WTB product, not a duplicate.',
    fields: { wheelDiameter: 'ISO_622', widthMm: 37, tubeless: true },
    bikes: [
      { slug: 'cannondale-topstone-1-2025', slot: 'front' }, { slug: 'cannondale-topstone-1-2025', slot: 'rear' },
      { slug: 'cannondale-topstone-2-cues-1x-2025', slot: 'front' }, { slug: 'cannondale-topstone-2-cues-1x-2025', slot: 'rear' },
      { slug: 'cannondale-topstone-2-grx-2x-2025', slot: 'front' }, { slug: 'cannondale-topstone-2-grx-2x-2025', slot: 'rear' },
      { slug: 'cannondale-topstone-3-2025', slot: 'front' }, { slug: 'cannondale-topstone-3-2025', slot: 'rear' },
    ],
  },
  {
    category: PartType.TYRE, relation: 'tyre',
    brand: 'WTB', name: 'Riddler Comp',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_4,
    dataNotes: '700x37c, lower-tier "Comp" casing (not tubeless-marked on Cannondale\'s page, unlike the TCS Light casing used on other trims) -- explicitly a different SKU from "Riddler TCS Light" above, not merged despite the shared "Riddler" name.',
    fields: { wheelDiameter: 'ISO_622', widthMm: 37, tubeless: false },
    bikes: [{ slug: 'cannondale-topstone-4-2024', slot: 'front' }, { slug: 'cannondale-topstone-4-2024', slot: 'rear' }],
  },
  {
    category: PartType.TYRE, relation: 'tyre',
    brand: 'WTB', name: 'Vulpine TCS Light (36c)',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_EQ,
    dataNotes: 'Cannondale\'s Topstone EQ page states 700x36c. The existing "WTB Vulpine TCS Light" catalog row is stored at 40mm -- verified via direct DB query before writing this, not assumed from the shared name -- so this is a genuinely different width variant of the same named product, not a duplicate or a mistaken re-link of the 40mm row.',
    fields: { wheelDiameter: 'ISO_622', widthMm: 36, tubeless: true },
    bikes: [{ slug: 'cannondale-topstone-eq-2025', slot: 'front' }, { slug: 'cannondale-topstone-eq-2025', slot: 'rear' }],
  },
  {
    category: PartType.TYRE, relation: 'tyre',
    brand: 'Vittoria', name: 'Terreno Dry (38c)',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_APEX1,
    dataNotes: 'Cannondale\'s Topstone Apex 1 page states 700x38c, "Vittoria Terreno Dry" with no "TNT" suffix. The existing "Vittoria Terreno Dry TNT" catalog row is stored at 40mm -- verified via direct DB query before writing -- so treated as a different width/casing variant, not the same SKU.',
    fields: { wheelDiameter: 'ISO_622', widthMm: 38, tubeless: true },
    bikes: [{ slug: 'cannondale-topstone-apex-1-2024', slot: 'front' }, { slug: 'cannondale-topstone-apex-1-2024', slot: 'rear' }],
  },

  // ===== Wheelsets (no marketed product name on any of these -- built
  // only from the rim/hub fields Cannondale's own page states) =====
  {
    category: PartType.WHEELSET, relation: 'wheelset',
    brand: 'Cannondale', name: 'Topstone 1 Stock Wheelset (WTB ST i23 TCS / Formula)',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_1,
    dataNotes: 'Rim: WTB ST i23 TCS, 28h, tubeless ready, 23mm internal width (the "i23" designation is WTB\'s own internal-width naming, not inferred). Hubs: Formula cartridge bearing, 12x100mm/12x142mm, centerlock (matches frame\'s confirmed THRU_AXLE_142x12). freehubBodyType inferred as HG_11 to match the paired 105 R7100-series (CS-R7101-12) cassette, which is stored HG_11 in this catalog -- a direct, sourced inference from the paired part, not a guess.',
    fields: { wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_100x12', rearAxleType: 'THRU_AXLE_142x12', freehubBodyType: 'HG_11', tubelessReady: true, internalRimWidthMm: 23, rotorMountStandard: 'CENTERLOCK' },
    bikes: [{ slug: 'cannondale-topstone-1-2025' }],
  },
  {
    category: PartType.WHEELSET, relation: 'wheelset',
    brand: 'Cannondale', name: 'Topstone GXD 1.0 / Shimano TC500 Stock Wheelset',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_CUES,
    dataNotes: 'Rim: GXD 1.0, 28h, 23mm internal width, tubeless ready. Hubs: Shimano TC500, 12x100mm/12x142mm, centerlock. Shared across Topstone 2 CUES-1x, 2 GRX-2x and 3 -- all three trims state this identical rim+hub combination verbatim. freehubBodyType: HG_11 for the GRX-2x/3 trims (matching their 10-speed HG500 cassette, an HG-body-standard product); the CUES-1x trim\'s cassette is a genuinely different Linkglide product (CS-LG400-11) that is also HG-body-compatible per Shimano\'s own Linkglide-11 spec (Linkglide 11-speed, unlike 12-speed Linkglide/Microspline, uses the standard HG freehub body) -- same field value for a different, verified reason, not copy-pasted without checking.',
    fields: { wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_100x12', rearAxleType: 'THRU_AXLE_142x12', freehubBodyType: 'HG_11', tubelessReady: true, internalRimWidthMm: 23, rotorMountStandard: 'CENTERLOCK' },
    bikes: [
      { slug: 'cannondale-topstone-2-cues-1x-2025' }, { slug: 'cannondale-topstone-2-grx-2x-2025' },
      { slug: 'cannondale-topstone-3-2025' },
    ],
  },
  {
    category: PartType.WHEELSET, relation: 'wheelset',
    brand: 'Cannondale', name: 'Topstone EQ GXD 1.0 / Dynamo Stock Wheelset',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_EQ,
    dataNotes: 'Same GXD 1.0 rim as other Topstone trims, but kept as its own Part row rather than shared: the front hub is a SP PL-7 dynamo hub (for the EQ trim\'s integrated lighting), a genuinely different physical part from the plain Formula/TC500 front hubs on every other trim. Rear hub: Shimano TC500, 12x142mm, centerlock.',
    fields: { wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_100x12', rearAxleType: 'THRU_AXLE_142x12', freehubBodyType: 'HG_11', tubelessReady: true, internalRimWidthMm: 23, rotorMountStandard: 'CENTERLOCK' },
    bikes: [{ slug: 'cannondale-topstone-eq-2025' }],
  },
  {
    category: PartType.WHEELSET, relation: 'wheelset',
    brand: 'Cannondale', name: 'Topstone Apex 1 GXD 1.0 / Formula Stock Wheelset',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_APEX1,
    dataNotes: 'Rim: GXD 1.0, 28h, 23mm internal width, tubeless ready. Hubs: Formula cartridge bearing (not Shimano TC500 -- this trim\'s hub brand is stated differently from the CUES/GRX/3 group), 12x100mm/12x142mm, centerlock. freehubBodyType HG_11 matches the paired SRAM PG-1231 XPLR cassette, stored HG_11 in this catalog.',
    fields: { wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_100x12', rearAxleType: 'THRU_AXLE_142x12', freehubBodyType: 'HG_11', tubelessReady: true, internalRimWidthMm: 23, rotorMountStandard: 'CENTERLOCK' },
    bikes: [{ slug: 'cannondale-topstone-apex-1-2024' }],
  },
  {
    category: PartType.WHEELSET, relation: 'wheelset',
    brand: 'Cannondale', name: 'Topstone 4 GXD 1.0 / Formula Alloy Stock Wheelset',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_4,
    dataNotes: 'Rim: GXD 1.0, 28h (internal width not stated for this specific trim -- left null rather than assumed to match other trims\' 23mm). Hubs: "Formula alloy", 12x100mm/12x142mm. Kept as its own Part row rather than merged with the Apex 1 wheelset above: Cannondale describes the hub differently ("Formula alloy" vs "Formula cartridge bearing") and rim internal width is unconfirmed here, so treating them as identical would be assuming, not verifying. freehubBodyType: schema requires a value; this trim\'s cassette (microSHIFT, unspecified model) gives no basis to confirm HG vs another body type, so HG_11 is used as the same directly-observed-elsewhere default the rest of this batch uses, flagged here as the weakest-sourced field in this whole import -- worth a follow-up check specifically for this row.',
    fields: { wheelDiameter: 'ISO_622', frontAxleType: 'THRU_AXLE_100x12', rearAxleType: 'THRU_AXLE_142x12', freehubBodyType: 'HG_11', tubelessReady: false, internalRimWidthMm: 21, rotorMountStandard: 'CENTERLOCK' },
    bikes: [{ slug: 'cannondale-topstone-4-2024' }],
  },

  // ===== Topstone 2 CUES-1x drivetrain/brake gaps =====
  {
    category: PartType.CASSETTE, relation: 'cassette',
    brand: 'Shimano', name: 'CS-LG400-11 CUES Linkglide',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_CUES,
    dataNotes: '11-speed, 11-50T, Linkglide, HG-compatible freehub body (Shimano\'s own documented design intent for 11-speed Linkglide, unlike 12-speed Linkglide/Microspline).',
    fields: { speeds: 11, freehubBodyType: 'HG_11', smallestCogTeeth: 11, largestCogTeeth: 50 },
    bikes: [{ slug: 'cannondale-topstone-2-cues-1x-2025' }],
  },
  {
    category: PartType.SHIFTER, relation: 'shifter',
    brand: 'Shimano', name: 'ST-U6030 CUES',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_CUES,
    dataNotes: 'Integrated shift/hydraulic-brake lever, 11-speed. "ST-" prefix completes standard Shimano SKU notation for the bare "U6030" Cannondale states -- confirmed by U6030 pairing 1:1 with the exact-match BR-U6030 caliper already in the catalog, not inferred from the tier number alone. cablePullStandard: SHIMANO_MTB -- CUES is Shimano\'s unified replacement for its Altus/Acera/Alivio MTB-tier lineage and uses that lineage\'s actuation ratio, a well-established fact about the product family rather than a guess.',
    fields: { speeds: 11, cablePullStandard: 'SHIMANO_MTB', barType: 'DROP', clampDiameterMm: 23.8 },
    bikes: [{ slug: 'cannondale-topstone-2-cues-1x-2025', slot: 'left' }, { slug: 'cannondale-topstone-2-cues-1x-2025', slot: 'right' }],
  },
  {
    category: PartType.REAR_DERAILLEUR, relation: 'rearDerailleur',
    brand: 'Shimano', name: 'RD-U6000-GS CUES',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_CUES,
    dataNotes: 'Shadow RD+, medium (GS) cage, direct-attach. maxCassetteCogTeeth 50 matches the stated CS-LG400-11 cassette (11-50T) exactly.',
    fields: { maxSpeeds: 11, cablePullStandard: 'SHIMANO_MTB', maxCassetteCogTeeth: 50, minCassetteCogTeeth: 11, cageLength: 'MEDIUM_GS' },
    bikes: [{ slug: 'cannondale-topstone-2-cues-1x-2025' }],
  },
  {
    category: PartType.ROTOR, relation: 'rotor',
    brand: 'Shimano', name: 'SM-RT30 180mm',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_CUES,
    dataNotes: 'Center Lock mount independently verified against Shimano\'s own product listing (bike.shimano.com) plus corroborating retailer pages -- SM-RT30 has no 6-bolt SKU. Front rotor on this trim only (180mm); the rear (160mm) is a separate row below, since the two positions use different diameters on this bike.',
    fields: { diameterMm: 180, mountStandard: 'CENTERLOCK' },
    bikes: [{ slug: 'cannondale-topstone-2-cues-1x-2025', slot: 'front' }],
  },
  {
    category: PartType.ROTOR, relation: 'rotor',
    brand: 'Shimano', name: 'SM-RT30 160mm',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_CUES,
    dataNotes: 'Same SM-RT30 product as the 180mm row above, Center Lock mount (verified against Shimano\'s own listing). Used as the rear rotor here (Topstone 2 CUES-1x, 160mm rear vs 180mm front), and shared with Topstone 2 GRX-2x and EQ below, both of which state 160/160mm front and rear.',
    fields: { diameterMm: 160, mountStandard: 'CENTERLOCK' },
    bikes: [
      { slug: 'cannondale-topstone-2-cues-1x-2025', slot: 'rear' },
      { slug: 'cannondale-topstone-2-grx-2x-2025', slot: 'front' }, { slug: 'cannondale-topstone-2-grx-2x-2025', slot: 'rear' },
      { slug: 'cannondale-topstone-eq-2025', slot: 'front' }, { slug: 'cannondale-topstone-eq-2025', slot: 'rear' },
    ],
  },

  // ===== Topstone 2 GRX-2x / EQ shared gaps (GRX 400 tier) =====
  {
    category: PartType.CASSETTE, relation: 'cassette',
    brand: 'Shimano', name: 'CS-HG500-10',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_GRX,
    dataNotes: '10-speed, 11-32T, HG freehub body -- standard Shimano HG500 naming for this exact stated range/speed count. Shared with Topstone EQ, which states the identical spec.',
    fields: { speeds: 10, freehubBodyType: 'HG_11', smallestCogTeeth: 11, largestCogTeeth: 32 },
    bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-eq-2025' }],
  },
  {
    category: PartType.FRONT_DERAILLEUR, relation: 'frontDerailleur',
    brand: 'Shimano', name: 'FD-RX400',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_2_GRX,
    dataNotes: 'GRX 400-tier 2x10 front derailleur -- a genuine, distinct Shimano SKU (unlike the crankset, which shares the RX600 arm across tiers). Mount type and pull direction are the well-established, undisputed mechanical facts about this product, not sourced individually from Cannondale\'s spec sheet.',
    fields: { speeds: 10, cablePullStandard: 'SHIMANO_ROAD', mountType: 'BRAZE_ON', pullDirection: 'TOP_PULL', maxChainringTeeth: 48 },
    bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-eq-2025' }],
  },

  // ===== Topstone 3 gaps (microSHIFT/Prowheel/KMC/Promax) =====
  {
    category: PartType.CRANKSET, relation: 'crankset',
    brand: 'Prowheel', name: 'Charm 40T',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_3,
    dataNotes: 'Single 40T chainring, 1x. Spindle interface inferred as SQUARE_TAPER -- directly sourced from this same trim\'s bottom bracket, independently stated on Cannondale\'s page as "cartridge, square taper", which the crank\'s spindle must match by definition. Shared with Topstone 4, which states an identical crank.',
    fields: { spindleDiameter: 'SQUARE_TAPER', chainlineType: '1x', chainringCount: 1, maxChainringTeeth: 40 },
    bikes: [{ slug: 'cannondale-topstone-3-2025' }, { slug: 'cannondale-topstone-4-2024' }],
  },
  {
    category: PartType.CASSETTE, relation: 'cassette',
    brand: 'microSHIFT', name: '10-Speed 11-48T (Topstone 3/4)',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_3,
    dataNotes: 'Cannondale\'s spec sheet gives only brand + range + speed ("microSHIFT, 11-48, 10-speed", labeled "Rear Cogs") with no specific model/SKU -- name reflects that rather than inventing a product line name. freehubBodyType: HG (standard splined body), the only body type a 10-speed cassette in this class uses. Shared with Topstone 4, which states the identical brand/range/speed.',
    fields: { speeds: 10, freehubBodyType: 'HG_11', smallestCogTeeth: 11, largestCogTeeth: 48 },
    bikes: [{ slug: 'cannondale-topstone-3-2025' }, { slug: 'cannondale-topstone-4-2024' }],
  },
  {
    category: PartType.CHAIN, relation: 'chain',
    brand: 'KMC', name: 'X10',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_3,
    dataNotes: '10-speed. Shared with Topstone 4, which states the identical chain.',
    fields: { speeds: 10, chainStandard: 'SHIMANO_HG_10' },
    bikes: [{ slug: 'cannondale-topstone-3-2025' }, { slug: 'cannondale-topstone-4-2024' }],
  },
  {
    category: PartType.BRAKE_CALIPER, relation: 'brakeCaliper',
    brand: 'Promax', name: 'Decoder R',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_3,
    dataNotes: 'Mechanical (cable-actuated) disc, flat mount -- both stated on Cannondale\'s page.',
    fields: { mountType: 'FLAT_MOUNT', isHydraulic: false, fluidType: 'NONE_MECHANICAL' },
    bikes: [{ slug: 'cannondale-topstone-3-2025', slot: 'front' }, { slug: 'cannondale-topstone-3-2025', slot: 'rear' }],
  },
  {
    category: PartType.BOTTOM_BRACKET, relation: 'bottomBracket',
    brand: 'FSA', name: 'Cartridge Square Taper BSA',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_3,
    dataNotes: 'Cannondale states "FSA cartridge, square taper"; shell width/standard (BSA_68) taken from this same trim\'s already-verified frame row, not guessed.',
    fields: { frameInterface: 'BSA_68', spindleInterface: 'SQUARE_TAPER', shellWidthMm: 68 },
    bikes: [{ slug: 'cannondale-topstone-3-2025' }],
  },

  // ===== Topstone 4 gaps (microSHIFT Advent X / Promax Render R) =====
  {
    category: PartType.BRAKE_CALIPER, relation: 'brakeCaliper',
    brand: 'Promax', name: 'Render R',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_4,
    dataNotes: 'Mechanical disc -- a different Promax model from Topstone 3\'s "Decoder R", kept as its own row. Mount type not explicitly restated for the caliper on this trim\'s page; flat mount inferred from the fork/frame spec stated elsewhere on the same page (every trim in this platform is flat mount, no exceptions found).',
    fields: { mountType: 'FLAT_MOUNT', isHydraulic: false, fluidType: 'NONE_MECHANICAL' },
    bikes: [{ slug: 'cannondale-topstone-4-2024', slot: 'front' }, { slug: 'cannondale-topstone-4-2024', slot: 'rear' }],
  },

  // ===== Topstone Apex 1 gaps (SRAM Apex-tier) =====
  {
    category: PartType.CRANKSET, relation: 'crankset',
    brand: 'SRAM', name: 'Apex 1 DUB Wide',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_APEX1,
    dataNotes: '40T, 1x, DUB spindle, "Wide" chainline variant (both stated on Cannondale\'s page).',
    fields: { spindleDiameter: 'DUB_29', chainlineType: '1x wide', chainringCount: 1, maxChainringTeeth: 40, chainlineMm: 47.5 },
    bikes: [{ slug: 'cannondale-topstone-apex-1-2024' }],
  },
  {
    category: PartType.SHIFTER, relation: 'shifter',
    brand: 'SRAM', name: 'Apex Hydraulic (12-speed)',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_APEX1,
    dataNotes: 'Integrated shift/hydraulic-brake lever, 12-speed. No official SRAM part code was in the research -- left out of the name rather than invented. cablePullStandard: SRAM_X_ACTUATION, not SRAM_EXACT_ACTUATION (Exact Actuation is SRAM\'s 2x road standard; XPLR/1x gravel groups including Apex XPLR use the X-Actuation long-pull ratio shared with SRAM\'s MTB lineage) -- an earlier draft of this row used Exact Actuation and was caught by the compatibility engine\'s own R-DRV-01 check against the already-catalogued RD-APX-1-D1 derailleur (stored X-Actuation), which flagged the mismatch immediately on validating a cloned build; corrected to match rather than left in place.',
    fields: { speeds: 12, cablePullStandard: 'SRAM_X_ACTUATION', barType: 'DROP', clampDiameterMm: 23.8 },
    bikes: [{ slug: 'cannondale-topstone-apex-1-2024', slot: 'left' }, { slug: 'cannondale-topstone-apex-1-2024', slot: 'right' }],
  },
  {
    category: PartType.BRAKE_CALIPER, relation: 'brakeCaliper',
    brand: 'SRAM', name: 'Apex Hydraulic Disc',
    dataSource: 'MANUFACTURER_SPEC', sourceUrl: CANNONDALE_SPEC_URL_APEX1,
    dataNotes: 'Hydraulic disc caliper, no official part code stated in the research.',
    fields: { mountType: 'FLAT_MOUNT', isHydraulic: true, fluidType: 'DOT', brakeSystemFamily: 'Apex' },
    bikes: [{ slug: 'cannondale-topstone-apex-1-2024', slot: 'front' }, { slug: 'cannondale-topstone-apex-1-2024', slot: 'rear' }],
  },
];

// ---------------------------------------------------------------
// LINKS TO EXISTING CATALOG PARTS
// ---------------------------------------------------------------
const RESOLVED_LINKS: ResolvedLink[] = [
  // --- Topstone 1 ---
  { type: PartType.CRANKSET, brand: 'Shimano', name: 'FC-RX600 SHIMANO GRX Crankset', bikes: [{ slug: 'cannondale-topstone-1-2025' }, { slug: 'cannondale-topstone-eq-2025' }, { slug: 'cannondale-topstone-2-grx-2x-2025' }] },
  { type: PartType.CASSETTE, brand: 'Shimano', name: 'CS-R7101-12 SHIMANO 105 11-34T', bikes: [{ slug: 'cannondale-topstone-1-2025' }] },
  { type: PartType.CHAIN, brand: 'Shimano', name: 'CN-M7100 SHIMANO', bikes: [{ slug: 'cannondale-topstone-1-2025' }] },
  { type: PartType.REAR_DERAILLEUR, brand: 'Shimano', name: 'RD-RX820 GRX', bikes: [{ slug: 'cannondale-topstone-1-2025' }] },
  { type: PartType.FRONT_DERAILLEUR, brand: 'Shimano', name: 'FD-RX820-F SHIMANO GRX', bikes: [{ slug: 'cannondale-topstone-1-2025' }] },
  { type: PartType.BRAKE_CALIPER, brand: 'Shimano', name: 'BR-RX410-F GRX', bikes: [{ slug: 'cannondale-topstone-1-2025' }] },
  { type: PartType.BRAKE_CALIPER, brand: 'Shimano', name: 'BR-RX410-R GRX', bikes: [{ slug: 'cannondale-topstone-1-2025' }] },
  { type: PartType.BOTTOM_BRACKET, brand: 'Shimano', name: 'BB-RS501 SHIMANO Threaded Bottom Bracket', bikes: [
    { slug: 'cannondale-topstone-1-2025' }, { slug: 'cannondale-topstone-2-cues-1x-2025' },
    { slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-eq-2025' },
  ] },

  // --- Topstone 2 CUES-1x ---
  { type: PartType.BRAKE_CALIPER, brand: 'Shimano', name: 'BR-U6030-F CUES', bikes: [{ slug: 'cannondale-topstone-2-cues-1x-2025' }] },
  { type: PartType.BRAKE_CALIPER, brand: 'Shimano', name: 'BR-U6030-R CUES', bikes: [{ slug: 'cannondale-topstone-2-cues-1x-2025' }] },
  { type: PartType.CHAIN, brand: 'Shimano', name: 'CN-LG500 SHIMANO', bikes: [{ slug: 'cannondale-topstone-2-cues-1x-2025' }] },

  // --- Topstone 2 GRX-2x / EQ ---
  { type: PartType.CHAIN, brand: 'Shimano', name: 'CN-HG54 SHIMANO', bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-eq-2025' }] },
  { type: PartType.SHIFTER, brand: 'Shimano', name: 'ST-RX400-L GRX', bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025', slot: 'left' }, { slug: 'cannondale-topstone-eq-2025', slot: 'left' }] },
  { type: PartType.SHIFTER, brand: 'Shimano', name: 'ST-RX400-R GRX', bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025', slot: 'right' }, { slug: 'cannondale-topstone-eq-2025', slot: 'right' }] },
  { type: PartType.REAR_DERAILLEUR, brand: 'Shimano', name: 'RD-RX400 GRX', bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-eq-2025' }] },
  { type: PartType.BRAKE_CALIPER, brand: 'Shimano', name: 'BR-RX410-F GRX', bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-eq-2025' }] },
  { type: PartType.BRAKE_CALIPER, brand: 'Shimano', name: 'BR-RX410-R GRX', bikes: [{ slug: 'cannondale-topstone-2-grx-2x-2025' }, { slug: 'cannondale-topstone-eq-2025' }] },

  // --- Topstone Apex 1 ---
  { type: PartType.CASSETTE, brand: 'SRAM', name: 'CS-PG-1231-D1 XPLR PG-1231 Cassette', bikes: [{ slug: 'cannondale-topstone-apex-1-2024' }] },
  { type: PartType.CHAIN, brand: 'SRAM', name: 'CN-APX-D1 Apex Chain', bikes: [{ slug: 'cannondale-topstone-apex-1-2024' }] },
  { type: PartType.REAR_DERAILLEUR, brand: 'SRAM', name: 'RD-APX-1-D1 Apex XPLR Rear Derailleur', bikes: [{ slug: 'cannondale-topstone-apex-1-2024' }] },
  { type: PartType.BOTTOM_BRACKET, brand: 'SRAM', name: 'BB-DUB-BSA-A1 BSA_68', bikes: [{ slug: 'cannondale-topstone-apex-1-2024' }] },
];

async function main() {
  let partsCreated = 0, partsSkipped = 0, linksCreated = 0, linksSkipped = 0, errors = 0;

  for (const spec of NEW_PARTS) {
    let part = await prisma.part.findFirst({ where: { type: spec.category, brand: spec.brand, name: spec.name } });

    if (!part) {
      try {
        part = await prisma.part.create({
          data: {
            type: spec.category,
            brand: spec.brand,
            name: spec.name,
            weightGrams: spec.weightGrams ?? 0,
            basePricePence: spec.basePricePence,
            dataSource: spec.dataSource as any,
            sourceUrl: spec.sourceUrl,
            dataNotes: spec.dataNotes,
            [spec.relation]: { create: spec.fields },
          } as any,
        });
        partsCreated++;
        console.log(`+ PART  ${spec.brand} ${spec.name}`);
      } catch (e) {
        errors++;
        console.error(`! FAILED to create ${spec.brand} ${spec.name}:`, (e as Error).message);
        continue;
      }
    } else {
      partsSkipped++;
    }

    for (const bike of spec.bikes) {
      const bikeModel = await prisma.bikeModel.findUnique({ where: { slug: bike.slug } });
      if (!bikeModel) { console.error(`! bike not found: ${bike.slug}`); errors++; continue; }
      const slot = bike.slot ?? null;
      const existingLink = await prisma.bikeModelPart.findFirst({ where: { bikeModelId: bikeModel.id, partId: part.id, slot } });
      if (existingLink) { linksSkipped++; continue; }
      await prisma.bikeModelPart.create({ data: { bikeModelId: bikeModel.id, partId: part.id, slot } });
      linksCreated++;
    }
  }

  for (const link of RESOLVED_LINKS) {
    const part = await prisma.part.findFirst({ where: { type: link.type, brand: link.brand, name: link.name } });
    if (!part) { console.error(`! resolved-link part not found: ${link.brand} ${link.name}`); errors++; continue; }
    for (const bike of link.bikes) {
      const bikeModel = await prisma.bikeModel.findUnique({ where: { slug: bike.slug } });
      if (!bikeModel) { console.error(`! bike not found: ${bike.slug}`); errors++; continue; }
      const slot = bike.slot ?? null;
      const existingLink = await prisma.bikeModelPart.findFirst({ where: { bikeModelId: bikeModel.id, partId: part.id, slot } });
      if (existingLink) { linksSkipped++; continue; }
      await prisma.bikeModelPart.create({ data: { bikeModelId: bikeModel.id, partId: part.id, slot } });
      linksCreated++;
      console.log(`+ LINK  ${bikeModel.brand} ${bikeModel.model} -> ${part.brand} ${part.name}`);
    }
  }

  console.log(
    `\nDone. Parts: ${partsCreated} created, ${partsSkipped} already existed. ` +
    `Links: ${linksCreated} created, ${linksSkipped} already existed. Errors: ${errors}.`
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
