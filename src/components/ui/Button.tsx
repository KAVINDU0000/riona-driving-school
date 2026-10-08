import React from "react";
import Icon from "./Icon";

type Variant = "primary" | "white" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  href?: string;
  target?: string;
  rel?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** Trailing icon rendered after the label, e.g. "arrow-up-right". */
  icon?: string;
  "aria-label"?: string;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark";

const variants: Record<Variant, string> = {
  primary: "bg-gold text-ink hover:bg-gold-dark shadow-[0_8px_20px_-8px_rgba(232,164,0,0.7)]",
  white: "bg-white text-ink border border-line hover:border-ink/25 hover:shadow-card",
  ghost: "text-ink hover:bg-white/70",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-[0.8125rem]",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-[0.9375rem]",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  onClick,
  href,
  target,
  rel,
  type = "button",
  disabled = false,
  icon,
  ...rest
}: ButtonProps) {
  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  const content = (
    <>
      {children}
      {icon && <Icon name={icon} className="w-4 h-4" strokeWidth={2} />}
    </>
  );

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes} {...rest}>
      {content}
    </button>
  );
}
