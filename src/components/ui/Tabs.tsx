"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: ReactNode;
  count?: number | string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: "underline" | "pill" | "segmented";
  className?: string;
}

export function Tabs({ items, value, onChange, variant = "underline", className }: TabsProps) {
  if (variant === "segmented") {
    return (
      <div className={cn("inline-flex gap-1 p-1 bg-panel-2 border border-line rounded-lg", className)}>
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            className={cn(
              "px-3 py-1.5 text-[12px] font-medium rounded-md transition-all",
              value === it.value
                ? "bg-panel text-ink shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                : "text-ink-3 hover:text-ink"
            )}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span className="ml-1.5 font-mono text-[10px] text-ink-3">{it.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  if (variant === "pill") {
    return (
      <div className={cn("flex gap-2 flex-wrap", className)}>
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-full border transition-all",
              value === it.value
                ? "bg-accent/10 border-accent/40 text-accent"
                : "bg-panel border-line text-ink-2 hover:border-line-2 hover:text-ink"
            )}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span className="font-mono text-[10px] opacity-70">{it.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // underline (default) — like project detail page
  return (
    <div
      role="tablist"
      className={cn("flex gap-0 border-b border-line overflow-x-auto", className)}
    >
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={it.disabled}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors -mb-px",
              active
                ? "text-ink border-accent"
                : "text-ink-2 border-transparent hover:text-ink"
            )}
          >
            {it.icon}
            {it.label}
            {it.count !== undefined && (
              <span className="font-mono text-[10px] text-ink-3">{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
