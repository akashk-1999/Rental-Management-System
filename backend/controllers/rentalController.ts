import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authController';
import { RentalService } from '../services/rentalService';
import { HttpError } from '../errors/HttpError';

/**
 * RentalController manages rental-related HTTP endpoints (Phase 1: Rental Creation only).
 * It is kept extremely thin, containing only mapping of request data, delegating all business
 * logic to the injected RentalService instance, and returning standardized responses.
 */
export class RentalController {
  constructor(
    private readonly rentalService: RentalService
  ) {}

  /**
   * Retrieves all rentals (lightweight summaries) as client-facing DTOs.
   */
  async getAllRentals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rentals = await this.rentalService.getAllRentals();

      res.status(200).json({
        success: true,
        data: rentals
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Retrieves a single rental (with full line item detail) identified by the :id route param.
   */
  async getRentalById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rentalId = parseInt(req.params.id, 10);

      const rental = await this.rentalService.getRentalById(rentalId);

      res.status(200).json({
        success: true,
        data: rental
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Creates a new rental from the request body (customer, rental, and line item information)
   * and returns the created DTO. Attributes the rental to the authenticated user.
   */
  async createRental(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdByUserId = req.user?.userId;
      if (!createdByUserId) {
        throw new HttpError(401, 'Authentication required to create a rental.');
      }

      const { customer, rentalStartDate, expectedReturnDate, advancePaid, securityDepositPaid, notes, lineItems } =
        req.body;

      const createdRental = await this.rentalService.createRental(
        { customer, rentalStartDate, expectedReturnDate, advancePaid, securityDepositPaid, notes, lineItems },
        createdByUserId
      );

      res.status(201).json({
        success: true,
        data: createdRental
      });
    } catch (err: any) {
      next(err);
    }
  }
}
