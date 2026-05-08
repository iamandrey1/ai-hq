"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 md:mb-8",
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.02em] text-ink leading-tight">
          {title}
        </h1>
        {description && (
          <div className="text-[13px] text-ink-3 mt-1.5">{description}</div>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
