import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reportService';

/**
 * ReportController manages the read-only, filterable report endpoints. It is kept extremely
 * thin, containing only mapping of request query/route params, delegating all filtering and
 * aggregation logic to the injected ReportService instance, and returning standardized responses.
 */
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /** GET /reports/rentals?startDate=&endDate=&status=&customer= */
  async getRentalReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, status, customer } = req.query;

      const data = await this.reportService.getRentalReport({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        status: status as any,
        customer: customer as string | undefined
      });

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      next(err);
    }
  }

  /** GET /reports/payments?startDate=&endDate=&paymentMode=&paymentType=&customer= */
  async getPaymentReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, paymentMode, paymentType, customer } = req.query;

      const data = await this.reportService.getPaymentReport({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        paymentMode: paymentMode as string | undefined,
        paymentType: paymentType as any,
        customer: customer as string | undefined
      });

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      next(err);
    }
  }

  /** GET /reports/returns?startDate=&endDate=&customer=&item= */
  async getReturnReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, customer, item } = req.query;

      const data = await this.reportService.getReturnReport({
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        customer: customer as string | undefined,
        item: item as string | undefined
      });

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      next(err);
    }
  }

  /** GET /reports/inventory?categoryId=&status= */
  async getInventoryReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId, status } = req.query;

      const data = await this.reportService.getInventoryReport({
        categoryId: categoryId as string | undefined,
        status: status as any
      });

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      next(err);
    }
  }

  /** GET /reports/customer-history/:customerId?startDate=&endDate=&status= */
  async getCustomerHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, status } = req.query;

      const data = await this.reportService.getCustomerHistory(req.params.customerId, {
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
        status: status as any
      });

      res.status(200).json({ success: true, data });
    } catch (err: any) {
      next(err);
    }
  }
}
