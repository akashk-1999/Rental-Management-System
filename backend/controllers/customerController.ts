import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';

/**
 * CustomerController exposes the lightweight customer lookup used by the Rentals creation form.
 * This is NOT a Customer Management controller — no create/update/delete/list endpoints exist here.
 * It is kept extremely thin, containing only mapping of request data, delegating all business
 * logic to the injected CustomerService instance, and returning standardized responses.
 */
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService
  ) {}

  /**
   * Looks up a customer by mobile number (?mobile=...). Always returns 200 — a not-found result
   * is represented as { found: false } in the response body, not a 404.
   */
  async lookupByMobile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const mobile = typeof req.query.mobile === 'string' ? req.query.mobile : undefined;

      const result = await this.customerService.lookupByMobile(mobile);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (err: any) {
      next(err);
    }
  }
}
