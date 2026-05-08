"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white hover:bg-accent-2 shadow-[0_1px_0_rgba(255,255,255,0.08)_inset]",
        secondary:
          "bg-panel border border-line text-ink hover:bg-panel-2 hover:border-line-2",
        ghost:
          "bg-transparent text-ink-2 hover:bg-panel hover:text-ink",
        danger:
          "bg-red/10 border border-red/30 text-red hover:bg-red/20",
        outline:
          "bg-transparent border border-line text-ink hover:border-accent/40 hover:text-accent",
      },
      size: {
        sm: "px-2.5 py-1 text-[12px]",
        md: "px-3.5 py-2 text-[13px]",
        lg: "px-5 py-2.5 text-[14px]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = "Button";
