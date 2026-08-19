"use client";

import type { ComponentPropsWithoutRef, CSSProperties, JSX } from "react";
import { cx } from "@/lib/design/cx";
import { useInView } from "./useInView";

type CSSVars = CSSProperties & Record<string, string | number>;

export interface RevealProps extends ComponentPropsWithoutRef<"div"> {
  /** Element to render. Defaults to `div`. */
  as?: keyof JSX.IntrinsicElements;
  /** Delay before this element animates, in ms. */
  delay?: number;
  /** Distance travelled, in px. Defaults to the `--reveal-distance` token. */
  distance?: number;
  /** Re-hide when scrolled back out of view. Default `false`. */
  repeat?: boolean;
  /** Fraction visible before revealing. Defaults to the token. */
  threshold?: number;
  /** Observer root margin. Defaults to the token. */
  rootMargin?: string;
}

/**
 * Fade and slide up when scrolled into view.
 *
 * The actual animation lives in `globals.css` under `[data-reveal]` — this
 * component only decides *when* to flip the attribute. That split is
 * deliberate: it means the timing, distance and easing of every reveal on the
 * site are edited in one place, and it means the animation still behaves
 * correctly for anything that sets the attribute without using this
 * component.
 *
 * Reduced motion: `useInView` reports `true` immediately and builds no
 * observer, and the CSS overrides the hidden state outright. Content is
 * always readable.
 */
export function Reveal({
  as = "div",
  delay = 0,
  distance,
  repeat = false,
  threshold,
  rootMargin,
  className,
  style,
  children,
  ...rest
}: RevealProps) {
  const [ref, inView] = useInView<HTMLDivElement>({
    once: !repeat,
    threshold,
    rootMargin,
  });

  // `as` is intentionally narrowed to an intrinsic element so the ref type is
  // knowable. Every intrinsic element accepts a ref to its own node.
  const Tag = as as "div";

  const vars: CSSVars = { ...style };
  if (delay) vars["--reveal-delay"] = `${delay}ms`;
  if (distance !== undefined) vars["--reveal-distance"] = `${distance}px`;

  return (
    <Tag
      ref={ref}
      data-reveal={inView ? "shown" : "hidden"}
      className={cx(className)}
      style={vars}
      {...rest}
    >
      {children}
    </Tag>
  );
}
