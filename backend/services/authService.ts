import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';
import { UserRepository, User } from '../repositories/userRepository';

// --- Types & Interfaces ---

export interface JwtPayload {
  userId: number;
  username: string;
  role: 'Admin' | 'Staff';
}

export interface SafeUser {
  UserId: number;
  Username: string;
  FullName: string;
  Role: 'Admin' | 'Staff';
  IsActive: boolean;
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
}

// --- Custom Exception Classes ---

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// --- AuthService Implementation ---

/**
 * AuthService handles business logic for user authentication, password hashing, 
 * token verification, and secure password management.
 * 
 * It is framework-independent and relies on constructor injection of UserRepository.
 */
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository
  ) {}

  /**
   * Helper to fetch and validate JWT configuration variables.
   * Throws ConfigurationError if parameters are missing or malformed.
   */
  private getJwtConfig(): { secret: string; expiresIn: string } {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new ConfigurationError('Missing required environment variable: JWT_SECRET');
    }

    const expiresIn = process.env.JWT_EXPIRES_IN;
    if (!expiresIn) {
      throw new ConfigurationError('Missing required environment variable: JWT_EXPIRES_IN');
    }

    return { secret, expiresIn };
  }

  /**
   * Helper to fetch and validate bcrypt configuration variables.
   * Throws ConfigurationError if parameters are missing or malformed.
   */
  private getBcryptConfig(): { saltRounds: number } {
    const roundsStr = process.env.BCRYPT_SALT_ROUNDS;
    if (!roundsStr) {
      throw new ConfigurationError('Missing required environment variable: BCRYPT_SALT_ROUNDS');
    }

    const saltRounds = parseInt(roundsStr, 10);
    if (isNaN(saltRounds) || saltRounds < 8 || saltRounds > 15) {
      throw new ConfigurationError('Invalid BCRYPT_SALT_ROUNDS configuration. Must be an integer between 8 and 15.');
    }

    return { saltRounds };
  }

  /**
   * Utility to safely map a database User model to a secure client-facing SafeUser DTO.
   * Strips the sensitive PasswordHash, CreatedAt, and UpdatedAt fields from the returned object.
   */
  private mapToSafeUser(user: User): SafeUser {
    return {
      UserId: user.UserId,
      Username: user.Username,
      FullName: user.FullName,
      Role: user.Role,
      IsActive: user.IsActive
    };
  }

  /**
   * Hashes a plain-text password securely using bcryptjs and configurable salt rounds.
   */
  async hashPassword(password: string): Promise<string> {
    const { saltRounds } = this.getBcryptConfig();
    try {
      return await bcrypt.hash(password, saltRounds);
    } catch (err: any) {
      logger.error(`[AuthService.hashPassword] Password hashing failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Securely compares a plain-text password with a saved password hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (err: any) {
      logger.error(`[AuthService.comparePassword] Password comparison failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Generates a signed lightweight JWT with explicit user claims.
   * Validates payload fields to ensure secure tokens.
   */
  createAccessToken(payload: JwtPayload): string {
    const { secret, expiresIn } = this.getJwtConfig();

    if (!payload || !payload.userId || !payload.username || !payload.role) {
      logger.error('[AuthService.createAccessToken] JWT signing failed: Missing required fields in token payload.');
      throw new AuthenticationError('Failed to sign access token: invalid payload.');
    }

    try {
      return jwt.sign(payload, secret, { expiresIn: expiresIn as any });
    } catch (err: any) {
      logger.error(`[AuthService.createAccessToken] JWT signing failed: ${err.message}`);
      throw err;
    }
  }

  /**
   * Authenticates user credentials and generates a signed access token.
   */
  async login(username: string, password: string): Promise<AuthResult> {
    // Basic structural checks to prevent DB queries on empty data
    if (!username || !password) {
      logger.warn('[AuthService.login] Failed login attempt: Missing credentials.');
      throw new AuthenticationError('Invalid username or password.');
    }

    const user = await this.userRepository.getUserByUsername(username);
    if (!user) {
      // Use generic warning to prevent user enumeration attacks
      logger.warn('[AuthService.login] Failed login attempt: Username invalid or password incorrect.');
      throw new AuthenticationError('Invalid username or password.');
    }

    if (!user.IsActive) {
      logger.warn(`[AuthService.login] Failed login attempt: User account ${user.UserId} is disabled.`);
      throw new AuthenticationError('Invalid username or password.');
    }

    const isMatch = await this.comparePassword(password, user.PasswordHash);
    if (!isMatch) {
      logger.warn('[AuthService.login] Failed login attempt: Username invalid or password incorrect.');
      throw new AuthenticationError('Invalid username or password.');
    }

    const payload: JwtPayload = {
      userId: user.UserId,
      username: user.Username,
      role: user.Role
    };

    const accessToken = this.createAccessToken(payload);
    logger.info(`[AuthService.login] Successful login: User ${user.UserId} (${user.Role}) authenticated.`);

    return {
      user: this.mapToSafeUser(user),
      accessToken
    };
  }

  /**
   * Cryptographically verifies a JWT access token and extracts the claims.
   * Maps distinct error categories to standard audit log entries and raises a generic error externally.
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    const { secret } = this.getJwtConfig();
    try {
      const decoded = jwt.verify(token, secret) as any;
      if (!decoded || typeof decoded !== 'object' || !decoded.userId || !decoded.username || !decoded.role) {
        logger.warn('[AuthService.verifyToken] Token verification failed: Malformed token payload');
        throw new AuthenticationError('Invalid authentication token');
      }

      return {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    } catch (err: any) {
      if (err instanceof ConfigurationError || err instanceof AuthenticationError) {
        throw err;
      }

      if (err.name === 'TokenExpiredError') {
        logger.warn(`[AuthService.verifyToken] Token verification failed: Expired token (Expired At: ${err.expiredAt})`);
      } else if (err.name === 'JsonWebTokenError' && err.message?.includes('invalid signature')) {
        logger.warn('[AuthService.verifyToken] Token verification failed: Invalid signature');
      } else {
        logger.warn(`[AuthService.verifyToken] Token verification failed: Malformed or invalid token (${err.message})`);
      }

      throw new AuthenticationError('Invalid authentication token');
    }
  }

  /**
   * Securely changes a user's password. Requires verifying their current password first.
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    if (!userId || !currentPassword || !newPassword) {
      throw new AuthenticationError('Missing parameters required for changing password.');
    }

    const user = await this.userRepository.getUserById(userId);
    if (!user) {
      logger.warn(`[AuthService.changePassword] Failed password change: User with ID ${userId} not found.`);
      throw new AuthenticationError('User not found.');
    }

    const isMatch = await this.comparePassword(currentPassword, user.PasswordHash);
    if (!isMatch) {
      logger.warn(`[AuthService.changePassword] Failed password change: Invalid current password for User ${userId}.`);
      throw new AuthenticationError('Invalid current password.');
    }

    const hashedNewPassword = await this.hashPassword(newPassword);
    await this.userRepository.resetPassword(userId, hashedNewPassword);

    logger.info(`[AuthService.changePassword] Secure password changed successfully for User ${userId}.`);
  }
}
