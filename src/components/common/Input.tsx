import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, id, required, className = "", ...rest }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      <input
        id={id}
        required={required}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700 ${
          error ? "border-rose-300 dark:border-rose-500/50" : "border-slate-300 dark:border-slate-600"
        } ${className}`}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
