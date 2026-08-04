import { query } from '../config/db';
import logger from '../utils/logger';
import { RentalStatus } from '../types/rental';
import { DashboardRentalFilter } from '../types/dashboard';

export interface DashboardMetricsRow {
  TotalItems: number;
  ActiveItems: number;
  InactiveItems: number;
  TotalRentals: number;
  ActiveRentals: number;
  PartialReturnRentals: number;
  CompletedRentals: number;
  TotalCustomers: number;
  TotalRentalAmount: number;
  TotalAdvancePaidAllTime: number;
  TotalPaymentsAmountAllTime: number;
  NewRentals: number;
  AdvancePaidInPeriod: number;
  PaymentsAmountInPeriod: number;
  PaymentsRecordedInPeriod: number;
  ReturnsProcessedInPeriod: number;
}

export interface RentalListRow {
  RentalId: number;
  RentalCode: string;
  CustomerName: string;
  MobileNumber: string;
  RentalStartDate: Date;
  ExpectedReturnDate: Date;
  Status: RentalStatus;
  TotalAmount: number;
  AdvancePaid: number;
  AmountPaidViaPayments: number;
}

export interface OverdueRentalListRow extends RentalListRow {
  DaysOverdue: number;
}

/** One outstanding (not-yet-returned) line item on a rental that is due today or coming due soon. */
export interface RentalDueLineItemRow {
  RentalId: number;
  ItemId: number;
  ItemName: string;
  QuantityRented: number;
  QuantityAlreadyReturned: number;
}

export interface LowInventoryItemRow {
  ItemId: number;
  ItemName: string;
  TotalQuantity: number;
  AvailableStock: number;
}

export interface RentalCreatedRow {
  CreatedAt: Date;
  AdvancePaid: number;
}

export interface PaymentDateAmountRow {
  PaymentDate: Date;
  Amount: number;
}

export class DashboardRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'DashboardRepositoryError';
  }
}

/** Columns shared by every rental-list query, joined once here to avoid repeating the join. */
const RENTAL_LIST_SELECT = `r.RentalId, r.RentalCode, c.CustomerName, c.MobileNumber, r.RentalStartDate, r.ExpectedReturnDate,
       r.Status, r.TotalAmount, r.AdvancePaid,
       ISNULL((SELECT SUM(p.Amount) FROM Payments p WHERE p.RentalId = r.RentalId AND p.DeleteStatus = 0), 0) AS AmountPaidViaPayments`;

/** Every rental-list query joins Rentals r + Customers c; both must be excluded when soft-deleted. */
const RENTAL_CUSTOMER_NOT_DELETED = 'r.DeleteStatus = 0 AND c.DeleteStatus = 0';

/**
 * WHERE clauses shared between the rental-level due-today/upcoming-due queries and their
 * line-item counterparts, so the two stay in lockstep by construction.
 */
const DUE_TODAY_WHERE = `r.Status IN ('Active','PartialReturn')
           AND r.ExpectedReturnDate >= @TodayStart AND r.ExpectedReturnDate < @TodayEnd
           AND ${RENTAL_CUSTOMER_NOT_DELETED}`;
const UPCOMING_DUE_WHERE = `r.Status IN ('Active','PartialReturn')
           AND CAST(r.ExpectedReturnDate AS DATE) BETWEEN CAST(SYSUTCDATETIME() AS DATE) AND DATEADD(DAY, 7, CAST(SYSUTCDATETIME() AS DATE))
           AND ${RENTAL_CUSTOMER_NOT_DELETED}`;

/**
 * Columns for the due-today/upcoming-due line-item breakdown: one row per outstanding rental
 * line item, with the cumulative quantity already returned so the caller can derive how much of
 * each item is still out (mirrors ReturnRepository.getRentalLineItemsForReturn's subquery).
 */
const RENTAL_DUE_LINE_ITEM_SELECT = `r.RentalId, rli.ItemId, i.ItemName, rli.QuantityRented,
       ISNULL((SELECT SUM(re.QuantityReturned) FROM ReturnEvents re WHERE re.RentalLineItemId = rli.RentalLineItemId AND re.DeleteStatus = 0), 0) AS QuantityAlreadyReturned`;
const RENTAL_DUE_LINE_ITEM_JOIN = `FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         JOIN RentalLineItems rli ON rli.RentalId = r.RentalId AND rli.DeleteStatus = 0
         JOIN Items i ON i.ItemId = rli.ItemId AND i.DeleteStatus = 0`;

/**
 * DashboardRepository provides read-only SQL Server aggregation and list queries for the
 * business overview dashboard. It reuses the existing vw_ItemInventoryStatus view for the
 * low-inventory calculation; the rental-list queries (recent, due-today, upcoming-due, overdue,
 * and the on-demand drill-down) are dedicated queries since each needs columns beyond what the
 * existing vw_UpcomingReturns/vw_OverdueRentals views expose (remaining balance, mobile number).
 */
export class DashboardRepository {
  /**
   * Retrieves every count/sum metric in a single round trip via correlated scalar subqueries.
   * @param periodStart start of the selected day/week/month/year window (UTC instant)
   *
   * SQL Query:
   * SELECT
   *   (SELECT COUNT(*) FROM Items WHERE DeleteStatus = 0) AS TotalItems,
   *   (SELECT COUNT(*) FROM Items WHERE Status = 'Active' AND DeleteStatus = 0) AS ActiveItems,
   *   (SELECT COUNT(*) FROM Items WHERE Status = 'Inactive' AND DeleteStatus = 0) AS InactiveItems,
   *   (SELECT COUNT(*) FROM Rentals WHERE DeleteStatus = 0) AS TotalRentals,
   *   (SELECT COUNT(*) FROM Rentals WHERE Status = 'Active' AND DeleteStatus = 0) AS ActiveRentals,
   *   (SELECT COUNT(*) FROM Rentals WHERE Status = 'PartialReturn' AND DeleteStatus = 0) AS PartialReturnRentals,
   *   (SELECT COUNT(*) FROM Rentals WHERE Status = 'Returned' AND DeleteStatus = 0) AS CompletedRentals,
   *   (SELECT COUNT(*) FROM Customers WHERE DeleteStatus = 0) AS TotalCustomers,
   *   (SELECT ISNULL(SUM(TotalAmount), 0) FROM Rentals WHERE DeleteStatus = 0) AS TotalRentalAmount,
   *   (SELECT ISNULL(SUM(AdvancePaid), 0) FROM Rentals WHERE DeleteStatus = 0) AS TotalAdvancePaidAllTime,
   *   (SELECT ISNULL(SUM(Amount), 0) FROM Payments WHERE DeleteStatus = 0) AS TotalPaymentsAmountAllTime,
   *   (SELECT COUNT(*) FROM Rentals WHERE CreatedAt >= @PeriodStart AND DeleteStatus = 0) AS NewRentals,
   *   (SELECT ISNULL(SUM(AdvancePaid), 0) FROM Rentals WHERE CreatedAt >= @PeriodStart AND DeleteStatus = 0) AS AdvancePaidInPeriod,
   *   (SELECT ISNULL(SUM(Amount), 0) FROM Payments WHERE PaymentDate >= CAST(@PeriodStart AS DATE) AND DeleteStatus = 0) AS PaymentsAmountInPeriod,
   *   (SELECT COUNT(*) FROM Payments WHERE PaymentDate >= CAST(@PeriodStart AS DATE) AND DeleteStatus = 0) AS PaymentsRecordedInPeriod,
   *   (SELECT COUNT(*) FROM ReturnEvents WHERE ReturnDate >= CAST(@PeriodStart AS DATE) AND DeleteStatus = 0) AS ReturnsProcessedInPeriod
   */
  static async getMetrics(periodStart: Date): Promise<DashboardMetricsRow> {
    try {
      const rows = await query<DashboardMetricsRow>(
        `SELECT
           (SELECT COUNT(*) FROM Items WHERE DeleteStatus = 0) AS TotalItems,
           (SELECT COUNT(*) FROM Items WHERE Status = 'Active' AND DeleteStatus = 0) AS ActiveItems,
           (SELECT COUNT(*) FROM Items WHERE Status = 'Inactive' AND DeleteStatus = 0) AS InactiveItems,
           (SELECT COUNT(*) FROM Rentals WHERE DeleteStatus = 0) AS TotalRentals,
           (SELECT COUNT(*) FROM Rentals WHERE Status = 'Active' AND DeleteStatus = 0) AS ActiveRentals,
           (SELECT COUNT(*) FROM Rentals WHERE Status = 'PartialReturn' AND DeleteStatus = 0) AS PartialReturnRentals,
           (SELECT COUNT(*) FROM Rentals WHERE Status = 'Returned' AND DeleteStatus = 0) AS CompletedRentals,
           (SELECT COUNT(*) FROM Customers WHERE DeleteStatus = 0) AS TotalCustomers,
           (SELECT ISNULL(SUM(TotalAmount), 0) FROM Rentals WHERE DeleteStatus = 0) AS TotalRentalAmount,
           (SELECT ISNULL(SUM(AdvancePaid), 0) FROM Rentals WHERE DeleteStatus = 0) AS TotalAdvancePaidAllTime,
           (SELECT ISNULL(SUM(Amount), 0) FROM Payments WHERE DeleteStatus = 0) AS TotalPaymentsAmountAllTime,
           (SELECT COUNT(*) FROM Rentals WHERE CreatedAt >= @PeriodStart AND DeleteStatus = 0) AS NewRentals,
           (SELECT ISNULL(SUM(AdvancePaid), 0) FROM Rentals WHERE CreatedAt >= @PeriodStart AND DeleteStatus = 0) AS AdvancePaidInPeriod,
           (SELECT ISNULL(SUM(Amount), 0) FROM Payments WHERE PaymentDate >= CAST(@PeriodStart AS DATE) AND DeleteStatus = 0) AS PaymentsAmountInPeriod,
           (SELECT COUNT(*) FROM Payments WHERE PaymentDate >= CAST(@PeriodStart AS DATE) AND DeleteStatus = 0) AS PaymentsRecordedInPeriod,
           (SELECT COUNT(*) FROM ReturnEvents WHERE ReturnDate >= CAST(@PeriodStart AS DATE) AND DeleteStatus = 0) AS ReturnsProcessedInPeriod`,
        { PeriodStart: periodStart }
      );
      return rows[0];
    } catch (err: any) {
      logger.error(`[DashboardRepository.getMetrics] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve dashboard metrics: ${err.message}`, err);
    }
  }

  /**
   * Retrieves the 5 most recently created rentals, joined with their customer.
   *
   * SQL Query:
   * SELECT TOP 5 <RENTAL_LIST_SELECT>
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY r.RentalId DESC
   */
  static async getRecentRentals(): Promise<RentalListRow[]> {
    try {
      const rows = await query<RentalListRow>(
        `SELECT TOP 5 ${RENTAL_LIST_SELECT}
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE ${RENTAL_CUSTOMER_NOT_DELETED}
         ORDER BY r.RentalId DESC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getRecentRentals] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve recent rentals: ${err.message}`, err);
    }
  }

  /**
   * Retrieves rentals not yet fully returned whose expected return date falls today.
   * @param todayStart UTC instant of today's calendar-day start
   * @param todayEnd UTC instant of tomorrow's calendar-day start (exclusive upper bound)
   *
   * SQL Query:
   * SELECT <RENTAL_LIST_SELECT>
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.Status IN ('Active','PartialReturn')
   *   AND r.ExpectedReturnDate >= @TodayStart AND r.ExpectedReturnDate < @TodayEnd
   *   AND r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY r.ExpectedReturnDate ASC
   */
  static async getDueTodayRentals(todayStart: Date, todayEnd: Date): Promise<RentalListRow[]> {
    try {
      const rows = await query<RentalListRow>(
        `SELECT ${RENTAL_LIST_SELECT}
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE ${DUE_TODAY_WHERE}
         ORDER BY r.ExpectedReturnDate ASC`,
        { TodayStart: todayStart, TodayEnd: todayEnd }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getDueTodayRentals] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve rentals due today: ${err.message}`, err);
    }
  }

  /**
   * Retrieves the outstanding (not-yet-returned) line items for every rental due today, one row
   * per rental line item, so the caller can show which items — not just which rentals — are due
   * back and in what quantity, for reallocation planning.
   *
   * SQL Query:
   * SELECT <RENTAL_DUE_LINE_ITEM_SELECT>
   * <RENTAL_DUE_LINE_ITEM_JOIN>
   * WHERE <DUE_TODAY_WHERE>
   */
  static async getDueTodayLineItems(todayStart: Date, todayEnd: Date): Promise<RentalDueLineItemRow[]> {
    try {
      const rows = await query<RentalDueLineItemRow>(
        `SELECT ${RENTAL_DUE_LINE_ITEM_SELECT}
         ${RENTAL_DUE_LINE_ITEM_JOIN}
         WHERE ${DUE_TODAY_WHERE}`,
        { TodayStart: todayStart, TodayEnd: todayEnd }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getDueTodayLineItems] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve due-today line items: ${err.message}`, err);
    }
  }

  /**
   * Retrieves rentals not yet fully returned whose expected return date falls within the next 7
   * days (today included).
   *
   * SQL Query:
   * SELECT <RENTAL_LIST_SELECT>
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.Status IN ('Active','PartialReturn')
   *   AND CAST(r.ExpectedReturnDate AS DATE) BETWEEN CAST(SYSUTCDATETIME() AS DATE) AND DATEADD(DAY, 7, CAST(SYSUTCDATETIME() AS DATE))
   *   AND r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY r.ExpectedReturnDate ASC
   */
  static async getUpcomingDueRentals(): Promise<RentalListRow[]> {
    try {
      const rows = await query<RentalListRow>(
        `SELECT ${RENTAL_LIST_SELECT}
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE ${UPCOMING_DUE_WHERE}
         ORDER BY r.ExpectedReturnDate ASC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getUpcomingDueRentals] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve upcoming due rentals: ${err.message}`, err);
    }
  }

  /**
   * Retrieves the outstanding (not-yet-returned) line items for every rental due within the next
   * 7 days, one row per rental line item — the upcoming-due counterpart of getDueTodayLineItems.
   *
   * SQL Query:
   * SELECT <RENTAL_DUE_LINE_ITEM_SELECT>
   * <RENTAL_DUE_LINE_ITEM_JOIN>
   * WHERE <UPCOMING_DUE_WHERE>
   */
  static async getUpcomingDueLineItems(): Promise<RentalDueLineItemRow[]> {
    try {
      const rows = await query<RentalDueLineItemRow>(
        `SELECT ${RENTAL_DUE_LINE_ITEM_SELECT}
         ${RENTAL_DUE_LINE_ITEM_JOIN}
         WHERE ${UPCOMING_DUE_WHERE}`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getUpcomingDueLineItems] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve upcoming-due line items: ${err.message}`, err);
    }
  }

  /**
   * Retrieves rentals not yet fully returned whose expected return date has already passed,
   * with how many days overdue each one is. Mirrors vw_OverdueRentals' filter, but as a
   * dedicated query since the view does not expose Status or the amounts needed for balance.
   *
   * SQL Query:
   * SELECT <RENTAL_LIST_SELECT>, DATEDIFF(DAY, r.ExpectedReturnDate, CAST(SYSUTCDATETIME() AS DATE)) AS DaysOverdue
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.Status IN ('Active','PartialReturn') AND r.ExpectedReturnDate < CAST(SYSUTCDATETIME() AS DATE)
   *   AND r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY DaysOverdue DESC
   */
  static async getOverdueRentals(): Promise<OverdueRentalListRow[]> {
    try {
      const rows = await query<OverdueRentalListRow>(
        `SELECT ${RENTAL_LIST_SELECT}, DATEDIFF(DAY, r.ExpectedReturnDate, CAST(SYSUTCDATETIME() AS DATE)) AS DaysOverdue
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE r.Status IN ('Active','PartialReturn') AND r.ExpectedReturnDate < CAST(SYSUTCDATETIME() AS DATE)
           AND ${RENTAL_CUSTOMER_NOT_DELETED}
         ORDER BY DaysOverdue DESC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getOverdueRentals] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve overdue rentals: ${err.message}`, err);
    }
  }

  /**
   * Retrieves the 5 active items with the lowest available stock, reusing vw_ItemInventoryStatus
   * for the available-quantity calculation (TotalQuantity minus currently-rented/damaged/lost).
   *
   * SQL Query:
   * SELECT TOP 5 ItemId, ItemName, TotalQuantity, AvailableStock
   * FROM vw_ItemInventoryStatus
   * ORDER BY AvailableStock ASC
   */
  static async getLowInventoryItems(): Promise<LowInventoryItemRow[]> {
    try {
      const rows = await query<LowInventoryItemRow>(
        `SELECT TOP 5 ItemId, ItemName, TotalQuantity, AvailableStock
         FROM vw_ItemInventoryStatus
         ORDER BY AvailableStock ASC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getLowInventoryItems] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve low inventory items: ${err.message}`, err);
    }
  }

  /**
   * Retrieves the on-demand rental drill-down list for a metric card (Total/New/Active/
   * PartialReturn/Completed). The WHERE clause is selected from a fixed, hardcoded mapping keyed
   * by the typed `filter` union — never built from raw user input — so this stays injection-safe
   * despite being assembled dynamically.
   *
   * SQL Query (WHERE clause varies by filter, see mapping below):
   * SELECT <RENTAL_LIST_SELECT>
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE <mapped clause> AND r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY r.RentalId DESC
   */
  static async getRentalsByFilter(filter: DashboardRentalFilter, periodStart: Date): Promise<RentalListRow[]> {
    const clauseByFilter: Record<DashboardRentalFilter, string> = {
      total: '1 = 1',
      new: 'r.CreatedAt >= @PeriodStart',
      active: "r.Status = 'Active'",
      'partial-return': "r.Status = 'PartialReturn'",
      completed: "r.Status = 'Returned'"
    };

    try {
      const rows = await query<RentalListRow>(
        `SELECT ${RENTAL_LIST_SELECT}
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE ${clauseByFilter[filter]} AND ${RENTAL_CUSTOMER_NOT_DELETED}
         ORDER BY r.RentalId DESC`,
        { PeriodStart: periodStart }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getRentalsByFilter] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve rentals for filter '${filter}': ${err.message}`, err);
    }
  }

  /**
   * Retrieves every rental created since `rangeStart`, for the trend chart's rentals-count and
   * advance-revenue series (bucketed in the service, since bucket granularity varies by period).
   *
   * SQL Query:
   * SELECT CreatedAt, AdvancePaid FROM Rentals WHERE CreatedAt >= @RangeStart AND DeleteStatus = 0
   */
  static async getRentalsCreatedInRange(rangeStart: Date): Promise<RentalCreatedRow[]> {
    try {
      const rows = await query<RentalCreatedRow>(
        `SELECT CreatedAt, AdvancePaid FROM Rentals WHERE CreatedAt >= @RangeStart AND DeleteStatus = 0`,
        { RangeStart: rangeStart }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getRentalsCreatedInRange] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve rentals in range: ${err.message}`, err);
    }
  }

  /**
   * Retrieves every payment recorded since `rangeStart`, for the trend chart's revenue series.
   *
   * SQL Query:
   * SELECT PaymentDate, Amount FROM Payments WHERE PaymentDate >= CAST(@RangeStart AS DATE) AND DeleteStatus = 0
   */
  static async getPaymentsInRange(rangeStart: Date): Promise<PaymentDateAmountRow[]> {
    try {
      const rows = await query<PaymentDateAmountRow>(
        `SELECT PaymentDate, Amount FROM Payments WHERE PaymentDate >= CAST(@RangeStart AS DATE) AND DeleteStatus = 0`,
        { RangeStart: rangeStart }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[DashboardRepository.getPaymentsInRange] Database query failed: ${err.message}`);
      throw new DashboardRepositoryError(`Failed to retrieve payments in range: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getMetrics(periodStart: Date): Promise<DashboardMetricsRow> {
    return DashboardRepository.getMetrics(periodStart);
  }

  async getRecentRentals(): Promise<RentalListRow[]> {
    return DashboardRepository.getRecentRentals();
  }

  async getDueTodayRentals(todayStart: Date, todayEnd: Date): Promise<RentalListRow[]> {
    return DashboardRepository.getDueTodayRentals(todayStart, todayEnd);
  }

  async getDueTodayLineItems(todayStart: Date, todayEnd: Date): Promise<RentalDueLineItemRow[]> {
    return DashboardRepository.getDueTodayLineItems(todayStart, todayEnd);
  }

  async getUpcomingDueRentals(): Promise<RentalListRow[]> {
    return DashboardRepository.getUpcomingDueRentals();
  }

  async getUpcomingDueLineItems(): Promise<RentalDueLineItemRow[]> {
    return DashboardRepository.getUpcomingDueLineItems();
  }

  async getOverdueRentals(): Promise<OverdueRentalListRow[]> {
    return DashboardRepository.getOverdueRentals();
  }

  async getLowInventoryItems(): Promise<LowInventoryItemRow[]> {
    return DashboardRepository.getLowInventoryItems();
  }

  async getRentalsByFilter(filter: DashboardRentalFilter, periodStart: Date): Promise<RentalListRow[]> {
    return DashboardRepository.getRentalsByFilter(filter, periodStart);
  }

  async getRentalsCreatedInRange(rangeStart: Date): Promise<RentalCreatedRow[]> {
    return DashboardRepository.getRentalsCreatedInRange(rangeStart);
  }

  async getPaymentsInRange(rangeStart: Date): Promise<PaymentDateAmountRow[]> {
    return DashboardRepository.getPaymentsInRange(rangeStart);
  }
}
