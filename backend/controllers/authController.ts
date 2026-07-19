import { Request, Response, NextFunction } from 'express';
import { AuthService, JwtPayload } from '../services/authService';
import { HttpError } from '../errors/HttpError';

/**
 * Interface representing an Express Request containing a verified user payload.
 */
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * AuthController manages authentication-related HTTP endpoints.
 * It is kept extremely thin, containing only mapping of request data,
 * delegating all business logic to the injected AuthService instance,
 * and returning standardized responses.
 */
export class AuthController {
  constructor(
    private readonly authService: AuthService
  ) {}

  /**
   * Executes user login through AuthService using pre-validated credentials.
   * On success, returns the SafeUser DTO and access token.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password } = req.body;

      // Delegate authentication to the framework-independent service
      const authResult = await this.authService.login(username, password);

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: authResult
      });
    } catch (err: any) {
      // Map domain/auth exceptions to standardized HTTP statuses and forward to global error handler
      if (err.name === 'AuthenticationError') {
        next(new HttpError(401, err.message));
      } else {
        next(err);
      }
    }
  }

  /**
   * Performs secure password change for the currently authenticated user using pre-validated password fields.
   */
  async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        throw new HttpError(401, 'Authentication required to change password.');
      }

      // Delegate password change logic to the service
      await this.authService.changePassword(userId, currentPassword, newPassword);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully.'
      });
    } catch (err: any) {
      if (err.name === 'AuthenticationError') {
        next(new HttpError(401, err.message));
      } else {
        next(err);
      }
    }
  }

  /**
   * Resolves the currently authenticated user context populated by the authentication middleware.
   */
  async verifyCurrentUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = req.user;

      if (!payload) {
        throw new HttpError(401, 'Authorization token required.');
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            userId: payload.userId,
            username: payload.username,
            role: payload.role
          }
        }
      });
    } catch (err: any) {
      if (err.name === 'AuthenticationError') {
        next(new HttpError(401, err.message));
      } else {
        next(err);
      }
    }
  }
}

