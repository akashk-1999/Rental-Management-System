import { RentalStatus } from "./rental";

export type DashboardPeriod = "day" | "week" | "month" | "year";

export type DashboardRentalFilter = "total" | "new" | "active" | "partial-return" | "completed";

export interface DashboardMetrics {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  totalRentals: number;
  activeRentals: number;
  partialReturnRentals: number;
  completedRentals: number;
  totalCustomers: number;
  outstandingBalance: number;
  newRentals: number;
  paymentsRecorded: number;
  returnsProcessed: number;
  revenueCollected: number;
}

export interface DashboardRentalListItem extends Record<string, unknown> {
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

export interface DashboardRentalDueItem extends Record<string, unknown> {
  itemId: number;
  itemName: string;
  quantityDue: number;
}

export interface DashboardDueRental extends DashboardRentalListItem {
  lineItems: DashboardRentalDueItem[];
}

export interface DashboardLowInventoryItem extends Record<string, unknown> {
  itemId: number;
  itemName: string;
  totalQuantity: number;
  availableStock: number;
}

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

export interface GetDashboardOverviewResponse {
  success: boolean;
  data: DashboardOverview;
}

export interface GetDashboardRentalsResponse {
  success: boolean;
  data: DashboardRentalListItem[];
}
