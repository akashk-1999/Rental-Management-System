import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the payment router (Phase 1: payment recording and
 * history only). Implements Dependency Injection by accepting the PaymentController instance.
 *
 * @param paymentController - The injected PaymentController instance.
 * @returns An Express Router configured with payment routes.
 */
export function createPaymentRouter(paymentController: PaymentController): Router {
  const router = Router();

  /**
   * GET /payments
   * 1. JWT Authentication Middleware
   * 2. PaymentController.getPaymentSummaries
   */
  router.get(
    '/payments',
    authenticateToken,
    paymentController.getPaymentSummaries.bind(paymentController)
  );

  /**
   * GET /payments/:rentalId
   * 1. JWT Authentication Middleware
   * 2. PaymentController.getRentalPaymentDetail
   */
  router.get(
    '/payments/:rentalId',
    authenticateToken,
    paymentController.getRentalPaymentDetail.bind(paymentController)
  );

  /**
   * POST /payments
   * 1. JWT Authentication Middleware
   * 2. PaymentController.createPayment
   */
  router.post(
    '/payments',
    authenticateToken,
    paymentController.createPayment.bind(paymentController)
  );

  return router;
}
