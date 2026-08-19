import { cx } from "@/lib/design/cx";

/**
 * Deliberately NOT a client module.
 *
 * `hoverClasses` is a plain string function, but it is needed by server
 * components (`Card`). If it lived in `Hover.tsx` — which carries the
 * `"use client"` directive — importing it from a server component would give
 * back a client reference proxy rather than the function. Hence its own file.
 */

export interface HoverOptions {
  /** Raise the surface 3px. Default `true`. */
  lift?: boolean;
  /** Tint the border and cast an accent glow. Default `false`. */
  glow?: boolean;
  /** Pointer-tracked accent spotlight across the surface. Default `false`. */
  spotlight?: boolean;
}

/**
 * The class list for the house hover treatment.
 *
 * There is one hover in this application and this function returns it. Any
 * component that renders its own element opts in through here rather than
 * approximating the effect with its own utilities.
 */
export function hoverClasses({
  lift = true,
  glow = false,
  spotlight = false,
}: HoverOptions = {}): string {
  return cx(
    "bt-hover",
    lift && "bt-hover-lift",
    glow && "bt-hover-glow",
    spotlight && "bt-hover-spotlight",
  );
}
