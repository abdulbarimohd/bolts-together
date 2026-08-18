# Bolts Together — Build Plan

**Project:** a UK bike compatibility engine and build tool, monetised through
affiliate links. Successor to Build My Bike (formerly Bike PartPicker).

**Working directory:** `C:\Users\abdul\Documents\bolts-together\`
**Predecessor (source of engine + data):** `C:\Users\abdul\Documents\bike-partpicker\`
**Engine reference:** [`docs/ENGINE_SPEC.md`](docs/ENGINE_SPEC.md) — all 103 rules, portable, no chat history needed.

---

## Status — 19 August 2026

| Phase | State |
|---|---|
| 0 — Domain | Deferred to launch. `boltstogether.co.uk/.com/.bike` all free as of 18 Aug. |
| 1 — Foundation | **Done.** Next 16.3.1 + OpenNext on Workers, Neon (London), schema migrated. |
| 2 — Engine | **Done.** 103 rules ported, **128 tests green**. |
| 3 — Data | **Done for road/gravel.** 773 parts, 122 bike models, 542 links, 478 prices in Neon. MTB sourcing in progress. |
| 4 — Design system | In progress. |
| 5 — 3D hero | Not started. Depends on Phase 4. |
| 6 — Three sections | Backend in progress; UI depends on Phases 4 + 6-backend. |
| 7 — Affiliate layer | In progress. **Blocked on Awin credentials + the feed-coverage answer.** |
| 8 — Launch | Not started. |

**Live:** `bolts-together.bolts-together.workers.dev` (stale build — a fresh
deploy is pending the size fix landing).

**Coverage today:** gravel 82, road 32, endurance 5, trail 2, xc 1. MTB is
effectively unsourced despite being a launch discipline — this is the largest
open gap.

**Data recovery note.** The bike rows were missing from every database when
Phase 3 began — both the old production and local databases held 3 models, not
the 122 the session log described. They were recoverable only because the import
scripts carry their verified data *inline* rather than reading external files:
the research lived in git, not just in Postgres. **Keep sourced data as
committed fixtures, never solely as rows.**

---

## Decisions taken (2026-08-18)

| Area | Decision |
|---|---|
| Codebase | New repo. Port the compatibility engine, schema and verified data across. |
| Name | **Bolts Together** — from the existing tagline "a bike that actually bolts together" |
| Domains | `.co.uk`, `.com` and `.bike` all confirmed available |
| Frontend | Next.js (App Router) on **Cloudflare Workers** via the OpenNext adapter |
| Database | **Neon** — serverless Postgres, free tier, branching for preview deploys |
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

## Phase 0 — Secure the name (yours, but NOT yet)

Register **boltstogether.co.uk**, **.com** and **.bike** — all three confirmed free
on 2026-08-18.

**Timing: do this shortly before launch, not now.** Every phase up to launch runs
on a free hosting subdomain, so a paid domain sitting idle for months earns
nothing. Two things make waiting low-risk here:

- "Bolts Together" is a two-word phrase, not a premium dictionary term — there is
  no meaningful squatting demand for it.
- Availability was checked directly against the Nominet, Verisign and Identity
  Digital **registries**, not a registrar's search box. Some registrars have been
  accused of front-running searched names; going via RDAP means the name was never
  exposed to one.

If budget is tight, **`.co.uk` alone is the one that matters** for a UK site
(~£8–12/yr). `.com` and `.bike` are defensive registrations that can wait.

I can't purchase domains — that needs payment details, which I won't handle.
Enable auto-renew, decline every upsell, and note that Nominet only permits
address privacy for individuals *not trading* — an affiliate site plausibly
counts as trading, which would make a home address public. Use a business or
forwarding address.

Also needed from you before Phase 6:
- Awin **publisher ID** and API/feed credentials
- The Ribble tracked deep-link format Awin gave you
- Confirmation of whether Ribble's Awin feed includes **component-level** products
  or complete bikes only — this decides whether per-part pricing is possible at launch

---

## Phase 1 — Foundation

Fresh Next.js App Router project, TypeScript strict, Tailwind, deployed to
Cloudflare Workers through the OpenNext adapter. Neon project with a `main` branch
for production and preview branches per pull request. Prisma set up for the
Workers runtime (driver adapter over HTTP, not the standard TCP client — this is
the one real gotcha of the Cloudflare route and is worth getting right on day
one). Schema ported from the predecessor, with these changes made **during** the
port rather than after:

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
keyboard and screen-reader pass, domain cutover from the `workers.dev` subdomain
to `boltstogether.co.uk`, redirects from the old Build My Bike URLs to preserve
whatever SEO has accrued.

**This is the first phase that costs money** — and only the domain. See below.

---

## What this costs

The whole build runs on £0. Nothing between here and launch requires payment.

| Item | Cost | When |
|---|---|---|
| GitHub | Free | — |
| Cloudflare Workers | **Free** — and unlike Vercel's Hobby plan, the free tier permits commercial use | — |
| Neon Postgres | Free tier | — |
| Next.js, Prisma, React Three Fiber, Tailwind | Free, open source | — |
| Part data | Free — sourced from manufacturer specs and affiliate feeds | — |
| **Domain** | **~£8–12/yr** for `.co.uk` alone | Phase 8 only |

**Total to build: £0. Total at launch: about a tenner a year.**

Why not Vercel: its fair-use policy restricts the Hobby plan to non-commercial
personal use, and its definition of commercial explicitly covers sites whose
primary purpose is affiliate linking. That is exactly this project, so Hobby is
not available to us and Pro is $20/month. Cloudflare's free tier carries no such
restriction. This also applies to the existing Build My Bike deployment, which is
worth being aware of.

Costs only appear if the site succeeds: Neon's paid tier if the database outgrows
the free allowance, and Cloudflare's $5/month Workers plan if traffic exceeds
100,000 requests a day. Both are good problems.

---

## Platform constraints discovered in build

**Cloudflare free-plan Workers are capped at 3 MiB gzipped** (paid: 10 MiB). The
first deploy carrying Prisma landed at 3,132 KiB — 60 KiB over. Fixed by
excluding `@vercel/og`, which Next traces into every bundle whether used or not
and which costs ~1.5 MB in WASM and an embedded font. This project generates no
OpenGraph images, so none of it was reachable code.

Prisma's own WASM query compiler (3.5 MB raw) stays — the driver adapter needs
it, and it compresses well. The practical rule: **check `Total Upload … gzip:`
in the wrangler log after any dependency change.** Adding OG image generation,
or another WASM-heavy dependency, will require the paid plan.

**Windows Developer Mode must stay on.** The OpenNext build creates directory
symlinks, which Windows refuses without it. CI on Linux
(`.github/workflows/deploy.yml`) exists so deploys don't depend on that setting.

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
