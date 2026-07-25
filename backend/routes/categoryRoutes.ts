import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the category router.
 * Implements Dependency Injection by accepting the CategoryController instance.
 *
 * @param categoryController - The injected CategoryController instance.
 * @returns An Express Router configured with category routes.
 */
export function createCategoryRouter(categoryController: CategoryController): Router {
  const router = Router();

  /**
   * GET /categories
   * 1. JWT Authentication Middleware
   * 2. CategoryController.getAllCategories
   */
  router.get(
    '/categories',
    authenticateToken,
    categoryController.getAllCategories.bind(categoryController)
  );

  /**
   * GET /categories/:id
   * 1. JWT Authentication Middleware
   * 2. CategoryController.getCategoryById
   */
  router.get(
    '/categories/:id',
    authenticateToken,
    categoryController.getCategoryById.bind(categoryController)
  );

  /**
   * POST /categories
   * 1. JWT Authentication Middleware
   * 2. CategoryController.createCategory
   */
router.post(
  '/categories',

  (req, res, next) => {
    console.log('✅ POST /api/categories route reached');
    next();
  },

  authenticateToken,

  categoryController.createCategory.bind(categoryController)
);

  /**
   * PUT /categories/:id
   * 1. JWT Authentication Middleware
   * 2. CategoryController.updateCategory
   */
  router.put(
    '/categories/:id',
    authenticateToken,
    categoryController.updateCategory.bind(categoryController)
  );

  /**
   * PATCH /categories/:id/status
   * 1. JWT Authentication Middleware
   * 2. CategoryController.updateCategoryStatus
   */
  router.patch(
    '/categories/:id/status',
    authenticateToken,
    categoryController.updateCategoryStatus.bind(categoryController)
  );

  return router;
}
