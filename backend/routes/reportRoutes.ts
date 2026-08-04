import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the reports router (read-only, filterable reports).
 * Implements Dependency Injection by accepting the ReportController instance.
 *
 * @param reportController - The injected ReportController instance.
 * @returns An Express Router configured with report routes.
 */
export function createReportRouter(reportController: ReportController): Router {
  const router = Router();

  /**
   * GET /reports/rentals
   * 1. JWT Authentication Middleware
   * 2. ReportController.getRentalReport
   */
  router.get(
    '/reports/rentals',
    authenticateToken,
    reportController.getRentalReport.bind(reportController)
  );

  /**
   * GET /reports/payments
   * 1. JWT Authentication Middleware
   * 2. ReportController.getPaymentReport
   */
  router.get(
    '/reports/payments',
    authenticateToken,
    reportController.getPaymentReport.bind(reportController)
  );

  /**
   * GET /reports/returns
   * 1. JWT Authentication Middleware
   * 2. ReportController.getReturnReport
   */
  router.get(
    '/reports/returns',
    authenticateToken,
    reportController.getReturnReport.bind(reportController)
  );

  /**
   * GET /reports/inventory
   * 1. JWT Authentication Middleware
   * 2. ReportController.getInventoryReport
   */
  router.get(
    '/reports/inventory',
    authenticateToken,
    reportController.getInventoryReport.bind(reportController)
  );

  /**
   * GET /reports/customer-history/:customerId
   * 1. JWT Authentication Middleware
   * 2. ReportController.getCustomerHistory
   */
  router.get(
    '/reports/customer-history/:customerId',
    authenticateToken,
    reportController.getCustomerHistory.bind(reportController)
  );

  return router;
}
