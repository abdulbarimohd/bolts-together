# Bolts Together — Build Plan

**Project:** a UK bike compatibility engine and build tool, monetised through
affiliate links. Successor to Build My Bike (formerly Bike PartPicker).

**Working directory:** `C:\Users\abdul\Documents\bolts-together\`
**Predecessor (source of engine + data):** `C:\Users\abdul\Documents\bike-partpicker\`
**Engine reference:** [`docs/ENGINE_SPEC.md`](docs/ENGINE_SPEC.md) — all 103 rules, portable, no chat history needed.

---

## Decisions taken (2026-08-18)

| Area | Decision |
|---|---|
| Codebase | New repo. Port the compatibility engine, schema and verified data across. |
| Name | **Bolts Together** — from the existing tagline "a bike that actually bolts together" |
| Domains | `.co.uk`, `.com` and `.bike` all confirmed available |
| Frontend | Next.js (App Router) on Vercel |
| Database | **Neon** — serverless Postgres, free tier, Vercel-native, branching for previews |
| ORM | Prisma (carried over) |
| Theme | **Dark only** |
| Palette | **Technical blueprint** — ink `#0A0C10`, panel `#141821`, text `#E6EAF2`, accent `#FF5D2E`, grid `#1E2634`, fits `#3DDC97`, blocked `#FF4D4D` |
| Type | **Technical grotesk** — one precise sans (Geist / Suisse) + mono for part numbers and measurements |
| Motion | **Rich and continuous** — ambient motion, parallax, hover micro-interactions, route transitions |
| 3D | **Decorative hero only** — one stylised bike that assembles on scroll. Not tied to selected parts. |
| Imagery | **Awin affiliate product feeds** (licensed) **+ manufacturer press kits** |
| Accounts | **Anonymous builds**, optional sign-up to save |
| Affiliate | Awin now (Ribble approved), more networks later → build a **retailer-agnostic** layer |
| Monetisation | Buy price on every part **+** whole-build checkout list |
| Chatbot | **Not in v1** |
| Disciplines | Road, gravel and MTB from day one |
| Launch | **Full parity, then launch** |

---

## Phase 0 — Secure the name (yours, do this first)

Register **boltstogether.co.uk**, **.com** and **.bike**. All three were free when
checked on 2026-08-18, but availability changes daily and every branded asset we
build after this depends on the name. Nothing else should start until this is done.

I can't purchase domains for you — that needs your payment details, which I won't
handle. Any registrar is fine.

Also needed from you before Phase 6:
- Awin **publisher ID** and API/feed credentials
- The Ribble tracked deep-link format Awin gave you
- Confirmation of whether Ribble's Awin feed includes **component-level** products
  or complete bikes only — this decides whether per-part pricing is possible at launch

---

## Phase 1 — Foundation

Fresh Next.js App Router project, TypeScript strict, Tailwind. Neon project with
a `main` branch for production and preview branches wired to Vercel. Prisma schema
ported from the predecessor, with these changes made **during** the port rather
than after:

1. **`Build.userId` becomes nullable** + a `sessionToken` column, so a build can
   exist before anyone signs up. This is the single biggest conversion fix.
2. **`Chain.speeds` becomes a range** (`speedsMin`/`speedsMax`, or an int array).
   Fixes the known false `R-DRV-07` block on SRAM's 12/13-speed chains.
3. **`bbShellWidthMm` becomes `Decimal`** so it can hold 85.5.
4. **`CablePullStandard` gains microSHIFT values** — currently blocks Topstone 3/4.
5. **Shell width split out of `bbShellStandard`** (R-BB-03 currently folds them
   together, which hides real mismatches).

Deliverable: schema migrates clean on Neon, app boots, no UI yet.

---

## Phase 2 — Port the compatibility engine

Copy `src/compatibility/engine.ts` and its 132 tests. Get the suite green on the
new schema **before** any UI exists — the tests are the specification.

Guard against the five bug classes that caused real damage (full detail in
`docs/ENGINE_SPEC.md` §7):
1. No `??` defaulting on compatibility inputs — `== null` means abstain.
2. Every paired component takes an explicit `slot`; never collapse front/rear.
3. Never resolve a part by insertion order.
4. Normalise or enum free-text keys like `brakeSystemFamily`.
5. Generate the public rules reference **from** the engine, never by hand.

Deliverable: 132+ tests passing, engine callable, zero UI.

---

## Phase 3 — Data migration

Move the verified catalogue across with provenance intact: `dataSource`,
`sourceUrl`, `dataNotes`, `verifiedAt` all preserved. 122 bikes, 9 frame
platforms, 26 fully-specced trims, ~93 real components.

Nothing gets approximated to fill a gap. Where the predecessor deliberately
abstained (Canyon Grizl alloy hanger, Cannondale Topstone alloy hanger,
proprietary D-shaped seatposts), it stays abstained.

**Known risk — MTB coverage.** You chose all three disciplines at launch, but the
verified data is almost entirely road and gravel. Mitigation: the UI states
coverage honestly per discipline ("14 verified frames in gravel, 0 in MTB — we're
sourcing these") rather than showing an empty list that reads as broken. Sourcing
MTB frames runs in parallel from Phase 3 onward using the two-phase
research→verify agent method in `docs/ENGINE_SPEC.md` §9.

---

## Phase 4 — Design system

Before any page is built, establish the primitives so the whole site is one system:

- **Tokens**: the blueprint palette as CSS custom properties. Dark only, so no
  theme-switching complexity — but every colour still defined once, centrally.
- **Type scale**: one grotesk, deliberate weights and tracking; mono reserved for
  part numbers, measurements and standards (`BB86 · 148×12 BOOST · M12×1.0`).
  Tabular numerals everywhere a number sits in a column.
- **State colours are semantic, not decorative**: `#3DDC97` means *fits*,
  `#FF4D4D` means *blocked*, `#FF5D2E` means *needs an adapter*. These map
  directly onto the engine's three severities and must never be used for
  ornament.
- **Motion primitives**: a scroll-reveal, a stagger, a hover lift, a route
  transition. Built once, reused everywhere — this is what stops "rich motion"
  from becoming "inconsistent motion".
- **`prefers-reduced-motion`** honoured from the start, not retrofitted. With
  continuous ambient motion this is an accessibility requirement, not a nicety.

---

## Phase 5 — The 3D hero

React Three Fiber, one stylised bike model, scroll-driven assembly: parts fly in
and bolt together as the visitor scrolls the hero.

Constraints that keep this from wrecking the site:
- Lazy-loaded and code-split; it must never block first paint.
- A static rendered fallback for reduced-motion, mobile and slow connections.
- Compressed geometry (draco/meshopt) with a hard budget — target under ~1.5 MB.
- It is explicitly **decorative**. It does not claim to show your actual build,
  and nothing about it should imply the parts you picked. That separation matters
  given the project's never-fabricate rule.

---

## Phase 6 — The three sections

**1. Build my bike** — pick a frame, everything else narrows to what genuinely
fits. True lockout. Per-row warning icons naming the exact remedy. Live running
totals for price and weight.

**2. I already own a bike** — load a factory spec from the 122-bike catalogue,
see upgrades guaranteed to fit. Slots with no verified part show "not fitted"
and let the rider pick from scratch.

**3. Buy a complete bike** — affiliate-led. Complete bikes with real specs,
filtered by discipline and budget, clicking out to Awin retailers.

---

## Phase 7 — Affiliate layer

> **⚠ BLOCKER — resolve before building this phase.**
> - [ ] Awin **publisher ID**
> - [ ] Awin **API / product-feed credentials**
> - [ ] The **tracked deep-link format** Awin issued for Ribble
> - [ ] **Does Ribble's feed carry component-level products, or complete bikes only?**
>       This decides whether "buy price on every part" is deliverable at launch, and
>       whether licensed feed images are available as an imagery source. If it's
>       bikes-only, this phase and the imagery plan both need reworking — much
>       cheaper to discover now than after building.
>
> Also: remove the stale Impact.com verification tag carried over from the old
> site. The live relationship is Awin.

Built retailer-agnostic from the start, because you plan to add networks:

- A `Retailer` + `AffiliateNetwork` model; adding Awin, Impact or another network
  is configuration, not code.
- Feed ingest on a schedule → prices, stock, product images.
- **Buy price on every part** row and detail page.
- **Whole-build checkout list** — itemised basket, total, one click-out per
  retailer, at the end of the builder flow.
- Disclosure on every affiliate link, plus a standing statement that commission
  never influences compatibility results. Legally required, and it's also the
  thing that makes the tool trustworthy.

---

## Phase 8 — Launch

SEO (per-page metadata, sitemap, JSON-LD, SSR on content pages — the predecessor
already proved this out), Lighthouse pass with the 3D and motion in place,
keyboard and screen-reader pass, domain cutover from Vercel subdomain to
`boltstogether.co.uk`, redirects from the old Build My Bike URLs to preserve
whatever SEO has accrued.

---

## Risks worth naming now

1. **"Full parity, then launch" means no revenue until everything is done.**
   The predecessor took ~20 sessions to reach its current state. If earning
   sooner matters more than a single clean launch, say so and I'll resequence
   to ship the Buy section first.
2. **Awin feed coverage is unverified.** If Ribble's feed carries complete bikes
   but not individual components, "buy price on every part" can't be delivered
   at launch for most of the catalogue. This needs checking early — it changes
   Phase 7 substantially.
3. **Rich continuous motion is the hardest thing here to execute well.** Done
   loosely it reads as AI-generated. The mitigation is Phase 4: a small set of
   motion primitives applied consistently, rather than effects added per page.
4. **MTB launches sparse.** Covered above — honesty in the UI, sourcing in
   parallel.
5. **Two Postgres services still run on Railway** for the old project. Once
   migration to Neon is verified, those should be torn down so you're not paying
   for or maintaining them.

---

## What I need from you to start Phase 1

- Domains registered (Phase 0)
- Confirmation you want me to create the GitHub repo, or whether you'll create it
- Awin credentials when convenient — not needed until Phase 7
