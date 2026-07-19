import logger from '../utils/logger';
import { UserRepository, User } from '../repositories/userRepository';

// --- Types & Interfaces ---

export interface SafeUser {
  UserId: number;
  Username: string;
  FullName: string;
  Role: 'Admin' | 'Staff';
  IsActive: boolean;
}

// --- UsersService Implementation ---

/**
 * UsersService handles business logic for retrieving user records.
 *
 * It is framework-independent and relies on constructor injection of UserRepository.
 */
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository
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
}
