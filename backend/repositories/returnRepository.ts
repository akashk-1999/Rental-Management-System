import mssql from 'mssql';
import { query, transaction } from '../config/db';
import logger from '../utils/logger';
import { RentalStatus } from '../types/rental';

export interface ReturnableRental {
  RentalId: number;
  RentalCode: string;
  CustomerName: string;
  MobileNumber: string;
  RentalStartDate: Date;
  ExpectedReturnDate: Date;
  Status: RentalStatus;
}

export interface RentalLineItemForReturn {
  RentalLineItemId: number;
  RentalId: number;
  ItemId: number;
  ItemName: string;
  QuantityRented: number;
  UnitPrice: number;
  QuantityAlreadyReturned: number;
}

export interface CreateReturnTransactionInput {
  rentalId: number;
  returnDate: Date;
  notes: string | null;
  recordedByUserId: number;
  returnedItems: Array<{ rentalLineItemId: number; itemId: number; itemName: string; quantityReturned: number }>;
  newRentalStatus: RentalStatus;
}

export class ReturnRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'ReturnRepositoryError';
  }
}

/**
 * Thrown when a returned quantity would exceed a rental line item's remaining (rented minus
 * already-returned) quantity, as re-verified under a row lock inside createReturnTransaction.
 * Kept distinct from ReturnRepositoryError so the error handler can map it to a 409 instead of
 * masking it as a generic database failure.
 */
export class ReturnQuantityExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReturnQuantityExceededError';
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

/**
 * ReturnRepository provides SQL Server direct operations for recording rental returns. Reads use
 * the shared connection pool; the multi-table return write uses a single SQL transaction so the
 * remaining-quantity re-check, ReturnEvents inserts, and Rentals.Status update commit or roll back
 * together. Items.TotalQuantity is never mutated here — it is the fixed, master owned quantity;
 * vw_ItemInventoryStatus derives CurrentlyRented/AvailableStock from RentalLineItems/ReturnEvents,
 * so incrementing TotalQuantity on return would double-credit the returned units.
 */
export class ReturnRepository {
  /**
   * Retrieves every rental that has not been fully returned (Status is Active or PartialReturn),
   * joined with its customer, ordered by soonest expected return first.
   *
   * SQL Query:
   * SELECT r.RentalId, r.RentalCode, c.CustomerName, c.MobileNumber,
   *        r.RentalStartDate, r.ExpectedReturnDate, r.Status
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.Status IN ('Active', 'PartialReturn') AND r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY r.ExpectedReturnDate ASC
   */
  static async getReturnableRentals(): Promise<ReturnableRental[]> {
    try {
      const rows = await query<ReturnableRental>(
        `SELECT r.RentalId, r.RentalCode, c.CustomerName, c.MobileNumber,
                r.RentalStartDate, r.ExpectedReturnDate, r.Status
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE r.Status IN ('Active', 'PartialReturn') AND r.DeleteStatus = 0 AND c.DeleteStatus = 0
         ORDER BY r.ExpectedReturnDate ASC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[ReturnRepository.getReturnableRentals] Database query failed: ${err.message}`);
      throw new ReturnRepositoryError(`Failed to retrieve returnable rentals: ${err.message}`, err);
    }
  }

  /**
   * Retrieves every line item for a rental together with the cumulative quantity already returned
   * across all prior ReturnEvents. RentalLineItems itself stores no running "quantity returned"
   * column, so the total is derived via a correlated subquery over ReturnEvents.
   *
   * SQL Query:
   * SELECT rli.RentalLineItemId, rli.RentalId, rli.ItemId, i.ItemName, rli.QuantityRented, rli.UnitPrice,
   *        ISNULL((SELECT SUM(re.QuantityReturned) FROM ReturnEvents re WHERE re.RentalLineItemId = rli.RentalLineItemId AND re.DeleteStatus = 0), 0) AS QuantityAlreadyReturned
   * FROM RentalLineItems rli
   * JOIN Items i ON i.ItemId = rli.ItemId
   * WHERE rli.RentalId = @RentalId AND rli.DeleteStatus = 0 AND i.DeleteStatus = 0
   * ORDER BY rli.RentalLineItemId ASC
   */
  static async getRentalLineItemsForReturn(rentalId: number): Promise<RentalLineItemForReturn[]> {
    try {
      const rows = await query<RentalLineItemForReturn>(
        `SELECT rli.RentalLineItemId, rli.RentalId, rli.ItemId, i.ItemName, rli.QuantityRented, rli.UnitPrice,
                ISNULL((SELECT SUM(re.QuantityReturned) FROM ReturnEvents re WHERE re.RentalLineItemId = rli.RentalLineItemId AND re.DeleteStatus = 0), 0) AS QuantityAlreadyReturned
         FROM RentalLineItems rli
         JOIN Items i ON i.ItemId = rli.ItemId
         WHERE rli.RentalId = @RentalId AND rli.DeleteStatus = 0 AND i.DeleteStatus = 0
         ORDER BY rli.RentalLineItemId ASC`,
        { RentalId: rentalId }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[ReturnRepository.getRentalLineItemsForReturn] Database query failed: ${err.message}`);
      throw new ReturnRepositoryError(`Failed to retrieve rental line items for return: ${err.message}`, err);
    }
  }

  /**
   * Atomically records a return: for each returned line item, re-verifies under a row lock that
   * the quantity being returned does not exceed what remains (rented minus already returned),
   * then inserts a ReturnEvents row; finally updates the parent Rental's Status. All statements
   * run within a single SQL transaction; any failure rolls back everything (see config/db.ts's
   * transaction() helper). Items.TotalQuantity is intentionally left untouched — see class doc.
   *
   * The remaining-quantity check duplicates the one ReturnService already performs before calling
   * this method, but that earlier check reads via the plain connection pool outside any
   * transaction/lock, so two concurrent return requests for the same line item could both pass it
   * and jointly over-return. Locking the RentalLineItems row here (UPDLOCK, HOLDLOCK) serializes
   * concurrent returns of the same line item and re-reads the true already-returned total after
   * acquiring the lock, closing that race.
   *
   * SQL Queries (in order, once per returned item, all within one transaction):
   * SELECT rli.QuantityRented,
   *        ISNULL((SELECT SUM(re.QuantityReturned) FROM ReturnEvents re WHERE re.RentalLineItemId = rli.RentalLineItemId AND re.DeleteStatus = 0), 0) AS QuantityAlreadyReturned
   * FROM RentalLineItems rli WITH (UPDLOCK, HOLDLOCK)
   * WHERE rli.RentalLineItemId = @RentalLineItemId AND rli.DeleteStatus = 0
   *
   * INSERT INTO ReturnEvents (RentalLineItemId, ReturnDate, QuantityReturned, Notes, RecordedByUserId)
   * OUTPUT INSERTED.ReturnEventId
   * VALUES (@RentalLineItemId, @ReturnDate, @QuantityReturned, @Notes, @RecordedByUserId)
   *
   * -- then once, after every line item is processed:
   * UPDATE Rentals
   * SET Status = @Status, UpdatedAt = SYSUTCDATETIME()
   * WHERE RentalId = @RentalId AND DeleteStatus = 0
   */
  static async createReturnTransaction(input: CreateReturnTransactionInput): Promise<void> {
    try {
      await transaction(async (tx) => {
        for (const item of input.returnedItems) {
          const lineItemResult = await txRequest(tx, {
            RentalLineItemId: item.rentalLineItemId
          }).query(
            `SELECT rli.QuantityRented,
                    ISNULL((SELECT SUM(re.QuantityReturned) FROM ReturnEvents re WHERE re.RentalLineItemId = rli.RentalLineItemId AND re.DeleteStatus = 0), 0) AS QuantityAlreadyReturned
             FROM RentalLineItems rli WITH (UPDLOCK, HOLDLOCK)
             WHERE rli.RentalLineItemId = @RentalLineItemId AND rli.DeleteStatus = 0`
          );

          const lineItemRow = lineItemResult.recordset[0];
          if (!lineItemRow) {
            throw new ReturnQuantityExceededError(
              `Rental line item ${item.rentalLineItemId} was not found.`
            );
          }

          const quantityRemaining = lineItemRow.QuantityRented - Number(lineItemRow.QuantityAlreadyReturned);
          if (item.quantityReturned > quantityRemaining) {
            throw new ReturnQuantityExceededError(
              `Quantity returned for '${item.itemName}' exceeds the remaining quantity of ${quantityRemaining}.`
            );
          }

          await txRequest(tx, {
            RentalLineItemId: item.rentalLineItemId,
            ReturnDate: input.returnDate,
            QuantityReturned: item.quantityReturned,
            Notes: input.notes,
            RecordedByUserId: input.recordedByUserId
          }).query(
            `INSERT INTO ReturnEvents (RentalLineItemId, ReturnDate, QuantityReturned, Notes, RecordedByUserId)
             OUTPUT INSERTED.ReturnEventId
             VALUES (@RentalLineItemId, @ReturnDate, @QuantityReturned, @Notes, @RecordedByUserId)`
          );
        }

        await txRequest(tx, {
          RentalId: input.rentalId,
          Status: input.newRentalStatus
        }).query(
          `UPDATE Rentals
           SET Status = @Status, UpdatedAt = SYSUTCDATETIME()
           WHERE RentalId = @RentalId AND DeleteStatus = 0`
        );
      });
    } catch (err: any) {
      if (err instanceof ReturnQuantityExceededError) {
        throw err;
      }
      logger.error(`[ReturnRepository.createReturnTransaction] Transaction failed: ${err.message}`);
      throw new ReturnRepositoryError(`Failed to record return: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getReturnableRentals(): Promise<ReturnableRental[]> {
    return ReturnRepository.getReturnableRentals();
  }

  async getRentalLineItemsForReturn(rentalId: number): Promise<RentalLineItemForReturn[]> {
    return ReturnRepository.getRentalLineItemsForReturn(rentalId);
  }

  async createReturnTransaction(input: CreateReturnTransactionInput): Promise<void> {
    return ReturnRepository.createReturnTransaction(input);
  }
}
