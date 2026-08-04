import { RentalStatus } from './rental';

export type DashboardPeriod = 'day' | 'week' | 'month' | 'year';

/**
 * Allowed values for the on-demand rental drill-down endpoint. 'due-today', 'upcoming-due', and
 * 'overdue' are intentionally excluded — those lists are small and bounded by nature, so they are
 * already returned inline by the main overview endpoint instead of requiring a second request.
 */
export type DashboardRentalFilter = 'total' | 'new' | 'active' | 'partial-return' | 'completed';

export interface DashboardMetrics {
  // Always-current: describe present state, unaffected by the selected period.
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  totalRentals: number;
  activeRentals: number;
  partialReturnRentals: number;
  completedRentals: number;
  totalCustomers: number;
  outstandingBalance: number;

  // Period-scoped: recomputed for the selected day/week/month/year window.
  newRentals: number;
  paymentsRecorded: number;
  returnsProcessed: number;
  revenueCollected: number;
}

export interface DashboardRentalListItem {
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  rentalStartDate: string;
  expectedReturnDate: string;
  status: RentalStatus;
  remainingBalance: number;
}

export interface DashboardOverdueRental extends DashboardRentalListItem {
  daysOverdue: number;
}

/**
 * One outstanding (not-yet-returned) item on a rental, with how much of it is still out — used to
 * drill into a due-today/upcoming-due rental and see what's pending, for reallocation planning.
 */
export interface DashboardRentalDueItem {
  itemId: number;
  itemName: string;
  quantityDue: number;
}

/** A due-today/upcoming-due rental together with the item-wise breakdown of what's still out. */
export interface DashboardDueRental extends DashboardRentalListItem {
  lineItems: DashboardRentalDueItem[];
}

export interface DashboardLowInventoryItem {
  itemId: number;
  itemName: string;
  totalQuantity: number;
  availableStock: number;
}

/**
 * One point of the rentals/revenue trend chart. `label` is a pre-formatted, human-readable
 * bucket name (e.g. "Mon", "14 Jul", "Jul") rather than a raw date — bucket granularity varies
 * by period (trailing 7 days / week / month / year), so the client renders labels as-is.
 */
export interface DashboardChartPoint {
  label: string;
  rentalsCount: number;
  revenue: number;
}

export interface DashboardOverview {
  period: DashboardPeriod;
  metrics: DashboardMetrics;
  recentRentals: DashboardRentalListItem[];
  dueTodayRentals: DashboardDueRental[];
  upcomingDueRentals: DashboardDueRental[];
  overdueRentals: DashboardOverdueRental[];
  lowInventoryItems: DashboardLowInventoryItem[];
  chartData: DashboardChartPoint[];
}
