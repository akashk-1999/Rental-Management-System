import { Router } from 'express';
import { ReturnController } from '../controllers/returnController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the return router (Phase 1: receiving returned rental
 * items only). Implements Dependency Injection by accepting the ReturnController instance.
 *
 * @param returnController - The injected ReturnController instance.
 * @returns An Express Router configured with return routes.
 */
export function createReturnRouter(returnController: ReturnController): Router {
  const router = Router();

  /**
   * GET /returns/rentals
   * 1. JWT Authentication Middleware
   * 2. ReturnController.getReturnableRentals
   */
  router.get(
    '/returns/rentals',
    authenticateToken,
    returnController.getReturnableRentals.bind(returnController)
  );

  /**
   * GET /returns/rentals/:id
   * 1. JWT Authentication Middleware
   * 2. ReturnController.getRentalForReturn
   */
  router.get(
    '/returns/rentals/:id',
    authenticateToken,
    returnController.getRentalForReturn.bind(returnController)
  );

  /**
   * POST /returns
   * 1. JWT Authentication Middleware
   * 2. ReturnController.createReturn
   */
  router.post(
    '/returns',
    authenticateToken,
    returnController.createReturn.bind(returnController)
  );

  return router;
}
