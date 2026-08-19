"use client";

import { useCallback } from "react";
import type { ComponentPropsWithoutRef, JSX, PointerEvent } from "react";
import { cx } from "@/lib/design/cx";
import { hoverClasses } from "./hoverClasses";
import type { HoverOptions } from "./hoverClasses";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export interface HoverProps
  extends ComponentPropsWithoutRef<"div">,
    HoverOptions {
  /** Element to render. Defaults to `div`. */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Wraps content in the standard hover lift / glow.
 *
 * Reduced motion: the transform and the spotlight are suppressed in CSS, but
 * the border and shadow change still happens. A hover state that disappears
 * entirely under reduced motion is a regression, not an accommodation — the
 * visitor still needs to know what is under the cursor. The pointer listener
 * is not attached at all when spotlight is off or motion is reduced.
 */
export function Hover({
  as = "div",
  lift = true,
  glow = false,
  spotlight = false,
  className,
  children,
  onPointerMove,
  ...rest
}: HoverProps) {
  const reduced = usePrefersReducedMotion();
  const trackPointer = spotlight && !reduced;
  const Tag = as as "div";

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);
      if (!trackPointer) return;
      const el = event.currentTarget;
      const rect = el.getBoundingClientRect();
      el.style.setProperty(
        "--pointer-x",
        `${((event.clientX - rect.left) / rect.width) * 100}%`,
      );
      el.style.setProperty(
        "--pointer-y",
        `${((event.clientY - rect.top) / rect.height) * 100}%`,
      );
    },
    [onPointerMove, trackPointer],
  );

  return (
    <Tag
      className={cx(
        hoverClasses({ lift, glow, spotlight: trackPointer }),
        className,
      )}
      onPointerMove={
        trackPointer || onPointerMove ? handlePointerMove : undefined
      }
      {...rest}
    >
      {children}
    </Tag>
  );
}
