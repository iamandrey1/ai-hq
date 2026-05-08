"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-95",
  {
    variants: {
      variant: {
        ghost: "text-ink-3 hover:text-ink hover:bg-panel-2",
        solid: "bg-panel border border-line text-ink hover:bg-panel-2 hover:border-line-2",
        accent: "bg-accent text-white hover:bg-accent-2",
        danger: "text-ink-3 hover:text-red hover:bg-red/10",
      },
      size: {
        sm: "w-7 h-7",
        md: "w-8 h-8",
        lg: "w-10 h-10",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  }
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
IconButton.displayName = "IconButton";
