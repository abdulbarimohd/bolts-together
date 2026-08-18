import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the Worker under Cloudflare's free-plan 3 MiB (gzipped) limit.
  //
  // The first deploy came in at 3,132 KiB gzipped — 60 KiB over. Next traces
  // @vercel/og into the bundle whether or not you use it, and it is heavy:
  // resvg.wasm is 1,346 KiB and it ships a 123 KiB embedded font. This project
  // generates no OpenGraph images, so none of that is reachable code.
  //
  // Prisma's WASM query compiler (3.5 MiB raw) stays — that one is genuinely
  // needed by the driver adapter, and it compresses well.
  //
  // If OG image generation is ever added, remove this exclusion and expect to
  // need the paid plan (10 MiB) instead.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/next/dist/compiled/@vercel/og/**",
    ],
  },
};

export default nextConfig;
