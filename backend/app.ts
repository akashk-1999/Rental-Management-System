import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbError } from './config/db';
import { UserRepository } from './repositories/userRepository';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { createAuthRouter } from './routes/authRoutes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();

// Dependency chain for the auth module
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Core API Health Route (must remain accessible for diagnostics)
app.get('/api/health', (req, res) => {
  const dbError = getDbError();
  const port = parseInt(process.env.APP_PORT || '3000', 10);
  const environment = process.env.NODE_ENV || 'development';

  res.status(200).json({
    success: true,
    application: {
      status: 'running',
      version: '1.0.0',
      environment: environment
    },
    database: {
      status: dbError ? 'connection_required' : 'connected',
      type: 'Microsoft SQL Server'
    },
    server: {
      port: port,
      timestamp: new Date().toISOString()
    }
  });
});

// Middleware to enforce database connection for all other database-driven api routes
app.use('/api', (req, res, next) => {
  const dbError = getDbError();
  if (dbError) {
    return res.status(503).json({
      success: false,
      message: 'Database Connection Required. Normal system operations are unavailable.',
      errors: ['Unable to connect to Microsoft SQL Server. Please verify your database configuration and try again.']
    });
  }
  next();
});

app.use('/api/auth', createAuthRouter(authController));

// We will mount other routes here (items, customers, rentals, dashboard) as we build them.

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
