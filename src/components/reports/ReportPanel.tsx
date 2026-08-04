import { AlertTriangle, SearchCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Table, { TableColumn } from "../common/Table";
import LoadingSpinner from "../common/LoadingSpinner";

interface ReportPanelProps<T extends Record<string, unknown>> {
  title: string;
  icon: LucideIcon;
  loading: boolean;
  error: string | null;
  data: T[];
  columns: TableColumn<T>[];
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
  /** True until the user has run their first search; shows a prompt instead of loading/table. */
  idle?: boolean;
  idleMessage?: string;
  /** Optional header-right content (e.g. export buttons), hidden while idle. */
  actions?: ReactNode;
}

/**
 * Reusable loading/error/table wrapper shared by every report section, so each one only needs to
 * supply its own column definitions and fetched rows. Wraps the shared Table component in the
 * same card chrome as every other list page, with a title + live record count header.
 */
export default function ReportPanel<T extends Record<string, unknown>>({
  title,
  icon: Icon,
  loading,
  error,
  data,
  columns,
  emptyMessage = "No records found for the selected filters.",
  getRowKey,
  idle = false,
  idleMessage = "Set your filters and click Search to generate this report.",
  actions,
}: ReportPanelProps<T>) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          {title}
        </div>
        {!idle && (
          <div className="flex flex-wrap items-center gap-3">
            {!loading && !error && (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {data.length} {data.length === 1 ? "record" : "records"} found
              </span>
            )}
            {actions}
          </div>
        )}
      </div>

      {idle ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-2 px-4 py-12 text-center text-slate-500 dark:text-slate-400">
          <SearchCheck className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
          <p className="text-sm">{idleMessage}</p>
        </div>
      ) : loading ? (
        <LoadingSpinner label={`Loading ${title.toLowerCase()}...`} className="min-h-[40vh]" />
      ) : error ? (
        <div className="flex items-start gap-2.5 px-4 py-6 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-b-2xl">
          <Table columns={columns} data={data} emptyMessage={emptyMessage} getRowKey={getRowKey} />
        </div>
      )}
    </div>
  );
}
