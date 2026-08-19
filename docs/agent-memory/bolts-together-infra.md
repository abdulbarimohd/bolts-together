---
name: bolts-together-infra
description: "Live infrastructure IDs and local conventions for Bolts Together — Neon project, connection-string split, Prisma 7 gotchas"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 1bc9ea93-bb77-42b6-8d56-e57c3c5c943a
  modified: 2026-08-18T22:41:45.456Z
---

Live infrastructure for [[bolts-together-rebuild]], set up 2026-08-18.

**Repo:** `github.com/abdulbarimohd/bolts-together`, local at
`C:\Users\abdul\Documents\bolts-together`.

**Neon** — project `bolts-together`, id `lucky-frog-76673748`, Postgres 18,
region `aws-eu-west-2` (London, chosen over the auto-provisioned `us-east-2`
default because the audience is UK-only). Org `org-still-bread-43555992`.
A second, unused auto-created project `summer-breeze-96068767` also exists.

**Two connection strings, deliberately not interchangeable** (both gitignored):
- `.env` → **direct** URL, for the Prisma CLI. Migrations run DDL and should not
  go through a connection pooler.
- `.dev.vars` → **pooled** URL (host contains `-pooler`), for the app at runtime.
  Workers spawn many short-lived isolates and would exhaust a direct connection
  limit.

**Prisma 7 gotchas that cost time — don't rediscover these:**
- The datasource `url` is no longer allowed in `schema.prisma`. It lives in
  `prisma.config.ts`.
- Prisma 7 does **not** auto-load `.env`. `prisma.config.ts` must
  `import "dotenv/config"` before `defineConfig`, or `env()` resolves nothing.
- The client is generated with `runtime = "workerd"` into `lib/generated/`
  (gitignored). A Node-runtime client will be needed separately for import
  scripts in Phase 3 — the workerd client won't run under plain Node.
- `npm run db:generate` must be re-run after any schema change or the client
  silently keeps stale types.

**Next.js 16.3.1** with `@opennextjs/cloudflare` 1.20.2 (which requires
next `>=16.2.11`) and wrangler 4.124. Route types like `LayoutProps` only exist
after a build, so a bare `tsc --noEmit` fails on a clean checkout until
`next build` has run once.

**Cloudflare** — account `65215cba41c6d85d6caed4f6a4d2e488`
(abdulbarimohd2022@gmail.com). Worker `bolts-together` deployed; production
`DATABASE_URL` set via `wrangler secret put`. Account subdomain is
`bolts-together.workers.dev`, so the Worker lives at
**`bolts-together.bolts-together.workers.dev`** (the name appears twice — worker
name, then account subdomain). Confirmed serving 200 from the LHR edge.

**Windows Developer Mode is OFF, and this blocks local deploys.** The OpenNext
build (`createServerBundle`) creates directory symlinks; Windows refuses them
with `EPERM` without Developer Mode. Junctions work, real symlinks do not —
confirmed by direct test. Consequence: `npm run deploy` cannot succeed on this
machine. Deployment goes through `.github/workflows/deploy.yml` on Linux
instead, which needs a `CLOUDFLARE_API_TOKEN` repo secret. `next dev`, tests,
migrations and Prisma generate all work fine locally — it is only the OpenNext
bundle step that fails.

**PowerShell blocks `npx`** on this machine — ExecutionPolicy refuses to load
`npx.ps1` (`UnauthorizedAccess`). Don't tell the user to run `npx ...` in
PowerShell. Use the Bash tool, or call the binary directly
(`./node_modules/.bin/wrangler`). Browser OAuth flows (`wrangler login`,
`neon auth`) work fine when run from the Bash tool in the background.

**Data state (2026-08-19):** 793 parts, 169 bike models, 41 frames, 478 prices.
Coverage: gravel 82, trail 38, road 32, xc 9, endurance 5, enduro 3. **Zero
UNVERIFIED frames** — the three invented-geometry seed frames were purged (their
bikes kept 22–23 genuinely sourced components each). ~75 non-frame parts are
still `UNVERIFIED` seed data.

**Hard-won lesson: the bike rows had been lost from every database** (both the
old Railway production DB and the local Docker one held only 3 bike models, not
the 122 the session log described). They were recoverable *only* because the
import scripts carry their verified data inline rather than reading external
files — the research lived in git, not just in Postgres. **Keep sourced data as
committed fixtures, never solely as rows.**

**MTB sourcing (2026-08-19)** brought MTB from 3 bikes to 50 across 24 verified
platforms, via five parallel research agents. Systemic gaps found, worth knowing
before re-attempting: **Giant publish no BB shell standard anywhere** (only the
installed part, e.g. "Shimano, threaded"), so all Giant platforms were dropped;
**Canyon publish no rear brake mount standard**, so only the Lux Trail survived;
**Orange publish neither brake mount nor numeric tyre clearance**.

**Trek Marlin Gen 3 is deliberately NOT imported.** It uses Trek's proprietary
"ThruSkew" — a 5mm skewer through a closed 135mm dropout. Mapping it to
`QUICK_RELEASE_135x9` would make the engine offer 9mm QR skewers that cannot
fit. Needs a `THRU_SKEW_135x5` enum member first.

**Two Frame columns cannot express "unknown":** `hasEyelets` and
`mulletApproved` are `Boolean @default(false)`, so honest abstentions become
`false`. Both drive advisory rules only (R-MNT-05 info, R-FRK-04 warning), never
a block — but making them nullable is the correct fix.

**Cloudflare free-plan Worker size limit is the tightest constraint on this
project.** Limit is **3 MiB gzipped** (paid is 10 MiB). The first deploy with
Prisma came in at 3,132 KiB — 60 KiB over. Breakdown that mattered:
- Prisma's WASM query compiler, 3,591 KiB raw — genuinely needed by the driver
  adapter, keep it.
- `@vercel/og` (`resvg.wasm` 1,346 KiB + a 123 KiB embedded font) — Next traces
  it in whether or not it is used. This project generates no OG images, so it is
  excluded via `outputFileTracingExcludes` in `next.config.ts`.

Consequence: **adding OG image generation, or another WASM-heavy dependency,
will push this over the free limit.** Check `Total Upload ... gzip:` in the
wrangler log after any dependency change. Wrangler's log (under
`AppData/Roaming/xdg.config/.wrangler/logs/`) lists the largest files, which is
far faster than scanning `.open-next/` on this machine.
