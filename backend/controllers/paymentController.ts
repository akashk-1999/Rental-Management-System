import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authController';
import { PaymentService } from '../services/paymentService';
import { HttpError } from '../errors/HttpError';

/**
 * PaymentController manages payment-related HTTP endpoints (Phase 1: recording payments and
 * retrieving payment history only). It is kept extremely thin, containing only mapping of
 * request data, delegating all business logic to the injected PaymentService instance, and
 * returning standardized responses.
 */
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService
  ) {}

  /**
   * Retrieves a lightweight payment summary for every rental.
   */
  async getPaymentSummaries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summaries = await this.paymentService.getPaymentSummaries();

      res.status(200).json({
        success: true,
        data: summaries
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Retrieves a single rental's payment detail (amounts + full payment history) identified by
   * the :rentalId route param.
   */
  async getRentalPaymentDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rentalId = parseInt(req.params.rentalId, 10);

      const detail = await this.paymentService.getRentalPaymentDetail(rentalId);

      res.status(200).json({
        success: true,
        data: detail
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Records a payment from the request body and returns the updated payment detail DTO.
   * Attributes the payment to the authenticated user.
   */
  async createPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordedByUserId = req.user?.userId;
      if (!recordedByUserId) {
        throw new HttpError(401, 'Authentication required to record a payment.');
      }

      const { rentalId, paymentDate, amount, paymentType, paymentMode, notes } = req.body;

      const result = await this.paymentService.createPayment(
        { rentalId, paymentDate, amount, paymentType, paymentMode, notes },
        recordedByUserId
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      next(err);
    }
  }
}
