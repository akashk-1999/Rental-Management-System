import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  iconAccent?: string;
  onClick?: () => void;
}

export default function DashboardCard({
  icon: Icon,
  label,
  value,
  iconAccent = "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
  onClick,
}: DashboardCardProps) {
  const content: ReactNode = (
    <>
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${iconAccent}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 text-left">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-150 ease-in-out hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-indigo-500/40"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      {content}
    </div>
  );
}
