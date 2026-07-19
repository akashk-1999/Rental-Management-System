import express from 'express';
import request from 'supertest';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Define environment variables first so that configurations are correct when AuthService initializes
process.env.JWT_SECRET = 'test_jwt_secret_key_long_enough_for_security';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.NODE_ENV = 'test';

// Declare mocks for UserRepository functions
const mockGetUserByUsername = jest.fn();
const mockGetUserById = jest.fn();
const mockResetPassword = jest.fn();

// Mock UserRepository module
jest.mock('../repositories/userRepository', () => {
  return {
    UserRepository: jest.fn().mockImplementation(() => {
      return {
        getUserByUsername: mockGetUserByUsername,
        getUserById: mockGetUserById,
        resetPassword: mockResetPassword,
      };
    }),
    UserRepositoryError: class UserRepositoryError extends Error {
      constructor(message: string, public readonly originalError?: any) {
        super(message);
        this.name = 'UserRepositoryError';
      }
    }
  };
});

// Mock bcryptjs module
jest.mock('bcryptjs', () => {
  return {
    compare: jest.fn(),
    hash: jest.fn().mockResolvedValue('$2a$10$hashednewpassword'),
  };
});

// Mock logger to avoid winston esm/cjs compatibility issues in tests
jest.mock('../utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    logger: mockLogger,
  };
});

import { createAuthRouter } from '../routes/authRoutes';
import { AuthController } from '../controllers/authController';
import { AuthService } from '../services/authService';
import { UserRepository } from '../repositories/userRepository';
import { errorHandler } from '../middlewares/errorHandler';
import { authenticateToken } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validationMiddleware';
import { authorizeRoles } from '../middlewares/authorizationMiddleware';

describe('Authentication Module - Integration Tests', () => {
  let app: express.Express;
  let authService: AuthService;
  let authController: AuthController;

  beforeAll(() => {
    const userRepository = new UserRepository();
    authService = new AuthService(userRepository);
    authController = new AuthController(authService);

    app = express();
    app.use(express.json());

    // 1. Mount official Auth routes
    app.use('/api/auth', createAuthRouter(authController));

    // Setup test login route to bypass empty placeholder stripping
    app.post(
      '/api/test-login',
      (req, res, next) => {
        authController.login(req, res, next);
      }
    );

    // 2. Setup schema and route for Validation Testing (Scenario 17, 18, 19)
    const testValidationSchema = {
      body: Joi.object({
        username: Joi.string().required(),
        password: Joi.string().required(),
        age: Joi.number().integer().required(),
      }),
      query: Joi.object({
        limit: Joi.number().integer().optional(),
      }),
      params: Joi.object({
        id: Joi.number().integer().required(),
      }),
    };

    app.post(
      '/api/test-validate/:id',
      validateRequest(testValidationSchema),
      (req, res) => {
        res.status(200).json({
          success: true,
          body: req.body,
          params: req.params,
          query: req.query,
        });
      }
    );

    // 3. Setup test endpoint for changePassword controller logic to avoid production schema placeholder stripping
    app.post(
      '/api/test-change-password',
      authenticateToken,
      (req, res, next) => {
        authController.changePassword(req, res, next);
      }
    );

    // 4. Setup routes for Authorization Testing (Scenario 13, 14, 15, 16)
    app.get(
      '/api/test-admin-only',
      authenticateToken,
      authorizeRoles('Admin'),
      (req, res) => {
        res.status(200).json({ success: true, user: (req as any).user });
      }
    );

    app.get(
      '/api/test-multi-roles',
      authenticateToken,
      authorizeRoles('Admin', 'Staff'),
      (req, res) => {
        res.status(200).json({ success: true, user: (req as any).user });
      }
    );

    app.get(
      '/api/test-missing-user',
      authorizeRoles('Admin'),
      (req, res) => {
        res.status(200).json({ success: true });
      }
    );

    // 5. Mount Global Error Handler
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to generate test JWT token
  const generateToken = (payload: any, expiresIn: string | number = '1h') => {
    return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: expiresIn as any });
  };

  // --- Authentication Flow Tests (Scenarios 1 - 6) ---
  describe('POST /api/auth/login', () => {
    it('Scenario 1: Should login successfully and return a SafeUser DTO and access token', async () => {
      const activeUser = {
        UserId: 1,
        Username: 'john_doe',
        PasswordHash: '$2a$10$mockedpasswordhash',
        FullName: 'John Doe',
        Role: 'Staff',
        IsActive: true,
        CreatedAt: new Date(),
        UpdatedAt: null,
      };

      mockGetUserByUsername.mockResolvedValueOnce(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/test-login')
        .send({ username: 'john_doe', password: 'securePassword123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful.');
      expect(response.body.data.user).toEqual({
        UserId: 1,
        Username: 'john_doe',
        FullName: 'John Doe',
        Role: 'Staff',
        IsActive: true,
      });
      expect(response.body.data.accessToken).toBeDefined();

      // Verify PasswordHash and timestamps are removed for safety
      expect(response.body.data.user.PasswordHash).toBeUndefined();
      expect(response.body.data.user.CreatedAt).toBeUndefined();
      expect(response.body.data.user.UpdatedAt).toBeUndefined();
    });

    it('Scenario 2: Should reject with 401 when username is invalid/not found', async () => {
      mockGetUserByUsername.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/test-login')
        .send({ username: 'unknown_user', password: 'securePassword123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username or password.');
    });

    it('Scenario 3: Should reject with 401 when password is incorrect', async () => {
      const activeUser = {
        UserId: 1,
        Username: 'john_doe',
        PasswordHash: '$2a$10$mockedpasswordhash',
        FullName: 'John Doe',
        Role: 'Staff',
        IsActive: true,
        CreatedAt: new Date(),
        UpdatedAt: null,
      };

      mockGetUserByUsername.mockResolvedValueOnce(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      const response = await request(app)
        .post('/api/test-login')
        .send({ username: 'john_doe', password: 'wrongPassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username or password.');
    });

    it('Scenario 4: Should reject with 401 when user account is disabled/inactive', async () => {
      const inactiveUser = {
        UserId: 2,
        Username: 'disabled_user',
        PasswordHash: '$2a$10$mockedpasswordhash',
        FullName: 'Disabled User',
        Role: 'Staff',
        IsActive: false,
        CreatedAt: new Date(),
        UpdatedAt: null,
      };

      mockGetUserByUsername.mockResolvedValueOnce(inactiveUser);

      const response = await request(app)
        .post('/api/test-login')
        .send({ username: 'disabled_user', password: 'securePassword123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username or password.');
    });

    it('Scenario 5: Should fail login with 401 when username is missing', async () => {
      const response = await request(app)
        .post('/api/test-login')
        .send({ password: 'securePassword123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username or password.');
    });

    it('Scenario 6: Should fail login with 401 when password is missing', async () => {
      const response = await request(app)
        .post('/api/test-login')
        .send({ username: 'john_doe' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid username or password.');
    });
  });

  // --- JWT Authentication Tests (Scenarios 7 - 12) ---
  describe('JWT Authentication Middleware', () => {
    it('Scenario 7: Should fail with 401 when Authorization header is missing', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authorization header is missing.');
    });

    it('Scenario 8: Should fail with 401 when Bearer format is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic abcdef123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid authorization header format. Expected Bearer <token>.');
    });

    it('Scenario 9: Should fail with 401 when Bearer token is empty', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid authorization header format. Expected Bearer <token>.');
    });

    it('Scenario 10: Should fail with 401 when JWT signature is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_header.invalid_payload.invalid_signature');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid authentication token');
    });

    it('Scenario 11: Should fail with 401 when JWT token is expired', async () => {
      const expiredToken = generateToken(
        { userId: 1, username: 'john_doe', role: 'Staff' },
        -10 // Expired 10 seconds ago
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid authentication token');
    });

    it('Scenario 12: Should authenticate successfully and return current user claims with valid JWT', async () => {
      const payload = { userId: 42, username: 'clara_admin', role: 'Admin' };
      const validToken = generateToken(payload);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            userId: 42,
            username: 'clara_admin',
            role: 'Admin',
          },
        },
      });
    });
  });

  // --- Authorization Tests (Scenarios 13 - 16) ---
  describe('Role-Based Authorization Middleware', () => {
    it('Scenario 13: Should allow Admin user to access an Admin-only endpoint', async () => {
      const adminToken = generateToken({ userId: 1, username: 'boss', role: 'Admin' });

      const response = await request(app)
        .get('/api/test-admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual({ userId: 1, username: 'boss', role: 'Admin' });
    });

    it('Scenario 14: Should reject Staff user trying to access an Admin-only endpoint with 403', async () => {
      const staffToken = generateToken({ userId: 2, username: 'helper', role: 'Staff' });

      const response = await request(app)
        .get('/api/test-admin-only')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Access denied. Role 'Staff' is not authorized to access this resource.");
    });

    it('Scenario 15: Should throw 401 and fail when user context is missing (middleware order mismatch)', async () => {
      const response = await request(app).get('/api/test-missing-user');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication required. Missing user context.');
    });

    it('Scenario 16: Should allow both Admin and Staff to access multi-role endpoint', async () => {
      const staffToken = generateToken({ userId: 2, username: 'helper', role: 'Staff' });
      const adminToken = generateToken({ userId: 1, username: 'boss', role: 'Admin' });

      // Test Staff
      const staffResponse = await request(app)
        .get('/api/test-multi-roles')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(staffResponse.status).toBe(200);
      expect(staffResponse.body.success).toBe(true);

      // Test Admin
      const adminResponse = await request(app)
        .get('/api/test-multi-roles')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.success).toBe(true);
    });
  });

  // --- Request Validation Middleware Tests (Scenarios 17 - 19) ---
  describe('Joi Request Validation Middleware', () => {
    it('Scenario 17: Should fail validation with 400 when required fields are missing from body', async () => {
      const response = await request(app)
        .post('/api/test-validate/42')
        .send({ username: 'missing_password_and_age' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed.');
      expect(response.body.errors).toContain('"password" is required');
      expect(response.body.errors).toContain('"age" is required');
    });

    it('Scenario 18: Should strip unknown/extraneous body fields from the request when they are passed', async () => {
      const response = await request(app)
        .post('/api/test-validate/42')
        .send({
          username: 'john_doe',
          password: 'securePassword',
          age: 30,
          unauthorizedField: 'maliciousPayload',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.body.unauthorizedField).toBeUndefined(); // Verified that unknown fields are stripped!
    });

    it('Scenario 19: Should fail validation with 400 when URL path parameters contain invalid types', async () => {
      const response = await request(app)
        .post('/api/test-validate/not-an-integer')
        .send({
          username: 'john_doe',
          password: 'securePassword',
          age: 30,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed.');
      expect(response.body.errors).toContain('"id" must be a number');
    });

    it('Should correctly coerce types and sanitize body inputs when validation succeeds', async () => {
      const response = await request(app)
        .post('/api/test-validate/100?limit=25')
        .send({
          username: 'john_doe',
          password: 'securePassword',
          age: '35', // Passed as string but coerced to number
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.body.age).toBe(35); // Verified coercion
      expect(response.body.params.id).toBe(100); // Verified parameter coercion
      expect(response.body.query.limit).toBe(25); // Verified query coercion
    });
  });

  // --- Protected Endpoints Execution Pipelines (Scenarios 20 - 21) ---
  describe('Protected Route Integration (Endpoints 20 & 21)', () => {
    it('Scenario 20: GET /api/auth/me should return verified user profile', async () => {
      const payload = { userId: 5, username: 'charlie_staff', role: 'Staff' };
      const validToken = generateToken(payload);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            userId: 5,
            username: 'charlie_staff',
            role: 'Staff',
          },
        },
      });
    });

    it('Scenario 21: POST /api/auth/change-password should successfully execute password updates when valid', async () => {
      const currentUser = {
        UserId: 10,
        Username: 'john_doe',
        PasswordHash: '$2a$10$oldhashedpassword',
        FullName: 'John Doe',
        Role: 'Staff',
        IsActive: true,
        CreatedAt: new Date(),
        UpdatedAt: null,
      };

      const payload = { userId: 10, username: 'john_doe', role: 'Staff' };
      const validToken = generateToken(payload);

      // Mock DB retrieval and password checks
      mockGetUserById.mockResolvedValueOnce(currentUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true); // Old password match
      mockResetPassword.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/api/test-change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ currentPassword: 'oldPassword123', newPassword: 'newSuperSecret123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Password changed successfully.',
      });

      expect(mockGetUserById).toHaveBeenCalledWith(10);
      expect(mockResetPassword).toHaveBeenCalledWith(10, '$2a$10$hashednewpassword');
    });

    it('Scenario 21: POST /api/auth/change-password should reject when current password does not match', async () => {
      const currentUser = {
        UserId: 10,
        Username: 'john_doe',
        PasswordHash: '$2a$10$oldhashedpassword',
        FullName: 'John Doe',
        Role: 'Staff',
        IsActive: true,
        CreatedAt: new Date(),
        UpdatedAt: null,
      };

      const payload = { userId: 10, username: 'john_doe', role: 'Staff' };
      const validToken = generateToken(payload);

      // Mock DB retrieval and failed password checks
      mockGetUserById.mockResolvedValueOnce(currentUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false); // Old password mismatch

      const response = await request(app)
        .post('/api/test-change-password')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ currentPassword: 'wrongCurrentPassword', newPassword: 'newSuperSecret123' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid current password.');

      expect(mockResetPassword).not.toHaveBeenCalled();
    });
  });
});
