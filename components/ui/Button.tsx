import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/design/cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const base = cx(
  "inline-flex items-center justify-center gap-2 rounded-md",
  "font-medium whitespace-nowrap select-none",
  "border border-transparent",
  // One transition list for every button, taken from the motion tokens.
  "transition-[background-color,border-color,color,box-shadow,transform]",
  "duration-[var(--duration-fast)] ease-[var(--ease-standard)]",
  // The press. Suppressed under reduced motion by the global backstop.
  "active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-45",
  "aria-disabled:pointer-events-none aria-disabled:opacity-45",
);

const variants: Record<ButtonVariant, string> = {
  primary: cx(
    "bg-accent text-text-on-accent",
    "hover:bg-accent-hover",
    "shadow-[var(--shadow-inset-line)]",
  ),
  secondary: cx(
    "bg-panel text-text border-grid",
    "hover:bg-panel-raised hover:border-grid-strong",
  ),
  ghost: cx(
    "bg-transparent text-text-muted",
    "hover:bg-panel hover:text-text",
  ),
  danger: cx(
    "bg-transparent text-state-blocked border-state-blocked/45",
    "hover:bg-state-blocked/12 hover:border-state-blocked",
  ),
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders full-width. */
  block?: boolean;
  className?: string;
  children?: ReactNode;
}

export type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export type ButtonLinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & {
    href: string;
    /** Opens in a new tab and adds the required rel. */
    external?: boolean;
  };

function classesFor({ variant = "primary", size = "md", block, className }: CommonProps) {
  return cx(base, variants[variant], sizes[size], block && "w-full", className);
}

/**
 * The button.
 *
 * Focus comes from the global `:focus-visible` rule in `globals.css` — an
 * accent outline at 2px offset. No variant overrides it, and none should:
 * one focus treatment across the whole application is the point.
 */
export function Button({
  variant,
  size,
  block,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classesFor({ variant, size, block, className })}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * The same button, as a link. Separate component rather than a polymorphic
 * `as` prop because the two have genuinely different props — `disabled` means
 * nothing to an anchor, `href` means nothing to a button — and pretending
 * otherwise produces the sort of un-navigable "button" that fails keyboard
 * testing.
 */
export function ButtonLink({
  variant,
  size,
  block,
  className,
  children,
  href,
  external,
  ...rest
}: ButtonLinkProps) {
  const classes = classesFor({ variant, size, block, className });

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}
