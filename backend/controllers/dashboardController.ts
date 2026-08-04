import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';

/**
 * DashboardController manages the read-only business overview endpoints. It is kept extremely
 * thin, delegating all aggregation logic to the injected DashboardService instance and returning
 * standardized responses.
 */
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService
  ) {}

  /**
   * Retrieves the full dashboard overview (period-scoped metrics, priority rental lists, recent
   * rentals, and low inventory) for the ?period= query param (day|week|month|year, defaults to
   * 'month' if omitted or invalid).
   */
  async getDashboardOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await this.dashboardService.getDashboardOverview(req.query.period);

      res.status(200).json({
        success: true,
        data: overview
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Retrieves the on-demand rental drill-down list for a clickable metric card, selected via the
   * required ?filter= query param and the optional ?period= query param (only relevant to the
   * 'new' filter).
   */
  async getRentalsByFilter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rentals = await this.dashboardService.getRentalsByFilter(req.query.filter, req.query.period);

      res.status(200).json({
        success: true,
        data: rentals
      });
    } catch (err: any) {
      next(err);
    }
  }
}
