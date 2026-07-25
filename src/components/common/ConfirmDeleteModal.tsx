import { X } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

export interface DetailItem {
  label: string;
  value: string;
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle?: string;
  details: DetailItem[];
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  details,
  confirmLabel = "Delete",
  loading = false,
  error,
}: ConfirmDeleteModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="-mx-6 -mt-6 mb-6 flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-rose-600 to-red-600 px-6 py-3">
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-rose-100">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1 text-white/80 transition-colors duration-150 ease-in-out hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-700">
        {details.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between bg-slate-50/60 px-4 py-2.5 dark:bg-slate-800/40"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {item.label}
            </span>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-6">
        <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
