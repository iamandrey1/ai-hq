"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex items-center justify-center font-semibold text-white shrink-0 select-none",
  {
    variants: {
      size: {
        xs: "w-5 h-5 text-[9px] rounded-md",
        sm: "w-7 h-7 text-[10px] rounded-lg",
        md: "w-8 h-8 text-[11px] rounded-lg",
        lg: "w-10 h-10 text-[13px] rounded-xl",
        xl: "w-14 h-14 text-[18px] rounded-2xl",
      },
      tone: {
        accent: "bg-gradient-to-br from-accent to-blue",
        purple: "bg-gradient-to-br from-purple-400 to-purple-600",
        green: "bg-gradient-to-br from-green to-emerald-600",
        amber: "bg-gradient-to-br from-amber-400 to-orange-500",
        red: "bg-gradient-to-br from-red to-pink-500",
        muted: "bg-line text-ink-2",
      },
    },
    defaultVariants: { size: "md", tone: "accent" },
  }
);

export interface AvatarProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  initials?: string;
  online?: boolean;
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, tone, initials, online, children, ...props }, ref) => (
    <div className="relative inline-block">
      <div
        ref={ref}
        className={cn(avatarVariants({ size, tone }), className)}
        {...props}
      >
        {children ?? initials?.slice(0, 2).toUpperCase()}
      </div>
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-bg",
            online ? "bg-green" : "bg-ink-3",
            size === "xs" ? "w-1.5 h-1.5" : size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5"
          )}
        />
      )}
    </div>
  )
);
Avatar.displayName = "Avatar";
