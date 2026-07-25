import { Router } from 'express';
import { RentalController } from '../controllers/rentalController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the rental router (Phase 1: Rental Creation only).
 * Implements Dependency Injection by accepting the RentalController instance.
 *
 * @param rentalController - The injected RentalController instance.
 * @returns An Express Router configured with rental routes.
 */
export function createRentalRouter(rentalController: RentalController): Router {
  const router = Router();

  /**
   * GET /rentals
   * 1. JWT Authentication Middleware
   * 2. RentalController.getAllRentals
   */
  router.get(
    '/rentals',
    authenticateToken,
    rentalController.getAllRentals.bind(rentalController)
  );

  /**
   * GET /rentals/:id
   * 1. JWT Authentication Middleware
   * 2. RentalController.getRentalById
   */
  router.get(
    '/rentals/:id',
    authenticateToken,
    rentalController.getRentalById.bind(rentalController)
  );

  /**
   * POST /rentals
   * 1. JWT Authentication Middleware
   * 2. RentalController.createRental
   */
  router.post(
    '/rentals',
    authenticateToken,
    rentalController.createRental.bind(rentalController)
  );

  return router;
}
