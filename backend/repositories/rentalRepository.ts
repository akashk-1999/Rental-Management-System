import mssql from 'mssql';
import { query, transaction } from '../config/db';
import logger from '../utils/logger';
import { Customer, Rental, RentalLineItem, RentalPaymentStatus } from '../types/rental';

export interface RentalWithCustomer extends Rental {
  CustomerName: string;
  MobileNumber: string;
}

export interface RentalLineItemWithItem extends RentalLineItem {
  ItemName: string;
  ItemCode: string | null;
  UnitType: string;
}

export interface CreateRentalTransactionInput {
  existingCustomerId: number | null;
  customer: {
    customerName: string;
    mobileNumber: string;
    alternateNumber: string | null;
    address: string | null;
    idProof: string | null;
    notes: string | null;
  };
  rentalStartDate: Date;
  expectedReturnDate: Date;
  totalAmount: number;
  advancePaid: number;
  securityDepositPaid: number;
  paymentStatus: RentalPaymentStatus;
  notes: string | null;
  createdByUserId: number;
  lineItems: Array<{ itemId: number; quantityRented: number; unitPrice: number }>;
}

export class RentalRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'RentalRepositoryError';
  }
}

/**
 * Builds an mssql.Request bound to an in-flight transaction, mirroring the parameter-binding
 * behavior of the pool-based query()/execute() helpers in config/db.ts.
 */
function txRequest(tx: mssql.Transaction, params?: Record<string, any>): mssql.Request {
  const request = new mssql.Request(tx);
  if (params) {
    for (const [key, val] of Object.entries(params)) {
      request.input(key, val);
    }
  }
  return request;
}

function isDuplicateKeyError(err: any): boolean {
  return (
    err.number === 2627 ||
    err.number === 2601 ||
    err.originalError?.number === 2627 ||
    err.originalError?.number === 2601 ||
    (err.message && (err.message.includes('Violation of UNIQUE KEY') || err.message.includes('duplicate key')))
  );
}

/**
 * RentalRepository provides SQL Server direct operations for managing the Rentals,
 * RentalLineItems, and Customers tables. Reads use the shared connection pool; the
 * multi-table rental creation write uses a single SQL transaction so the Customer,
 * Rental, and RentalLineItems inserts commit or roll back together.
 */
export class RentalRepository {
  /**
   * Retrieves a customer record by mobile number, used to decide whether a new
   * Customers row must be created for a rental or an existing one reused.
   *
   * SQL Query:
   * SELECT CustomerId, CustomerName, MobileNumber, AlternateNumber, Address, IdProof, Notes, CreatedAt, UpdatedAt
   * FROM Customers
   * WHERE MobileNumber = @MobileNumber AND DeleteStatus = 0
   */
  static async getCustomerByMobileNumber(mobileNumber: string): Promise<Customer | null> {
    try {
      const rows = await query<Customer>(
        `SELECT CustomerId, CustomerName, MobileNumber, AlternateNumber, Address, IdProof, Notes, CreatedAt, UpdatedAt
         FROM Customers
         WHERE MobileNumber = @MobileNumber AND DeleteStatus = 0`,
        { MobileNumber: mobileNumber }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[RentalRepository.getCustomerByMobileNumber] Database query failed: ${err.message}`);
      throw new RentalRepositoryError(`Failed to retrieve customer by mobile number: ${err.message}`, err);
    }
  }

  /**
   * Retrieves all rental headers joined with their customer, most recently created first.
   * Line items are intentionally not joined here to keep the list endpoint lightweight;
   * use getRentalLineItems() for the detail view.
   *
   * SQL Query:
   * SELECT r.RentalId, r.RentalCode, r.CustomerId, c.CustomerName, c.MobileNumber,
   *        r.RentalStartDate, r.ExpectedReturnDate, r.Status, r.TotalAmount, r.AdvancePaid,
   *        r.SecurityDepositPaid, r.PaymentStatus, r.Notes, r.CreatedByUserId, r.CreatedAt, r.UpdatedAt
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY r.RentalId DESC
   */
  static async getAllRentals(): Promise<RentalWithCustomer[]> {
    try {
      const rows = await query<RentalWithCustomer>(
        `SELECT r.RentalId, r.RentalCode, r.CustomerId, c.CustomerName, c.MobileNumber,
                r.RentalStartDate, r.ExpectedReturnDate, r.Status, r.TotalAmount, r.AdvancePaid,
                r.SecurityDepositPaid, r.PaymentStatus, r.Notes, r.CreatedByUserId, r.CreatedAt, r.UpdatedAt
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE r.DeleteStatus = 0 AND c.DeleteStatus = 0
         ORDER BY r.RentalId DESC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[RentalRepository.getAllRentals] Database query failed: ${err.message}`);
      throw new RentalRepositoryError(`Failed to retrieve all rentals: ${err.message}`, err);
    }
  }

  /**
   * Retrieves a single rental header, joined with its customer, by RentalId.
   *
   * SQL Query:
   * SELECT r.RentalId, r.RentalCode, r.CustomerId, c.CustomerName, c.MobileNumber,
   *        r.RentalStartDate, r.ExpectedReturnDate, r.Status, r.TotalAmount, r.AdvancePaid,
   *        r.SecurityDepositPaid, r.PaymentStatus, r.Notes, r.CreatedByUserId, r.CreatedAt, r.UpdatedAt
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.RentalId = @RentalId AND r.DeleteStatus = 0 AND c.DeleteStatus = 0
   */
  static async getRentalById(id: number): Promise<RentalWithCustomer | null> {
    try {
      const rows = await query<RentalWithCustomer>(
        `SELECT r.RentalId, r.RentalCode, r.CustomerId, c.CustomerName, c.MobileNumber,
                r.RentalStartDate, r.ExpectedReturnDate, r.Status, r.TotalAmount, r.AdvancePaid,
                r.SecurityDepositPaid, r.PaymentStatus, r.Notes, r.CreatedByUserId, r.CreatedAt, r.UpdatedAt
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE r.RentalId = @RentalId AND r.DeleteStatus = 0 AND c.DeleteStatus = 0`,
        { RentalId: id }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[RentalRepository.getRentalById] Database query failed: ${err.message}`);
      throw new RentalRepositoryError(`Failed to retrieve rental by ID: ${err.message}`, err);
    }
  }

  /**
   * Retrieves the line items for a rental, joined with Items to include item name/code/unit type.
   *
   * SQL Query:
   * SELECT rli.RentalLineItemId, rli.RentalId, rli.ItemId, i.ItemName, i.ItemCode, i.UnitType,
   *        rli.QuantityRented, rli.UnitPrice, rli.LineTotal, rli.CreatedAt
   * FROM RentalLineItems rli
   * JOIN Items i ON i.ItemId = rli.ItemId
   * WHERE rli.RentalId = @RentalId AND rli.DeleteStatus = 0 AND i.DeleteStatus = 0
   * ORDER BY rli.RentalLineItemId ASC
   */
  static async getRentalLineItems(rentalId: number): Promise<RentalLineItemWithItem[]> {
    try {
      const rows = await query<RentalLineItemWithItem>(
        `SELECT rli.RentalLineItemId, rli.RentalId, rli.ItemId, i.ItemName, i.ItemCode, i.UnitType,
                rli.QuantityRented, rli.UnitPrice, rli.LineTotal, rli.CreatedAt
         FROM RentalLineItems rli
         JOIN Items i ON i.ItemId = rli.ItemId
         WHERE rli.RentalId = @RentalId AND rli.DeleteStatus = 0 AND i.DeleteStatus = 0
         ORDER BY rli.RentalLineItemId ASC`,
        { RentalId: rentalId }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[RentalRepository.getRentalLineItems] Database query failed: ${err.message}`);
      throw new RentalRepositoryError(`Failed to retrieve rental line items: ${err.message}`, err);
    }
  }

  /**
   * Atomically creates a rental: reuses an existing Customer (by mobile number) or inserts a new
   * one, generates the next sequential year-wise RentalCode, inserts the Rental header, and
   * inserts every RentalLineItem — all within a single SQL transaction. The transaction is
   * committed only if every statement succeeds; any failure rolls back all of it (see
   * config/db.ts's transaction() helper).
   *
   * SQL Queries (in order, all within one transaction):
   * INSERT INTO Customers (CustomerName, MobileNumber, AlternateNumber, Address, IdProof, Notes)
   * OUTPUT INSERTED.CustomerId
   * VALUES (@CustomerName, @MobileNumber, @AlternateNumber, @Address, @IdProof, @Notes)
   * -- only when existingCustomerId is not supplied
   *
   * SELECT COUNT(*) AS RentalCount
   * FROM Rentals WITH (UPDLOCK, HOLDLOCK)
   * WHERE RentalCode LIKE @CodePattern
   * -- RentalCode becomes RN-<year>-<count+1, zero-padded to 4 digits>
   *
   * INSERT INTO Rentals (RentalCode, CustomerId, RentalStartDate, ExpectedReturnDate, Status,
   *                       TotalAmount, AdvancePaid, SecurityDepositPaid, PaymentStatus, Notes, CreatedByUserId)
   * OUTPUT INSERTED.RentalId
   * VALUES (@RentalCode, @CustomerId, @RentalStartDate, @ExpectedReturnDate, 'Active',
   *         @TotalAmount, @AdvancePaid, @SecurityDepositPaid, @PaymentStatus, @Notes, @CreatedByUserId)
   *
   * INSERT INTO RentalLineItems (RentalId, ItemId, QuantityRented, UnitPrice)
   * VALUES (@RentalId, @ItemId, @QuantityRented, @UnitPrice)
   * -- once per line item
   */
  static async createRentalTransaction(input: CreateRentalTransactionInput): Promise<number> {
    try {
      return await transaction(async (tx) => {
        let customerId = input.existingCustomerId;

        if (!customerId) {
          const customerResult = await txRequest(tx, {
            CustomerName: input.customer.customerName,
            MobileNumber: input.customer.mobileNumber,
            AlternateNumber: input.customer.alternateNumber,
            Address: input.customer.address,
            IdProof: input.customer.idProof,
            Notes: input.customer.notes
          }).query<{ CustomerId: number }>(
            `INSERT INTO Customers (CustomerName, MobileNumber, AlternateNumber, Address, IdProof, Notes)
             OUTPUT INSERTED.CustomerId
             VALUES (@CustomerName, @MobileNumber, @AlternateNumber, @Address, @IdProof, @Notes)`
          );
          customerId = customerResult.recordset[0].CustomerId;
        }

        // Generate a sequential, year-wise rental code (e.g. RN-2026-0001), counting existing
        // codes for the current year. WITH (UPDLOCK, HOLDLOCK) prevents two concurrent
        // transactions from computing the same next sequence number. Deliberately NOT filtered
        // by DeleteStatus: RentalCode is UNIQUE across all rows regardless of soft-delete state,
        // so a soft-deleted rental's code still occupies that slot and must still be counted to
        // avoid generating a colliding duplicate.
        const year = new Date().getUTCFullYear();
        const codePattern = `RN-${year}-%`;
        const countResult = await txRequest(tx, { CodePattern: codePattern }).query<{ RentalCount: number }>(
          `SELECT COUNT(*) AS RentalCount
           FROM Rentals WITH (UPDLOCK, HOLDLOCK)
           WHERE RentalCode LIKE @CodePattern`
        );
        const nextSequence = countResult.recordset[0].RentalCount + 1;
        const rentalCode = `RN-${year}-${String(nextSequence).padStart(4, '0')}`;

        const rentalResult = await txRequest(tx, {
          RentalCode: rentalCode,
          CustomerId: customerId,
          RentalStartDate: input.rentalStartDate,
          ExpectedReturnDate: input.expectedReturnDate,
          TotalAmount: input.totalAmount,
          AdvancePaid: input.advancePaid,
          SecurityDepositPaid: input.securityDepositPaid,
          PaymentStatus: input.paymentStatus,
          Notes: input.notes,
          CreatedByUserId: input.createdByUserId
        }).query<{ RentalId: number }>(
          `INSERT INTO Rentals (RentalCode, CustomerId, RentalStartDate, ExpectedReturnDate, Status,
                                 TotalAmount, AdvancePaid, SecurityDepositPaid, PaymentStatus, Notes, CreatedByUserId)
           OUTPUT INSERTED.RentalId
           VALUES (@RentalCode, @CustomerId, @RentalStartDate, @ExpectedReturnDate, 'Active',
                   @TotalAmount, @AdvancePaid, @SecurityDepositPaid, @PaymentStatus, @Notes, @CreatedByUserId)`
        );
        const rentalId = rentalResult.recordset[0].RentalId;

        for (const lineItem of input.lineItems) {
          await txRequest(tx, {
            RentalId: rentalId,
            ItemId: lineItem.itemId,
            QuantityRented: lineItem.quantityRented,
            UnitPrice: lineItem.unitPrice
          }).query(
            `INSERT INTO RentalLineItems (RentalId, ItemId, QuantityRented, UnitPrice)
             VALUES (@RentalId, @ItemId, @QuantityRented, @UnitPrice)`
          );
        }

        return rentalId;
      });
    } catch (err: any) {
      logger.error(`[RentalRepository.createRentalTransaction] Transaction failed: ${err.message}`);
      if (isDuplicateKeyError(err)) {
        throw new RentalRepositoryError(
          `Duplicate rental violation: ${err.message}`,
          err
        );
      }
      throw new RentalRepositoryError(`Failed to create rental: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getCustomerByMobileNumber(mobileNumber: string): Promise<Customer | null> {
    return RentalRepository.getCustomerByMobileNumber(mobileNumber);
  }

  async getAllRentals(): Promise<RentalWithCustomer[]> {
    return RentalRepository.getAllRentals();
  }

  async getRentalById(id: number): Promise<RentalWithCustomer | null> {
    return RentalRepository.getRentalById(id);
  }

  async getRentalLineItems(rentalId: number): Promise<RentalLineItemWithItem[]> {
    return RentalRepository.getRentalLineItems(rentalId);
  }

  async createRentalTransaction(input: CreateRentalTransactionInput): Promise<number> {
    return RentalRepository.createRentalTransaction(input);
  }
}
