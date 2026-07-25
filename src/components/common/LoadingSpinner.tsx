import WalletLoader from "./WalletLoader";

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export default function LoadingSpinner({ label = "Loading...", className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex min-h-[60vh] flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 ${className}`}>
      <WalletLoader scale={0.7} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
