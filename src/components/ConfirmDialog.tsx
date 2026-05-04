"use client";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmText = "Подтвердить",
  cancelText = "Отмена",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const buttonClass =
    variant === "danger"
      ? "bg-red text-white hover:bg-red/90"
      : variant === "warning"
      ? "bg-accent text-bg hover:bg-accent-2"
      : "bg-accent text-bg hover:bg-accent-2";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
            variant === "danger" ? "bg-red/20 text-red" : "bg-accent/20 text-accent"
          }`}>
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-display text-lg mb-2">{title}</h3>
          <p className="text-sm text-ink-2">{message}</p>
        </div>
        <div className="flex border-t border-line">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm text-ink hover:bg-panel-2 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${buttonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
