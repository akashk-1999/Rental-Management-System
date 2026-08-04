import logger from '../utils/logger';
import {
  DashboardRepository,
  RentalListRow,
  OverdueRentalListRow,
  RentalCreatedRow,
  PaymentDateAmountRow,
  RentalDueLineItemRow
} from '../repositories/dashboardRepository';
import { HttpError } from '../errors/HttpError';
import {
  DashboardChartPoint,
  DashboardDueRental,
  DashboardOverview,
  DashboardOverdueRental,
  DashboardPeriod,
  DashboardRentalDueItem,
  DashboardRentalFilter,
  DashboardRentalListItem
} from '../types/dashboard';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ChartBucket {
  start: Date;
  end: Date;
  label: string;
}

const VALID_PERIODS: DashboardPeriod[] = ['day', 'week', 'month', 'year'];
const VALID_RENTAL_FILTERS: DashboardRentalFilter[] = ['total', 'new', 'active', 'partial-return', 'completed'];

/**
 * DashboardService assembles the read-only business overview dashboard: period-aware metrics,
 * always-current priority rental lists (due today, upcoming due, overdue), recent rentals, low
 * inventory, and an on-demand rental drill-down for the remaining metric cards.
 *
 * It is framework-independent and relies on constructor injection of DashboardRepository.
 */
export class DashboardService {
  constructor(private readonly dashboardRepository: DashboardRepository) {}

  /**
   * This is an India-only rental business (₹ pricing, no DST), so period/day boundaries are
   * computed using a fixed IST (UTC+5:30) offset rather than the server process's own timezone
   * or raw UTC — mirroring the same convention RentalService uses for rental date comparisons.
   */
  private static readonly IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  /** The UTC instant corresponding to IST calendar midnight on the given number of days back. */
  private istMidnight(daysAgo: number, now: Date): Date {
    const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
    const istMidnightUtcMillis = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysAgo);
    return new Date(istMidnightUtcMillis - DashboardService.IST_OFFSET_MS);
  }

  /**
   * The IST calendar year/month/day for the given number of days back, computed via pure UTC
   * field arithmetic (never `toLocaleDateString`, whose output depends on the server process's
   * own locale/timezone and would silently misdate the label on a non-UTC host).
   */
  private istCalendarParts(daysAgo: number, now: Date): { year: number; month: number; day: number } {
    const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
    const shifted = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - daysAgo));
    return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
  }

  /**
   * Builds the trend chart's time buckets for the selected period. Every bucket is day-level or
   * coarser — Payments.PaymentDate and ReturnEvents.ReturnDate are DATE columns with no
   * time-of-day, so an hour-level bucket could not be attributed correctly. 'day' therefore shows
   * a trailing 7-day view (a meaningful trend) rather than trying to slice today into hours.
   */
  private getChartBuckets(period: DashboardPeriod, now: Date): ChartBucket[] {
    const buckets: ChartBucket[] = [];

    if (period === 'day') {
      for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
        const { month, day } = this.istCalendarParts(daysAgo, now);
        buckets.push({
          start: this.istMidnight(daysAgo, now),
          end: this.istMidnight(daysAgo - 1, now),
          label: `${day} ${MONTH_LABELS[month]}`
        });
      }
      return buckets;
    }

    if (period === 'week') {
      const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
      const daysSinceMonday = (istNow.getUTCDay() + 6) % 7;
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const daysAgo = daysSinceMonday - dayIndex;
        buckets.push({
          start: this.istMidnight(daysAgo, now),
          end: this.istMidnight(daysAgo - 1, now),
          label: WEEKDAY_LABELS[dayIndex]
        });
      }
      return buckets;
    }

    if (period === 'year') {
      const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
      const year = istNow.getUTCFullYear();
      for (let month = 0; month < 12; month++) {
        buckets.push({
          start: new Date(Date.UTC(year, month, 1) - DashboardService.IST_OFFSET_MS),
          end: new Date(Date.UTC(year, month + 1, 1) - DashboardService.IST_OFFSET_MS),
          label: MONTH_LABELS[month]
        });
      }
      return buckets;
    }

    // month: every calendar day of the current IST month
    const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
    const year = istNow.getUTCFullYear();
    const month = istNow.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day++) {
      buckets.push({
        start: new Date(Date.UTC(year, month, day) - DashboardService.IST_OFFSET_MS),
        end: new Date(Date.UTC(year, month, day + 1) - DashboardService.IST_OFFSET_MS),
        label: String(day)
      });
    }
    return buckets;
  }

  /** Buckets raw rental-creation and payment rows into the chart's per-bucket count/revenue. */
  private buildChartData(
    buckets: ChartBucket[],
    rentalRows: RentalCreatedRow[],
    paymentRows: PaymentDateAmountRow[]
  ): DashboardChartPoint[] {
    return buckets.map((bucket) => {
      const rentalsInBucket = rentalRows.filter((row) => row.CreatedAt >= bucket.start && row.CreatedAt < bucket.end);
      const advanceRevenue = rentalsInBucket.reduce((sum, row) => sum + Number(row.AdvancePaid), 0);
      const paymentsRevenue = paymentRows
        .filter((row) => row.PaymentDate >= bucket.start && row.PaymentDate < bucket.end)
        .reduce((sum, row) => sum + Number(row.Amount), 0);

      return {
        label: bucket.label,
        rentalsCount: rentalsInBucket.length,
        revenue: advanceRevenue + paymentsRevenue
      };
    });
  }

  private resolvePeriod(period: unknown): DashboardPeriod {
    return typeof period === 'string' && VALID_PERIODS.includes(period as DashboardPeriod)
      ? (period as DashboardPeriod)
      : 'month';
  }

  private getPeriodStart(period: DashboardPeriod, now: Date): Date {
    switch (period) {
      case 'day':
        return this.istMidnight(0, now);
      case 'week': {
        const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
        const daysSinceMonday = (istNow.getUTCDay() + 6) % 7; // Monday = 0 ... Sunday = 6
        return this.istMidnight(daysSinceMonday, now);
      }
      case 'year': {
        const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
        const yearStartUtcMillis = Date.UTC(istNow.getUTCFullYear(), 0, 1);
        return new Date(yearStartUtcMillis - DashboardService.IST_OFFSET_MS);
      }
      case 'month':
      default: {
        const istNow = new Date(now.getTime() + DashboardService.IST_OFFSET_MS);
        const monthStartUtcMillis = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), 1);
        return new Date(monthStartUtcMillis - DashboardService.IST_OFFSET_MS);
      }
    }
  }

  private mapRentalListRow(row: RentalListRow): DashboardRentalListItem {
    return {
      rentalCode: row.RentalCode,
      customerName: row.CustomerName,
      mobileNumber: row.MobileNumber,
      rentalStartDate: row.RentalStartDate.toISOString(),
      expectedReturnDate: row.ExpectedReturnDate.toISOString(),
      status: row.Status,
      remainingBalance: Number(row.TotalAmount) - (Number(row.AdvancePaid) + Number(row.AmountPaidViaPayments))
    };
  }

  private mapOverdueRentalRow(row: OverdueRentalListRow): DashboardOverdueRental {
    return {
      ...this.mapRentalListRow(row),
      daysOverdue: row.DaysOverdue
    };
  }

  /**
   * Groups flat rental-line-item rows by RentalId, keeping only items with a positive outstanding
   * quantity (QuantityRented minus what's already been returned across prior ReturnEvents) — a
   * PartialReturn rental may have some line items fully settled already.
   */
  private groupLineItemsByRental(rows: RentalDueLineItemRow[]): Map<number, DashboardRentalDueItem[]> {
    const byRental = new Map<number, DashboardRentalDueItem[]>();
    for (const row of rows) {
      const quantityDue = Number(row.QuantityRented) - Number(row.QuantityAlreadyReturned);
      if (quantityDue <= 0) continue;

      const lineItems = byRental.get(row.RentalId) ?? [];
      lineItems.push({ itemId: row.ItemId, itemName: row.ItemName, quantityDue });
      byRental.set(row.RentalId, lineItems);
    }
    return byRental;
  }

  private mapDueRentalRow(row: RentalListRow, lineItemsByRental: Map<number, DashboardRentalDueItem[]>): DashboardDueRental {
    return {
      ...this.mapRentalListRow(row),
      lineItems: lineItemsByRental.get(row.RentalId) ?? []
    };
  }

  /**
   * Retrieves the full dashboard overview (period-scoped metrics, priority rental lists, recent
   * rentals, and low inventory) in one combined call. The underlying reads are independent of
   * one another, so they run concurrently.
   */
  async getDashboardOverview(periodInput: unknown): Promise<DashboardOverview> {
    const period = this.resolvePeriod(periodInput);
    const now = new Date();
    const periodStart = this.getPeriodStart(period, now);
    const todayStart = this.istMidnight(0, now);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const chartBuckets = this.getChartBuckets(period, now);
    const chartRangeStart = chartBuckets[0].start;

    const [
      metricsRow,
      recentRentalRows,
      dueTodayRows,
      dueTodayLineItemRows,
      upcomingDueRows,
      upcomingDueLineItemRows,
      overdueRows,
      lowInventoryRows,
      chartRentalRows,
      chartPaymentRows
    ] = await Promise.all([
      this.dashboardRepository.getMetrics(periodStart),
      this.dashboardRepository.getRecentRentals(),
      this.dashboardRepository.getDueTodayRentals(todayStart, todayEnd),
      this.dashboardRepository.getDueTodayLineItems(todayStart, todayEnd),
      this.dashboardRepository.getUpcomingDueRentals(),
      this.dashboardRepository.getUpcomingDueLineItems(),
      this.dashboardRepository.getOverdueRentals(),
      this.dashboardRepository.getLowInventoryItems(),
      this.dashboardRepository.getRentalsCreatedInRange(chartRangeStart),
      this.dashboardRepository.getPaymentsInRange(chartRangeStart)
    ]);

    const dueTodayLineItemsByRental = this.groupLineItemsByRental(dueTodayLineItemRows);
    const upcomingDueLineItemsByRental = this.groupLineItemsByRental(upcomingDueLineItemRows);

    const revenueCollected = Number(metricsRow.AdvancePaidInPeriod) + Number(metricsRow.PaymentsAmountInPeriod);
    const outstandingBalance =
      Number(metricsRow.TotalRentalAmount) - (Number(metricsRow.TotalAdvancePaidAllTime) + Number(metricsRow.TotalPaymentsAmountAllTime));

    const overview: DashboardOverview = {
      period,
      metrics: {
        totalItems: metricsRow.TotalItems,
        activeItems: metricsRow.ActiveItems,
        inactiveItems: metricsRow.InactiveItems,
        totalRentals: metricsRow.TotalRentals,
        activeRentals: metricsRow.ActiveRentals,
        partialReturnRentals: metricsRow.PartialReturnRentals,
        completedRentals: metricsRow.CompletedRentals,
        totalCustomers: metricsRow.TotalCustomers,
        outstandingBalance,
        newRentals: metricsRow.NewRentals,
        paymentsRecorded: metricsRow.PaymentsRecordedInPeriod,
        returnsProcessed: metricsRow.ReturnsProcessedInPeriod,
        revenueCollected
      },
      recentRentals: recentRentalRows.map((row) => this.mapRentalListRow(row)),
      dueTodayRentals: dueTodayRows.map((row) => this.mapDueRentalRow(row, dueTodayLineItemsByRental)),
      upcomingDueRentals: upcomingDueRows.map((row) => this.mapDueRentalRow(row, upcomingDueLineItemsByRental)),
      overdueRentals: overdueRows.map((row) => this.mapOverdueRentalRow(row)),
      lowInventoryItems: lowInventoryRows.map((row) => ({
        itemId: row.ItemId,
        itemName: row.ItemName,
        totalQuantity: row.TotalQuantity,
        availableStock: row.AvailableStock
      })),
      chartData: this.buildChartData(chartBuckets, chartRentalRows, chartPaymentRows)
    };

    logger.info(`[DashboardService.getDashboardOverview] Assembled dashboard overview for period '${period}'.`);
    return overview;
  }

  /**
   * Retrieves the on-demand rental list behind a clickable metric card (Total/New/Active/
   * PartialReturn/Completed Rentals). `period` only affects the 'new' filter; it is ignored for
   * every other filter since those describe a current status, not a time window.
   */
  async getRentalsByFilter(filterInput: unknown, periodInput: unknown): Promise<DashboardRentalListItem[]> {
    if (typeof filterInput !== 'string' || !VALID_RENTAL_FILTERS.includes(filterInput as DashboardRentalFilter)) {
      logger.warn(`[DashboardService.getRentalsByFilter] Failed: Invalid filter '${String(filterInput)}'.`);
      throw new HttpError(400, 'A valid rental filter is required');
    }

    const filter = filterInput as DashboardRentalFilter;
    const period = this.resolvePeriod(periodInput);
    const periodStart = this.getPeriodStart(period, new Date());

    const rows = await this.dashboardRepository.getRentalsByFilter(filter, periodStart);
    logger.info(`[DashboardService.getRentalsByFilter] Retrieved ${rows.length} rental(s) for filter '${filter}'.`);
    return rows.map((row) => this.mapRentalListRow(row));
  }
}
