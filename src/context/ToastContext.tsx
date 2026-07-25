import React, { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const GLOW_STYLES: Record<ToastType, string> = {
  success: "from-emerald-200 via-teal-200 to-sky-200",
  error: "from-rose-200 via-orange-200 to-amber-200",
  info: "from-sky-200 via-indigo-200 to-violet-200",
};

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const ICON_COLORS: Record<ToastType, string> = {
  success: "text-emerald-500",
  error: "text-rose-500",
  info: "text-sky-500",
};

const AUTO_DISMISS_MS = 4000;

let nextToastId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      const id = nextToastId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.type];
          return (
            <div key={toast.id} className="relative">
              <div
                className={`absolute -inset-1 rounded-2xl bg-gradient-to-r ${GLOW_STYLES[toast.type]} opacity-70 blur-md`}
                aria-hidden="true"
              />
              <div className="relative flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <span className={`mt-0.5 flex-shrink-0 ${ICON_COLORS[toast.type]}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="flex-1 pt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-100">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="rounded-lg p-1 text-slate-400 transition-colors duration-150 ease-in-out hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a ToastProvider");
  }

  return context;
}
