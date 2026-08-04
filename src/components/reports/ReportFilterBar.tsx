import { AlertTriangle, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import Button from "../common/Button";

export type ReportFilterFieldConfig =
  | { type: "dateRange"; startKey: string; endKey: string; label?: string }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { type: "text"; key: string; label: string; placeholder?: string };

interface ReportFilterBarProps {
  fields: ReportFilterFieldConfig[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onApply: () => void;
  onReset: () => void;
  loading?: boolean;
  validationError?: string | null;
}

const FIELD_CLASSNAME =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800";

const LABEL_CLASSNAME = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500";

/**
 * Reusable, config-driven filter bar shared by every report section. Each report supplies its own
 * `fields` (date range, select, or free-text) and owns its filter state; this component only
 * renders the inputs and reports changes back via onChange/onApply/onReset.
 */
export default function ReportFilterBar({
  fields,
  values,
  onChange,
  onApply,
  onReset,
  loading = false,
  validationError,
}: ReportFilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        Filters
      </div>

      <div className="flex flex-wrap items-end gap-4">
        {fields.map((field) => {
          if (field.type === "dateRange") {
            return (
              <div key={`${field.startKey}-${field.endKey}`} className="flex flex-wrap items-end gap-2">
                <div className="w-[calc(50%-0.25rem)] sm:w-36">
                  <label className={LABEL_CLASSNAME}>{field.label ?? "Date"} From</label>
                  <input
                    type="date"
                    value={values[field.startKey] ?? ""}
                    onChange={(e) => onChange(field.startKey, e.target.value)}
                    disabled={loading}
                    className={FIELD_CLASSNAME}
                  />
                </div>
                <div className="w-[calc(50%-0.25rem)] sm:w-36">
                  <label className={LABEL_CLASSNAME}>{field.label ?? "Date"} To</label>
                  <input
                    type="date"
                    value={values[field.endKey] ?? ""}
                    onChange={(e) => onChange(field.endKey, e.target.value)}
                    disabled={loading}
                    className={FIELD_CLASSNAME}
                  />
                </div>
              </div>
            );
          }

          if (field.type === "select") {
            return (
              <div key={field.key} className="w-full sm:w-44">
                <label className={LABEL_CLASSNAME}>{field.label}</label>
                <select
                  value={values[field.key] ?? ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  disabled={loading}
                  className={FIELD_CLASSNAME}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={field.key} className="w-full sm:w-52">
              <label className={LABEL_CLASSNAME}>{field.label}</label>
              <input
                type="text"
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                disabled={loading}
                placeholder={field.placeholder}
                className={FIELD_CLASSNAME}
              />
            </div>
          );
        })}

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Search className="h-3.5 w-3.5" />}
            onClick={onApply}
            disabled={loading}
          >
            Search
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onReset}
            disabled={loading}
          >
            Reset
          </Button>
        </div>
      </div>

      {validationError && (
        <div className="mt-3 flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
