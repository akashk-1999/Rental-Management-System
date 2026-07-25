import { Request, Response, NextFunction } from 'express';
import { ItemService } from '../services/itemService';

/**
 * ItemController manages item-master-related HTTP endpoints.
 * It is kept extremely thin, containing only mapping of request data,
 * delegating all business logic to the injected ItemService instance,
 * and returning standardized responses.
 */
export class ItemController {
  constructor(
    private readonly itemService: ItemService
  ) {}

  /**
   * Retrieves all items (active and inactive) as client-facing DTOs.
   */
  async getAllItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await this.itemService.getAllItems();

      res.status(200).json({
        success: true,
        data: items
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Retrieves a single item identified by the :id route param.
   */
  async getItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.id, 10);

      const item = await this.itemService.getItemById(itemId);

      res.status(200).json({
        success: true,
        data: item
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Creates a new item from the request body and returns the created DTO.
   */
  async createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        itemName,
        categoryId,
        itemCode,
        unitType,
        totalQuantity,
        rentalPrice,
        securityDeposit,
        description,
        imageUrl
      } = req.body;

      const createdItem = await this.itemService.createItem({
        itemName,
        categoryId,
        itemCode,
        unitType,
        totalQuantity,
        rentalPrice,
        securityDeposit,
        description,
        imageUrl
      });

      res.status(201).json({
        success: true,
        data: createdItem
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Updates an existing item identified by the :id route param and returns the updated DTO.
   */
  async updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.id, 10);
      const {
        itemName,
        categoryId,
        itemCode,
        unitType,
        totalQuantity,
        rentalPrice,
        securityDeposit,
        description,
        imageUrl
      } = req.body;

      const updatedItem = await this.itemService.updateItem(itemId, {
        itemName,
        categoryId,
        itemCode,
        unitType,
        totalQuantity,
        rentalPrice,
        securityDeposit,
        description,
        imageUrl
      });

      res.status(200).json({
        success: true,
        data: updatedItem
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Activates or deactivates the item identified by the :id route param.
   * Physical delete is never performed on items.
   */
  async updateItemStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const itemId = parseInt(req.params.id, 10);
      const { status } = req.body;

      const updatedItem = await this.itemService.updateItemStatus(itemId, { status });

      res.status(200).json({
        success: true,
        message: `Item ${status === 'Active' ? 'activated' : 'deactivated'} successfully.`,
        data: updatedItem
      });
    } catch (err: any) {
      next(err);
    }
  }
}
