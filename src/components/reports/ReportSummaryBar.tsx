import type { LucideIcon } from "lucide-react";
import DashboardCard from "../dashboard/DashboardCard";

export interface ReportSummaryItem {
  icon: LucideIcon;
  label: string;
  value: string;
  iconAccent?: string;
}

interface ReportSummaryBarProps {
  items: ReportSummaryItem[];
}

/**
 * Reusable report summary row (record count, totals, etc.), shared by every report section.
 * Reuses the same DashboardCard stat-tile component and grid breakpoints as the Dashboard page's
 * metric cards, so summaries read as one consistent design language across the app.
 */
export default function ReportSummaryBar({ items }: ReportSummaryBarProps) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <DashboardCard key={item.label} icon={item.icon} label={item.label} value={item.value} iconAccent={item.iconAccent} />
      ))}
    </div>
  );
}
