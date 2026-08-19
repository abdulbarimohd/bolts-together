import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/lib/design/cx";
import { hoverClasses } from "@/components/motion/hoverClasses";

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  /** Applies the house hover treatment. Use for cards that are clickable. */
  interactive?: boolean;
  /** Adds the accent glow to the hover. Implies `interactive`. */
  glow?: boolean;
  /** Lays the blueprint grid texture behind the content. */
  blueprint?: boolean;
  /** `raised` sits on top of another panel; `well` recedes into the page. */
  tone?: "panel" | "raised" | "well";
  children?: ReactNode;
}

const tones = {
  panel: "bg-panel",
  raised: "bg-panel-raised",
  well: "bg-well",
} as const;

/**
 * The surface everything sits on.
 *
 * `interactive` pulls in `hoverClasses()` rather than defining its own hover,
 * so a card and a `<Hover>` wrapper behave identically — including under
 * reduced motion, where the lift drops out but the border change stays.
 */
export function Card({
  interactive = false,
  glow = false,
  blueprint = false,
  tone = "panel",
  className,
  children,
  ...rest
}: CardProps) {
  const wantsHover = interactive || glow;

  return (
    <div
      className={cx(
        "relative rounded-lg border border-grid",
        tones[tone],
        "shadow-[var(--shadow-panel)]",
        wantsHover && hoverClasses({ lift: true, glow }),
        className,
      )}
      {...rest}
    >
      {blueprint ? (
        <div
          aria-hidden="true"
          className="bt-blueprint pointer-events-none absolute inset-0 rounded-[inherit] opacity-40 [--grid-size:28px] [mask-image:radial-gradient(120%_100%_at_50%_0%,black,transparent)]"
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx(
        "flex items-start justify-between gap-4 border-b border-grid px-5 py-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"h3">) {
  return (
    <h3 className={cx("text-xl font-semibold text-text", className)} {...rest}>
      {children}
    </h3>
  );
}

/** The small caps label that sits above a card title. */
export function CardEyebrow({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      className={cx(
        "text-micro font-medium tracking-caps text-text-faint uppercase",
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}

export function CardBody({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cx("px-5 py-4", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cx(
        "flex items-center justify-between gap-3 border-t border-grid px-5 py-3",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
