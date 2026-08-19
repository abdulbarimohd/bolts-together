"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { motion } from "@/lib/design/tokens";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export interface UseInViewOptions {
  /** Fraction of the element that must be visible. Defaults to the token. */
  threshold?: number;
  /** Observer root margin. Defaults to the token. */
  rootMargin?: string;
  /** Stop observing after the first intersection. Default `true`. */
  once?: boolean;
  /** Skip observation entirely and report `true` immediately. */
  disabled?: boolean;
}

const noopSubscribe = () => () => {};

/**
 * `true` where IntersectionObserver exists. The server snapshot is `true` so
 * that SSR renders the pre-reveal state; if the client turns out to lack the
 * API, the very first client render reports `false` and everything is shown
 * immediately.
 */
function useSupportsObserver(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof IntersectionObserver !== "undefined",
    () => true,
  );
}

/**
 * One IntersectionObserver, one boolean.
 *
 * This is the single scroll-detection mechanism in the app — `Reveal` and
 * `Stagger` both sit on top of it, so there is exactly one set of thresholds
 * to reason about.
 *
 * Under `prefers-reduced-motion: reduce`, or where IntersectionObserver is
 * missing, it returns `true` without ever constructing an observer. Content
 * is visible; nothing animates; no listeners are mounted. The hook never
 * degrades to "hidden" — if the mechanism fails, the content wins.
 */
export function useInView<T extends Element>(
  options: UseInViewOptions = {},
): [RefObject<T | null>, boolean] {
  const {
    threshold = motion.revealThreshold,
    rootMargin = motion.revealRootMargin,
    once = true,
    disabled = false,
  } = options;

  const ref = useRef<T | null>(null);
  const reduced = usePrefersReducedMotion();
  const supported = useSupportsObserver();
  const skip = disabled || reduced || !supported;

  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (skip) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [skip, threshold, rootMargin, once]);

  // `skip` short-circuits here rather than through state, so no effect ever
  // needs to call setState synchronously to reveal content.
  return [ref, skip || inView];
}
