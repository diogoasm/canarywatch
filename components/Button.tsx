import Link from "next/link";
import { forwardRef } from "react";

// The one button. Three kinds, two sizes, DM Sans 500, sentence case.
//   primary   — canary fill, the main action on a screen (one per screen)
//   secondary — 1px ink hairline on a transparent ground
//   text      — an underlined text action, for quieter or repeated actions
// tone="danger" recolours a kind in red ink, for deleting the account only.
// Hover only darkens a little; nothing grows or glows. Every kind keeps the
// 44×44px tap area from `.tap`, whatever its visible size.

type Kind = "primary" | "secondary" | "text";
type Size = "md" | "sm";
type Tone = "default" | "danger";

const BASE =
  "tap inline-flex items-center justify-center gap-2 font-body font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const KINDS: Record<Kind, string> = {
  primary:
    "rounded-lg bg-canary text-[#1A1A1A] hover:bg-canary-hover disabled:hover:bg-canary",
  secondary:
    "rounded-lg border border-[#1A1A1A] bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/[0.06] disabled:hover:bg-transparent",
  text: "text-[#1A1A1A] underline underline-offset-4 decoration-[#1A1A1A]/35 hover:decoration-[#1A1A1A]",
};

const DANGER: Record<Kind, string> = {
  primary:
    "rounded-lg bg-urgent-ink text-white hover:bg-[#A82424] disabled:hover:bg-urgent-ink",
  secondary:
    "rounded-lg border border-urgent-ink bg-transparent text-urgent-ink hover:bg-urgent-ink/[0.06] disabled:hover:bg-transparent",
  text: "text-urgent-ink underline underline-offset-4 decoration-urgent-ink/40 hover:decoration-urgent-ink",
};

// Boxed kinds: md is 44px tall, sm is 36px (still a 44px tap area). The text
// kind has no box, so size only sets the type.
const SIZES: Record<Size, string> = {
  md: "h-11 px-5 text-sm",
  sm: "h-9 px-4 text-sm",
};
const TEXT_SIZES: Record<Size, string> = {
  md: "text-sm",
  sm: "text-xs",
};

export function buttonClasses({
  kind = "primary",
  size = "md",
  tone = "default",
  muted = false,
  className = "",
}: {
  kind?: Kind;
  size?: Size;
  tone?: Tone;
  /** Text kind only: grey until hovered, for the least important actions. */
  muted?: boolean;
  className?: string;
} = {}): string {
  const sizing = kind === "text" ? TEXT_SIZES[size] : SIZES[size];
  const quiet =
    kind === "text" && muted
      ? "text-text-secondary decoration-text-secondary/40 hover:text-[#1A1A1A] hover:decoration-[#1A1A1A]"
      : "";
  const look = tone === "danger" ? DANGER[kind] : KINDS[kind];
  return [BASE, look, sizing, quiet, className].filter(Boolean).join(" ");
}

type CommonProps = {
  kind?: Kind;
  size?: Size;
  tone?: Tone;
  muted?: boolean;
  className?: string;
  children: React.ReactNode;
};

type AsLink = CommonProps & {
  href: string;
} & Omit<React.ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">;

type AsButton = CommonProps & {
  href?: undefined;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

const Button = forwardRef<HTMLButtonElement, AsLink | AsButton>(function Button(
  props,
  ref
) {
  const { kind, size, tone, muted, className, children, ...rest } = props;
  const classes = buttonClasses({ kind, size, tone, muted, className });

  if (rest.href !== undefined) {
    const linkProps = rest as Omit<AsLink, keyof CommonProps>;
    return (
      <Link {...linkProps} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest as Omit<AsButton, keyof CommonProps>;
  return (
    <button ref={ref} type={type} {...buttonProps} className={classes}>
      {children}
    </button>
  );
});

export default Button;
