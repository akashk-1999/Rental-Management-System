import logger from '../utils/logger';
import { UserRepository, User } from '../repositories/userRepository';
import { AuthService } from './authService';
import { HttpError } from '../errors/HttpError';

const ALLOWED_ROLES = ['Admin', 'Staff'] as const;

// --- Types & Interfaces ---

export interface SafeUser {
  UserId: number;
  Username: string;
  FullName: string;
  Role: 'Admin' | 'Staff';
  IsActive: boolean;
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  role: 'Admin' | 'Staff';
}

// --- UsersService Implementation ---

/**
 * UsersService handles business logic for retrieving and creating user records.
 *
 * It is framework-independent and relies on constructor injection of UserRepository
 * and AuthService (reused for password hashing, consistent with the auth module).
 */
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService
  ) {}

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
   * Retrieves all active users and maps them into safe, client-facing DTOs.
   */
  async getAllUsers(): Promise<SafeUser[]> {
    const users = await this.userRepository.getAllUsers();
    logger.info(`[UsersService.getAllUsers] Retrieved ${users.length} active user(s).`);
    return users.map((user) => this.mapToSafeUser(user));
  }

  /**
   * Creates a new user record. The plain-text password is hashed via the shared
   * AuthService before being persisted, and the created record is mapped to a
   * safe, client-facing DTO before being returned.
   */
  async createUser(input: CreateUserInput): Promise<SafeUser> {
    const existingUser = await this.userRepository.getUserByUsername(input.username);
    if (existingUser) {
      logger.warn(`[UsersService.createUser] Failed to create user: Username '${input.username}' already exists.`);
      throw new HttpError(409, 'Username already exists');
    }

    if (!ALLOWED_ROLES.includes(input.role)) {
      logger.warn(`[UsersService.createUser] Failed to create user: Invalid role '${input.role}' received.`);
      throw new HttpError(400, 'Invalid role');
    }

    const passwordHash = await this.authService.hashPassword(input.password);

    const createdUser = await this.userRepository.createUser({
      Username: input.username,
      PasswordHash: passwordHash,
      FullName: input.fullName,
      Role: input.role
    });

    logger.info(`[UsersService.createUser] Created new user: ${createdUser.UserId} (${createdUser.Username}).`);
    return this.mapToSafeUser(createdUser);
  }
}
