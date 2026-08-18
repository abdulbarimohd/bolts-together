import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The OpenNext Cloudflare adapter's build config.
//
// Deliberately minimal for now: the defaults give us the Worker entrypoint and
// static assets, which is all Phase 1 needs. Incremental cache (R2) and tag
// revalidation (D1/Durable Objects) get wired up later, when there's actually
// something worth caching — adding them now would mean provisioning paid-tier
// resources before a single page exists.
export default defineCloudflareConfig();
