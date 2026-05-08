"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] bg-panel border border-line rounded-2xl shadow-2xl outline-none",
            sizeMap[size],
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
            className
          )}
        >
          {(title || description) && (
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-line">
              <div className="flex-1 min-w-0">
                {title && (
                  <Dialog.Title className="text-[15px] font-semibold text-ink leading-tight">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="text-[12px] text-ink-3 mt-1">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <IconButton size="sm" variant="ghost" aria-label="Закрыть">
                  <X size={14} />
                </IconButton>
              </Dialog.Close>
            </div>
          )}
          <div className="px-6 py-5">{children}</div>
          {footer && (
            <div className="flex gap-3 px-6 py-4 border-t border-line">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
