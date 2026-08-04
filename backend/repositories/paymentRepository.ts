import mssql from 'mssql';
import { query, transaction } from '../config/db';
import logger from '../utils/logger';
import { Payment, PaymentType } from '../types/payment';
import { RentalPaymentStatus } from '../types/rental';

export interface PaymentSummaryRow {
  RentalId: number;
  RentalCode: string;
  CustomerName: string;
  MobileNumber: string;
  TotalAmount: number;
  AdvancePaid: number;
  SecurityDepositPaid: number;
  PaymentStatus: RentalPaymentStatus;
  AmountPaidViaPayments: number;
}

export interface PaymentWithRecordedBy extends Payment {
  RecordedByName: string;
}

export interface CreatePaymentTransactionInput {
  rentalId: number;
  paymentDate: Date;
  amount: number;
  paymentType: PaymentType;
  paymentMode: string;
  notes: string | null;
  recordedByUserId: number;
  newPaymentStatus: RentalPaymentStatus;
}

export class PaymentRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'PaymentRepositoryError';
  }
}

/**
 * Thrown when a payment amount would exceed a rental's remaining balance, as re-verified under a
 * row lock inside createPaymentTransaction. Kept distinct from PaymentRepositoryError so the error
 * handler can map it to a 409 instead of masking it as a generic database failure.
 */
export class PaymentAmountExceedsBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentAmountExceedsBalanceError';
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
 * PaymentRepository provides SQL Server direct operations for recording rental payments and
 * retrieving payment summaries/history. Reads use the shared connection pool; the payment write
 * uses a single SQL transaction so the Payments insert and Rentals.PaymentStatus update commit or
 * roll back together.
 */
export class PaymentRepository {
  /**
   * Retrieves every rental joined with its customer and the running total paid via the Payments
   * table, used to compute Amount Already Paid / Remaining Balance without re-fetching every
   * individual payment row.
   *
   * SQL Query:
   * SELECT r.RentalId, r.RentalCode, c.CustomerName, c.MobileNumber, r.TotalAmount,
   *        r.AdvancePaid, r.SecurityDepositPaid, r.PaymentStatus,
   *        ISNULL((SELECT SUM(p.Amount) FROM Payments p WHERE p.RentalId = r.RentalId AND p.DeleteStatus = 0), 0) AS AmountPaidViaPayments
   * FROM Rentals r
   * JOIN Customers c ON c.CustomerId = r.CustomerId
   * WHERE r.DeleteStatus = 0 AND c.DeleteStatus = 0
   * ORDER BY r.RentalId DESC
   */
  static async getPaymentSummaries(): Promise<PaymentSummaryRow[]> {
    try {
      const rows = await query<PaymentSummaryRow>(
        `SELECT r.RentalId, r.RentalCode, c.CustomerName, c.MobileNumber, r.TotalAmount,
                r.AdvancePaid, r.SecurityDepositPaid, r.PaymentStatus,
                ISNULL((SELECT SUM(p.Amount) FROM Payments p WHERE p.RentalId = r.RentalId AND p.DeleteStatus = 0), 0) AS AmountPaidViaPayments
         FROM Rentals r
         JOIN Customers c ON c.CustomerId = r.CustomerId
         WHERE r.DeleteStatus = 0 AND c.DeleteStatus = 0
         ORDER BY r.RentalId DESC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[PaymentRepository.getPaymentSummaries] Database query failed: ${err.message}`);
      throw new PaymentRepositoryError(`Failed to retrieve payment summaries: ${err.message}`, err);
    }
  }

  /**
   * Retrieves every payment recorded against a rental, joined with the recording user's full
   * name, newest first.
   *
   * SQL Query:
   * SELECT p.PaymentId, p.RentalId, p.PaymentDate, p.Amount, p.PaymentType, p.PaymentMode,
   *        p.Notes, p.RecordedByUserId, u.FullName AS RecordedByName, p.CreatedAt
   * FROM Payments p
   * JOIN Users u ON u.UserId = p.RecordedByUserId
   * WHERE p.RentalId = @RentalId AND p.DeleteStatus = 0 AND u.DeleteStatus = 0
   * ORDER BY p.PaymentDate DESC, p.CreatedAt DESC
   */
  static async getPaymentsByRentalId(rentalId: number): Promise<PaymentWithRecordedBy[]> {
    try {
      const rows = await query<PaymentWithRecordedBy>(
        `SELECT p.PaymentId, p.RentalId, p.PaymentDate, p.Amount, p.PaymentType, p.PaymentMode,
                p.Notes, p.RecordedByUserId, u.FullName AS RecordedByName, p.CreatedAt
         FROM Payments p
         JOIN Users u ON u.UserId = p.RecordedByUserId
         WHERE p.RentalId = @RentalId AND p.DeleteStatus = 0 AND u.DeleteStatus = 0
         ORDER BY p.PaymentDate DESC, p.CreatedAt DESC`,
        { RentalId: rentalId }
      );
      return rows;
    } catch (err: any) {
      logger.error(`[PaymentRepository.getPaymentsByRentalId] Database query failed: ${err.message}`);
      throw new PaymentRepositoryError(`Failed to retrieve payments for rental: ${err.message}`, err);
    }
  }

  /**
   * Atomically records a payment: re-verifies under a row lock that the amount does not exceed
   * the rental's remaining balance, then inserts the Payments row and updates the parent Rental's
   * PaymentStatus. All statements run within a single SQL transaction; any failure rolls back
   * everything (see config/db.ts's transaction() helper).
   *
   * The remaining-balance check duplicates the one PaymentService already performs before calling
   * this method, but that earlier check reads via the plain connection pool outside any
   * transaction/lock, so two concurrent payment requests for the same rental could both pass it
   * and jointly overpay. Locking the Rentals row here (UPDLOCK, HOLDLOCK) serializes concurrent
   * payments against the same rental and re-reads the true amount-already-paid total after
   * acquiring the lock, closing that race.
   *
   * SQL Queries (in order, within one transaction):
   * SELECT r.TotalAmount, r.AdvancePaid,
   *        ISNULL((SELECT SUM(p.Amount) FROM Payments p WHERE p.RentalId = r.RentalId AND p.DeleteStatus = 0), 0) AS PaymentsTotal
   * FROM Rentals r WITH (UPDLOCK, HOLDLOCK)
   * WHERE r.RentalId = @RentalId AND r.DeleteStatus = 0
   *
   * INSERT INTO Payments (RentalId, PaymentDate, Amount, PaymentType, PaymentMode, Notes, RecordedByUserId)
   * OUTPUT INSERTED.PaymentId
   * VALUES (@RentalId, @PaymentDate, @Amount, @PaymentType, @PaymentMode, @Notes, @RecordedByUserId)
   *
   * UPDATE Rentals
   * SET PaymentStatus = @PaymentStatus, UpdatedAt = SYSUTCDATETIME()
   * WHERE RentalId = @RentalId AND DeleteStatus = 0
   */
  static async createPaymentTransaction(input: CreatePaymentTransactionInput): Promise<number> {
    try {
      return await transaction(async (tx) => {
        const rentalResult = await txRequest(tx, {
          RentalId: input.rentalId
        }).query<{ TotalAmount: number; AdvancePaid: number; PaymentsTotal: number }>(
          `SELECT r.TotalAmount, r.AdvancePaid,
                  ISNULL((SELECT SUM(p.Amount) FROM Payments p WHERE p.RentalId = r.RentalId AND p.DeleteStatus = 0), 0) AS PaymentsTotal
           FROM Rentals r WITH (UPDLOCK, HOLDLOCK)
           WHERE r.RentalId = @RentalId AND r.DeleteStatus = 0`
        );

        const rentalRow = rentalResult.recordset[0];
        if (!rentalRow) {
          throw new PaymentAmountExceedsBalanceError(`Rental ${input.rentalId} was not found.`);
        }

        const remainingBalance =
          Number(rentalRow.TotalAmount) - (Number(rentalRow.AdvancePaid) + Number(rentalRow.PaymentsTotal));
        if (input.amount > remainingBalance) {
          throw new PaymentAmountExceedsBalanceError(
            `Payment amount exceeds the remaining balance of ${remainingBalance}.`
          );
        }

        const paymentResult = await txRequest(tx, {
          RentalId: input.rentalId,
          PaymentDate: input.paymentDate,
          Amount: input.amount,
          PaymentType: input.paymentType,
          PaymentMode: input.paymentMode,
          Notes: input.notes,
          RecordedByUserId: input.recordedByUserId
        }).query<{ PaymentId: number }>(
          `INSERT INTO Payments (RentalId, PaymentDate, Amount, PaymentType, PaymentMode, Notes, RecordedByUserId)
           OUTPUT INSERTED.PaymentId
           VALUES (@RentalId, @PaymentDate, @Amount, @PaymentType, @PaymentMode, @Notes, @RecordedByUserId)`
        );

        await txRequest(tx, {
          RentalId: input.rentalId,
          PaymentStatus: input.newPaymentStatus
        }).query(
          `UPDATE Rentals
           SET PaymentStatus = @PaymentStatus, UpdatedAt = SYSUTCDATETIME()
           WHERE RentalId = @RentalId AND DeleteStatus = 0`
        );

        return paymentResult.recordset[0].PaymentId;
      });
    } catch (err: any) {
      if (err instanceof PaymentAmountExceedsBalanceError) {
        throw err;
      }
      logger.error(`[PaymentRepository.createPaymentTransaction] Transaction failed: ${err.message}`);
      throw new PaymentRepositoryError(`Failed to record payment: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getPaymentSummaries(): Promise<PaymentSummaryRow[]> {
    return PaymentRepository.getPaymentSummaries();
  }

  async getPaymentsByRentalId(rentalId: number): Promise<PaymentWithRecordedBy[]> {
    return PaymentRepository.getPaymentsByRentalId(rentalId);
  }

  async createPaymentTransaction(input: CreatePaymentTransactionInput): Promise<number> {
    return PaymentRepository.createPaymentTransaction(input);
  }
}
