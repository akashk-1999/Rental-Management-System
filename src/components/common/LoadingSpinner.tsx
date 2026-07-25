import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export default function LoadingSpinner({ label = "Loading...", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-12 text-slate-500 dark:text-slate-400 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" aria-hidden="true" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
