import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/categoryService';

/**
 * CategoryController manages item-category-related HTTP endpoints.
 * It is kept extremely thin, containing only mapping of request data,
 * delegating all business logic to the injected CategoryService instance,
 * and returning standardized responses.
 */
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService
  ) {}

  /**
   * Retrieves all categories (active and inactive) as client-facing DTOs.
   */
  async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await this.categoryService.getAllCategories();

      res.status(200).json({
        success: true,
        data: categories
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Retrieves a single category identified by the :id route param.
   */
  async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id, 10);

      const category = await this.categoryService.getCategoryById(categoryId);

      res.status(200).json({
        success: true,
        data: category
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Creates a new category from the request body and returns the created DTO.
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryName } = req.body;

      const createdCategory = await this.categoryService.createCategory({ categoryName });

      res.status(201).json({
        success: true,
        data: createdCategory
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Updates an existing category identified by the :id route param and returns the updated DTO.
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id, 10);
      const { categoryName } = req.body;

      const updatedCategory = await this.categoryService.updateCategory(categoryId, { categoryName });

      res.status(200).json({
        success: true,
        data: updatedCategory
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Activates or deactivates the category identified by the :id route param.
   * Physical delete is never performed on categories.
   */
  async updateCategoryStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoryId = parseInt(req.params.id, 10);
      const { isActive } = req.body;

      const updatedCategory = await this.categoryService.updateCategoryStatus(categoryId, isActive);

      res.status(200).json({
        success: true,
        message: `Category ${isActive ? 'activated' : 'deactivated'} successfully.`,
        data: updatedCategory
      });
    } catch (err: any) {
      next(err);
    }
  }
}
