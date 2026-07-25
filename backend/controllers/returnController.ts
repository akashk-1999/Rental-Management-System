import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authController';
import { ReturnService } from '../services/returnService';
import { HttpError } from '../errors/HttpError';

/**
 * ReturnController manages return-related HTTP endpoints (Phase 1: receiving returned rental
 * items only). It is kept extremely thin, containing only mapping of request data, delegating
 * all business logic to the injected ReturnService instance, and returning standardized responses.
 */
export class ReturnController {
  constructor(
    private readonly returnService: ReturnService
  ) {}

  /**
   * Retrieves lightweight summaries of every rental that has not been fully returned.
   */
  async getReturnableRentals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rentals = await this.returnService.getReturnableRentals();

      res.status(200).json({
        success: true,
        data: rentals
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Retrieves a single rental (with full line item return detail) identified by the :id route param.
   */
  async getRentalForReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rentalId = parseInt(req.params.id, 10);

      const rental = await this.returnService.getRentalForReturn(rentalId);

      res.status(200).json({
        success: true,
        data: rental
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Records a return from the request body (rental, return date, notes, and returned line items)
   * and returns the updated rental status DTO. Attributes the return to the authenticated user.
   */
  async createReturn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const recordedByUserId = req.user?.userId;
      if (!recordedByUserId) {
        throw new HttpError(401, 'Authentication required to record a return.');
      }

      const { rentalId, returnDate, notes, returnedItems } = req.body;

      const result = await this.returnService.createReturn(
        { rentalId, returnDate, notes, returnedItems },
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
