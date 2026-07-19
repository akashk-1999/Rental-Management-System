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
      const { username, password, fullName, role } = req.body;

      const createdUser = await this.usersService.createUser({ username, password, fullName, role });

      res.status(201).json({
        success: true,
        data: createdUser
      });
    } catch (err: any) {
      next(err);
    }
  }
}
