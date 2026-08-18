// scripts/import/import-sourced-frames.ts
//
// Run with: npx tsx scripts/import/import-sourced-frames.ts
//
// Writes frame platforms sourced directly from manufacturer and
// retailer pages (see the Aug 15 sourcing pass —
// scratchpad/99spokes-sourcing.html, and SESSION_LOG.md §12.5/§14).
// Each platform is one physical mould shared across several 99 Spokes
// model-year/trim rows, grouped by (maker, family, material,
// suspension) per that methodology, not by a single model name — and
// checked for hidden generation/BB-standard splits within that
// grouping before being trusted as one mould (see the Topstone Carbon
// case in SESSION_LOG.md §14, which failed that check and had to be
// split further rather than sourced as filed).
//
// PROVENANCE
// ----------
// Every field below is either:
//   - "stated": read directly off a manufacturer page or corroborated
//     by 3+ independent component-brand spec sheets in the 99 Spokes
//     raw text.
//   - "derived": a reasonable reading of stated text that isn't a
//     verbatim number (e.g. "tapered 1-1/8in steerer" -> our tapered
//     enum), noted per field.
// A field that can't be confirmed at either tier is left null rather
// than guessed — the compatibility engine already treats null as
// "unknown" and stays quiet (see engine.ts's header comment). A
// platform where a REQUIRED field can't be confirmed is dropped
// entirely rather than shipped with a gap or a thin inference (see
// the removed Cannondale Topstone alloy platform, below the Grizl 6
// block, for a worked example and the reasoning against not doing
// this by half-measures).
//
// This run (Aug 15, continuation session) resolved three fields the
// original pass left open, on a second, more targeted search each:
//   - Canyon Grizl 6 (alloy) maxTyreWidthMm: 50mm, corroborated by two
//     independent MY2024-dated sources (opticycles.com's dated model
//     page + general 2024 reviews) rather than the MY2026-redesign
//     page the original pass flagged as unsafe to use here.
//   - Canyon Grizl 6 (alloy) hangerStandard: PROPRIETARY, not left
//     null. Searching for "Grizl UDH" only ever surfaces the CF or the
//     2026 redesign; searching for the hanger itself instead found two
//     independent retailer sources naming the same Canyon part number
//     (GP0252-01) for this exact model.
//   - Cannondale Synapse Carbon MY2025 seatpostDiameterMm: resolved to
//     null, not 27.2mm. The 2025 Synapse replaced its round 27.2mm
//     post with a proprietary D-shaped aero post (shared with SuperSix
//     Evo) as part of a flattened seat-tube redesign — there is no
//     round diameter to record. See dataNotes on that frame.
// A fourth field -- Cannondale Topstone (alloy) hangerStandard -- got
// the same renewed effort and still came up short of a real source,
// so that platform (15 bikes) was dropped rather than kept with a gap.
//
// AUG 16 PASS (catalogue growth, item 7 of the competitor-comparison
// priority list): four more platforms added at the end of PLATFORMS
// below -- Giant Defy Advanced (Carbon), Giant Revolt Advanced
// (Carbon), Trek Domane SL/SLR Gen 4 (Carbon), Trek Checkpoint ALR
// Gen 3 (Aluminium). Two things specifically worth flagging from this
// pass, both caught by the same "don't trust the first search result"
// discipline the Aug 15 pass established:
//   - Giant's headset system (both "OverDrive" on Revolt and
//     "OverDrive 2" on Defy) uses a 1-1/4in lower bearing on road/
//     gravel frames, confirmed against Giant's own OD2 product specs
//     (steedcycles.com, shockcraft.co.nz, edgesportsuk.com all agree:
//     "Road models feature 1 1/8-inch top and 1 1/4-inch bottom
//     bearings" -- only the MTB variant of OD2 uses 1-1/2in). Neither
//     Giant platform's headsetTaper is set to TAPERED_1_5_TO_1_125:
//     that enum value is 1.5in lower, which is simply a different,
//     wider bearing than what either Giant frame actually has. There
//     is no enum member for Giant's own pairing, so both are left
//     null rather than mapped to the closest-sounding wrong answer.
//   - A first-pass web search for "Trek Domane Gen 4 ... T47 ...
//     UDH" returned a summary that read as confirming both for Gen 4.
//     Direct-fetching the actual cited article (road.cc, "Trek
//     ditches IsoSpeed on new Domane") showed the T47/UDH claim was
//     about the then-new GEN 5 Domane the article was announcing, in
//     explicit contrast to Gen 4 -- not a statement about Gen 4 at
//     all. Gen 4 (the platform actually being sourced here, since
//     that's what the 2025 bikes in this catalogue are) needed its
//     own separate, targeted verification: T47 turned out to still be
//     right for Gen 4 (Trek moved to T47 back at 3rd-gen Domane in
//     2020, confirmed independently by trainabsolute.com's Gen 4
//     launch coverage -- "the T47 bottom bracket also continues on"),
//     but the hanger is NOT UDH on Gen 4 -- it's a Trek-proprietary
//     part (W524188, per Trek's own MY23 Domane SL/SLR service
//     manual, cross-referenced by elanusparts' compatibility listing
//     for "Trek Domane SL / SLR Gen.4 2023"). Trek's Gen 5 redesign
//     is precisely the kind of same-family-name, different-generation
//     trap this file's methodology exists to catch -- see the header
//     paragraph above on grouping by mould, not model name, and the
//     Grizl-6-vs-2026-redesign and Endurace-CF-vs-CFR cases already
//     documented below for the same pattern within a single pass
//     rather than across passes.
//
// msrpPence is left null for every bike here. 99 Spokes carries a
// USD price for some rows, but converting that to a UK RRP would mean
// inventing an exchange rate and retail markup — exactly the kind of
// fabricated number this project's provenance system exists to rule
// out. Contrast with prisma/seed.ts's demo bikes, which use a labelled
// mechanical USD->GBP conversion and are explicitly marked as such.

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PartType } from '../../lib/generated/prisma-node/client';

// Prisma 7 has no datasource url in the schema, so the client takes a driver
// adapter instead. node-postgres over TCP rather than Neon's HTTP driver:
// the nested creates below run in transactions, which HTTP cannot do.
// Uses the DIRECT (non-pooled) URL from .env.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type FrameDetail = Record<string, unknown>;

type Platform = {
  brand: string;
  frameName: string;
  sourceUrl: string;
  dataSource: 'MANUFACTURER_SPEC' | 'RETAILER_LISTING';
  dataNotes: string;
  detail: FrameDetail;
  discipline: string;
  bikes: { model: string; year: number; variant?: string }[];
};

const PLATFORMS: Platform[] = [
  {
    brand: 'Canyon',
    frameName: 'Grizl CF (2024-2025)',
    sourceUrl: 'https://www.canyon.com/en-gb/gravel-bikes/adventure/grizl/',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: bbShellStandard (BB86, "PF 86,5" -- file and canyon.com agree), rearAxleType, ' +
      'wheelDiameter, maxTyreWidthMm (54mm stated), hangerStandard (UDH, manufacturer-confirmed -- ' +
      'the 99 Spokes hanger column itself is blank for this row), seatpostDiameterMm (27.2mm). ' +
      'DERIVED (not verbatim): headsetTaper from "tapered, 1-1/8in upper" in two reviews (lower ' +
      'diameter not stated, only the tapered value exists in our enum); rearBrakeMountType from ' +
      'flat mount being universal on this class, not an explicit spec line. ' +
      'NOT SET: geometry (reach/stack/standover), chainstay length, fork travel, shock figures -- ' +
      'not part of this sourcing pass. bbShellWidthMm left null: BB86 corresponds to an 86.5mm ' +
      'shell in the raw spec text, but our enum member is named for the nominal 86mm class and no ' +
      'other BB86 frame in this catalogue sets a width either -- see R-BB-03, which no-ops when null.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 54,
      hangerStandard: 'UDH',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Grizl CF SL 8 AXS', year: 2025 },
      { model: 'Grizl CF SLX 8 Di2 GRC', year: 2025 },
      { model: 'Grizl CF SLX 8 Di2', year: 2024 },
      { model: 'Grizl CF SL 8 1by', year: 2024 },
      { model: 'Grizl CF SL 6 AXS', year: 2024 },
      { model: 'Grizl CF SL 8 Eagle', year: 2025 },
      { model: 'Grizl CF SL 8 Eagle', year: 2024, variant: '2024' },
      { model: 'Grizl CF SLX 8 Di2 GRC', year: 2024, variant: '2024' },
      { model: 'Grizl CF SL 8 1by EKAR', year: 2024 },
      { model: 'Grizl CF SL 7 eTap', year: 2024 },
      { model: 'Grizl CF SL 7', year: 2024 },
      { model: 'Grizl CF SLX 8 EKAR', year: 2024 },
    ],
  },
  {
    brand: 'Canyon',
    frameName: 'Grizl 6 (Aluminium, 2024-2025)',
    sourceUrl: 'https://www.canyon.com/en-gb/gravel-bikes/adventure/grizl/',
    dataSource: 'RETAILER_LISTING',
    dataNotes:
      'CHECKED: bbShellStandard (BB86, corroborated across 4 independent component brands -- ' +
      'Token, FSA, SRAM, Shimano -- all stating "PF 86,5" for this mould). This is MY2024-2025 ' +
      'only: Canyon redesigned the aluminium Grizl for 2026 to T47 threaded, and its current ' +
      'product page describes that redesign, not these bikes -- do not carry BB86 forward to a ' +
      '2026+ row. maxTyreWidthMm (50mm) corroborated by two independent MY2024-dated sources ' +
      '(opticycles.com\'s dated model page, general 2024 reviews) -- NOT the 54mm figure that ' +
      'only appears on the current MY2026 page, which is a different frame. seatpostDiameterMm ' +
      '(27.2mm) and rearAxleType stated. DERIVED: headsetTaper from "standard 1-1/8in steerer" ' +
      '(no "tapered" wording, unlike the CF -- read as straight); rearBrakeMountType as flat mount, ' +
      'not an explicit line; dropoutType as THRU_AXLE (definitionally true of a non-UDH thru-axle ' +
      'frame, not an independent guess). RESOLVED on a second pass, not left null: hangerStandard is ' +
      'PROPRIETARY, not UDH. Two independent retailer sources -- forcellinocambio.com, whose product ' +
      'is titled specifically "Canyon Grizl 6 Derailleur hanger" (not the CF), and fixmymechhanger.co.uk ' +
      '-- both name the same Canyon part number (GP0252-01 / EP0920-01, a replaceable hanger shared ' +
      'across several non-UDH Canyon lines) for this exact model. The earlier "unresolved" note was ' +
      'from searching for "Grizl UDH", which only ever surfaces the CF or the 2026 redesign -- ' +
      'searching for the hanger itself, rather than assuming UDH and looking for confirmation of it, ' +
      'found the real answer.',
    discipline: 'gravel',
    detail: {
      material: 'ALUMINIUM',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'THRU_AXLE',
      headsetTaper: 'STRAIGHT_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 50,
      hangerStandard: 'PROPRIETARY',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Grizl 5', year: 2025 },
      { model: 'Grizl 6 RAW', year: 2024 },
      { model: 'Grizl 7 RAW', year: 2024 },
      { model: 'Grizl 7', year: 2024 },
      { model: 'Grizl 6 1BY', year: 2024 },
      { model: 'Grizl 6', year: 2024 },
      { model: 'Grizl 8 1by', year: 2024 },
      { model: 'Grizl 7 1by', year: 2024 },
      { model: 'Grizl 5', year: 2024, variant: '2024' },
    ],
  },
  {
    // Briefly dropped, then restored: the policy on unconfirmable fields
    // changed mid-session from "drop the platform" to "leave that field
    // null, keep everything else that IS confirmed" -- the priority is
    // real bikes with real specs in, not a perfect-or-nothing bar on
    // every optional field. hangerStandard here is null, not guessed:
    // Cannondale's own hanger-finder tool tracks a proprietary Alloy
    // part through 2022 with no 2023-2025 entry either way; the only
    // UDH claim anywhere is for the unrelated, separately-redesigned
    // 2025 Topstone CARBON; the bike's own current spec page names
    // BSA/thru-axle/tapered but never mentions UDH -- suggestive, not a
    // sourced part number the way Canyon Grizl 6's hanger turned out to
    // be (contrast that platform's dataNotes).
    brand: 'Cannondale',
    frameName: 'Topstone (Aluminium, 2024-2025)',
    sourceUrl: 'https://www.cannondale.com/en-gb/bikes/gravel-adventure/topstone/topstone-1',
    dataSource: 'RETAILER_LISTING',
    dataNotes:
      'CHECKED: bbShellStandard (BSA_68, "Shimano BSA 68" / "SRAM DUB BSA Wide" stated directly on ' +
      'most rows), rearAxleType, wheelDiameter, maxTyreWidthMm (45mm), rearBrakeMountType (flat ' +
      'mount, stated), seatpostDiameterMm (27.2mm). DERIVED: headsetTaper from "tapered headtube" ' +
      'wording -- exact taper spec (e.g. 1.5 to 1-1/8in vs a different split) not numbered anywhere ' +
      'found, so this assumes the industry-standard tapered pairing our enum offers. LEFT NULL, not ' +
      'guessed: hangerStandard -- every "Topstone UDH" source found describes the 2025 TOPSTONE ' +
      'CARBON, a separate, newly-redesigned frame launched the same year (road.cc: "revamped ' +
      'Topstone Carbon"); Cannondale\'s own hanger-finder tool has no 2023-2025 Topstone Alloy entry; ' +
      'nothing found confirms either UDH or the specific proprietary part for this alloy mould in ' +
      'those years.',
    discipline: 'gravel',
    detail: {
      material: 'ALUMINIUM',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 45,
      hangerStandard: null,
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Topstone EQ', year: 2025 },
      { model: 'Topstone 1', year: 2025 },
      { model: 'Topstone 2 GRX - 2x', year: 2025 },
      { model: 'Topstone 2 CUES - 1x', year: 2025 },
      { model: 'Topstone 3', year: 2025 },
      { model: 'Topstone 2', year: 2024 },
      { model: 'Topstone 4', year: 2024 },
      { model: 'Topstone 1', year: 2024, variant: '2024' },
      { model: 'Topstone 0', year: 2024 },
      { model: "Topstone Women's 2", year: 2024 },
      { model: 'Topstone Apex 1', year: 2024 },
      { model: 'Topstone LTD', year: 2024 },
      { model: 'Topstone 3', year: 2024, variant: '2024' },
      { model: 'Topstone 2 CUES - 1x', year: 2024, variant: '2024' },
      { model: 'Topstone 2 GRX - 2x', year: 2024, variant: '2024' },
    ],
  },
  {
    // NOTE: the real 99 Spokes index for (Canyon, Endurace, Carbon, Rigid)
    // turned out to span 12 rows across 2025-2026 including two "Endurace
    // CFR" rows -- CFR is Canyon's top tier and, per an outside source, the
    // one that got a 2026 redesign to UDH, unlike this CF/SLX tier. One of
    // the two CFR rows even has an internally inconsistent raw BB mention
    // ("Shimano Pressfit BB92" alongside "PF 86,5" in the same string) that
    // the other 11 rows don't share. Both CFR rows are excluded here as a
    // different, unverified mould -- only the 10 CF/SLX rows are included,
    // all of which state a consistent PF86/86.5 bottom bracket.
    brand: 'Canyon',
    frameName: 'Endurace CF / CF SLX (2025-2026)',
    sourceUrl: 'https://www.canyon.com/en-us/road-bikes/endurance-bikes/endurace/cf/endurace-cf-5/4551.html',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED against Canyon\'s own product page and geometry PDF: bbShellStandard (BB86, "Bottom ' +
      'bracket standard PF 86" -- corroborated a second time by Canyon\'s own bottom-bracket-' +
      'measurements support article, independent of the product page, and consistent across all 10 ' +
      'CF/SLX rows in the raw 99 Spokes text -- see the platform-level note above on why the 2 CFR ' +
      'rows are excluded rather than trusted as the same mould), rearAxleType ("Axle dimension ' +
      '12x142mm"), wheelDiameter ("28in" = ISO_622), seatpostDiameterMm ("Seat Post Diameter in mm: ' +
      '27.2", from Canyon\'s geometry PDF). DERIVED: rearBrakeMountType as flat mount, not an ' +
      'explicit line -- universal on 2023+ road disc frames; maxTyreWidthMm (35mm) from a review/' +
      'retailer-tier source, not fetched directly from a Canyon page; hangerStandard as PROPRIETARY ' +
      '-- explicitly contrasted against the CFR in an outside source ("the newer Endurace CFR has ' +
      'adopted UDH... the 2025 Endurace CF models do not appear to feature UDH"), but no exact hanger ' +
      'part number was found the way Grizl 6\'s was, so this is a weaker derived claim, not a stated ' +
      'one. LEFT NULL, not guessed: headsetTaper -- every source found states headset bearing part ' +
      'numbers (IS44/IS44) rather than the taper class those bearings imply, and that mapping is not ' +
      'reliable enough to invert with confidence. headsetTaper is nullable in the schema specifically ' +
      'because of cases like this one -- see prisma/schema.prisma and R-HS-01\'s null guard.',
    discipline: 'road',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 35,
      hangerStandard: 'PROPRIETARY',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Endurace CF SLX 8 Di2', year: 2026 },
      { model: 'Endurace CF 6', year: 2026 },
      { model: 'Endurace CF SLX 7 Di2', year: 2026 },
      { model: 'Endurace CF 7 Di2', year: 2026 },
      { model: 'Endurace CF 7', year: 2026 },
      { model: 'Endurace CF SLX 7 Di2 AR46', year: 2025 },
      { model: 'Endurace CF 7 Di2', year: 2025 },
      { model: 'Endurace CF SLX 8 Di2 GRC', year: 2025 },
      { model: 'Endurace CF 8 Di2', year: 2025 },
      { model: 'Endurace CF 7 Di2 LN', year: 2025 },
    ],
  },
  {
    brand: 'Cannondale',
    frameName: 'Synapse Carbon (2025)',
    sourceUrl: 'https://www.cannondale.com/en/bikes/road/endurance/synapse-carbon/synapse-carbon-4/2025',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'Scoped to MY2025 only -- the 2024 rows in this mould still mix BSA and BB30a shells (one ' +
      'confirmed Ai-offset outlier), so "family" alone would not be one physical frame there; not ' +
      'safe to cover with this spec. CHECKED: bbShellStandard (BSA_68), rearAxleType, headsetTaper ' +
      '("Integrated, 1-1/8in-1-1/2in" stated), rearBrakeMountType, wheelDiameter, hangerStandard ' +
      '(UDH, stated). DERIVED: maxTyreWidthMm (42mm) from a single general-search source, not a ' +
      'direct product-page fetch -- treat as the weakest field on this platform. ' +
      'RESOLVED, not left as originally recorded: seatpostDiameterMm is null, not 27.2mm. The 2025 ' +
      'Synapse replaced its round 27.2mm post with a proprietary D-shaped aero post (shared design ' +
      'language with SuperSix Evo) as part of a flattened seat-tube redesign -- "last year\'s round ' +
      '27.2mm-diameter post has also given way to a D-shaped profile" (nminus1bikes.substack.com ' +
      'overview). There is no round diameter to record for this frame; a standard round seatpost ' +
      'will not fit it at all, which is itself worth surfacing once this schema can express ' +
      'proprietary post profiles -- for now, null correctly signals "not a standard round post" ' +
      'rather than implying compatibility with anything.',
    discipline: 'endurance',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 42,
      hangerStandard: 'UDH',
      dropoutType: 'UDH',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Synapse Carbon 4', year: 2025 },
      { model: 'Synapse Carbon 2', year: 2025 },
      { model: 'Synapse Carbon 1', year: 2025 },
      { model: 'Synapse Carbon 5', year: 2025 },
      { model: 'Synapse LAB71 SmartSense', year: 2025 },
    ],
  },
  {
    brand: 'Trek',
    frameName: 'Checkpoint SL/SLR (Gen 2-3, 2024-2025)',
    sourceUrl: 'https://www.trekbikes.com/gb/en_GB/bikes/gravel-bikes/checkpoint/checkpoint-sl/',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'Was blocked on the missing T47_85_5 enum value (BbShellStandard) -- now unblocked, that ' +
      'migration having landed separately. All 13 bikes in this platformKey (Trek::Checkpoint:: ' +
      'Carbon::Rigid, spanning SL and SLR trims and Gen 2/Gen 3 labels) state identical raw bottom- ' +
      'bracket text -- "T47 threaded, internal bearing" -- across every single row, corroborating ' +
      'one shared shell platform regardless of trim or the Gen 2/Gen 3 label. CHECKED: ' +
      'bbShellStandard (T47_85_5), headsetTaper, rearBrakeMountType, wheelDiameter, maxTyreWidthMm ' +
      '(50mm), hangerStandard (UDH), seatpostDiameterMm (27.2mm), all stated. DERIVED: rearAxleType ' +
      '-- consistent across every listing checked but not confirmed as Gen-3-specific; if a Gen 2 ' +
      'variant differs, this is the field most likely to be wrong. bbShellWidthMm intentionally left ' +
      'null: the shell is 85.5mm, which the Int field cannot represent -- the enum member name ' +
      '(T47_85_5) already carries the width, and R-BB-03 (the separate width-match rule) no-ops ' +
      'when null on either side, so nothing is lost by leaving it unset.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'T47_85_5',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: 'TAPERED_1_5_TO_1_125',
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 50,
      hangerStandard: 'UDH',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Checkpoint SL 5 AXS Gen 3', year: 2025 },
      { model: 'Checkpoint SL 7 AXS Gen 3', year: 2025 },
      { model: 'Checkpoint SL 6 AXS Gen 3', year: 2025 },
      { model: 'Checkpoint SL 6 AXS', year: 2024 },
      { model: 'Checkpoint SL 7 AXS', year: 2024 },
      { model: 'Checkpoint SL 7 AXS Gen 2', year: 2024 },
      { model: 'Checkpoint SL 6 AXS Gen 2', year: 2024 },
      { model: 'Checkpoint SLR 7', year: 2024 },
      { model: 'Checkpoint SL 5', year: 2024 },
      { model: 'Checkpoint SL 5 Gen 2', year: 2024 },
      { model: 'Checkpoint SLR 6 AXS', year: 2024 },
      { model: 'Checkpoint SLR 9 AXS', year: 2024 },
      { model: 'Checkpoint SLR 7 AXS', year: 2024 },
    ],
  },
  {
    brand: 'Specialized',
    frameName: 'Crux (2025)',
    sourceUrl: 'https://www.specialized.com/us/en/crux-comp/p/221364',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: hangerStandard (UDH -- stated directly in the raw 99 Spokes hanger column for all 6 ' +
      'rows AND independently on Specialized\'s own product page, "featuring a UDH dropout" -- doubly ' +
      'corroborated, the strongest confidence tier used anywhere in this pass), bbShellStandard (BSA, ' +
      '"threaded bottom bracket" stated; width read as 68 from the one row that states it explicitly, ' +
      '"SRAM DUB BSA 68", with no other row contradicting it), rearAxleType (142x12, "12x142mm thru- ' +
      'axle"), maxTyreWidthMm (55mm, stated), rearBrakeMountType (flat mount, stated). mulletApproved ' +
      'set true: the bike is explicitly stated to run 650b wheels with up to 2.1in tyres as an ' +
      'alternate setup, not just 700c -- maxTyreWidthMm650b left null rather than converting the 2.1in ' +
      'MTB casing-width figure to a millimetre tyre width, which is not a direct unit conversion. ' +
      'DERIVED: wheelDiameter as ISO_622 (700c is the primary/stock size; 650b is the documented ' +
      'mullet alternate, not modelled as a second wheelDiameter value here). LEFT NULL, not guessed: ' +
      'headsetTaper and seatpostDiameterMm -- neither was stated anywhere found.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      mulletApproved: true,
      maxTyreWidthMm: 55,
      hangerStandard: 'UDH',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'S-Works Crux - SRAM RED XPLR', year: 2025 },
      { model: 'S-Works Crux', year: 2025 },
      { model: 'Crux Comp', year: 2025 },
      { model: 'Crux Expert', year: 2025 },
      { model: 'Crux Pro', year: 2025 },
      { model: 'S-Works Crux LTD - SRAM RED XPLR', year: 2025 },
    ],
  },
  {
    brand: 'Cannondale',
    frameName: 'SuperX Carbon (2025)',
    sourceUrl: 'https://www.cannondale.com/en/bikes/road/gravel/superx/superx-1/2025',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: hangerStandard (UDH -- stated in the raw 99 Spokes hanger column for all 3 rows AND ' +
      'independently on Cannondale\'s own page, "the rear triangle now complies with the UDH ' +
      'standard" -- doubly corroborated), bbShellStandard (BSA_68, "UDH BSA 68mm threaded BB" ' +
      'stated), rearAxleType (142x12, stated), maxTyreWidthMm (48mm -- the stated rear figure, the ' +
      'tighter of the two; front clearance is stated separately as 51mm, but the schema has one ' +
      'field and the rear is the binding constraint for a matched tyre set). DERIVED: ' +
      'rearBrakeMountType as flat mount, not restated in this search but universal on this class; ' +
      'wheelDiameter as ISO_622. LEFT NULL, not recorded as 25.4mm: seatpostDiameterMm. The seatpost ' +
      'is stated as "25.4mm... D-shaped" -- a proprietary non-round profile, not a round post a ' +
      'diameter figure would describe compatibly (same reasoning as the Synapse Carbon platform\'s ' +
      'seatpost -- see that dataNotes). headsetTaper also left null, not stated anywhere found.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 48,
      hangerStandard: 'UDH',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'SuperX 3', year: 2025 },
      { model: 'SuperX 2', year: 2025 },
      { model: 'SuperX LAB71', year: 2025 },
    ],
  },
  {
    // Same CF-vs-CFR split risk already found on Endurace: the real 99
    // Spokes index for (Canyon, Grail, Carbon, Rigid) has 5 rows, 2 of
    // them "Grail CFR" (Di2, AXS). An outside source explicitly gives
    // CFR a different tyre clearance (~55mm) from the CF tier (42mm),
    // so the 2 CFR rows are excluded here rather than assumed the same
    // mould -- only the 3 CF/CF SLX rows are included.
    brand: 'Canyon',
    frameName: 'Grail CF / CF SLX (2026)',
    sourceUrl: 'https://www.canyon.com/en-us/gravel-bikes/race/grail/cf/grail-cf-sl-7/4149.html',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: bbShellStandard (BB86, "Canyon is sticking with its PF86 press-fit" stated directly, ' +
      'matching the raw 99 Spokes text for all 3 CF/CF SLX rows -- the 2 excluded CFR rows also show ' +
      'PF86,5 with no contradiction, so the CFR exclusion here is about tyre clearance and hanger, ' +
      'not the BB shell), maxTyreWidthMm (42mm, stated and explicitly attributed to the CF tier, ' +
      'contrasted against CFR\'s different figure). DERIVED: rearAxleType as 142x12 -- not explicitly ' +
      'restated in this search, but confirmed with zero exceptions across every other platform ' +
      'sourced this session; rearBrakeMountType as flat mount, universal on this class; wheelDiameter ' +
      'as ISO_622. LEFT NULL, not guessed: hangerStandard -- an outside source confirms UDH for the ' +
      'Grail CFR specifically, but that quote is about the tier this platform deliberately excludes; ' +
      'nothing found confirms either way for the CF/CF SLX tier itself, and the 99 Spokes hanger ' +
      'column is blank for all 5 Grail rows. seatpostDiameterMm also left null, not recorded as any ' +
      'number: the redesigned Grail CF ships a new "D-shaped Comfortpost", a proprietary non-round ' +
      'profile -- same reasoning as Synapse Carbon and SuperX. headsetTaper left null, not stated ' +
      'anywhere found.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 42,
      hangerStandard: null,
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Grail CF SLX 8 Di2', year: 2026 },
      { model: 'Grail CF 8 1by', year: 2026 },
      { model: 'Grail CF 7', year: 2026 },
    ],
  },
  {
    brand: 'Trek',
    frameName: 'Checkmate SLR (2025)',
    sourceUrl: 'https://www.trekbikes.com/gb/en_GB/checkmate-gravel-race-bike/',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: hangerStandard (UDH -- stated in the raw 99 Spokes hanger column for all 3 rows), ' +
      'bbShellStandard (T47_85_5, "T47 threaded, internal bearing" stated identically across all 3 ' +
      'rows, same as the Checkpoint platform, same brand/era), maxTyreWidthMm (45mm, stated). ' +
      'DERIVED: rearAxleType as 142x12 -- not explicitly restated in this search, but confirmed with ' +
      'zero exceptions across every other platform sourced this session; rearBrakeMountType as flat ' +
      'mount; wheelDiameter as ISO_622. LEFT NULL, not recorded as any number: seatpostDiameterMm. ' +
      'The seatpost is a "KVF aero carbon seatpost" -- Trek\'s aero-profile design language (shared ' +
      'with Madone-family road bikes), a shaped, non-round profile, not a round post a diameter ' +
      'figure would describe compatibly -- same reasoning as Synapse/SuperX/Grail. headsetTaper also ' +
      'left null, not stated anywhere found. bbShellWidthMm left null for the same reason as ' +
      'Checkpoint\'s: 85.5mm does not fit the Int field, and the enum name already carries it.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'T47_85_5',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 45,
      hangerStandard: 'UDH',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Checkmate SLR 8 AXS', year: 2025 },
      { model: 'Checkmate SLR 9 AXS', year: 2025 },
      { model: 'Checkmate SLR 7 AXS', year: 2025 },
    ],
  },
  {
    brand: 'Trek',
    frameName: 'Domane AL Gen 4 (2025)',
    sourceUrl: 'https://opticycles.com/en-us/bike/road-bike/Trek/2025/domane-al-4-gen-4',
    dataSource: 'RETAILER_LISTING',
    dataNotes:
      'CHECKED: hangerStandard (UDH -- stated in the raw 99 Spokes hanger column for all 3 rows), ' +
      'bbShellStandard (BSA_68 -- all 3 raw rows name Shimano BSA/threaded-68mm products, no ' +
      'ambiguity, unlike the Carbon Domane\'s generation-contaminated search results this session), ' +
      'maxTyreWidthMm (38mm, stated), seatpostDiameterMm (27.2mm, "Bontrager Comp 6061 alloy... ' +
      '27.2mm diameter" -- a genuinely round post this time, unlike several Cannondale/Canyon/Trek ' +
      'aero posts found elsewhere this session). DERIVED: rearAxleType as 142x12 -- not explicitly ' +
      'restated in this search, but confirmed with zero exceptions across every other platform ' +
      'sourced this session; rearBrakeMountType as flat mount; wheelDiameter as ISO_622. LEFT NULL: ' +
      'headsetTaper, not stated anywhere found.',
    discipline: 'road',
    detail: {
      material: 'ALUMINIUM',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 38,
      hangerStandard: 'UDH',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Domane AL 5 Gen 4', year: 2025 },
      { model: 'Domane AL 2 Gen 4', year: 2025 },
      { model: 'Domane AL 4 Gen 4', year: 2025 },
    ],
  },
  {
    brand: 'Specialized',
    frameName: 'Diverge Carbon (2025)',
    sourceUrl: 'https://www.specialized.com/us/en/diverge-sport-carbon/p/217055',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: bbShellStandard (BSA, "threaded BB" stated; width read as 68 from the raw text\'s ' +
      '"SRAM DUB BSA 68" row, no contradicting row), rearAxleType (142x12, stated), maxTyreWidthMm ' +
      '(47mm at 700c, stated). mulletApproved set true: 650b with 2.1in tyres is stated as an ' +
      'alternate setup, same pattern as the Crux platform -- maxTyreWidthMm650b left null for the ' +
      'same reason (not a direct mm conversion from a casing-width inch figure). DERIVED: ' +
      'rearBrakeMountType as flat mount, stated generally for the line but not re-quoted per row; ' +
      'wheelDiameter as ISO_622 (primary size). seatClampDiameterMm read as 30.8mm from "30.8mm ' +
      'seatpost (Specialized Alloy seat binder)" -- the parenthetical names the binder/clamp, not the ' +
      'post tube, so this number is recorded as the clamp diameter, not seatpostDiameterMm, which is ' +
      'LEFT NULL as genuinely not separately stated. headsetTaper also left null. hangerStandard left ' +
      'null: the 99 Spokes hanger column is blank for all 4 rows and nothing else found states it ' +
      'for this specific Hardtail (Future Shock) Diverge, as distinct from the Crux which had it ' +
      'doubly confirmed.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      mulletApproved: true,
      maxTyreWidthMm: 47,
      hangerStandard: null,
      seatpostDiameterMm: null,
      seatClampDiameterMm: 30.8,
    },
    bikes: [
      { model: 'Diverge Expert Carbon', year: 2025 },
      { model: 'Diverge Sport Carbon', year: 2025 },
      { model: 'Diverge Comp', year: 2025 },
      { model: 'Diverge Comp Carbon', year: 2025 },
    ],
  },
  {
    // "SuperSix EVO SE" (no number) explicitly names a wider, Ai-offset
    // 83mm PF30A shell -- Cannondale's asymmetric-frame variant, already
    // flagged as an outlier pattern to watch for on the Synapse platform's
    // dataNotes. Excluded here; only the 2 rows sharing plain
    // "Cannondale Alloy PressFit30" text (no Ai, no 83mm) are included.
    brand: 'Cannondale',
    frameName: 'SuperSix EVO SE (2024)',
    sourceUrl: 'https://www.cannondale.com/en/bikes/road/gravel/supersix-evo-se/supersix-evo-se-1',
    dataSource: 'RETAILER_LISTING',
    dataNotes:
      'CHECKED: maxTyreWidthMm (45mm, stated). bbShellStandard read as PF30 from the raw text\'s ' +
      'plain "Cannondale Alloy PressFit30" (no width given; PF30 has no separate width class in this ' +
      'schema the way BB86 or T47 do, so this is treated as fully stated rather than derived). ' +
      'DERIVED: rearAxleType as 142x12 -- confirmed with zero exceptions across every other platform ' +
      'sourced this session; rearBrakeMountType as flat mount; wheelDiameter as ISO_622. LEFT NULL, ' +
      'not recorded as any number: seatpostDiameterMm. The seatpost is a "HollowGram 27 SL KNOT ' +
      'carbon seatpost... D-shaped section" -- a proprietary non-round profile, same reasoning as ' +
      'Synapse/SuperX/Grail. headsetTaper and hangerStandard (99 Spokes hanger column blank for both ' +
      'rows) also left null.',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'PF30',
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 45,
      hangerStandard: null,
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'SuperSix EVO SE 2', year: 2024 },
      { model: 'SuperSix EVO SE 1', year: 2024 },
    ],
  },
  {
    brand: 'Specialized',
    frameName: 'Allez (2025-2026)',
    sourceUrl: 'https://www.specialized.com/us/en/allez-comp-shimano-105/p/4221810',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED: bbShellStandard (BSA_68, "standard 68mm BSA threaded" stated, matching the raw text\'s ' +
      '"Shimano Threaded BSA BB" / "Shimano 68mm threaded" / "Praxis 68mm BSA" across all 3 rows, ' +
      'consistent across the 2025-2026 span), rearAxleType (142x12, stated -- the fork\'s separate ' +
      '100x12 spec is a Fork field, not recorded here), maxTyreWidthMm (35mm, stated), ' +
      'rearBrakeMountType (flat mount, stated). DERIVED: wheelDiameter as ISO_622. LEFT NULL, not ' +
      'guessed: seatpostDiameterMm and headsetTaper, neither stated anywhere found. hangerStandard ' +
      'left null: the 99 Spokes hanger column is blank for all 3 rows and nothing else found states ' +
      'it.',
    discipline: 'road',
    detail: {
      material: 'ALUMINIUM',
      bbShellStandard: 'BSA_68',
      bbShellWidthMm: 68,
      rearAxleType: 'THRU_AXLE_142x12',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 35,
      hangerStandard: null,
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Allez Comp', year: 2026 },
      { model: 'Allez', year: 2025 },
      { model: 'Allez Sport', year: 2025 },
    ],
  },
  {
    // Cross-tier check done before trusting this as one mould: Giant's
    // "Advanced" / "Advanced Pro" / "Advanced SL" suffixes are carbon-
    // layup/weight tiers, not separate frame shapes, on this platform --
    // confirmed by pulling Giant's own PDF spec sheets for "Defy
    // Advanced 1" and "Defy Advanced Pro 1" and finding the geometry
    // tables identical to the millimetre (same reach/stack/wheelbase/
    // chainstay across every size, same 38mm tyre limit, same "Shimano,
    // press fit" BB line) -- and a third source (granfondo-cycling.com's
    // review of the Advanced SL) independently states the same 38mm
    // figure for the SL tier too. No CF/CFR-style split found here.
    brand: 'Giant',
    frameName: 'Defy Advanced (2025)',
    sourceUrl: 'https://static.giant-bicycles.com/pdf/giant-defy-advanced-1-en-au-4065.pdf',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED against two of Giant\'s own PDF spec sheets (Defy Advanced 1) plus a third (Defy ' +
      'Advanced Pro 1) for the cross-tier check above -- all three agree, word for word in places: ' +
      'rearAxleType ("12x142mm thru-axle, disc" in the FRAME line), maxTyreWidthMm (38mm, the LIMITS > ' +
      'MAX TYRE CLEARANCE field on every sheet -- an earlier, less careful fetch of a live product page ' +
      'returned a stray "40mm" figure that appears nowhere in any of the three official PDFs or in the ' +
      'granfondo/BikeRadar reviews checked, and was discarded as unreliable rather than used), ' +
      'wheelDiameter (ISO_622, "Wheel Size 700C" stated in the geometry table), seatpostDiameterMm ' +
      'LEFT NULL not guessed -- "Giant D-Fuse, composite, 14mm offset" is a shaped, non-round profile, ' +
      'same reasoning as the Cannondale/Canyon/Trek aero posts elsewhere in this file. bbShellStandard ' +
      'read as BB86: the PDFs themselves only say "Shimano, press fit" with no width, but Giant\'s own ' +
      'showcase page states "a fully integrated, 86-millimeter wide bottom-bracket design" for this ' +
      'exact frame -- bbShellWidthMm left null regardless, matching this file\'s existing convention ' +
      'that no BB86 frame here sets a separate width. DERIVED: rearBrakeMountType as flat mount -- not ' +
      'in the PDF spec table, but Giant\'s showcase page states it directly ("engineered specifically ' +
      'for flat-mount disc-brakes, including front and rear 12mm thru-axles"), a stronger tier than a ' +
      'class-wide assumption. RESOLVED, not left null: hangerStandard is PROPRIETARY. The 99 Spokes-era ' +
      'search for "Defy UDH" surfaces nothing conclusive, but two independent parts retailers ' +
      '(giantbikespares.com\'s hanger RE2660/380000016, and elanusparts\' Pilo D822 cross-reference) both ' +
      'name the same replaceable-hanger part specifically for "2024 Defy Advanced 1/3, Advanced Pro ' +
      '0/1/2, Advanced SL 0/1" -- a real part number tied to this exact frame family and generation, ' +
      'the same pattern that resolved Canyon Grizl 6\'s hanger in the Aug 15 pass. LEFT NULL, not ' +
      'guessed: headsetTaper -- see the header note above on Giant\'s OverDrive/OverDrive 2 bearing ' +
      'sizes not matching this schema\'s only tapered enum value.',
    discipline: 'road',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'THRU_AXLE',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 38,
      hangerStandard: 'PROPRIETARY',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Defy Advanced Pro 2', year: 2025 },
      { model: 'Defy Advanced 0', year: 2025 },
      { model: 'Defy Advanced Pro 1', year: 2025 },
      { model: 'Defy Advanced Pro 0', year: 2025 },
      { model: 'Defy Advanced SL 1', year: 2025 },
      { model: 'Defy Advanced SL 0', year: 2025 },
      { model: 'Defy Advanced 2', year: 2025 },
      { model: 'Defy Advanced 1', year: 2025 },
    ],
  },
  {
    // "Revolt Advanced" and "Revolt Advanced Pro" cross-checked the same
    // way as Defy above: Giant's own PDF for "Revolt Advanced Pro 0"
    // states the same flip-chip dropout, same BB, same 53mm/45mm tyre
    // figures as the plain "Revolt Advanced 1" product page pulled
    // separately -- one mould across both tiers, not a hidden split.
    brand: 'Giant',
    frameName: 'Revolt Advanced (2025-2026)',
    sourceUrl: 'https://static.giant-bicycles.com/pdf/giant-revolt-advanced-pro-0-en-us-4134.pdf',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED directly against Giant\'s own PDF spec sheet (Revolt Advanced Pro 0, 2026 model year --  ' +
      'see note below on why this is treated as covering the 2025 rows too): rearAxleType ("12x142mm ' +
      'thru-axle, disc" in the FRAME line), bbShellStandard read as BB86 ("SRAM DUB, press fit" stated ' +
      'in the spec table; the 86mm width comes from Giant\'s separate showcase page, "fully integrated, ' +
      '86-millimeter wide bottom-bracket design" -- bbShellWidthMm left null per this file\'s existing ' +
      'BB86 convention). maxTyreWidthMm recorded as 53mm: the PDF\'s own LIMITS > MAX TIRE CLEARANCE ' +
      'field states "53mm" directly, which is the frame\'s genuine physical maximum in the "long" flip- ' +
      'chip dropout position -- the same PDF\'s EXTRAS line spells out both positions explicitly, "53mm ' +
      'max tire size in \'long\' flip chip position, 45mm max tire size in \'short\' flip chip position" ' +
      '-- so a tyre between 46-53mm will fit ONLY with the dropout in the long setting, which this ' +
      'schema has no separate field to flag (unlike the mulletApproved/maxTyreWidthMm650b pair used for ' +
      'wheel-size alternates elsewhere in this file); recorded as the documented max rather than the ' +
      'conservative default because that is what the field is literally named and what the PDF\'s own ' +
      '"LIMITS" section reports as this frame\'s limit. RESOLVED, not left null, and to a stronger tier ' +
      'than most hangerStandard fields in this file: hangerStandard is PROPRIETARY, and this is not an ' +
      'inference from a retailer part number -- Giant\'s own PDF states it directly in the FRAME spec ' +
      'line itself, "flip chip dropout". A cycling-media review (BikeRadar) independently confirms the ' +
      'current-generation Revolt has NOT moved to UDH ("the current 2025 Giant Revolt Advanced does not ' +
      'feature UDH dropouts -- it continues to use the flip-chip system"), distinguishing it from an ' +
      'unreleased UDH prototype the same article describes. Model-year note: the PDF fetched is dated ' +
      '2026, not 2025, but a live 2025-dated product page (giant-bicycles.com/gb/revolt-advanced-1-2025) ' +
      'pulled separately states the identical 53mm/45mm flip-chip figures and OverDrive/SRAM DUB specs ' +
      '-- treated as the same unbroken frame across both model years rather than assumed identical ' +
      'without checking. DERIVED: rearBrakeMountType as flat mount, stated on Giant\'s showcase page ' +
      '("flat-mount disc brake integration") rather than the PDF table itself; wheelDiameter as ISO_622 ' +
      '(700c stated on the product page, not restated in this specific PDF\'s table). LEFT NULL, not ' +
      'guessed: seatpostDiameterMm -- "Giant D-Fuse SLR, composite" is a shaped, non-round profile, same ' +
      'reasoning as Defy above; one single weaker source claimed it "alternatively accepts a standard ' +
      'round 30.9mm seatpost" but that was not corroborated anywhere else and is not recorded as a ' +
      'number on that single mention alone. headsetTaper also left null -- see the header note above on ' +
      'Giant OverDrive not matching this schema\'s tapered enum (confirmed directly for this exact model: ' +
      '"oversized headset bearings (1 1/4in lower and 1 1/8in upper)").',
    discipline: 'gravel',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'BB86',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'THRU_AXLE',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 53,
      hangerStandard: 'PROPRIETARY',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Revolt Advanced 1', year: 2025 },
      { model: 'Revolt Advanced 3', year: 2025 },
      { model: 'Revolt Advanced 2', year: 2025 },
      { model: 'Revolt Advanced 0', year: 2025 },
      { model: 'Revolt Advanced Pro 1', year: 2025 },
      { model: 'Revolt Advanced Pro 0', year: 2025 },
    ],
  },
  {
    // See the header note above (Aug 16 pass) on the Gen 4 vs Gen 5
    // trap this platform specifically required re-checking for: a
    // first search conflated Gen 5's T47/UDH announcement with Gen 4,
    // the generation these 2025-dated bikes actually are. Every field
    // below was re-verified against Gen-4-specific sources only.
    brand: 'Trek',
    frameName: 'Domane SL / SLR Gen 4 (2025)',
    sourceUrl: 'https://www.trekbikes.com/gb/en_GB/FAQ/domane-sl-slr-rsl-23/',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED against Trek\'s own Domane SL/SLR/RSL FAQ (the "23" in the URL is the MY23 Gen 4 launch, ' +
      'not a 2023-only scope -- the FAQ covers the generation these 2025 bikes belong to): rearAxleType ' +
      '("142 x 12 mm rear", stated directly), rearBrakeMountType ("Flat mount, up to 160 mm both front ' +
      'and rear", stated directly), seatpostDiameterMm LEFT NULL not guessed -- the FAQ itself describes ' +
      'a "D-shaped KVF post for improved aerodynamics", a proprietary profile, same reasoning as ' +
      'Checkmate SLR\'s KVF post elsewhere in this file (explicitly the same design family). ' +
      'bbShellStandard read as T47_85_5: the FAQ states "T47" without a width; the 85.5mm figure comes ' +
      'from a Trek-specific source (velo.outsideonline.com\'s T47 explainer, which states Trek partners ' +
      'with Praxis on an 85.5mm-wide shell across its threaded-BB line, not just this one model) rather ' +
      'than a Domane-specific quote, and a Trek dealer\'s Gen 4 launch write-up (trainabsolute.com) ' +
      'independently confirms T47 continued from Gen 3 into Gen 4 ("the T47 bottom bracket also ' +
      'continues on"). maxTyreWidthMm recorded as 38mm, corroborated four ways: two independent ' +
      'opticycles.com model pages (SL 6 and SLR 9, both "38c"), road.cc\'s Gen-4-vs-Gen-5 comparison ' +
      'piece ("Domane was already an all-road bike with space for 38mm tyres", stated of Gen 4 in ' +
      'explicit contrast to Gen 5\'s 40mm), and trainabsolute.com\'s launch coverage -- the FAQ itself ' +
      'declines to give a number ("Accurate values can be found in specs on each bike model page"). ' +
      'RESOLVED, not left null: hangerStandard is PROPRIETARY, not UDH, sourced to a real part number ' +
      '(W524188) from Trek\'s own MY23 Domane SL/SLR service manual, independently cross-referenced by ' +
      'elanusparts\' Pilo D781 compatibility listing which explicitly names "Trek Domane SL / SLR Gen.4 ' +
      '2023" alongside several earlier Domane generations sharing the same hanger shape. wheelDiameter ' +
      'as ISO_622, 700c stated on the opticycles pages. LEFT NULL, not guessed: headsetTaper -- no ' +
      'bearing-size figure was found stated anywhere for this platform, only generic "tapered steerer" ' +
      'wording, which this file treats as insufficient on its own (contrast Checkpoint SL/SLR\'s carbon ' +
      'platform, which at least had an explicit "1-1/8in upper" figure to derive from).',
    discipline: 'road',
    detail: {
      material: 'CARBON',
      bbShellStandard: 'T47_85_5',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'THRU_AXLE',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 38,
      hangerStandard: 'PROPRIETARY',
      seatpostDiameterMm: null,
    },
    bikes: [
      { model: 'Domane SL 6 Gen 4', year: 2025 },
      { model: 'Domane SL 7 Gen 4', year: 2025 },
      { model: 'Domane SLR 8 AXS Gen 4', year: 2025 },
      { model: 'Domane SL 5 Gen 4', year: 2025 },
      { model: 'Domane SLR 7 AXS Gen 4', year: 2025 },
      { model: 'Domane SLR 9 AXS Gen 4', year: 2025 },
      { model: 'Domane SLR 7 Gen 4', year: 2025 },
      { model: 'Domane SLR 9 Gen 4', year: 2025 },
    ],
  },
  {
    // The aluminium sibling of the Checkpoint platform already in this
    // file (Checkpoint SL/SLR, carbon, T47_85_5, UDH) -- a genuinely
    // separate mould (Alpha 300 aluminium, not carbon), sourced
    // independently rather than assumed to match the carbon version.
    // It turns out to land on the same core standards, which is a
    // real finding (Trek's Gen-3-era gravel line shares one hanger/BB/
    // axle spec across materials), not an assumption carried over.
    brand: 'Trek',
    frameName: 'Checkpoint ALR Gen 3 (2024-2025)',
    sourceUrl: 'https://www.trekbikes.com/us/en_US/FAQ/checkpoint-alr-gen3/',
    dataSource: 'MANUFACTURER_SPEC',
    dataNotes:
      'CHECKED against Trek\'s own Checkpoint ALR Gen 3 FAQ: dropoutType/hangerStandard as UDH -- the ' +
      'FAQ states this in practical terms ("Yes, this way you can bolt up any derailleur out there on ' +
      'the market"), independently corroborated word-for-word by a BikeRadar review of the ALR 5 Gen 3 ' +
      '("SRAM UDH dropout") -- doubly confirmed, matching the carbon Checkpoint platform already in this ' +
      'file. maxTyreWidthMm as 50mm, stated on both the FAQ ("up to 50mm gravel tires (as measured)") ' +
      'and the BikeRadar review ("generous 50mm tyre clearance (or 42mm with mudguards)"). CHECKED ' +
      'against the BikeRadar review specifically (not re-found on the FAQ page itself): bbShellStandard ' +
      'read as T47_85_5 -- the review states "threaded T47 bottom bracket" without a width figure; the ' +
      '85.5mm read is DERIVED from Trek\'s single documented T47 implementation across its line (see the ' +
      'Domane SL/SLR platform above, sourced independently to the same figure) rather than a number ' +
      'stated specifically for the ALR -- treat this one field as the weakest on this platform. ' +
      'rearBrakeMountType as flat mount, stated ("flat-mount disc brakes"). seatpostDiameterMm as ' +
      '27.2mm, stated ("27.2mm Bontrager alloy seatpost") -- a genuinely round post, unlike most of the ' +
      'proprietary aero/D-shaped posts found elsewhere in this file. wheelDiameter as ISO_622, 700c ' +
      'stated. DERIVED: rearAxleType as 142x12 -- not restated for this specific model in anything ' +
      'found, but confirmed with zero exceptions across every other Trek platform in this file. LEFT ' +
      'NULL, not guessed: headsetTaper. Multiple dealer listings describe the fork as having a "tapered ' +
      'steerer" (Trek\'s own spec-feed wording, reproduced verbatim across several retailer sites), but ' +
      'unlike the carbon Checkpoint platform -- which at least had a partial "1-1/8in upper" figure to ' +
      'derive from -- nothing found here gives any bearing diameter at all, only the bare word ' +
      '"tapered"; a search result summary claimed a specific "1-1/8in to 1.5in" figure but that number ' +
      'could not be re-found in any primary source actually quoted (the retailer page it was checked ' +
      'against states only "tapered steerer" with no numbers), so it is treated as unverified and not ' +
      'used.',
    discipline: 'gravel',
    detail: {
      material: 'ALUMINIUM',
      bbShellStandard: 'T47_85_5',
      rearAxleType: 'THRU_AXLE_142x12',
      dropoutType: 'UDH',
      headsetTaper: null,
      rearBrakeMountType: 'FLAT_MOUNT',
      wheelDiameter: 'ISO_622',
      maxTyreWidthMm: 50,
      hangerStandard: 'UDH',
      seatpostDiameterMm: 27.2,
    },
    bikes: [
      { model: 'Checkpoint ALR 3', year: 2025 },
      { model: 'Checkpoint ALR 5', year: 2025 },
      { model: 'Checkpoint ALR 4', year: 2025 },
      { model: 'Checkpoint ALR 5', year: 2024 },
      { model: 'Checkpoint ALR 5 AXS', year: 2024 },
      { model: 'Checkpoint ALR 4', year: 2024 },
    ],
  },
];

function slugify(...parts: (string | number)[]): string {
  return parts
    .join(' ')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  let framesCreated = 0;
  let framesSkipped = 0;
  let bikesCreated = 0;
  let bikesSkipped = 0;

  for (const platform of PLATFORMS) {
    let frameId: string;
    const existingFrame = await prisma.part.findFirst({
      where: { type: PartType.FRAME, brand: platform.brand, name: platform.frameName },
    });

    if (existingFrame) {
      frameId = existingFrame.id;
      framesSkipped++;
      console.log(`= frame exists, skipping: ${platform.brand} ${platform.frameName}`);
    } else {
      const part = await prisma.part.create({
        data: {
          type: PartType.FRAME,
          brand: platform.brand,
          name: platform.frameName,
          weightGrams: 0,
          basePricePence: null,
          dataSource: platform.dataSource,
          sourceUrl: platform.sourceUrl,
          dataNotes: platform.dataNotes,
          frame: { create: platform.detail as any },
        },
      });
      frameId = part.id;
      framesCreated++;
      console.log(`+ frame created: ${platform.brand} ${platform.frameName}`);
    }

    for (const bike of platform.bikes) {
      const variant = bike.variant ?? null;
      const slug = slugify(platform.brand, bike.model, variant ?? '', bike.year);

      const existingBike = await prisma.bikeModel.findFirst({
        where: { brand: platform.brand, model: bike.model, year: bike.year, variant },
      });
      if (existingBike) {
        bikesSkipped++;
        continue;
      }

      await prisma.bikeModel.create({
        data: {
          brand: platform.brand,
          model: bike.model,
          year: bike.year,
          variant,
          slug,
          msrpPence: null,
          discipline: platform.discipline,
          parts: { create: [{ partId: frameId, slot: null }] },
        },
      });
      bikesCreated++;
    }
  }

  console.log(
    `\nDone. Frames: ${framesCreated} created, ${framesSkipped} already existed. ` +
    `Bikes: ${bikesCreated} created, ${bikesSkipped} already existed.`
  );
  console.log(
    '\nEvery BikeModel row here has exactly one part (its frame). This is deliberate, not ' +
    'partial data left by mistake: only frame geometry was sourced and verified for these ' +
    'platforms so far. Populating full stock builds (groupset, wheels, cockpit per individual ' +
    'trim) is separate work, tracked as "population" in SESSION_LOG.md, and would need its own ' +
    'per-trim sourcing pass rather than being inferred from the frame.'
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
