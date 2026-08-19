---
name: bolts-together-rebuild
description: "Bolts Together — the 2026-08-18 ground-up rebuild of Build My Bike, and every decision locked in for it"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1bc9ea93-bb77-42b6-8d56-e57c3c5c943a
  modified: 2026-08-18T22:15:52.129Z
---

On 2026-08-18 the user decided to rebuild [[build-my-bike-project]] from scratch
as **Bolts Together** — name taken from the old site's own tagline, "a bike that
actually bolts together". `boltstogether.co.uk`, `.com` and `.bike` were all
confirmed available via registry RDAP on that date.

**Location:** `C:\Users\abdul\Documents\bolts-together\`, with `PLAN.md` (the
phased build plan) and `docs/ENGINE_SPEC.md` (all 103 rules, portable — written
so the engine can be reimplemented without re-reading any chat history).

**Decisions locked in — do not re-ask:**

| Area | Decision |
|---|---|
| Codebase | New repo; port engine, schema and verified data from the predecessor |
| Frontend | Next.js App Router on **Cloudflare Workers** (OpenNext adapter) |
| Database | **Neon** (serverless Postgres, free tier) — replacing Railway |
| Domain | `boltstogether.co.uk` — **buy at Phase 8, not before**; free subdomain until then |
| Theme | **Dark only** |
| Palette | Technical blueprint: ink `#0A0C10`, panel `#141821`, text `#E6EAF2`, accent `#FF5D2E`, grid `#1E2634`, fits `#3DDC97`, blocked `#FF4D4D` |
| Type | Technical grotesk (Geist/Suisse) + mono for part numbers and measurements |
| Motion | Rich and continuous — ambient, parallax, hover, route transitions |
| 3D | Decorative hero only (R3F, one stylised bike assembling on scroll). **Not** tied to selected parts |
| Imagery | Awin affiliate feeds (licensed) + manufacturer press kits |
| Accounts | Anonymous builds, optional sign-up — `Build.userId` becomes nullable |
| Affiliate | Awin (Ribble approved). Build a **retailer-agnostic** layer; more networks planned |
| Monetisation | Buy price on every part **and** a whole-build checkout list |
| Chatbot | **Not** in v1 |
| Disciplines | Road, gravel and MTB from day one |
| Launch | Full parity before launching |

**Budget constraint (stated 2026-08-18):** the user has no money to spend yet, so
the build must cost £0 until launch. This is why hosting moved off Vercel and the
domain is deferred.

**Do not put this project on Vercel's Hobby plan.** Vercel's fair-use policy
restricts Hobby to non-commercial personal use, and its definition of commercial
explicitly covers sites whose primary purpose is affiliate linking — this project
exactly. Pro is $20/month. Cloudflare Workers' free tier has no such restriction.
The *existing* Build My Bike deployment sits in this grey area too.

**Correction carried forward:** the affiliate relationship is via **Awin**, not
Impact.com — the old site's Impact verification tag is stale.

Still governed by [[bike-data-accuracy-rule]] and [[bike-data-sourcing-method]] —
the rebuild changes the presentation, never the never-fabricate principle.
