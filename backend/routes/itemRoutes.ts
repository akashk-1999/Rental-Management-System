import { Router } from 'express';
import { ItemController } from '../controllers/itemController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the item router.
 * Implements Dependency Injection by accepting the ItemController instance.
 *
 * @param itemController - The injected ItemController instance.
 * @returns An Express Router configured with item routes.
 */
export function createItemRouter(itemController: ItemController): Router {
  const router = Router();

  /**
   * GET /items
   * 1. JWT Authentication Middleware
   * 2. ItemController.getAllItems
   */
  router.get(
    '/items',
    authenticateToken,
    itemController.getAllItems.bind(itemController)
  );

  /**
   * GET /items/:id
   * 1. JWT Authentication Middleware
   * 2. ItemController.getItemById
   */
  router.get(
    '/items/:id',
    authenticateToken,
    itemController.getItemById.bind(itemController)
  );

  /**
   * POST /items
   * 1. JWT Authentication Middleware
   * 2. ItemController.createItem
   */
  router.post(
    '/items',
    authenticateToken,
    itemController.createItem.bind(itemController)
  );

  /**
   * PUT /items/:id
   * 1. JWT Authentication Middleware
   * 2. ItemController.updateItem
   */
  router.put(
    '/items/:id',
    authenticateToken,
    itemController.updateItem.bind(itemController)
  );

  /**
   * PATCH /items/:id/status
   * 1. JWT Authentication Middleware
   * 2. ItemController.updateItemStatus
   */
  router.patch(
    '/items/:id/status',
    authenticateToken,
    itemController.updateItemStatus.bind(itemController)
  );

  return router;
}
