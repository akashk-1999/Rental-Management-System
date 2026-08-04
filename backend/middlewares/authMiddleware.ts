import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../controllers/authController';
import { AuthService, AuthenticationError } from '../services/authService';
import { UserRepository } from '../repositories/userRepository';

// Instantiating the service and repository dependencies at the module level 
// to keep the exported middleware compatible with current routing injection patterns.
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);

/**
 * JWT Authentication Middleware.
 * Reads the Authorization header, verifies the token cryptographically via AuthService, 
 * and populates the request context (req.user) on success.
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new AuthenticationError('Authorization header is missing.');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Invalid authorization header format. Expected Bearer <token>.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Token not found in authorization header.');
    }

    // Call verifyToken asynchronously as required
    const decoded = await authService.verifyToken(token);

    // Re-check current account state on every request so a still-valid token issued
    // before a user was deactivated or deleted stops working immediately, instead of
    // remaining usable until it naturally expires.
    const user = await userRepository.getUserById(decoded.userId);
    if (!user || !user.IsActive) {
      throw new AuthenticationError('Account is no longer active.');
    }

    // Store the decoded JwtPayload on req.user
    req.user = decoded;

    next();
  } catch (err: any) {
    // Forward all exceptions directly to the global error handler
    next(err);
  }
};
