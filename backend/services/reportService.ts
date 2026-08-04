import logger from '../utils/logger';
import {
  ReportRepository,
  RentalReportRow as RentalReportRowDb,
  PaymentReportRow as PaymentReportRowDb,
  ReturnReportRow as ReturnReportRowDb,
  InventoryReportRow as InventoryReportRowDb
} from '../repositories/reportRepository';
import { HttpError } from '../errors/HttpError';
import { RentalStatus } from '../types/rental';
import { PaymentType } from '../types/payment';
import {
  RentalReportFilters,
  PaymentReportFilters,
  ReturnReportFilters,
  InventoryReportFilters,
  CustomerHistoryFilters,
  RentalReportRow,
  PaymentReportRow,
  ReturnReportRow,
  InventoryReportRow,
  CustomerHistoryReport
} from '../types/report';

const VALID_RENTAL_STATUSES: RentalStatus[] = ['Active', 'PartialReturn', 'Returned', 'Overdue', 'Cancelled'];
const VALID_PAYMENT_TYPES: PaymentType[] = ['Advance', 'Partial', 'Final', 'SecurityDeposit', 'Refund'];
const VALID_ITEM_STATUSES: Array<'Active' | 'Inactive'> = ['Active', 'Inactive'];

/**
 * ReportService assembles the read-only, filterable reports: Rental Report, Payment Report,
 * Return Report, Inventory Report, and Customer Rental History. It is framework-independent and
 * relies on constructor injection of ReportRepository, consistent with the dashboard module.
 *
 * Every date-range filter is parsed here (never passed as a raw string to SQL) and every
 * enum-like filter (status, payment type) is validated against a fixed allow-list, rejecting
 * invalid values with a 400 HttpError rather than silently ignoring them.
 */
export class ReportService {
  constructor(private readonly reportRepository: ReportRepository) {}

  /**
   * Parses an optional ?startDate=/?endDate= pair (plain "YYYY-MM-DD" or full ISO strings) into
   * Date instances. The end date is pushed to the last instant of that calendar day so a filter
   * of endDate=2026-07-26 includes everything recorded on the 26th, not just up to midnight.
   */
  private parseDateRange(startDateInput: unknown, endDateInput: unknown): { startDate?: Date; endDate?: Date } {
    const result: { startDate?: Date; endDate?: Date } = {};

    if (typeof startDateInput === 'string' && startDateInput.trim() !== '') {
      const startDate = new Date(startDateInput);
      if (Number.isNaN(startDate.getTime())) {
        throw new HttpError(400, 'startDate is invalid');
      }
      result.startDate = startDate;
    }

    if (typeof endDateInput === 'string' && endDateInput.trim() !== '') {
      const endDate = new Date(endDateInput);
      if (Number.isNaN(endDate.getTime())) {
        throw new HttpError(400, 'endDate is invalid');
      }
      endDate.setUTCHours(23, 59, 59, 999);
      result.endDate = endDate;
    }

    if (result.startDate && result.endDate && result.startDate > result.endDate) {
      throw new HttpError(400, 'startDate must be before endDate');
    }

    return result;
  }

  private parseRentalStatus(statusInput: unknown): RentalStatus | undefined {
    if (statusInput === undefined || statusInput === '') return undefined;
    if (typeof statusInput !== 'string' || !VALID_RENTAL_STATUSES.includes(statusInput as RentalStatus)) {
      throw new HttpError(400, 'A valid rental status is required');
    }
    return statusInput as RentalStatus;
  }

  private parsePaymentType(paymentTypeInput: unknown): PaymentType | undefined {
    if (paymentTypeInput === undefined || paymentTypeInput === '') return undefined;
    if (typeof paymentTypeInput !== 'string' || !VALID_PAYMENT_TYPES.includes(paymentTypeInput as PaymentType)) {
      throw new HttpError(400, 'A valid payment type is required');
    }
    return paymentTypeInput as PaymentType;
  }

  private parseItemStatus(statusInput: unknown): 'Active' | 'Inactive' | undefined {
    if (statusInput === undefined || statusInput === '') return undefined;
    if (typeof statusInput !== 'string' || !VALID_ITEM_STATUSES.includes(statusInput as 'Active' | 'Inactive')) {
      throw new HttpError(400, 'A valid item status is required');
    }
    return statusInput as 'Active' | 'Inactive';
  }

  private parseOptionalText(input: unknown): string | undefined {
    if (typeof input !== 'string') return undefined;
    const trimmed = input.trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private parseCategoryId(input: unknown): number | undefined {
    if (input === undefined || input === '') return undefined;
    const categoryId = Number(input);
    if (Number.isNaN(categoryId) || categoryId <= 0) {
      throw new HttpError(400, 'A valid categoryId is required');
    }
    return categoryId;
  }

  private mapRentalRow(row: RentalReportRowDb): RentalReportRow {
    const totalAmount = Number(row.TotalAmount);
    const advancePaid = Number(row.AdvancePaid);
    const amountPaid = advancePaid + Number(row.AmountPaidViaPayments);

    return {
      rentalId: row.RentalId,
      rentalCode: row.RentalCode,
      customerName: row.CustomerName,
      mobileNumber: row.MobileNumber,
      rentalStartDate: row.RentalStartDate.toISOString(),
      expectedReturnDate: row.ExpectedReturnDate.toISOString(),
      status: row.Status,
      totalAmount,
      advancePaid,
      securityDepositPaid: Number(row.SecurityDepositPaid),
      amountPaid,
      outstandingBalance: totalAmount - amountPaid,
      paymentStatus: row.PaymentStatus,
      createdAt: row.CreatedAt.toISOString()
    };
  }

  private mapPaymentRow(row: PaymentReportRowDb): PaymentReportRow {
    return {
      paymentId: row.PaymentId,
      paymentDate: row.PaymentDate.toISOString(),
      rentalCode: row.RentalCode,
      customerName: row.CustomerName,
      mobileNumber: row.MobileNumber,
      amount: Number(row.Amount),
      paymentType: row.PaymentType,
      paymentMode: row.PaymentMode,
      recordedByName: row.RecordedByName
    };
  }

  private mapReturnRow(row: ReturnReportRowDb): ReturnReportRow {
    return {
      returnEventId: row.ReturnEventId,
      returnDate: row.ReturnDate.toISOString(),
      rentalCode: row.RentalCode,
      customerName: row.CustomerName,
      mobileNumber: row.MobileNumber,
      itemName: row.ItemName,
      quantityReturned: row.QuantityReturned,
      quantityDamaged: row.QuantityDamaged,
      quantityMissing: row.QuantityMissing,
      damageStatus: row.DamageStatus
    };
  }

  private mapInventoryRow(row: InventoryReportRowDb): InventoryReportRow {
    return {
      itemId: row.ItemId,
      itemName: row.ItemName,
      categoryName: row.CategoryName,
      itemCode: row.ItemCode,
      unitType: row.UnitType,
      status: row.Status,
      totalQuantity: row.TotalQuantity,
      currentlyRented: row.CurrentlyRented,
      damagedStock: row.DamagedStock,
      lostStock: row.LostStock,
      availableStock: row.AvailableStock
    };
  }

  /** Retrieves the Rental Report, filtered by any combination of date range, status, or customer. */
  async getRentalReport(filters: RentalReportFilters): Promise<RentalReportRow[]> {
    const { startDate, endDate } = this.parseDateRange(filters.startDate, filters.endDate);
    const status = this.parseRentalStatus(filters.status);
    const customerSearch = this.parseOptionalText(filters.customer);

    const rows = await this.reportRepository.getRentalReport({ startDate, endDate, status, customerSearch });
    logger.info(`[ReportService.getRentalReport] Retrieved ${rows.length} rental report row(s).`);
    return rows.map((row) => this.mapRentalRow(row));
  }

  /** Retrieves the Payment Report, filtered by any combination of date range, mode, type, or customer. */
  async getPaymentReport(filters: PaymentReportFilters): Promise<PaymentReportRow[]> {
    const { startDate, endDate } = this.parseDateRange(filters.startDate, filters.endDate);
    const paymentType = this.parsePaymentType(filters.paymentType);
    const paymentMode = this.parseOptionalText(filters.paymentMode);
    const customerSearch = this.parseOptionalText(filters.customer);

    const rows = await this.reportRepository.getPaymentReport({
      startDate,
      endDate,
      paymentMode,
      paymentType,
      customerSearch
    });
    logger.info(`[ReportService.getPaymentReport] Retrieved ${rows.length} payment report row(s).`);
    return rows.map((row) => this.mapPaymentRow(row));
  }

  /** Retrieves the Return Report, filtered by any combination of date range, customer, or item. */
  async getReturnReport(filters: ReturnReportFilters): Promise<ReturnReportRow[]> {
    const { startDate, endDate } = this.parseDateRange(filters.startDate, filters.endDate);
    const customerSearch = this.parseOptionalText(filters.customer);
    const itemSearch = this.parseOptionalText(filters.item);

    const rows = await this.reportRepository.getReturnReport({ startDate, endDate, customerSearch, itemSearch });
    logger.info(`[ReportService.getReturnReport] Retrieved ${rows.length} return report row(s).`);
    return rows.map((row) => this.mapReturnRow(row));
  }

  /** Retrieves the Inventory Report, filtered by category and/or Active/Inactive status. */
  async getInventoryReport(filters: InventoryReportFilters): Promise<InventoryReportRow[]> {
    const categoryId = this.parseCategoryId(filters.categoryId);
    const status = this.parseItemStatus(filters.status);

    const rows = await this.reportRepository.getInventoryReport({ categoryId, status });
    logger.info(`[ReportService.getInventoryReport] Retrieved ${rows.length} inventory report row(s).`);
    return rows.map((row) => this.mapInventoryRow(row));
  }

  /**
   * Retrieves a single customer's full rental history (optionally narrowed by date range and/or
   * status) plus a summary of totals across the matching rentals, throwing a 404 HttpError if the
   * customer does not exist.
   */
  async getCustomerHistory(customerIdInput: unknown, filters: CustomerHistoryFilters): Promise<CustomerHistoryReport> {
    const customerId = Number(customerIdInput);
    if (!customerIdInput || Number.isNaN(customerId)) {
      throw new HttpError(400, 'A valid customerId is required');
    }

    const customer = await this.reportRepository.getCustomerById(customerId);
    if (!customer) {
      logger.warn(`[ReportService.getCustomerHistory] Customer with ID ${customerId} not found.`);
      throw new HttpError(404, 'Customer not found');
    }

    const { startDate, endDate } = this.parseDateRange(filters.startDate, filters.endDate);
    const status = this.parseRentalStatus(filters.status);

    const rows = await this.reportRepository.getRentalReport({ startDate, endDate, status, customerId });
    const rentals = rows.map((row) => this.mapRentalRow(row));

    const summary = rentals.reduce(
      (acc, rental) => ({
        totalRentals: acc.totalRentals + 1,
        totalAmount: acc.totalAmount + rental.totalAmount,
        totalPaid: acc.totalPaid + rental.amountPaid,
        totalOutstanding: acc.totalOutstanding + rental.outstandingBalance
      }),
      { totalRentals: 0, totalAmount: 0, totalPaid: 0, totalOutstanding: 0 }
    );

    logger.info(`[ReportService.getCustomerHistory] Retrieved ${rentals.length} rental(s) for customer ${customerId}.`);

    return {
      customerId: customer.CustomerId,
      customerName: customer.CustomerName,
      mobileNumber: customer.MobileNumber,
      summary,
      rentals
    };
  }
}
