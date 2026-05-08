"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-panel-2 text-ink-2 border border-line",
        accent: "bg-accent/10 text-accent border border-accent/25",
        green: "bg-green/10 text-green border border-green/25",
        red: "bg-red/10 text-red border border-red/25",
        amber: "bg-amber-400/10 text-amber-400 border border-amber-400/25",
        blue: "bg-blue/10 text-blue border border-blue/25",
        muted: "bg-ink-3/10 text-ink-3 border border-line",
      },
      size: {
        xs: "text-[10px] px-1.5 py-px rounded",
        sm: "text-[10px] px-2 py-0.5 rounded-md",
        md: "text-[11px] px-2.5 py-1 rounded-md",
      },
      shape: {
        rect: "",
        pill: "rounded-full uppercase tracking-wide font-semibold",
      },
    },
    defaultVariants: { variant: "default", size: "sm", shape: "rect" },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, shape, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, shape }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";
