"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/design/cx";

export interface RouteTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Fades and lifts page content on every route change.
 *
 * Keyed on the pathname, so React tears down the old subtree and mounts a
 * fresh one, which restarts the CSS animation. That is the whole trick — no
 * exit animation, because an exit animation on a Next.js App Router
 * navigation means holding the old page on screen while the new one is ready,
 * which makes the site feel slower than it is.
 *
 * Reduced motion is handled in CSS (`.bt-route-enter`), so no JS check is
 * needed and no work is done for visitors who have opted out.
 *
 * Wrap `{children}` in `app/layout.tsx` with this when the real pages exist.
 * It is deliberately not wired up yet — there is only one route.
 */
export function RouteTransition({ children, className }: RouteTransitionProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={cx("bt-route-enter", className)}>
      {children}
    </div>
  );
}
