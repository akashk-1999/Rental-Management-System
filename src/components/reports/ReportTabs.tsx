import { ClipboardList, CreditCard, PackageCheck, Package, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ReportKey = "rentals" | "payments" | "returns" | "inventory" | "customer-history";

interface ReportTabsProps {
  active: ReportKey;
  onChange: (key: ReportKey) => void;
}

interface ReportTabDefinition {
  key: ReportKey;
  label: string;
  icon: LucideIcon;
}

const TABS: ReportTabDefinition[] = [
  { key: "rentals", label: "Rental Report", icon: ClipboardList },
  { key: "payments", label: "Payment Report", icon: CreditCard },
  { key: "returns", label: "Return Report", icon: PackageCheck },
  { key: "inventory", label: "Inventory Report", icon: Package },
  { key: "customer-history", label: "Customer Rental History", icon: History },
];

export default function ReportTabs({ active, onChange }: ReportTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Reports"
      className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800"
    >
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            active === tab.key
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          <tab.icon className="h-4 w-4" aria-hidden="true" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}
