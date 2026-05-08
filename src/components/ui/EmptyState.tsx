"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        className
      )}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-panel-2 border border-line flex items-center justify-center mb-4 text-ink-3">
          {icon}
        </div>
      )}
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      {description && (
        <p className="text-[12px] text-ink-3 mt-1.5 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
