import clsx from "clsx";
import type { ReactNode } from "react";

type Variant = "neutral" | "accent" | "success" | "warning" | "danger";

export function Badge({
  children,
  variant = "neutral",
  className,
}: {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span className={clsx("badge", `badge-${variant}`, className)}>{children}</span>
  );
}

export function Dot({ variant = "neutral" }: { variant?: Variant }) {
  return (
    <span
      className={clsx(
        "h-1.5 w-1.5 rounded-full",
        variant === "neutral" && "bg-muted",
        variant === "accent" && "bg-accent",
        variant === "success" && "bg-success",
        variant === "warning" && "bg-warning",
        variant === "danger" && "bg-danger",
      )}
    />
  );
}
