# Data Audit — UNVERIFIED parts and catalogue integrity

**Date:** 2026-08-19
**Scope:** read-only audit of the live Neon catalogue (`DATABASE_URL`, direct).
**Method:** every `Part` with `dataSource = UNVERIFIED`, its child spec row, and its
`BikeModelPart` / `BuildPart` / `Price` / `RetailerOffer` references, judged against
`docs/ENGINE_SPEC.md` §6 rule severities.

---

## 1. Summary

The catalogue holds **793 parts**: 644 `MANUFACTURER_SPEC`, 43 `RETAILER_LISTING`,
31 `ESTIMATED`, **75 `UNVERIFIED`**. All 75 are the predecessor's demo seed. Every
one of them shares a single identical `dataNotes` string:

> "Specs written from general knowledge of component standards, not read from a
> manufacturer sheet. Price is an estimate."

and every one has `sourceUrl = NULL`. There is no partial verification anywhere in
the set — it is one homogeneous block of invented data.

**Four findings dominate everything else:**

1. **All 466 `Price` rows in the entire database belong to these 75 parts**, and
   every `productUrl` is fabricated from the part's own UUID —
   e.g. `https://www.tredz.co.uk/products/dded0b29-f0b0-49e9-869f-39d41a3d8bb8`.
   Four *real, named* UK retailers (Sigma Sports, Tredz, Evans Cycles, Canyon UK)
   are being shown to users as carrying stock at prices that were generated, linking
   to pages that do not exist. This is the highest-harm item in the audit and it is
   not a compatibility-engine problem at all. `Price` rows on non-UNVERIFIED parts: **0**.

2. **At least 13 of the 75 are exact duplicates of parts already sourced to
   `MANUFACTURER_SPEC`** — the same physical product, with a real model number, already
   in the catalogue. `Shimano | CN-M8100 XT 12-Speed` (UNVERIFIED) duplicates
   `CN-M8100 SHIMANO` (MANUFACTURER_SPEC). These need no re-sourcing at all: delete the
   demo row and repoint its references.

3. **Three `BikeModel` rows have no frame and are 100% UNVERIFIED parts** — the
   wreckage left when the three invented-geometry frames were deleted:
   Santa Cruz Hightower 2024 C S (23 parts), Trek Fuel EX 2025 9.8 XT (22),
   Specialized Epic 8 2024 Expert (22). They account for 67 of the 78 references.
   Delete the bike models and most of the seed becomes unreferenced.

4. **Only five real bikes touch the demo seed, and all five touch the same two
   parts** — a chain. Both chains already exist as sourced rows. See §3.

**Net effect of the recommended plan:** 15 DELETE-as-duplicate, 5 DELETE-as-orphan,
55 RE-SOURCE, 0 KEEP-as-is. No part in the set is safe to leave at UNVERIFIED,
because with `dataSource` ignored by the engine every one of these values is
currently being treated as fact by a `critical` rule.

---

## 2. What they are

### By type (75 total)

| Type | n | Type | n | Type | n |
|---|---|---|---|---|---|
| BOTTOM_BRACKET | 4 | BRAKE_CALIPER | 3 | SADDLE | 2 |
| TYRE | 4 | CRANKSET | 3 | SEAT_CLAMP | 2 |
| REAR_SHOCK | 4 | SEATPOST | 3 | HANDLEBAR | 2 |
| BRAKE_LEVER | 4 | TUBE | 3 | STEM | 2 |
| CHAINRING | 4 | SHIFTER | 3 | DERAILLEUR_HANGER | 2 |
| ROTOR | 4 | CASSETTE | 3 | CHAIN_GUIDE | 2 |
| | | PEDAL | 3 | SHOE | 2 |
| | | CHAIN | 3 | FRONT_DERAILLEUR | 1 |
| | | REAR_DERAILLEUR | 3 | | |
| | | WHEELSET | 3 | | |
| | | FORK | 3 | | |
| | | HEADSET | 3 | | |

No frames — the three invented-geometry frames were already deleted.

### By brand

Shimano 18, SRAM 14, RockShox 5, Race Face 5, Maxxis 4, Wolf Tooth 4, FOX 2,
Continental 2, OneUp 2, and one each of DT Swiss, Roval, Stan's NoTubes, Bontrager,
Cane Creek, Chris King, Renthal, Thomson, PNW, Fizik, Specialized, Crank Brothers,
Five Ten, Paul Component, Santa Cruz, Wheels Manufacturing.

### What references them

- **`BuildPart`: 0 across all 75.** No user build depends on any of them. Deletion
  breaks no saved build.
- **`RetailerOffer`: 0 across all 75.** No affiliate offer is matched to them.
- **`Price`: 466 rows** — 4 to 8 fabricated rows per part, across 4 vendors, dated
  2026-07-14 to 2026-08-13. `onDelete: Cascade` on `Price.partId`, so these vanish
  with the parts.
- **`BikeModelPart`: 78 rows across 8 bike models.** 67 of those 78 belong to the three
  headless demo bikes. The other 11 are chains on five real, sourced bikes (§3).

### Six categories are 100% UNVERIFIED

Deleting without re-sourcing empties them entirely:

| Type | total | UNVERIFIED | survives |
|---|---|---|---|
| REAR_SHOCK | 4 | 4 | **0** |
| TUBE | 3 | 3 | **0** |
| DERAILLEUR_HANGER | 2 | 2 | **0** |
| SHOE | 2 | 2 | **0** |
| SEAT_CLAMP | 2 | 2 | **0** |
| CHAIN_GUIDE | 2 | 2 | **0** |
| BRAKE_LEVER | 5 | 4 | **1** |
| HANDLEBAR | 3 | 2 | 1 |
| CHAINRING | 6 | 4 | 2 |
| STEM | 4 | 2 | 2 |

This is the case for RE-SOURCE over DELETE in those categories: they are the only
full-suspension, dropper-post and MTB-cockpit inventory the builder has. Note also
that the catalogue holds **61 brake calipers and 5 brake levers** — four of which are
in this set. Delete them and one lever remains for the whole site.

---

## 3. The only real bikes affected

Five sourced road/gravel bikes reference exactly one UNVERIFIED part each, and it is
always a chain:

| Bike model | UNVERIFIED part | Already-sourced equivalent |
|---|---|---|
| Cannondale SuperSix EVO SE 1 | Shimano CN-M8100 XT 12-Speed | `CN-M8100 SHIMANO` (MANUFACTURER_SPEC) |
| Cannondale Synapse Carbon 1 | Shimano CN-M8100 XT 12-Speed | same |
| Cannondale Synapse Carbon 2 | Shimano CN-M8100 XT 12-Speed | same |
| Canyon Grail CF SLX 8 Di2 | Shimano CN-M8100 XT 12-Speed | same |
| Cannondale SuperSix EVO SE 2 | Shimano CN-HG601 11-Speed | `CN-HG601-11 SHIMANO` (MANUFACTURER_SPEC) |

**This is a two-row fix, not a sourcing job.** Repoint the five `BikeModelPart` rows
at the sourced parts and delete the demo duplicates.

It also exposes a live correctness bug. The demo `CN-M8100` carries
`chainStandard: SHIMANO_HG_12_MTB` while sitting on four **road** bikes. R-DRV-08
[crit] exists precisely to separate road and MTB 12-speed chain standards; a road
drivetrain checked against an `..._MTB` chain standard is a candidate false critical
on four real bikes. Whatever the sourced `CN-M8100` row says is the value to trust.

---

## 4. Per-part recommendations

`Refs` = `BikeModelPart` rows. `demo` = referenced only by the three headless demo
bikes. Worst-case rule severity in brackets.

### 4a. DELETE — exact duplicate of an already-sourced part (15)

Nothing to re-source. Delete the demo row; repoint references where they exist.

| Type | UNVERIFIED part | Refs | Sourced row that already exists |
|---|---|---|---|
| CHAIN | Shimano CN-M8100 XT 12-Speed | 5 (4 real) | `CN-M8100 SHIMANO` |
| CHAIN | Shimano CN-HG601 11-Speed | 1 (real) | `CN-HG601-11 SHIMANO` |
| CASSETTE | Shimano CS-M8100 XT 10-51t | 1 demo | `CS-M8100-12 DEORE XT 10-51T` |
| SHIFTER | Shimano Deore XT SL-M8100 | 1 demo | `SL-M8100-R` / `-IR` / `-L DEORE XT` |
| REAR_DERAILLEUR | Shimano Deore XT M8100 SGS | 1 demo | `RD-M8100-SGS DEORE XT` |
| BRAKE_CALIPER | Shimano Deore XT M8120 4-Piston | 1 demo | `BR-M8120 DEORE XT` |
| CRANKSET | Shimano Deore XT M8100 | 1 demo | `FC-M8100-1` / `FC-M8100-2 DEORE XT` |
| FRONT_DERAILLEUR | Shimano Deore FD-M6025 Direct Mount | **0** | `FD-M6025-L` / `FD-M6025-H DEORE` |
| PEDAL | Shimano PD-M8100 XT SPD | **0** | `PD-M8100 DEORE XT` (ESTIMATED, sourced) |
| BOTTOM_BRACKET | SRAM DUB BSA Threaded | 2 demo | `BB-DUB-BSA-A1` in BSA_68 **and** BSA_73 |
| BOTTOM_BRACKET | SRAM DUB PF92 Press Fit | **0** | `BB-DUB-PF-A1 PF92` |
| CRANKSET | SRAM XX SL Eagle Transmission | 1 demo | `FC-XX-SL-D1 XX Eagle SL Crankset` |
| REAR_DERAILLEUR | SRAM XX SL Eagle AXS Transmission | 1 demo | `RD-XX-A1 XX Rear Derailleur` |
| BOTTOM_BRACKET | Shimano SM-BB52 BSA Threaded | **0** | superseded by the sourced Shimano BB set |
| SADDLE | Fizik Antares R1 Carbon | **0** | `Vento Antares 00` — current-generation replacement |

The DUB BSA case is instructive. The sourced catalogue models one physical BB as four
rows — `BSA_68`, `BSA_73`, `BSA_83`, `BSA_100` — which is the correct workaround for the
R-BB-03 weakness the spec flags. The demo row exists only as `frameInterface: BSA_73`,
`shellWidthMm: 73.0`, so R-BB-01 [crit] hides it from every 68mm frame in the
catalogue. Deleting it removes a false lockout for free.

### 4b. DELETE — unreferenced orphan, nothing to preserve (5)

| Type | Part | Refs | Why |
|---|---|---|---|
| DERAILLEUR_HANGER | Santa Cruz Hanger #67 | 1 demo | `hangerStandard: PROPRIETARY`, `model: "67"`. R-HGR-02 [crit] matches `hangerModel` by exact string. An unverifiable proprietary hanger number is a guaranteed-wrong exact-match key. Delete; re-add only from Santa Cruz's hanger finder. |
| BRAKE_LEVER | Paul Component Love Lever Compact | **0** | `brakeSystemFamily: "Mechanical"`. **No caliper in the catalogue has that family** — see §5.1. It is currently incompatible with all 61 calipers under R-BRK-08 [crit]. A mechanical-brake lane needs designing before this part means anything. |
| SEATPOST | PNW Loam 30.9 (170mm) | **0** | Real product, but its `totalLengthMm: 458` comes from the generated formula in §6.3, and the schema cannot store the field R-SP-03 actually needs. |
| ROTOR | SRAM Centerline 200mm 6-bolt | **0** | 83 sourced rotors survive. |
| ROTOR | Shimano RT-MT900 203mm Centerlock | **0** | 83 sourced rotors survive; and its `lockringType: INTERNAL` contradicts its stablemate (§6.4). |

### 4c. RE-SOURCE — real, current, UK-available, and load-bearing (55)

Ordered by how badly a wrong value hurts.

**Tier 1 — wrong value is critical AND a safety or blow-off risk**

| Part | Refs | Fields driving `critical` rules | Specific concern |
|---|---|---|---|
| Roval Control SL (WHEELSET) | 2 demo | `hookless: true`, `maxPressurePsi: 72`, `freehubBodyType: XD`, `internalRimWidthMm: 30`, `valveHoleType: PRESTA`, `rotorMountStandard: CENTERLOCK` | R-TIR-04 [crit] — "getting this wrong can blow a tyre off the rim". `maxPressurePsi: 72` is **the engine's own documented hookless cap constant copied into the data**, not a product spec. The hookless flag itself is a guess. |
| Stan's NoTubes Flow S2 (WHEELSET) | **0** | `rearAxleType: THRU_AXLE_157x12_SUPERBOOST` alongside `frontAxleType: THRU_AXLE_110x15_BOOST` | R-AXL-01 [crit]. Super Boost 157 as the default rear spacing for a Flow S2 is implausible — Boost 148 is the volume SKU. The spec is explicit that Boost 148 and Super Boost 157 are not interchangeable. Wrong here locks the wheelset out of every Boost frame. |
| DT Swiss XM1700 Spline (WHEELSET) | 1 demo | `freehubBodyType: MICRO_SPLINE`, `internalRimWidthMm: 25`, `rimDepthMm: 22` | R-FH-01 / R-FH-04 [crit]. Freehub body is the single most consequential enum on a wheelset. XM1700 ships in multiple freehub and rim-width variants; one guessed row cannot represent them. |
| SRAM Code RSC (BRAKE_CALIPER) | 1 demo | `fluidType: DOT`, `brakeSystemFamily: "SRAM Code RSC"`, `mountType: POST_MOUNT_180` | R-BRK-07 [crit] — "mixing destroys seals". DOT is right for SRAM, but it is a guess in a field where being wrong is a hydraulic failure. |
| SRAM Level Ultimate Stealth 4P (BRAKE_CALIPER) | 1 demo | `fluidType: DOT`, `mountType: POST_MOUNT_160`, `maxRotorThicknessMm: 2` | as above |
| SRAM Code RSC Lever (BRAKE_LEVER) | 1 demo | `fluidType: DOT`, `brakeSystemFamily`, `clampDiameterMm: 22.2`, `barType: RISER` | R-BRK-07 / 08 / 09 [crit]. Also one of only five levers in the catalogue. |
| SRAM Level Ultimate Stealth Lever (BRAKE_LEVER) | 1 demo | as above | as above |
| Shimano Deore XT M8100 Lever (BRAKE_LEVER) | 1 demo | `fluidType: MINERAL_OIL`, `brakeSystemFamily: "Shimano XT M8100"` | R-BRK-07 [crit]; R-BRK-08 [crit] naming drift — see §5.1. |
| FOX Float X 205x60 Trunnion (REAR_SHOCK) | 1 demo | `eyeToEyeMm: 205`, `strokeMm: 60`, `mountType: TRUNNION`, `hardwareWidthMm: 40`, `bushingDiameterMm: 8` | R-SHK-01 [crit], "no tolerance whatsoever"; R-SHK-03 [crit]. See the uniform-hardware problem in §6.2. |
| RockShox Super Deluxe Ultimate 210x55 | 1 demo | `eyeToEyeMm: 210`, `strokeMm: 55`, `hardwareWidthMm: 30`, `hasReservoir: false` | R-SHK-01 / 03 [crit]. `hasReservoir: false` is wrong on a piggyback shock and contradicts the Coil row of the same model. |
| RockShox SIDLuxe Ultimate 190x45 | 1 demo | `eyeToEyeMm: 190`, `strokeMm: 45`, `hardwareWidthMm: 30` | R-SHK-01 / 03 [crit] |
| RockShox Super Deluxe Coil 210x55 (450lb) | **0** | as above plus `springRate: 450` | R-SHK-01 / 03 [crit]. Spring rate belongs to the spring, not the shock — re-model or drop the field. |

**Tier 2 — wrong value blocks a legal part**

| Part | Refs | Concern |
|---|---|---|
| FOX 36 Factory GRIP2 (160mm) — FORK | 1 demo | The fork feeds eight critical rules: R-HS-01 / 03, R-FRK-01 / 02, R-BRK-02 / 04, R-TIR-02, R-AXL-02 / 04. `axleToCrownMm: 571` is generated — see §6.1. |
| RockShox Pike Ultimate Charger 3.1 (140mm) — FORK | 1 demo | as above; `axleToCrownMm: 551` |
| RockShox SID SL Ultimate (100mm) — FORK | 1 demo | as above; `axleToCrownMm: 511` |
| SRAM Eagle AXS Pod Ultimate (SHIFTER) | 1 demo | `cablePullStandard: ELECTRONIC_AXS` — R-DRV-01 / 03 [crit]. This is the exact pairing the spec names as v1's biggest correctness gap. May be superseded by the sourced `SL-90-A1` / `SL-70-A1` Transmission pods; check before re-sourcing. |
| SRAM GX Eagle Trigger (SHIFTER) | 1 demo | `cablePullStandard: SRAM_X_ACTUATION`, `speeds: 12` — R-DRV-01 / 02 / 10 [crit] |
| SRAM GX Eagle 12-Speed (REAR_DERAILLEUR) | 1 demo | `maxCassetteCogTeeth: 52`, `mountStandard: STANDARD_HANGER`, `totalCapacityTeeth: 42` — R-DRV-04, R-HGR-01 / 03 [crit] |
| SRAM XG-1275 GX Eagle 10-52t (CASSETTE) | 2 demo | `freehubBodyType: XD`, `largestCogTeeth: 52` — R-FH-01 / 04, R-DRV-04 [crit] |
| Shimano CS-M7000 SLX 11-42t (CASSETTE) | **0** | `freehubBodyType: HG_11`, `requiresSpacerMm: null` — R-FH-01 [crit], R-FH-03 [warn] |
| SRAM GX Eagle 12-Speed Chain (CHAIN) | 2 demo | `chainStandard: SRAM_EAGLE_12` — R-DRV-08 [crit]. **Not** the same part as the sourced `CN-TTYP-GX-A1` Transmission Flattop chain; genuinely missing from the catalogue. |
| SRAM GX Eagle DUB (CRANKSET) | 1 demo | `chainringMount: SRAM_3_BOLT`, `spindleDiameter: DUB_29`, `chainlineMm: 52` — R-CHR-01 / 02, R-BB-02 [crit] |
| Wheels Manufacturing PF92 for HollowTech II (BOTTOM_BRACKET) | 1 demo | `frameInterface: PF92`, `spindleInterface: HOLLOWTECH_II_24` — R-BB-01 / 02 [crit]. Real product, no sourced equivalent. |
| Race Face Narrow Wide 104BCD 40t (CHAINRING) | **0** | `mountStandard: BCD_104`, `boltCount: 4` — R-CHR-01 [crit] |
| SRAM X-Sync 2 Eagle 32t (3mm offset) | 1 demo | `mountStandard: SRAM_3_BOLT`, `offsetMm: 3` — R-CHR-01 / 02 [crit], R-CHR-03 [warn] |
| SRAM X-Sync 2 Eagle 34t (3mm offset) | 1 demo | as above |
| Shimano SM-CRM85 32t Direct Mount (CHAINRING) | 1 demo | `mountStandard: SHIMANO_DIRECT_MOUNT`, `offsetMm: 3` — R-CHR-02 [crit] |
| Cane Creek 40 Series IS42/IS52 (HEADSET) | 1 demo | `upperStandard: IS42` / `lowerStandard: IS52` — R-HS-02 [crit], checked independently; `stackHeightMm: 15` feeds R-FRK-01 [crit] |
| Chris King DropSet 3 ZS44/ZS56 (HEADSET) | 1 demo | `upperStandard: ZS44` / `lowerStandard: ZS56`, `stackHeightMm: 17` — as above |
| Wolf Tooth Performance IS42/IS52 (HEADSET) | 1 demo | `stackHeightMm: 14` — as above |
| SRAM UDH Universal Derailleur Hanger | **0** | `hangerStandard: UDH` — R-HGR-01 [crit] is "a hard gate on an entire modern groupset family". The only hanger left once Santa Cruz #67 goes. |
| OneUp Dropper V2 34.9 (180mm) — SEATPOST | 2 demo | `diameterMm: 34.9`, `routingType: INTERNAL`, `remoteType: CABLE` — R-SP-01 / 02 / 07 [crit] |
| RockShox Reverb AXS 31.6 (150mm) — SEATPOST | 1 demo | `routingType: NONE`, `remoteType: ELECTRONIC` — R-SP-02 [crit] is the rule the spec says "was wrong first time" on exactly this part shape. `totalLengthMm: 440` is suspect (§6.3). |
| Wolf Tooth Seatpost Clamp 34.9 | 1 demo | `diameterMm: 34.9` — R-SP-05 [crit]. One of only two seat clamps. |
| Wolf Tooth Seatpost Clamp 38.6 | 2 demo | `diameterMm: 38.6` — as above |
| Specialized Bridge Comp 143mm (SADDLE) | 3 demo | `railType: ROUND_7MM` — R-SP-06 [crit] |
| Race Face Next R 35 Carbon 800mm (HANDLEBAR) | 1 demo | `clampDiameterMm: 35`, `controlClampDiameterMm: 22.2`, `barType: RISER` — R-CKP-01 / 03 / 04 [crit] |
| Renthal Fatbar Lite 31.8 760mm (HANDLEBAR) | 2 demo | `clampDiameterMm: 31.8` — as above |
| Race Face Turbine R 35 40mm (STEM) | 1 demo | `barClampDiameterMm: 35`, `steererClampMm: 28.6` — R-CKP-01 / 02 [crit] |
| Thomson Elite X4 31.8 50mm (STEM) | 2 demo | `barClampDiameterMm: 31.8`, `steererClampMm: 28.6` — as above |
| Maxxis Minion DHF 29x2.5" WT (TYRE) | 2 demo | `wheelDiameter: ISO_622`, `widthMm: 63`, `hooklessSafe: true` — R-TIR-01 / 02 / 04 [crit] |
| Maxxis Minion DHR II 29x2.4" WT (TYRE) | 2 demo | `widthMm: 61`, `hooklessSafe: true` — as above |
| Maxxis Rekon Race 29x2.25" (TYRE) | 2 demo | `widthMm: 57`, `hooklessSafe: true` — as above |
| Continental Kryptotal Fr 29x2.4" (TYRE) | **0** | `widthMm: 61`, **`hooklessSafe: false`** while all three Maxxis rows say `true`. Under R-TIR-04 [crit] this single guessed boolean hides the tyre from every hookless rim in the catalogue. |
| Bontrager Standard 29 (35mm Schrader) — TUBE | **0** | `valveType: SCHRADER` — R-TIR-06 [crit]. **All three UNVERIFIED wheelsets are `valveHoleType: PRESTA`**, so this tube is critically blocked from the entire MTB wheel inventory on the strength of a guessed enum. |
| Continental MTB 29 Light (42mm Presta) — TUBE | **0** | `minWidthMm: 47`, `maxWidthMm: 62`, `valveLengthMm: 42` — R-TIR-06 [crit], R-TIR-07 / 08 [warn] |
| Maxxis Welter Weight 29x2.2-2.5 (48mm Presta) — TUBE | **0** | `minWidthMm: 56`, `maxWidthMm: 63` — as above; only tubes in the catalogue |
| Crank Brothers Mallet DH (PEDAL) | **0** | `cleatSystem: CRANK_BROTHERS`, `thread: NINE_SIXTEENTHS` — R-PDL-01 / 02 [crit] |
| Race Face Chester Flat (PEDAL) | **0** | `cleatSystem: FLAT_NONE` — R-PDL-02 [crit] |
| Five Ten Freerider Pro (flat) — SHOE | **0** | `soleDrilling: FLAT_NONE` — R-PDL-03 [crit]; one of only two shoes |
| Shimano ME7 (2-bolt) — SHOE | **0** | `soleDrilling: TWO_BOLT` — as above |
| OneUp Chainguide ISCG05 (CHAIN_GUIDE) | **0** | `mountStandard: ISCG_05`, 28–36t — R-MNT-01 [crit]; one of only two guides |
| Wolf Tooth GnarWolf BB Mount (CHAIN_GUIDE) | **0** | `mountStandard: BB_MOUNT`, 28–38t — as above |
| SRAM Centerline 180mm Centerlock (ROTOR) | 4 demo | `mountStandard: CENTERLOCK`, `diameterMm: 180`, `thicknessMm: 1.85` — R-BRK-04 / 05 [crit] |
| Shimano RT-MT800 160mm Centerlock (ROTOR) | 2 demo | `thicknessMm: 1.8`, `lockringType: EXTERNAL` — R-BRK-04 / 05 [crit], R-BRK-06 [warn] |

### 4d. KEEP as-is: none

There is no part in this set whose values can be trusted. `dataSource` is provenance
metadata; the engine reads the spec fields regardless. Leaving a row at UNVERIFIED does
not make the engine abstain — it makes it confidently assert a guess, which is the exact
failure mode the governing rule exists to prevent.

---

## 5. Other findings, ranked by potential harm

### 5.1 CRITICAL — `brakeSystemFamily` naming drift is live in production data

The spec lists this as bug class 4 ("convention drift in free-text keys") that "bit
hard" in v1. It is present again. R-BRK-08 is plain string equality. Actual values:

**Calipers (61):** `SHIMANO` x15, `DEORE XT` x7, `CUES` x5, `XTR` x5, `DEORE` x4,
`GRX` x4, `SLX` x3, `ULTEGRA` x3, `TIAGRA` x2, `SAINT`, `DURA-ACE`, `SHIMANO 105`,
`Apex`, `Tektro`, `SRAM RED AXS (E1)`, `SRAM RED eTap AXS (D1)`, `SRAM Force AXS (D2)`,
`SRAM Code RSC`, `SRAM Level Stealth`, `Shimano XT M8100`, and **2 nulls**.

**Levers (5):** `GRX`, `Mechanical`, `SRAM Code RSC`, `SRAM Level Stealth`,
`Shimano XT M8100`.

Three separate defects:

1. **`Mechanical` matches nothing.** The Paul Love Lever is critically incompatible
   with all 61 calipers. No caliper carries that family.
2. **Two naming conventions coexist.** The sourced rows use bare groupset names
   (`DEORE XT`); the demo rows use brand-prefixed model names (`Shimano XT M8100`).
   The demo XT lever will never match the 7 sourced `DEORE XT` calipers — the identical
   failure the spec documents as `"Shimano GRX"` vs `"GRX"`.
3. **`SHIMANO` on 15 calipers is not a family.** It asserts that 15 unrelated calipers
   share a piston ratio. Currently harmless only because no lever carries it; a single
   future `SHIMANO` lever silently passes all 15.

**Fix:** promote `brakeSystemFamily` to an enum, or normalise on write. The spec already
said which. Until then R-BRK-08 is producing verdicts from string luck.

### 5.2 HIGH — the entire `Price` table is fabricated, with real retailer names

466 rows, all on UNVERIFIED parts, none on sourced parts. `productUrl` is
`https://<retailer>/products/<part-uuid>` for every single row. Prices are jittered
around `basePricePence` per vendor — the RockShox Pike's `basePricePence` of 93500
appears as 98175 at Sigma Sports, with matching Tredz / Evans / Canyon variants from the
same generator. `recordedAt` spans 2026-07-14 to 2026-08-13, so the UI will render these
as current.

This is not a compatibility problem. It presents invented prices and dead links under
the names of four real UK retailers. **Delete the `Price` rows regardless of what
happens to the parts** — the cascade on part deletion covers it, but it should not wait
on the sourcing work.

### 5.3 HIGH — three bike models have no frame

| Bike model | parts | frames | UNVERIFIED |
|---|---|---|---|
| Santa Cruz Hightower 2024 C S | 23 | **0** | 23 |
| Trek Fuel EX 2025 9.8 XT | 22 | **0** | 22 |
| Specialized Epic 8 2024 Expert | 22 | **0** | 22 |

"The frame must be picked first" — the engine reads 27 fields on `Frame` alone. These
three models cannot be compatibility-checked at all, and every part hanging off them is
invented. Delete the `BikeModel` rows (`BikeModelPart` cascades). No other model in the
catalogue is missing a frame.

### 5.4 MEDIUM — duplicate unslotted paired components

`BikeModelPart.slot` mirrors `BuildPart.slot`, and the spec is explicit: "Never infer
position from insertion order — this caused real bugs twice." Six models carry two rows
of the same paired type with `slot = NULL`:

- Cannondale Topstone 2 GRX - 2x 2025 — 2x BRAKE_CALIPER, both `slot` null
- Cannondale Topstone 2 CUES - 1x 2025 — 2x BRAKE_CALIPER, both null
- Cannondale Topstone 1 2025 — 2x BRAKE_CALIPER, both null
- Cannondale Topstone EQ 2025 — 2x BRAKE_CALIPER, both null
- Canyon Grail CF 7 2026 — 2x CHAINRING, both null
- Cannondale SuperX 3 2025 — 2x CRANKSET, both null

Catalogue-wide slot coverage is patchy: BRAKE_CALIPER 3 front / 3 rear / **27 null**;
ROTOR 6 / 6 / **18 null**; TYRE 10 / 10 / **11 null**; BRAKE_LEVER 2 `left` / **3 null**.
The two crankset rows on one bike and two chainring rows on another are likelier to be
data errors than paired parts — a bike has one crankset. Worth inspecting directly.

### 5.5 LOW — `ESTIMATED` in a field driving a `critical` rule (31 parts)

All 31 `ESTIMATED` parts are Shimano pedals, and all are ESTIMATED for the same
declared reason: `PedalThread` (9/16") was not printed on the source page and was
applied from the universal standard. `PedalThread` drives R-PDL-01 [crit].

**This is the system working, not a defect.** Every row has a `sourceUrl`, cites the
page number, and the `dataNotes` states exactly which field is inferred and why. The
inference is universal for three-piece cranks, and the affected set contains no
one-piece-crank product. Leave as is; the honest downgrade is the point.

### 5.6 CLEAN — `MANUFACTURER_SPEC` without `sourceUrl`: zero

All 644 `MANUFACTURER_SPEC` parts carry a `sourceUrl`. No provenance claim is
unbacked. Nothing to do.

---

## 6. Things that look outright fabricated

Beyond the blanket `dataNotes` admission, several values betray the generator that
made them.

### 6.1 Fork axle-to-crown is a linear formula

| Fork | `travelMm` | `axleToCrownMm` | A-C minus travel |
|---|---|---|---|
| RockShox SID SL Ultimate | 100 | 511 | 411 |
| RockShox Pike Ultimate Charger 3.1 | 140 | 551 | 411 |
| FOX 36 Factory GRIP2 | 160 | 571 | 411 |

Three forks, two manufacturers, one constant. Real axle-to-crown varies by chassis,
crown design and wheel size. All three also share `offsetMm: 44` and
`crownRaceDiameterMm: 40`, and `steererLengthMm` is 300 / 300 / 280 — round numbers.
R-FRK-03 (A-C window, ±10mm) is only a `warning`, but R-FRK-01 (steerer length) is
`critical` and reads the same generated data.

### 6.2 Rear shock hardware is uniform across four different shocks

All four shocks carry `bushingDiameterMm: 8`, and all three RockShox units carry
`hardwareWidthMm: 30` (the FOX trunnion carries 40). Real hardware width is dictated by
the *frame*, and a given shock ships in many widths. R-SHK-03 is `critical`, so a single
guessed constant will block legal frame/shock pairs across the board.

`RockShox Super Deluxe Ultimate 210x55` also carries `hasReservoir: false` — wrong for a
piggyback shock, and directly contradicted by `RockShox Super Deluxe Coil 210x55`
(`hasReservoir: true`) in the same seed.

### 6.3 Dropper total length is a formula too

| Dropper | `travelMm` | `totalLengthMm` | difference |
|---|---|---|---|
| RockShox Reverb AXS 31.6 | 150 | 440 | 290 |
| PNW Loam 30.9 | 170 | 458 | 288 |
| OneUp Dropper V2 34.9 | 180 | 468 | 288 |

`total = travel + ~288`. All three also carry `setbackMm: 0` and
`railClampType: ROUND_7MM`. 440mm total for a 150mm Reverb AXS is at the implausibly
short end for that post.

**Compounding schema gap:** R-SP-03 [crit] is documented as "must compare insertion
depth", and the spec records that comparing total length "was wrong first time" and
"excluded virtually every dropper made". `Seatpost` has `totalLengthMm` but **no
`maxInsertionMm` field**. R-SP-03 cannot currently be implemented as specified against
this schema, whatever the data quality. This is a schema defect, not a data one.

### 6.4 Internally contradictory enum values

- **SRAM XX SL Eagle Transmission (CRANKSET): `chainringMount: SRAM_3_BOLT`.**
  A T-Type Transmission crank does not use the 3-bolt X-Sync interface. Under
  R-CHR-02 [crit] this both falsely admits the seed's own `X-Sync 2` 3-bolt rings onto
  a Transmission crank and blocks the correct ring. It also sits at
  `chainlineMm: 52` / `chainlineType: BOOST_52` while the T-Type family is a
  55mm-chainline system — and the paired `XX SL Eagle AXS Transmission` derailleur
  correctly carries `mountStandard: UDH_DIRECT_MOUNT`, so the crank contradicts its own
  groupset. (Both rows are DELETE-as-duplicate anyway; the sourced `FC-XX-SL-D1` and
  `RD-XX-A1` supersede them.)
- **SRAM XX SL Eagle AXS Transmission (RD): `cageLength: LONG_SGS`.** SS/GS/SGS is
  Shimano nomenclature; SRAM T-Type derailleurs carry no cage-length designation. A
  Shimano field value has been stamped onto a SRAM part. R-DRV-06 [warn].
- **Shimano Deore XT M8100 (CRANKSET): `chainlineMm: 55`, `chainlineType: BOOST_55`**,
  against `BOOST_52` on both SRAM Boost cranks in the same seed and against the spec's
  own "Boost 52mm" in R-CRK-01. One of the two is wrong; they cannot both be Boost.
  R-CRK-01 [warn].
- **Shimano rotor lockrings disagree within one family.** `RT-MT800 160mm` is
  `lockringType: EXTERNAL`, `RT-MT900 203mm` is `INTERNAL`. R-BRK-06 [warn].
- **Continental Kryptotal Fr `hooklessSafe: false`** against `true` on all three Maxxis
  tyres — see §4c. R-TIR-04 [crit].
- **Bontrager Standard 29 `valveType: SCHRADER`** against `valveHoleType: PRESTA` on
  every wheelset in the set. R-TIR-06 [crit].
- **Paul Component Love Lever `brakeSystemFamily: "Mechanical"`** — a category label
  in a field the engine treats as an exact-match product key. R-BRK-08 [crit].
- **Uniform `minRotorThicknessMm: 1.5` on all three calipers**, across SRAM and
  Shimano. Generated, not read. R-BRK-11 [warn].

### 6.5 The price ladder

75 parts share only **37 distinct `basePricePence` values**, drawn from a ladder that
repeats across unrelated categories: `3399` is simultaneously the SRAM DUB BSA bottom
bracket, the GX Eagle Trigger shifter, the Race Face Chester pedals and the CN-M8100
chain; `51000` is both the XX SL crankset and the XX SL derailleur; `13000` covers a
crankset, a caliper, a cassette, a handlebar and a pair of shoes. Values cluster on
`x99` endings and round hundreds. No sourced part in the catalogue carries a
`basePricePence` at all — consistent with the rule that "manufacturer spec sheets carry
no RRP, and inventing one is not acceptable". These 75 are the only parts that broke it.

Tyre widths are likewise arithmetic rather than measured: 2.25" -> 57, 2.4" -> 61,
2.5" -> 63, i.e. `round(inches x 25.4)`. Real mounted width is a measured figure that
varies with rim internal width, which is exactly what R-TIR-03 is trying to reason about.

---

## 7. Recommended order of work

1. **Delete the 466 `Price` rows.** Fabricated prices and dead links under real
   retailer names. No dependency on anything else. (§5.2)
2. **Repoint the 5 real-bike chain references** at `CN-M8100 SHIMANO` and
   `CN-HG601-11 SHIMANO`, then delete the two demo chains. Removes the last
   UNVERIFIED data from any sourced bike, and resolves the road-bike
   `SHIMANO_HG_12_MTB` question. (§3)
3. **Delete the three headless `BikeModel` rows.** Frees 67 of the 78
   `BikeModelPart` references. (§5.3)
4. **Delete the remaining 13 duplicates and 5 orphans** (§4a, §4b) — 20 parts gone
   with zero sourcing effort.
5. **Fix `brakeSystemFamily`** — enum, or normalise on write. This is a live
   engine-correctness bug affecting sourced data, not just the demo seed. (§5.1)
6. **Re-source the 55**, tier order as listed in §4c. Wheelsets, brakes and shocks
   first: freehub body, brake fluid and shock eye-to-eye/hardware are where a wrong
   value is both `critical` and unsafe.
7. **Backlog:** add `Seatpost.maxInsertionMm` so R-SP-03 can be implemented as
   specified (§6.3); audit the six unslotted paired-component models (§5.4).

Until step 6 completes, the honest position is that the MTB half of the builder has no
verified inventory in six categories. That is a smaller problem than shipping guesses:
"a tool that confidently says an incompatible part fits is worse than no tool."
