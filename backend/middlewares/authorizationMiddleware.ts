import { Response, NextFunction, RequestHandler } from 'express';
import { AuthenticatedRequest } from '../controllers/authController';
import { AuthenticationError } from '../services/authService';
import { AuthorizationError } from '../errors/AuthorizationError';

/**
 * Reusable role-based authorization middleware factory.
 * 
 * Checks if the authenticated user (populated on req.user) possesses 
 * one of the required/permitted roles for the route.
 * 
 * @param allowedRoles - One or more roles authorized to access the endpoint.
 * @returns An Express RequestHandler middleware.
 */
export const authorizeRoles = (...allowedRoles: string[]): RequestHandler => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;

      // Ensure user context is present on the request
      if (!user) {
        throw new AuthenticationError('Authentication required. Missing user context.');
      }

      // Check if user's role matches any of the allowed roles
      if (!allowedRoles.includes(user.role)) {
        throw new AuthorizationError(`Access denied. Role '${user.role}' is not authorized to access this resource.`);
      }

      // User possesses the authorized role, proceed to next handler
      next();
    } catch (err: any) {
      // Forward all exceptions directly to the global error handler
      next(err);
    }
  };
};
