import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the dashboard router (read-only business overview).
 * Implements Dependency Injection by accepting the DashboardController instance.
 *
 * @param dashboardController - The injected DashboardController instance.
 * @returns An Express Router configured with dashboard routes.
 */
export function createDashboardRouter(dashboardController: DashboardController): Router {
  const router = Router();

  /**
   * GET /dashboard
   * 1. JWT Authentication Middleware
   * 2. DashboardController.getDashboardOverview
   */
  router.get(
    '/dashboard',
    authenticateToken,
    dashboardController.getDashboardOverview.bind(dashboardController)
  );

  /**
   * GET /dashboard/rentals
   * 1. JWT Authentication Middleware
   * 2. DashboardController.getRentalsByFilter
   */
  router.get(
    '/dashboard/rentals',
    authenticateToken,
    dashboardController.getRentalsByFilter.bind(dashboardController)
  );

  return router;
}
