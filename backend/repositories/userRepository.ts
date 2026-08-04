import { query, execute } from '../config/db';
import logger from '../utils/logger';

export interface User {
  UserId: number;
  Username: string;
  PasswordHash: string;
  FullName: string;
  Role: 'Admin' | 'Staff';
  IsActive: boolean;
  Email: string | null;
  ContactNumber: string | null;
  DeleteStatus: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export class UserRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'UserRepositoryError';
  }
}

/**
 * UserRepository provides SQL Server direct operations for managing the Users table.
 * All queries are strictly parameterized and type-safe.
 */
export class UserRepository {
  /**
   * Retrieves a single user record by their unique integer primary key (UserId).
   *
   * SQL Query:
   * SELECT UserId, Username, PasswordHash, FullName, Role, IsActive, Email, ContactNumber, CreatedAt, UpdatedAt
   * FROM Users
   * WHERE UserId = @UserId AND DeleteStatus = 0
   */
  static async getUserById(id: number): Promise<User | null> {
    try {
      const rows = await query<User>(
        `SELECT UserId, Username, PasswordHash, FullName, Role, IsActive, Email, ContactNumber, CreatedAt, UpdatedAt
         FROM Users
         WHERE UserId = @UserId AND DeleteStatus = 0`,
        { UserId: id }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[UserRepository.getUserById] Database query failed: ${err.message}`);
      throw new UserRepositoryError(`Failed to retrieve user by ID: ${err.message}`, err);
    }
  }

  /**
   * Retrieves a single user record by their unique login Username identifier.
   * 
   * SQL Query:
   * SELECT UserId, Username, PasswordHash, FullName, Role, IsActive, CreatedAt, UpdatedAt
   * FROM Users
   * WHERE Username = @Username AND DeleteStatus = 0
   */
  static async getUserByUsername(username: string): Promise<User | null> {
    try {
      const rows = await query<User>(
        `SELECT UserId, Username, PasswordHash, FullName, Role, IsActive, CreatedAt, UpdatedAt
         FROM Users
         WHERE Username = @Username AND DeleteStatus = 0`,
        { Username: username }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[UserRepository.getUserByUsername] Database query failed: ${err.message}`);
      throw new UserRepositoryError(`Failed to retrieve user by Username: ${err.message}`, err);
    }
  }

  /**
   * Retrieves all non-deleted user records (active and inactive) from the Users table,
   * ordered alphabetically by FullName. Inactive users are still returned so they remain
   * manageable (e.g. re-activatable) from the UI; only DeleteStatus excludes rows here.
   *
   * SQL Query:
   * SELECT UserId, Username, PasswordHash, FullName, Role, IsActive, Email, ContactNumber, CreatedAt, UpdatedAt
   * FROM Users
   * WHERE DeleteStatus = 0
   * ORDER BY FullName ASC
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const rows = await query<User>(
        `SELECT UserId, Username, PasswordHash, FullName, Role, IsActive, Email, ContactNumber, CreatedAt, UpdatedAt
         FROM Users
         WHERE DeleteStatus = 0
         ORDER BY FullName ASC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[UserRepository.getAllUsers] Database query failed: ${err.message}`);
      throw new UserRepositoryError(`Failed to retrieve all users: ${err.message}`, err);
    }
  }

  /**
   * Inserts a new user record into the Users table and returns the fully initialized entity.
   * Leverages SQL Server's OUTPUT clause for atomic creation and field retrieval in a single query.
   *
   * SQL Query:
   * INSERT INTO Users (Username, PasswordHash, FullName, Role, Email, ContactNumber, IsActive)
   * OUTPUT INSERTED.UserId, INSERTED.Username, INSERTED.PasswordHash, INSERTED.FullName, INSERTED.Role, INSERTED.IsActive, INSERTED.Email, INSERTED.ContactNumber, INSERTED.CreatedAt, INSERTED.UpdatedAt
   * VALUES (@Username, @PasswordHash, @FullName, @Role, @Email, @ContactNumber, 1)
   */
  static async createUser(user: Omit<User, 'UserId' | 'CreatedAt' | 'UpdatedAt' | 'IsActive' | 'DeleteStatus'>): Promise<User> {
    try {
      const rows = await query<User>(
        `INSERT INTO Users (Username, PasswordHash, FullName, Role, Email, ContactNumber, IsActive)
         OUTPUT INSERTED.UserId, INSERTED.Username, INSERTED.PasswordHash, INSERTED.FullName, INSERTED.Role, INSERTED.IsActive, INSERTED.Email, INSERTED.ContactNumber, INSERTED.CreatedAt, INSERTED.UpdatedAt
         VALUES (@Username, @PasswordHash, @FullName, @Role, @Email, @ContactNumber, 1)`,
        {
          Username: user.Username,
          PasswordHash: user.PasswordHash,
          FullName: user.FullName,
          Role: user.Role,
          Email: user.Email,
          ContactNumber: user.ContactNumber
        }
      );
      
      if (rows.length === 0) {
        throw new Error('No row returned from insert execution.');
      }
      return rows[0];
    } catch (err: any) {
      logger.error(`[UserRepository.createUser] Database insertion failed: ${err.message}`);
      const isDuplicate = err.number === 2627 || err.number === 2601 || 
                          err.originalError?.number === 2627 || err.originalError?.number === 2601 ||
                          (err.message && (err.message.includes('Violation of UNIQUE KEY') || err.message.includes('duplicate key')));
      if (isDuplicate) {
        throw new UserRepositoryError(`Duplicate user violation: Username '${user.Username}' already exists.`, err);
      }
      throw new UserRepositoryError(`Failed to create user record: ${err.message}`, err);
    }
  }

  /**
   * Updates mutable attributes (Username, FullName, Role, IsActive, Email, ContactNumber) of an existing
   * user and timestamps the change. Checks existence first to distinguish between 'User not found' and
   * a successful update without treating unchanged values as an error.
   *
   * SQL Query:
   * UPDATE Users
   * SET Username = @Username,
   *     FullName = @FullName,
   *     Role = @Role,
   *     IsActive = @IsActive,
   *     Email = @Email,
   *     ContactNumber = @ContactNumber,
   *     UpdatedAt = SYSUTCDATETIME()
   * WHERE UserId = @UserId AND DeleteStatus = 0
   */
  static async updateUser(
    user: Pick<User, 'UserId' | 'Username' | 'FullName' | 'Role' | 'IsActive' | 'Email' | 'ContactNumber'>
  ): Promise<void> {
    try {
      // Pre-check user existence to distinguish "not found" vs "successful update"
      const existingUser = await UserRepository.getUserById(user.UserId);
      if (!existingUser) {
        throw new Error(`User with ID ${user.UserId} not found.`);
      }

      await execute(
        `UPDATE Users
         SET Username = @Username,
             FullName = @FullName,
             Role = @Role,
             IsActive = @IsActive,
             Email = @Email,
             ContactNumber = @ContactNumber,
             UpdatedAt = SYSUTCDATETIME()
         WHERE UserId = @UserId AND DeleteStatus = 0`,
        {
          UserId: user.UserId,
          Username: user.Username,
          FullName: user.FullName,
          Role: user.Role,
          IsActive: user.IsActive ? 1 : 0,
          Email: user.Email,
          ContactNumber: user.ContactNumber
        }
      );
    } catch (err: any) {
      logger.error(`[UserRepository.updateUser] Database update failed: ${err.message}`);
      // Throw the direct "not found" error if that's what was raised
      if (err.message && err.message.includes('not found')) {
        throw new UserRepositoryError(err.message, err);
      }
      throw new UserRepositoryError(`Failed to update user record: ${err.message}`, err);
    }
  }

  /**
   * Performs a soft delete by setting IsActive to 0 (false) and DeleteStatus to 1 (true)
   * for the specified UserId. Once DeleteStatus is set, every other query in this
   * repository (which all filter on DeleteStatus = 0) treats the row as gone.
   *
   * SQL Query:
   * UPDATE Users
   * SET IsActive = 0,
   *     DeleteStatus = 1,
   *     UpdatedAt = SYSUTCDATETIME()
   * WHERE UserId = @UserId AND DeleteStatus = 0
   */
  static async disableUser(id: number): Promise<void> {
    try {
      const { rowsAffected } = await execute(
        `UPDATE Users
         SET IsActive = 0,
             DeleteStatus = 1,
             UpdatedAt = SYSUTCDATETIME()
         WHERE UserId = @UserId AND DeleteStatus = 0`,
        { UserId: id }
      );

      if (rowsAffected === 0) {
        throw new Error(`User with ID ${id} not found.`);
      }
    } catch (err: any) {
      logger.error(`[UserRepository.disableUser] Database operation failed: ${err.message}`);
      throw new UserRepositoryError(`Failed to disable user record: ${err.message}`, err);
    }
  }

  /**
   * Resets the PasswordHash field for the specified UserId and records the update time.
   * 
   * SQL Query:
   * UPDATE Users
   * SET PasswordHash = @PasswordHash,
   *     UpdatedAt = SYSUTCDATETIME()
   * WHERE UserId = @UserId AND DeleteStatus = 0
   */
  static async resetPassword(id: number, passwordHash: string): Promise<void> {
    try {
      const { rowsAffected } = await execute(
        `UPDATE Users
         SET PasswordHash = @PasswordHash,
             UpdatedAt = SYSUTCDATETIME()
         WHERE UserId = @UserId AND DeleteStatus = 0`,
        {
          UserId: id,
          PasswordHash: passwordHash
        }
      );

      if (rowsAffected === 0) {
        throw new Error(`User with ID ${id} not found.`);
      }
    } catch (err: any) {
      logger.error(`[UserRepository.resetPassword] Database update failed: ${err.message}`);
      throw new UserRepositoryError(`Failed to reset user password: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getUserById(id: number): Promise<User | null> {
    return UserRepository.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return UserRepository.getUserByUsername(username);
  }

  async getAllUsers(): Promise<User[]> {
    return UserRepository.getAllUsers();
  }

  async createUser(user: Omit<User, 'UserId' | 'CreatedAt' | 'UpdatedAt' | 'IsActive' | 'DeleteStatus'>): Promise<User> {
    return UserRepository.createUser(user);
  }

  async updateUser(
    user: Pick<User, 'UserId' | 'Username' | 'FullName' | 'Role' | 'IsActive' | 'Email' | 'ContactNumber'>
  ): Promise<void> {
    return UserRepository.updateUser(user);
  }

  async disableUser(id: number): Promise<void> {
    return UserRepository.disableUser(id);
  }

  async resetPassword(id: number, passwordHash: string): Promise<void> {
    return UserRepository.resetPassword(id, passwordHash);
  }
}
