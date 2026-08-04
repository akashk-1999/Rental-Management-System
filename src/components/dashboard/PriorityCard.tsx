import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PriorityTone = "rose" | "amber" | "indigo";

interface PriorityCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  description: string;
  tone: PriorityTone;
  onClick: () => void;
}

const TONE_STYLES: Record<PriorityTone, { border: string; iconBg: string; valueColor: string }> = {
  rose: {
    border: "border-rose-200 hover:border-rose-300 dark:border-rose-500/30 dark:hover:border-rose-500/50",
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300",
    valueColor: "text-rose-600 dark:text-rose-400",
  },
  amber: {
    border: "border-amber-200 hover:border-amber-300 dark:border-amber-500/30 dark:hover:border-amber-500/50",
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
    valueColor: "text-amber-600 dark:text-amber-400",
  },
  indigo: {
    border: "border-indigo-200 hover:border-indigo-300 dark:border-indigo-500/30 dark:hover:border-indigo-500/50",
    iconBg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
    valueColor: "text-indigo-600 dark:text-indigo-400",
  },
};

export default function PriorityCard({ icon: Icon, label, value, description, tone, onClick }: PriorityCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:bg-slate-900 ${styles.border}`}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${styles.iconBg}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className={`mt-0.5 text-3xl font-bold ${styles.valueColor}`}>{value}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />
    </button>
  );
}
