"use client";

import type { ComponentPropsWithoutRef, CSSProperties, JSX } from "react";
import { cx } from "@/lib/design/cx";
import { useInView } from "./useInView";

type CSSVars = CSSProperties & Record<string, string | number>;

export interface StaggerProps extends ComponentPropsWithoutRef<"div"> {
  /** Element to render. Defaults to `div`. */
  as?: keyof JSX.IntrinsicElements;
  /** Delay between siblings, in ms. Defaults to the `--stagger-step` token. */
  step?: number;
  /** Delay before the first child moves, in ms. */
  delay?: number;
  /** Distance each child travels, in px. Defaults to `--reveal-distance`. */
  distance?: number;
  /** Re-hide when scrolled back out of view. Default `false`. */
  repeat?: boolean;
  /** Fraction visible before revealing. Defaults to the token. */
  threshold?: number;
  /** Observer root margin. Defaults to the token. */
  rootMargin?: string;
}

/**
 * Reveal direct children one after another.
 *
 * One IntersectionObserver on the container; the offsets are pure CSS
 * (`[data-stagger] > *:nth-child(n)` in `globals.css`). Children are not
 * cloned and not wrapped, so this drops into an existing flex or grid layout
 * without disturbing it — put `<Stagger className="grid grid-cols-3 gap-4">`
 * exactly where the grid would have gone.
 *
 * Only element children are staggered; bare text nodes are not matched by
 * `> *` and will simply appear.
 *
 * Delays are enumerated to sixteen children; anything beyond that arrives on
 * the sixteenth beat. That cap is intentional — a stagger longer than about a
 * second stops reading as craft and starts reading as lag.
 */
export function Stagger({
  as = "div",
  step,
  delay = 0,
  distance,
  repeat = false,
  threshold,
  rootMargin,
  className,
  style,
  children,
  ...rest
}: StaggerProps) {
  const [ref, inView] = useInView<HTMLDivElement>({
    once: !repeat,
    threshold,
    rootMargin,
  });

  const Tag = as as "div";

  const vars: CSSVars = { ...style };
  if (step !== undefined) vars["--stagger-step"] = `${step}ms`;
  if (delay) vars["--stagger-base"] = `${delay}ms`;
  if (distance !== undefined) vars["--reveal-distance"] = `${distance}px`;

  return (
    <Tag
      ref={ref}
      data-stagger={inView ? "shown" : "hidden"}
      className={cx(className)}
      style={vars}
      {...rest}
    >
      {children}
    </Tag>
  );
}
