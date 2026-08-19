"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * `true` when the visitor has asked their OS to reduce motion.
 *
 * Server snapshot is `false` — we cannot know the preference during SSR, and
 * the CSS backstop in `globals.css` covers the gap before hydration. Because
 * the value can flip on the first client render, every primitive that uses
 * this must degrade to "fully visible, no animation", never to "hidden".
 *
 * Uses `useSyncExternalStore` so a preference changed mid-session (macOS and
 * Windows both allow this) takes effect immediately.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
