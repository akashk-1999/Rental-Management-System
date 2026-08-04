import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { HttpError } from '../errors/HttpError';
import { ValidationError } from '../errors/ValidationError';
import { AuthorizationError } from '../errors/AuthorizationError';
import { AuthenticationError, ConfigurationError } from '../services/authService';
import { UserRepositoryError } from '../repositories/userRepository';
import { CategoryRepositoryError } from '../repositories/categoryRepository';
import { ItemRepositoryError } from '../repositories/itemRepository';
import { RentalRepositoryError } from '../repositories/rentalRepository';
import { CustomerRepositoryError } from '../repositories/customerRepository';
import { ReturnRepositoryError, ReturnQuantityExceededError } from '../repositories/returnRepository';
import { PaymentRepositoryError, PaymentAmountExceedsBalanceError } from '../repositories/paymentRepository';
import { DashboardRepositoryError } from '../repositories/dashboardRepository';

/**
 * Global Error Handler middleware for Express.
 * Catches all forwarded errors, categorizes them, logs unexpected or critical failures,
 * and returns standardized JSON payloads.
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let status = 500;
  let message = 'An unexpected error occurred.';
  let errors: string[] = [];

  // Determine error category, set corresponding HTTP status and user-facing messages
  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ValidationError || err.name === 'ValidationError') {
    status = 400;
    message = err.message || 'Validation failed.';
    errors = (err as any).errors || [];
  } else if (err instanceof AuthenticationError || err.name === 'AuthenticationError') {
    status = 401;
    message = err.message || 'Authentication failed.';
  } else if (err instanceof AuthorizationError || err.name === 'AuthorizationError') {
    status = 403;
    message = err.message || 'Access denied.';
  } else if (err instanceof UserRepositoryError || err.name === 'UserRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof CategoryRepositoryError || err.name === 'CategoryRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof ItemRepositoryError || err.name === 'ItemRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof RentalRepositoryError || err.name === 'RentalRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof CustomerRepositoryError || err.name === 'CustomerRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof ReturnQuantityExceededError || err.name === 'ReturnQuantityExceededError') {
    status = 409;
    message = err.message;
  } else if (err instanceof ReturnRepositoryError || err.name === 'ReturnRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof PaymentAmountExceedsBalanceError || err.name === 'PaymentAmountExceedsBalanceError') {
    status = 409;
    message = err.message;
  } else if (err instanceof PaymentRepositoryError || err.name === 'PaymentRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof DashboardRepositoryError || err.name === 'DashboardRepositoryError') {
    // Database/Repository errors are masked for client security; details logged internally
    status = 500;
    message = 'Database operation failed.';
    logger.error(`[ErrorHandler] Repository error: ${err.message}`, {
      stack: err.stack,
      originalError: err.originalError
    });
  } else if (err instanceof ConfigurationError || err.name === 'ConfigurationError') {
    // Critical environment/configuration errors are masked for client security; details logged internally
    status = 500;
    message = 'Internal server configuration error.';
    logger.error(`[ErrorHandler] Critical configuration error: ${err.message}`, {
      stack: err.stack
    });
  } else {
    // Fallback for general unhandled native exceptions
    status = 500;
    message = 'Internal server error.';
    logger.error(`[ErrorHandler] Unhandled exception: ${err.message}`, {
      stack: err.stack
    });
  }

  // Build a standardized JSON response
  const responsePayload: {
    success: boolean;
    message: string;
    errors?: string[];
    stack?: string;
  } = {
    success: false,
    message
  };

  if (errors.length > 0) {
    responsePayload.errors = errors;
  }

  // Prevent stack trace leaks in production environments
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    responsePayload.stack = err.stack;
  }

  res.status(status).json(responsePayload);
};
