import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => ReactNode;
  align?: "left" | "center";
}

const ALIGN_CLASSES: Record<"left" | "center", string> = {
  left: "text-left",
  center: "text-center",
};

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  getRowKey?: (row: T, index: number) => string | number;
  pageSize?: number;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  emptyMessage = "No data found.",
  getRowKey,
  pageSize = 10,
}: TableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Jump back to page 1 whenever the underlying dataset changes (new search/filter results).
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pageData = data.slice(startIndex, startIndex + pageSize);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-gradient-to-r from-slate-300 via-[#EAC435]/25 to-slate-300 dark:from-slate-700 dark:via-[#EAC435]/15 dark:to-slate-700">
            <tr className="divide-x divide-slate-200 dark:divide-slate-600">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-200"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, index) => (
                <tr
                  key={getRowKey ? getRowKey(row, startIndex + index) : startIndex + index}
                  className="divide-x divide-slate-100 hover:bg-slate-50 dark:divide-slate-800 dark:hover:bg-slate-800/60"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 text-sm text-slate-700 whitespace-nowrap dark:text-slate-300 ${ALIGN_CLASSES[column.align ?? "left"]}`}
                    >
                      {column.render ? column.render(row, startIndex + index) : (row[column.key] as ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, data.length)} of {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              aria-label="First page"
              className="rounded-lg p-1.5 text-slate-500 transition-colors duration-150 ease-in-out hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="rounded-lg p-1.5 text-slate-500 transition-colors duration-150 ease-in-out hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="rounded-lg p-1.5 text-slate-500 transition-colors duration-150 ease-in-out hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              aria-label="Last page"
              className="rounded-lg p-1.5 text-slate-500 transition-colors duration-150 ease-in-out hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <ChevronsRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
