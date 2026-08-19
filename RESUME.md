# Resume — paste this as the first message in a new session or account

I'm continuing **Bolts Together** — a UK bike compatibility engine and build tool,
monetised through affiliate links. Successor to *Build My Bike* (originally *Bike
PartPicker*).

**Read these three files first, in this order:**
1. `PLAN.md` — decisions taken, phase status, risks
2. `docs/ENGINE_SPEC.md` — all 103 compatibility rules, portable, no chat history needed
3. This file — for anything the other two don't cover

---

## The one rule that governs everything

**Never guess, infer or fabricate a part spec.** If a value can't be verified, it
stays `null` and the engine abstains. A wrong spec doesn't fail loudly — it
silently removes legal parts from a rider's build list, which is worse than having
no data at all.

Every `Part` carries `dataSource` provenance (`MANUFACTURER_SPEC` >
`RETAILER_LISTING` > `DATA_FEED` > `COMMUNITY` > `ESTIMATED` > `UNVERIFIED`) and a
`sourceUrl`. Prices are UK, VAT-inclusive, in pence, and nullable — no invented
RRPs.

This is load-bearing, not a preference. It has already prevented several
near-misses, and three seed frames with invented geometry were deleted rather than
kept.

---

## Where everything lives

| Thing | Where |
|---|---|
| Repo | `github.com/abdulbarimohd/bolts-together` (public) |
| Local | `C:\Users\abdul\Documents\bolts-together` |
| Database | **Neon**, project `bolts-together` / `lucky-frog-76673748`, Postgres 18, `aws-eu-west-2` (London) |
| Hosting | **Cloudflare Workers**, `bolts-together.bolts-together.workers.dev` |
| Predecessor | `C:\Users\abdul\Documents\bike-partpicker` — source of the engine and original data |

None of these are tied to a Claude account. A new session on any machine only needs
the repo plus the two logins below.

## Getting a working environment back

```bash
git clone https://github.com/abdulbarimohd/bolts-together.git
cd bolts-together
npm install
```

Then recreate the two gitignored env files. **Both connection strings come from
Neon and are not interchangeable:**

```bash
npx neon auth
```

```bash
npx neon connection-string --project-id lucky-frog-76673748 > /tmp/direct
```

- `.env` → the **direct** URL as `DATABASE_URL`. Used by the Prisma CLI. Migrations
  run DDL and must not go through a pooler.
- `.dev.vars` → the **pooled** URL (host contains `-pooler`) as `DATABASE_URL`. Used
  by the app at runtime. Workers spawn many short-lived isolates and would exhaust a
  direct connection limit.

Then `npx prisma generate` and `npm test` — 146 tests should pass.

For deploys: `npx wrangler login`, then `npm run deploy`.

---

## Environment gotchas on this machine

These cost real time. Don't rediscover them.

- **PowerShell blocks `npx`** — ExecutionPolicy refuses to load `npx.ps1`. Use Git
  Bash, or call binaries directly (`./node_modules/.bin/wrangler`), or `npx.cmd`.
- **Windows Developer Mode must stay ON.** The OpenNext build creates directory
  symlinks, which Windows refuses with `EPERM` without it. CI on Linux
  (`.github/workflows/deploy.yml`) exists so deploys don't depend on that setting;
  it needs a `CLOUDFLARE_API_TOKEN` repo secret.
- **Cloudflare's free Worker limit is 3 MiB gzipped** and this app sits close to it.
  `@vercel/og` is excluded in `next.config.ts` because Next traces it in unused, at
  ~1.5 MB. Check `Total Upload … gzip:` in the wrangler log after any dependency
  change. Prisma's WASM query compiler (3.5 MB raw) is genuinely needed — keep it.
- **Two Prisma clients are generated.** `lib/generated/prisma` targets `workerd` for
  the app; `lib/generated/prisma-node` targets Node for the import scripts. The
  workerd client cannot run under plain Node.
- **Prisma 7 does not auto-load `.env`** — `prisma.config.ts` imports `dotenv/config`
  first, and its `datasource` block is conditional so `prisma generate` works in CI
  without a database.

---

## Working method that has proven itself

**Two-phase sourcing: a research agent, then a separate adversarial verify agent,
before anything is written.** One pass produced 129 findings of which verify
rejected 19 and downgraded 20 — roughly 30% would have been wrong.

Specific traps that have actually bitten:
- **Match on brand AND exact model number, never name similarity.** Shimano 105
  `R7100` (12sp) vs `R7000` (11sp); SRAM `XG-1391` vs `CN-RED-E1`.
- **Read the rendered page, never a search summary.** Summaries have twice invented
  specs that don't exist on the source page.
- **A manufacturer's current page may describe a newer redesign** than the model
  year being documented. Canyon and Vitus have both caught this project out; Vitus's
  generic geometry page still serves an old generation's data.
- **Keep sourced data as committed fixtures, not only as database rows.** The bike
  catalogue was once lost from every database and was recoverable *only* because the
  import scripts carry their data inline. `scripts/import/` is the pattern.

---

## Blocked on a human, not on work

1. **Awin credentials** — `AWIN_PUBLISHER_ID` and `AWIN_FEED_API_KEY`. Ribble's
   public Awin advertiser ID appears to be 5923; take it from the dashboard where
   approval status is visible. Run `npm run affiliate:check` to see current state.
2. **Does Ribble's Awin feed carry individual components, or complete bikes only?**
   If bikes-only, "buy price on every part" is undeliverable at launch and the
   imagery plan loses one of its two sources. The layer supports both outcomes —
   it's recorded as `RetailerFeed.scope` — but the UI can't commit until it's known.
3. **Domains** — `boltstogether.co.uk` / `.com` / `.bike` were all free on
   2026-08-18. Buy shortly before launch, not before.

## Known issues worth carrying forward

- **Trek Marlin Gen 3 is deliberately not imported.** It uses Trek's proprietary
  "ThruSkew" (a 5mm skewer through a closed 135mm dropout). Mapping it to
  `QUICK_RELEASE_135x9` would make the engine offer 9mm QR skewers that cannot fit.
  Needs a `THRU_SKEW_135x5` enum member first.
- **`Frame.hasEyelets` and `Frame.mulletApproved` cannot express "unknown"** — both
  are `Boolean @default(false)`, so an honest abstention becomes `false`. Both drive
  advisory rules only (R-MNT-05 info, R-FRK-04 warning), never a block. Making them
  nullable is the correct fix.
- **`state-adapter` and `accent` share `#FF5D2E`** — the accent does decorative and
  semantic duty at once. Separate tokens so they can diverge later.
- **~75 non-frame parts are still `UNVERIFIED` seed data.** Not urgent (the frame
  drives most lockout) but they should be re-sourced or removed eventually.
