---
name: build-my-bike-active-work
description: "As of 2026-08-18, the two unfinished workstreams on Build My Bike — the vividand.co-style homepage redesign and the planned in-house AI chatbot"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1bc9ea93-bb77-42b6-8d56-e57c3c5c943a
  modified: 2026-08-18T21:32:46.076Z
---

Two workstreams on [[build-my-bike-project]] were **in progress and unfinished**
as of 2026-08-18 (uncommitted in the working tree):

**1. Homepage redesign — attempted, not landed.** The target aesthetic is
modelled on **vividand.co**: "prismatic light through obsidian" — dark ground,
chromatic glass edges, a scroll-reactive moving cube background, and text that
animates in rather than appearing static. Artefacts on disk:
`web/components/PrismMark.tsx` (hexagon clip-path standing in for an isometric
cube, conic gradient faces, colour-offset `drop-shadow` for chromatic fringe),
`web/components/Reveal.tsx` (IntersectionObserver fade/slide-up), self-hosted
**General Sans** in `web/public/fonts/`, and a heavily rewritten
`web/app/page.tsx`. The previous session ended dissatisfied — the user's words
were that the entrances were "still static… nothing alike". This is why the
`frontend-design` and `ui-ux-pro-max` skill packs were installed on 2026-08-18.

**2. In-house AI chatbot — specced, not built.** The Vercel AI SDK
(`@ai-sdk/anthropic`, `@ai-sdk/react`, `ai`) is installed in `web/package.json`
but entirely unused: the planned route `web/app/api/chat/route.ts` does not exist
yet and nothing imports `useChat` or `streamText`.

Also settled by 2026-08-18: the **Ribble Cycles affiliate relationship via
Impact.com was approved**, and a "Buy a complete bike" homepage CTA plus `/buy`
page shipped — but the link is still the plain untracked category URL, pending
campaign/advertiser IDs from the Impact dashboard.
