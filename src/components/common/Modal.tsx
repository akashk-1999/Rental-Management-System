import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalSize = "md" | "lg";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  children: ReactNode;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  md: "max-w-md",
  lg: "max-w-3xl",
};

export default function Modal({ isOpen, onClose, title, subtitle, size = "md", children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative my-8 flex max-h-[calc(100dvh-4rem)] w-full ${SIZE_CLASSES[size]} flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-xl dark:border-slate-700/60 dark:bg-slate-900 sm:my-0 sm:max-h-[calc(100dvh-2rem)]`}
      >
        {title && (
          <div className="flex flex-shrink-0 items-center justify-between border-b border-amber-200 bg-gradient-to-r from-amber-100 via-amber-200 to-amber-50 px-6 py-3 dark:border-amber-500/20 dark:from-amber-500/10 dark:via-amber-500/20 dark:to-amber-500/10">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg border border-slate-200 bg-white/70 p-1 text-slate-500 transition-colors duration-150 ease-in-out hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
