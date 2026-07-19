import { Router } from 'express';
import Joi from 'joi';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateBody } from '../middlewares/validationMiddleware';

// --- Joi Schemas ---
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
});

/**
 * Factory function to create and configure the authentication router.
 * Implements Dependency Injection by accepting the AuthController instance.
 * 
 * @param authController - The injected AuthController instance.
 * @returns An Express Router configured with auth routes.
 */
export function createAuthRouter(authController: AuthController): Router {
  const router = Router();

  /**
   * POST /login
   * 1. Joi Validation Middleware
   * 2. AuthController.login
   */
  router.post(
    '/login',
    validateBody(loginSchema),
    authController.login.bind(authController)
  );

  /**
   * POST /change-password
   * 1. JWT Authentication Middleware
   * 2. Joi Validation Middleware
   * 3. AuthController.changePassword
   */
  router.post(
    '/change-password',
    authenticateToken,
    validateBody(changePasswordSchema),
    authController.changePassword.bind(authController)
  );

  /**
   * GET /me
   * 1. JWT Authentication Middleware
   * 2. AuthController.verifyCurrentUser
   */
  router.get(
    '/me',
    authenticateToken,
    authController.verifyCurrentUser.bind(authController)
  );

  return router;
}
