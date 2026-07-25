import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/usersService';

/**
 * UsersController manages user-related HTTP endpoints.
 * It is kept extremely thin, containing only mapping of request data,
 * delegating all business logic to the injected UsersService instance,
 * and returning standardized responses.
 */
export class UsersController {
  constructor(
    private readonly usersService: UsersService
  ) {}

  /**
   * Retrieves all active users as safe, client-facing DTOs.
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.usersService.getAllUsers();

      res.status(200).json({
        success: true,
        data: users
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Creates a new user from the request body and returns the created safe DTO.
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, fullName, role, email, contactNumber } = req.body;

      const createdUser = await this.usersService.createUser({
        username,
        password,
        fullName,
        role,
        email,
        contactNumber
      });

      res.status(201).json({
        success: true,
        data: createdUser
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Updates an existing user identified by the :id route param and returns the updated safe DTO.
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const { username, fullName, role, isActive, email, contactNumber } = req.body;

      const updatedUser = await this.usersService.updateUser(userId, {
        username,
        fullName,
        role,
        isActive,
        email,
        contactNumber
      });

      res.status(200).json({
        success: true,
        data: updatedUser
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Soft-deletes (deactivates) the user identified by the :id route param.
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);

      await this.usersService.deleteUser(userId);

      res.status(200).json({
        success: true,
        message: 'User deactivated successfully.'
      });
    } catch (err: any) {
      next(err);
    }
  }

  /**
   * Resets the password of the user identified by the :id route param to the system default.
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);

      await this.usersService.resetPassword(userId);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully.'
      });
    } catch (err: any) {
      next(err);
    }
  }
}
