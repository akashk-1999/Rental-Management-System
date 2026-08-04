import logger from '../utils/logger';
import { PaymentRepository, PaymentWithRecordedBy } from '../repositories/paymentRepository';
import { RentalRepository } from '../repositories/rentalRepository';
import { HttpError } from '../errors/HttpError';
import { RentalPaymentStatus } from '../types/rental';
import { CreatePaymentInput, PaymentType, SafePaymentRecord, SafePaymentRentalDetail, SafePaymentSummary } from '../types/payment';

const ALLOWED_PAYMENT_TYPES: PaymentType[] = ['Advance', 'Partial', 'Final', 'SecurityDeposit', 'Refund'];

/**
 * PaymentService handles business logic for recording rental payments and retrieving payment
 * summaries/history (Phase 1: payment recording and history only — no refunds, deposit
 * settlement, late fees, damage charges, invoices, or reporting).
 *
 * It is framework-independent and relies on constructor injection of PaymentRepository and
 * RentalRepository (reused for rental existence/amount checks), consistent with the returns module.
 */
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly rentalRepository: RentalRepository
  ) {}

  private mapToSafePaymentRecord(payment: PaymentWithRecordedBy): SafePaymentRecord {
    return {
      paymentId: payment.PaymentId,
      paymentDate: payment.PaymentDate.toISOString(),
      amount: Number(payment.Amount),
      paymentType: payment.PaymentType,
      paymentMode: payment.PaymentMode,
      notes: payment.Notes,
      recordedByName: payment.RecordedByName
    };
  }

  /**
   * A rental's payment status is derived from what it still owes toward its rental fee
   * (TotalAmount), not its security deposit — Pending with nothing paid, Partial while some of
   * the fee remains outstanding, Paid once the remaining balance reaches zero.
   */
  private computePaymentStatus(amountAlreadyPaid: number, remainingBalance: number): RentalPaymentStatus {
    if (remainingBalance <= 0) return 'Paid';
    if (amountAlreadyPaid > 0) return 'Partial';
    return 'Pending';
  }

  /**
   * Retrieves a lightweight payment summary for every rental, computing Amount Already Paid
   * (the rental's initial AdvancePaid plus everything recorded via the Payments table) and
   * Remaining Balance against TotalAmount.
   */
  async getPaymentSummaries(): Promise<SafePaymentSummary[]> {
    const rows = await this.paymentRepository.getPaymentSummaries();
    logger.info(`[PaymentService.getPaymentSummaries] Retrieved ${rows.length} payment summary row(s).`);

    return rows.map((row) => {
      const rentalAmount = Number(row.TotalAmount);
      const advancePaid = Number(row.AdvancePaid);
      const securityDepositPaid = Number(row.SecurityDepositPaid);
      const amountAlreadyPaid = advancePaid + Number(row.AmountPaidViaPayments);
      const remainingBalance = rentalAmount - amountAlreadyPaid;

      return {
        rentalId: row.RentalId,
        rentalCode: row.RentalCode,
        customerName: row.CustomerName,
        mobileNumber: row.MobileNumber,
        rentalAmount,
        advancePaid,
        securityDepositPaid,
        amountAlreadyPaid,
        remainingBalance,
        paymentStatus: row.PaymentStatus
      };
    });
  }

  /**
   * Retrieves a single rental's payment detail — its amounts plus the full history of payments
   * recorded against it, throwing a 404 HttpError if the rental does not exist.
   */
  async getRentalPaymentDetail(rentalId: number): Promise<SafePaymentRentalDetail> {
    const rental = await this.rentalRepository.getRentalById(rentalId);
    if (!rental) {
      logger.warn(`[PaymentService.getRentalPaymentDetail] Rental with ID ${rentalId} not found.`);
      throw new HttpError(404, 'Rental not found');
    }

    const payments = await this.paymentRepository.getPaymentsByRentalId(rentalId);
    const paymentsTotal = payments.reduce((sum, payment) => sum + Number(payment.Amount), 0);

    const rentalAmount = Number(rental.TotalAmount);
    const advancePaid = Number(rental.AdvancePaid);
    const securityDepositPaid = Number(rental.SecurityDepositPaid);
    const amountAlreadyPaid = advancePaid + paymentsTotal;
    const remainingBalance = rentalAmount - amountAlreadyPaid;

    return {
      rentalId: rental.RentalId,
      rentalCode: rental.RentalCode,
      customerName: rental.CustomerName,
      mobileNumber: rental.MobileNumber,
      rentalAmount,
      advancePaid,
      securityDepositPaid,
      amountAlreadyPaid,
      remainingBalance,
      paymentStatus: rental.PaymentStatus,
      payments: payments.map((payment) => this.mapToSafePaymentRecord(payment))
    };
  }

  /**
   * Validates and records a payment against a rental, then atomically persists the Payments row
   * and recomputes the rental's PaymentStatus from the new Amount Already Paid / Remaining Balance.
   * The remaining-balance check here is re-verified under a row lock inside
   * PaymentRepository.createPaymentTransaction, since this read happens outside any transaction
   * and is otherwise racy under concurrent requests.
   */
  async createPayment(input: CreatePaymentInput, recordedByUserId: number): Promise<SafePaymentRentalDetail> {
    const rentalId = Number(input.rentalId);
    if (!input.rentalId || Number.isNaN(rentalId)) {
      throw new HttpError(400, 'A valid rental must be specified');
    }

    if (!input.paymentDate) {
      logger.warn('[PaymentService.createPayment] Failed: Payment date is required.');
      throw new HttpError(400, 'Payment date is required');
    }
    const paymentDate = new Date(input.paymentDate);
    if (Number.isNaN(paymentDate.getTime())) {
      throw new HttpError(400, 'Payment date is invalid');
    }

    const amount = Number(input.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      logger.warn('[PaymentService.createPayment] Failed: Amount must be greater than zero.');
      throw new HttpError(400, 'Amount must be greater than zero');
    }

    if (!input.paymentType || !ALLOWED_PAYMENT_TYPES.includes(input.paymentType)) {
      logger.warn('[PaymentService.createPayment] Failed: Payment type is required or invalid.');
      throw new HttpError(400, 'A valid payment type is required');
    }

    const paymentMode = input.paymentMode?.trim();
    if (!paymentMode) {
      logger.warn('[PaymentService.createPayment] Failed: Payment mode is required.');
      throw new HttpError(400, 'Payment mode is required');
    }

    const rental = await this.rentalRepository.getRentalById(rentalId);
    if (!rental) {
      logger.warn(`[PaymentService.createPayment] Failed: Rental with ID ${rentalId} not found.`);
      throw new HttpError(404, 'Rental not found');
    }

    const existingPayments = await this.paymentRepository.getPaymentsByRentalId(rentalId);
    const paymentsTotal = existingPayments.reduce((sum, payment) => sum + Number(payment.Amount), 0);

    const rentalAmount = Number(rental.TotalAmount);
    const advancePaid = Number(rental.AdvancePaid);
    const amountAlreadyPaid = advancePaid + paymentsTotal;
    const remainingBalance = rentalAmount - amountAlreadyPaid;

    if (amount > remainingBalance) {
      logger.warn(
        `[PaymentService.createPayment] Failed: Amount ${amount} exceeds remaining balance ${remainingBalance} for rental ${rentalId}.`
      );
      throw new HttpError(400, 'Payment amount exceeds the remaining balance');
    }

    const newAmountAlreadyPaid = amountAlreadyPaid + amount;
    const newRemainingBalance = rentalAmount - newAmountAlreadyPaid;
    const newPaymentStatus = this.computePaymentStatus(newAmountAlreadyPaid, newRemainingBalance);

    await this.paymentRepository.createPaymentTransaction({
      rentalId,
      paymentDate,
      amount,
      paymentType: input.paymentType,
      paymentMode,
      notes: input.notes?.trim() || null,
      recordedByUserId,
      newPaymentStatus
    });

    logger.info(`[PaymentService.createPayment] Recorded payment of ${amount} for rental ${rentalId}; new status '${newPaymentStatus}'.`);

    return this.getRentalPaymentDetail(rentalId);
  }
}
