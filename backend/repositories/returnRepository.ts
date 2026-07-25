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
  returnedItems: Array<{ rentalLineItemId: number; itemId: number; quantityReturned: number }>;
  newRentalStatus: RentalStatus;
}

export class ReturnRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'ReturnRepositoryError';
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
 * ReturnEvents inserts, Items.TotalQuantity increments, and Rentals.Status update commit or roll
 * back together.
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
   * WHERE r.Status IN ('Active', 'PartialReturn')
   * ORDER BY r.ExpectedReturnDate ASC
   */
  static async getReturnableRentals(): Promise<ReturnableRental[]> {
    try {
      const rows = await query<ReturnableRental>(
        `SELECT r.RentalId, r.RentalCode, c.CustomerName, c.MobileNumber,
                r.RentalStartDate, r.ExpectedReturnDate, r.Status
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE r.Status IN ('Active', 'PartialReturn')
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
   *        ISNULL((SELECT SUM(re.QuantityReturned) FROM ReturnEvents re WHERE re.RentalLineItemId = rli.RentalLineItemId), 0) AS QuantityAlreadyReturned
   * FROM RentalLineItems rli
   * JOIN Items i ON i.ItemId = rli.ItemId
   * WHERE rli.RentalId = @RentalId
   * ORDER BY rli.RentalLineItemId ASC
   */
  static async getRentalLineItemsForReturn(rentalId: number): Promise<RentalLineItemForReturn[]> {
    try {
      const rows = await query<RentalLineItemForReturn>(
        `SELECT rli.RentalLineItemId, rli.RentalId, rli.ItemId, i.ItemName, rli.QuantityRented, rli.UnitPrice,
                ISNULL((SELECT SUM(re.QuantityReturned) FROM ReturnEvents re WHERE re.RentalLineItemId = rli.RentalLineItemId), 0) AS QuantityAlreadyReturned
         FROM RentalLineItems rli
         JOIN Items i ON i.ItemId = rli.ItemId
         WHERE rli.RentalId = @RentalId
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
   * Atomically records a return: inserts one ReturnEvents row per returned line item, increases
   * each affected Item's TotalQuantity by the quantity returned (Phase 1 inventory handling — no
   * use of vw_ItemInventoryStatus yet), and updates the parent Rental's Status. All statements run
   * within a single SQL transaction; any failure rolls back everything (see config/db.ts's
   * transaction() helper).
   *
   * SQL Queries (in order, once per returned item, all within one transaction):
   * INSERT INTO ReturnEvents (RentalLineItemId, ReturnDate, QuantityReturned, Notes, RecordedByUserId)
   * OUTPUT INSERTED.ReturnEventId
   * VALUES (@RentalLineItemId, @ReturnDate, @QuantityReturned, @Notes, @RecordedByUserId)
   *
   * UPDATE Items
   * SET TotalQuantity = TotalQuantity + @QuantityReturned, UpdatedAt = SYSUTCDATETIME()
   * WHERE ItemId = @ItemId
   *
   * -- then once, after every line item is processed:
   * UPDATE Rentals
   * SET Status = @Status, UpdatedAt = SYSUTCDATETIME()
   * WHERE RentalId = @RentalId
   */
  static async createReturnTransaction(input: CreateReturnTransactionInput): Promise<void> {
    try {
      await transaction(async (tx) => {
        for (const item of input.returnedItems) {
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

          await txRequest(tx, {
            ItemId: item.itemId,
            QuantityReturned: item.quantityReturned
          }).query(
            `UPDATE Items
             SET TotalQuantity = TotalQuantity + @QuantityReturned, UpdatedAt = SYSUTCDATETIME()
             WHERE ItemId = @ItemId`
          );
        }

        await txRequest(tx, {
          RentalId: input.rentalId,
          Status: input.newRentalStatus
        }).query(
          `UPDATE Rentals
           SET Status = @Status, UpdatedAt = SYSUTCDATETIME()
           WHERE RentalId = @RentalId`
        );
      });
    } catch (err: any) {
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
