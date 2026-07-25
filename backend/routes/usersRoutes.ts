import { Router } from 'express';
import { UsersController } from '../controllers/usersController';
import { authenticateToken } from '../middlewares/authMiddleware';

/**
 * Factory function to create and configure the users router.
 * Implements Dependency Injection by accepting the UsersController instance.
 *
 * @param usersController - The injected UsersController instance.
 * @returns An Express Router configured with users routes.
 */
export function createUsersRouter(usersController: UsersController): Router {
  const router = Router();

  /**
   * GET /users
   * 1. JWT Authentication Middleware
   * 2. UsersController.getAllUsers
   */
  router.get(
    '/users',
    authenticateToken,
    usersController.getAllUsers.bind(usersController)
  );

  /**
   * POST /users
   * 1. JWT Authentication Middleware
   * 2. UsersController.createUser
   */
  router.post(
    '/users',
    authenticateToken,
    usersController.createUser.bind(usersController)
  );

  /**
   * PUT /users/:id
   * 1. JWT Authentication Middleware
   * 2. UsersController.updateUser
   */
  router.put(
    '/users/:id',
    authenticateToken,
    usersController.updateUser.bind(usersController)
  );

  /**
   * DELETE /users/:id
   * 1. JWT Authentication Middleware
   * 2. UsersController.deleteUser
   */
  router.delete(
    '/users/:id',
    authenticateToken,
    usersController.deleteUser.bind(usersController)
  );

  /**
   * POST /users/:id/reset-password
   * 1. JWT Authentication Middleware
   * 2. UsersController.resetPassword
   */
  router.post(
    '/users/:id/reset-password',
    authenticateToken,
    usersController.resetPassword.bind(usersController)
  );

  return router;
}
