"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative rounded-xl transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-panel border border-line shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]",
        flat: "bg-panel-2 border border-line",
        glow:
          "bg-panel border border-accent/30 shadow-[0_0_40px_rgba(77,158,191,0.18)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-accent before:to-transparent before:opacity-60",
        ghost: "bg-transparent border border-line",
      },
      hover: {
        none: "",
        lift: "hover:border-line-2 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
        accent: "hover:border-accent/40",
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-5",
        xl: "p-6",
      },
    },
    defaultVariants: { variant: "default", hover: "none", padding: "md" },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, hover, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, hover, padding }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center justify-between mb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("flex items-center gap-2 text-[13px] font-semibold text-ink", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

export const CardMeta = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("font-mono text-[11px] text-ink-3", className)}
      {...props}
    />
  )
);
CardMeta.displayName = "CardMeta";
