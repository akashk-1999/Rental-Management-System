import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarRange,
  CalendarCheck,
  ClipboardList,
  PlusCircle,
  PlayCircle,
  Undo2,
  CheckCircle2,
  Package,
  PackageCheck,
  PackageX,
  Users,
  Receipt,
  IndianRupee,
  Wallet,
} from "lucide-react";
import DashboardCard from "../components/dashboard/DashboardCard";
import PriorityCard from "../components/dashboard/PriorityCard";
import TrendLineChart from "../components/dashboard/TrendLineChart";
import RentalListTable from "../components/dashboard/RentalListTable";
import RentalListModal from "../components/dashboard/RentalListModal";
import PendingItemsModal from "../components/dashboard/PendingItemsModal";
import LowInventoryTable from "../components/dashboard/LowInventoryTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { dashboardApi } from "../api/dashboardApi";
import {
  DashboardDueRental,
  DashboardOverview,
  DashboardPeriod,
  DashboardRentalDueItem,
  DashboardRentalFilter,
  DashboardRentalListItem,
} from "../types/dashboard";

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const PERIOD_SUFFIX: Record<DashboardPeriod, string> = {
  day: "Today",
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

// The trend chart buckets by day at the finest, so "Day" shows a trailing 7-day view instead of
// hourly slices — Payments/ReturnEvents store only a calendar date, with no time-of-day to bucket by.
const CHART_PERIOD_SUFFIX: Record<DashboardPeriod, string> = {
  day: "Last 7 Days",
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

interface DrilldownState {
  title: string;
  subtitle?: string;
  rentals: (DashboardRentalListItem & { daysOverdue?: number; lineItems?: DashboardRentalDueItem[] })[] | null;
  loading: boolean;
  error: string | null;
  showDaysOverdue: boolean;
  /** Due Today / Upcoming Due only: clicking a rental row opens its pending-items breakdown. */
  itemDrilldownEnabled: boolean;
  emptyMessage?: string;
}

interface PendingItemsState {
  rentalCode: string;
  customerName: string;
  dueDate: string;
  items: DashboardRentalDueItem[];
}

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

export default function Dashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>("month");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drilldown, setDrilldown] = useState<DrilldownState | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingItemsState | null>(null);

  const fetchOverview = useCallback(async (selectedPeriod: DashboardPeriod) => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getDashboardOverview(selectedPeriod);
      setOverview(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load the dashboard. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview(period);
  }, [period, fetchOverview]);

  const openInlineDrilldown = (
    title: string,
    rentals: (DashboardRentalListItem & { daysOverdue?: number; lineItems?: DashboardRentalDueItem[] })[],
    opts?: { showDaysOverdue?: boolean; itemDrilldownEnabled?: boolean; emptyMessage?: string }
  ) => {
    setDrilldown({
      title,
      rentals,
      loading: false,
      error: null,
      showDaysOverdue: opts?.showDaysOverdue ?? false,
      itemDrilldownEnabled: opts?.itemDrilldownEnabled ?? false,
      emptyMessage: opts?.emptyMessage,
    });
  };

  const openOnDemandDrilldown = async (filter: DashboardRentalFilter, title: string) => {
    setDrilldown({ title, rentals: null, loading: true, error: null, showDaysOverdue: false, itemDrilldownEnabled: false });
    try {
      const data = await dashboardApi.getRentalsByFilter(filter, period);
      setDrilldown({
        title,
        rentals: data,
        loading: false,
        error: null,
        showDaysOverdue: false,
        itemDrilldownEnabled: false,
      });
    } catch (err) {
      console.error(err);
      setDrilldown({
        title,
        rentals: null,
        loading: false,
        error: "Failed to load rentals. Please try again.",
        showDaysOverdue: false,
        itemDrilldownEnabled: false,
      });
    }
  };

  const closeDrilldown = () => setDrilldown(null);

  const openPendingItems = (rental: DashboardDueRental) => {
    setPendingItems({
      rentalCode: rental.rentalCode,
      customerName: rental.customerName,
      dueDate: rental.expectedReturnDate,
      items: rental.lineItems,
    });
  };

  const closePendingItems = () => setPendingItems(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Business overview</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading dashboard..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : overview ? (
        <>
          {/* Top priority: what needs attention right now, always current regardless of period */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PriorityCard
              icon={AlertTriangle}
              label="Overdue Rentals"
              value={overview.overdueRentals.length}
              description="Past expected return date"
              tone="rose"
              onClick={() =>
                openInlineDrilldown("Overdue Rentals", overview.overdueRentals, {
                  showDaysOverdue: true,
                  emptyMessage: "No overdue rentals.",
                })
              }
            />
            <PriorityCard
              icon={CalendarClock}
              label="Due Today"
              value={overview.dueTodayRentals.length}
              description="Expected back today"
              tone="amber"
              onClick={() =>
                openInlineDrilldown("Rentals Due Today", overview.dueTodayRentals, {
                  itemDrilldownEnabled: true,
                  emptyMessage: "No rentals due today.",
                })
              }
            />
            <PriorityCard
              icon={CalendarRange}
              label="Upcoming Due"
              value={overview.upcomingDueRentals.length}
              description="Due within the next 7 days"
              tone="indigo"
              onClick={() =>
                openInlineDrilldown("Upcoming Due (Next 7 Days)", overview.upcomingDueRentals, {
                  itemDrilldownEnabled: true,
                  emptyMessage: "No rentals due in the next 7 days.",
                })
              }
            />
          </div>

          {/* Period toggle: drives every period-scoped metric card below */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Period
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ease-in-out ${
                    period === option.value
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <DashboardCard
              icon={ClipboardList}
              label="Total Rentals"
              value={String(overview.metrics.totalRentals)}
              iconAccent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
              onClick={() => openOnDemandDrilldown("total", "All Rentals")}
            />
            <DashboardCard
              icon={PlusCircle}
              label={`New Rentals (${PERIOD_SUFFIX[period]})`}
              value={String(overview.metrics.newRentals)}
              iconAccent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
              onClick={() => openOnDemandDrilldown("new", `New Rentals (${PERIOD_SUFFIX[period]})`)}
            />
            <DashboardCard
              icon={PlayCircle}
              label="Active Rentals"
              value={String(overview.metrics.activeRentals)}
              iconAccent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
              onClick={() => openOnDemandDrilldown("active", "Active Rentals")}
            />
            <DashboardCard
              icon={Undo2}
              label="Partial Return Rentals"
              value={String(overview.metrics.partialReturnRentals)}
              iconAccent="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
              onClick={() => openOnDemandDrilldown("partial-return", "Partial Return Rentals")}
            />
            <DashboardCard
              icon={CheckCircle2}
              label="Completed Rentals"
              value={String(overview.metrics.completedRentals)}
              iconAccent="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
              onClick={() => openOnDemandDrilldown("completed", "Completed Rentals")}
            />
            <DashboardCard
              icon={Package}
              label="Total Items"
              value={String(overview.metrics.totalItems)}
              iconAccent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
            />
            <DashboardCard
              icon={PackageCheck}
              label="Active Items"
              value={String(overview.metrics.activeItems)}
              iconAccent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
            />
            <DashboardCard
              icon={PackageX}
              label="Inactive Items"
              value={String(overview.metrics.inactiveItems)}
              iconAccent="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            />
            <DashboardCard
              icon={Users}
              label="Total Customers"
              value={String(overview.metrics.totalCustomers)}
              iconAccent="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"
            />
            <DashboardCard
              icon={Receipt}
              label={`Payments Recorded (${PERIOD_SUFFIX[period]})`}
              value={String(overview.metrics.paymentsRecorded)}
              iconAccent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
            />
            <DashboardCard
              icon={CalendarCheck}
              label={`Returns Processed (${PERIOD_SUFFIX[period]})`}
              value={String(overview.metrics.returnsProcessed)}
              iconAccent="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"
            />
            <DashboardCard
              icon={IndianRupee}
              label={`Revenue Collected (${PERIOD_SUFFIX[period]})`}
              value={formatCurrency(overview.metrics.revenueCollected)}
              iconAccent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
            />
            <DashboardCard
              icon={Wallet}
              label="Outstanding Balance"
              value={formatCurrency(overview.metrics.outstandingBalance)}
              iconAccent="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
            />
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Rentals &amp; Revenue Trend
            </h2>
            <TrendLineChart
              title={`Rentals & Revenue (${CHART_PERIOD_SUFFIX[period]})`}
              caption="Each line is indexed to its own peak in the period (not a shared ₹/count scale) so the two trends can be compared on one chart — hover or focus a point for the real values."
              labels={overview.chartData.map((point) => point.label)}
              series={[
                {
                  key: "rentals",
                  label: "Rentals",
                  color: "#4f46e5",
                  values: overview.chartData.map((point) => point.rentalsCount),
                  formatValue: (value) => String(value),
                },
                {
                  key: "revenue",
                  label: "Revenue",
                  color: "#059669",
                  values: overview.chartData.map((point) => point.revenue),
                  formatValue: (value) => `₹${value.toFixed(0)}`,
                  area: true,
                },
              ]}
              emptyMessage="No rentals or revenue activity in this period."
            />
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Recent Rentals
            </h2>
            <RentalListTable rentals={overview.recentRentals} emptyMessage="No rentals found." />
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Low Inventory
            </h2>
            <LowInventoryTable items={overview.lowInventoryItems} />
          </div>
        </>
      ) : null}

      <RentalListModal
        isOpen={drilldown !== null}
        title={drilldown?.title ?? ""}
        subtitle={drilldown?.itemDrilldownEnabled ? "Click a rental to see its pending items." : undefined}
        rentals={drilldown?.rentals ?? null}
        loading={drilldown?.loading ?? false}
        error={drilldown?.error ?? null}
        showDaysOverdue={drilldown?.showDaysOverdue ?? false}
        onRowClick={drilldown?.itemDrilldownEnabled ? (rental) => openPendingItems(rental as DashboardDueRental) : undefined}
        emptyMessage={drilldown?.emptyMessage}
        onClose={closeDrilldown}
      />

      <PendingItemsModal
        isOpen={pendingItems !== null}
        rentalCode={pendingItems?.rentalCode ?? ""}
        customerName={pendingItems?.customerName ?? ""}
        dueDate={pendingItems?.dueDate ?? ""}
        items={pendingItems?.items ?? []}
        onClose={closePendingItems}
      />
    </div>
  );
}
