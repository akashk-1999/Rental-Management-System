import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the customer router. Lookup-only — no CRUD routes
 * exist here; this exists solely to speed up rental creation with an existing customer's details.
 * Implements Dependency Injection by accepting the CustomerController instance.
 *
 * @param customerController - The injected CustomerController instance.
 * @returns An Express Router configured with the customer lookup route.
 */
export function createCustomerRouter(customerController: CustomerController): Router {
  const router = Router();

  /**
   * GET /customers/lookup?mobile=...
   * 1. JWT Authentication Middleware
   * 2. CustomerController.lookupByMobile
   */
  router.get(
    '/customers/lookup',
    authenticateToken,
    customerController.lookupByMobile.bind(customerController)
  );

  return router;
}
