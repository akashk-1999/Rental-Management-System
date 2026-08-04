import { query } from '../config/db';
import logger from '../utils/logger';
import { RentalStatus, RentalPaymentStatus } from '../types/rental';
import { PaymentType } from '../types/payment';

export interface RentalReportRow {
  RentalId: number;
  RentalCode: string;
  CustomerName: string;
  MobileNumber: string;
  RentalStartDate: Date;
  ExpectedReturnDate: Date;
  Status: RentalStatus;
  TotalAmount: number;
  AdvancePaid: number;
  SecurityDepositPaid: number;
  PaymentStatus: RentalPaymentStatus;
  CreatedAt: Date;
  AmountPaidViaPayments: number;
}

export interface RentalReportQueryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: RentalStatus;
  customerId?: number;
  customerSearch?: string;
}

export interface PaymentReportRow {
  PaymentId: number;
  PaymentDate: Date;
  RentalCode: string;
  CustomerName: string;
  MobileNumber: string;
  Amount: number;
  PaymentType: PaymentType;
  PaymentMode: string | null;
  RecordedByName: string;
}

export interface PaymentReportQueryFilters {
  startDate?: Date;
  endDate?: Date;
  paymentMode?: string;
  paymentType?: PaymentType;
  customerSearch?: string;
}

export interface ReturnReportRow {
  ReturnEventId: number;
  ReturnDate: Date;
  RentalCode: string;
  CustomerName: string;
  MobileNumber: string;
  ItemName: string;
  QuantityReturned: number;
  QuantityDamaged: number;
  QuantityMissing: number;
  DamageStatus: 'Repairable' | 'Damaged' | 'Lost' | null;
}

export interface ReturnReportQueryFilters {
  startDate?: Date;
  endDate?: Date;
  customerSearch?: string;
  itemSearch?: string;
}

export interface InventoryReportRow {
  ItemId: number;
  ItemName: string;
  CategoryName: string;
  ItemCode: string | null;
  UnitType: string;
  Status: 'Active' | 'Inactive';
  TotalQuantity: number;
  CurrentlyRented: number;
  DamagedStock: number;
  LostStock: number;
  AvailableStock: number;
}

export interface InventoryReportQueryFilters {
  categoryId?: number;
  status?: 'Active' | 'Inactive';
}

export interface CustomerRow {
  CustomerId: number;
  CustomerName: string;
  MobileNumber: string;
}

export class ReportRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'ReportRepositoryError';
  }
}

/** Columns shared by every rental-report query; AmountPaidViaPayments is always computed so the
 * service can derive amountPaid/outstandingBalance without a second round trip. */
const RENTAL_REPORT_SELECT = `r.RentalId, r.RentalCode, c.CustomerName, c.MobileNumber, r.RentalStartDate,
       r.ExpectedReturnDate, r.Status, r.TotalAmount, r.AdvancePaid, r.SecurityDepositPaid,
       r.PaymentStatus, r.CreatedAt,
       ISNULL((SELECT SUM(p.Amount) FROM Payments p WHERE p.RentalId = r.RentalId AND p.DeleteStatus = 0), 0) AS AmountPaidViaPayments`;

/**
 * ReportRepository provides read-only SQL Server queries backing the Reports module. Every query
 * filters out soft-deleted rows (DeleteStatus = 1) on every joined table, and every optional
 * filter is appended as a parameterized condition — the WHERE clause is built from a fixed set of
 * hardcoded condition strings selected by typed booleans, never by concatenating raw user input,
 * so this stays injection-safe despite being assembled dynamically (same pattern as
 * DashboardRepository.getRentalsByFilter).
 */
export class ReportRepository {
  /**
   * Retrieves rentals joined with their customer for the Rental Report and Customer Rental
   * History report, filtered by any combination of date range (on RentalStartDate), status,
   * exact customer (customerId), or a free-text customer search (name or mobile number).
   *
   * SQL Query (base, WHERE grows with the supplied filters):
   * SELECT <RENTAL_REPORT_SELECT>
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.DeleteStatus = 0 AND c.DeleteStatus = 0
   *   [AND r.RentalStartDate >= @StartDate]
   *   [AND r.RentalStartDate <= @EndDate]
   *   [AND r.Status = @Status]
   *   [AND r.CustomerId = @CustomerId]
   *   [AND (c.CustomerName LIKE @CustomerSearch OR c.MobileNumber LIKE @CustomerSearch)]
   * ORDER BY r.RentalStartDate DESC
   */
  static async getRentalReport(filters: RentalReportQueryFilters): Promise<RentalReportRow[]> {
    const conditions = ['r.DeleteStatus = 0', 'c.DeleteStatus = 0'];
    const params: Record<string, any> = {};

    if (filters.startDate) {
      conditions.push('r.RentalStartDate >= @StartDate');
      params.StartDate = filters.startDate;
    }
    if (filters.endDate) {
      conditions.push('r.RentalStartDate <= @EndDate');
      params.EndDate = filters.endDate;
    }
    if (filters.status) {
      conditions.push('r.Status = @Status');
      params.Status = filters.status;
    }
    if (filters.customerId) {
      conditions.push('r.CustomerId = @CustomerId');
      params.CustomerId = filters.customerId;
    }
    if (filters.customerSearch) {
      conditions.push('(c.CustomerName LIKE @CustomerSearch OR c.MobileNumber LIKE @CustomerSearch)');
      params.CustomerSearch = `%${filters.customerSearch}%`;
    }

    try {
      const rows = await query<RentalReportRow>(
        `SELECT ${RENTAL_REPORT_SELECT}
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE ${conditions.join(' AND ')}
         ORDER BY r.RentalStartDate DESC`,
        params
      );
      return rows;
    } catch (err: any) {
      logger.error(`[ReportRepository.getRentalReport] Database query failed: ${err.message}`);
      throw new ReportRepositoryError(`Failed to retrieve rental report: ${err.message}`, err);
    }
  }

  /**
   * Retrieves payments joined with their rental, customer, and recording user for the Payment
   * Report, filtered by any combination of date range (on PaymentDate), payment mode, payment
   * type, or a free-text customer search (name or mobile number).
   *
   * SQL Query (base, WHERE grows with the supplied filters):
   * SELECT p.PaymentId, p.PaymentDate, r.RentalCode, c.CustomerName, c.MobileNumber, p.Amount,
   *        p.PaymentType, p.PaymentMode, u.FullName AS RecordedByName
   * FROM Payments p
   * JOIN Rentals r ON r.RentalId = p.RentalId
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * JOIN Users u ON u.UserId = p.RecordedByUserId
   * WHERE p.DeleteStatus = 0 AND r.DeleteStatus = 0 AND c.DeleteStatus = 0 AND u.DeleteStatus = 0
   *   [AND p.PaymentDate >= @StartDate] [AND p.PaymentDate <= @EndDate]
   *   [AND p.PaymentMode = @PaymentMode] [AND p.PaymentType = @PaymentType]
   *   [AND (c.CustomerName LIKE @CustomerSearch OR c.MobileNumber LIKE @CustomerSearch)]
   * ORDER BY p.PaymentDate DESC, p.CreatedAt DESC
   */
  static async getPaymentReport(filters: PaymentReportQueryFilters): Promise<PaymentReportRow[]> {
    const conditions = ['p.DeleteStatus = 0', 'r.DeleteStatus = 0', 'c.DeleteStatus = 0', 'u.DeleteStatus = 0'];
    const params: Record<string, any> = {};

    if (filters.startDate) {
      conditions.push('p.PaymentDate >= @StartDate');
      params.StartDate = filters.startDate;
    }
    if (filters.endDate) {
      conditions.push('p.PaymentDate <= @EndDate');
      params.EndDate = filters.endDate;
    }
    if (filters.paymentMode) {
      conditions.push('p.PaymentMode = @PaymentMode');
      params.PaymentMode = filters.paymentMode;
    }
    if (filters.paymentType) {
      conditions.push('p.PaymentType = @PaymentType');
      params.PaymentType = filters.paymentType;
    }
    if (filters.customerSearch) {
      conditions.push('(c.CustomerName LIKE @CustomerSearch OR c.MobileNumber LIKE @CustomerSearch)');
      params.CustomerSearch = `%${filters.customerSearch}%`;
    }

    try {
      const rows = await query<PaymentReportRow>(
        `SELECT p.PaymentId, p.PaymentDate, r.RentalCode, c.CustomerName, c.MobileNumber, p.Amount,
                p.PaymentType, p.PaymentMode, u.FullName AS RecordedByName
         FROM Payments p
         JOIN Rentals r ON r.RentalId = p.RentalId
         JOIN Customers c ON c.CustomerId = r.CustomerId
         JOIN Users u ON u.UserId = p.RecordedByUserId
         WHERE ${conditions.join(' AND ')}
         ORDER BY p.PaymentDate DESC, p.CreatedAt DESC`,
        params
      );
      return rows;
    } catch (err: any) {
      logger.error(`[ReportRepository.getPaymentReport] Database query failed: ${err.message}`);
      throw new ReportRepositoryError(`Failed to retrieve payment report: ${err.message}`, err);
    }
  }

  /**
   * Retrieves return events joined with their rental line item, rental, customer, and item for
   * the Return Report, filtered by any combination of date range (on ReturnDate), a free-text
   * customer search (name or mobile number), or a free-text item name search.
   *
   * SQL Query (base, WHERE grows with the supplied filters):
   * SELECT re.ReturnEventId, re.ReturnDate, r.RentalCode, c.CustomerName, c.MobileNumber, i.ItemName,
   *        re.QuantityReturned, re.QuantityDamaged, re.QuantityMissing, re.DamageStatus
   * FROM ReturnEvents re
   * JOIN RentalLineItems rli ON rli.RentalLineItemId = re.RentalLineItemId
   * JOIN Rentals r ON r.RentalId = rli.RentalId
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * JOIN Items i ON i.ItemId = rli.ItemId
   * WHERE re.DeleteStatus = 0 AND rli.DeleteStatus = 0 AND r.DeleteStatus = 0 AND c.DeleteStatus = 0 AND i.DeleteStatus = 0
   *   [AND re.ReturnDate >= @StartDate] [AND re.ReturnDate <= @EndDate]
   *   [AND (c.CustomerName LIKE @CustomerSearch OR c.MobileNumber LIKE @CustomerSearch)]
   *   [AND i.ItemName LIKE @ItemSearch]
   * ORDER BY re.ReturnDate DESC
   */
  static async getReturnReport(filters: ReturnReportQueryFilters): Promise<ReturnReportRow[]> {
    const conditions = [
      're.DeleteStatus = 0',
      'rli.DeleteStatus = 0',
      'r.DeleteStatus = 0',
      'c.DeleteStatus = 0',
      'i.DeleteStatus = 0'
    ];
    const params: Record<string, any> = {};

    if (filters.startDate) {
      conditions.push('re.ReturnDate >= @StartDate');
      params.StartDate = filters.startDate;
    }
    if (filters.endDate) {
      conditions.push('re.ReturnDate <= @EndDate');
      params.EndDate = filters.endDate;
    }
    if (filters.customerSearch) {
      conditions.push('(c.CustomerName LIKE @CustomerSearch OR c.MobileNumber LIKE @CustomerSearch)');
      params.CustomerSearch = `%${filters.customerSearch}%`;
    }
    if (filters.itemSearch) {
      conditions.push('i.ItemName LIKE @ItemSearch');
      params.ItemSearch = `%${filters.itemSearch}%`;
    }

    try {
      const rows = await query<ReturnReportRow>(
        `SELECT re.ReturnEventId, re.ReturnDate, r.RentalCode, c.CustomerName, c.MobileNumber, i.ItemName,
                re.QuantityReturned, re.QuantityDamaged, re.QuantityMissing, re.DamageStatus
         FROM ReturnEvents re
         JOIN RentalLineItems rli ON rli.RentalLineItemId = re.RentalLineItemId
         JOIN Rentals r ON r.RentalId = rli.RentalId
         JOIN Customers c ON c.CustomerId = r.CustomerId
         JOIN Items i ON i.ItemId = rli.ItemId
         WHERE ${conditions.join(' AND ')}
         ORDER BY re.ReturnDate DESC`,
        params
      );
      return rows;
    } catch (err: any) {
      logger.error(`[ReportRepository.getReturnReport] Database query failed: ${err.message}`);
      throw new ReportRepositoryError(`Failed to retrieve return report: ${err.message}`, err);
    }
  }

  /**
   * Retrieves items joined with their category and inventory status for the Inventory Report,
   * filtered by category or Active/Inactive status. Reuses vw_ItemInventoryStatus (LEFT JOIN,
   * since the view only covers Active items) for CurrentlyRented/DamagedStock/LostStock/
   * AvailableStock, defaulting every column to 0 (or TotalQuantity for AvailableStock) for
   * Inactive items the view excludes — mirrors ItemRepository.getAllItems' same LEFT JOIN pattern.
   *
   * SQL Query (base, WHERE grows with the supplied filters):
   * SELECT i.ItemId, i.ItemName, c.CategoryName, i.ItemCode, i.UnitType, i.Status, i.TotalQuantity,
   *        ISNULL(v.CurrentlyRented, 0) AS CurrentlyRented, ISNULL(v.DamagedStock, 0) AS DamagedStock,
   *        ISNULL(v.LostStock, 0) AS LostStock, ISNULL(v.AvailableStock, i.TotalQuantity) AS AvailableStock
   * FROM Items i
   * JOIN ItemCategories c ON c.CategoryId = i.CategoryId
   * LEFT JOIN vw_ItemInventoryStatus v ON v.ItemId = i.ItemId
   * WHERE i.DeleteStatus = 0 AND c.DeleteStatus = 0
   *   [AND i.CategoryId = @CategoryId] [AND i.Status = @Status]
   * ORDER BY i.ItemName ASC
   */
  static async getInventoryReport(filters: InventoryReportQueryFilters): Promise<InventoryReportRow[]> {
    const conditions = ['i.DeleteStatus = 0', 'c.DeleteStatus = 0'];
    const params: Record<string, any> = {};

    if (filters.categoryId) {
      conditions.push('i.CategoryId = @CategoryId');
      params.CategoryId = filters.categoryId;
    }
    if (filters.status) {
      conditions.push('i.Status = @Status');
      params.Status = filters.status;
    }

    try {
      const rows = await query<InventoryReportRow>(
        `SELECT i.ItemId, i.ItemName, c.CategoryName, i.ItemCode, i.UnitType, i.Status, i.TotalQuantity,
                ISNULL(v.CurrentlyRented, 0) AS CurrentlyRented,
                ISNULL(v.DamagedStock, 0) AS DamagedStock,
                ISNULL(v.LostStock, 0) AS LostStock,
                ISNULL(v.AvailableStock, i.TotalQuantity) AS AvailableStock
         FROM Items i
         JOIN ItemCategories c ON c.CategoryId = i.CategoryId
         LEFT JOIN vw_ItemInventoryStatus v ON v.ItemId = i.ItemId
         WHERE ${conditions.join(' AND ')}
         ORDER BY i.ItemName ASC`,
        params
      );
      return rows;
    } catch (err: any) {
      logger.error(`[ReportRepository.getInventoryReport] Database query failed: ${err.message}`);
      throw new ReportRepositoryError(`Failed to retrieve inventory report: ${err.message}`, err);
    }
  }

  /**
   * Retrieves a single non-deleted customer by CustomerId, used to validate the :customerId route
   * param and resolve the customer's name/mobile for the Customer Rental History report header.
   *
   * SQL Query:
   * SELECT CustomerId, CustomerName, MobileNumber FROM Customers WHERE CustomerId = @CustomerId AND DeleteStatus = 0
   */
  static async getCustomerById(customerId: number): Promise<CustomerRow | null> {
    try {
      const rows = await query<CustomerRow>(
        `SELECT CustomerId, CustomerName, MobileNumber FROM Customers WHERE CustomerId = @CustomerId AND DeleteStatus = 0`,
        { CustomerId: customerId }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[ReportRepository.getCustomerById] Database query failed: ${err.message}`);
      throw new ReportRepositoryError(`Failed to retrieve customer by ID: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getRentalReport(filters: RentalReportQueryFilters): Promise<RentalReportRow[]> {
    return ReportRepository.getRentalReport(filters);
  }

  async getPaymentReport(filters: PaymentReportQueryFilters): Promise<PaymentReportRow[]> {
    return ReportRepository.getPaymentReport(filters);
  }

  async getReturnReport(filters: ReturnReportQueryFilters): Promise<ReturnReportRow[]> {
    return ReportRepository.getReturnReport(filters);
  }

  async getInventoryReport(filters: InventoryReportQueryFilters): Promise<InventoryReportRow[]> {
    return ReportRepository.getInventoryReport(filters);
  }

  async getCustomerById(customerId: number): Promise<CustomerRow | null> {
    return ReportRepository.getCustomerById(customerId);
  }
}
