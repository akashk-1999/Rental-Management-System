import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbError } from './config/db';
import { UserRepository } from './repositories/userRepository';
import { AuthService } from './services/authService';
import { AuthController } from './controllers/authController';
import { createAuthRouter } from './routes/authRoutes';
import { UsersService } from './services/usersService';
import { UsersController } from './controllers/usersController';
import { createUsersRouter } from './routes/usersRoutes';
import { CategoryRepository } from './repositories/categoryRepository';
import { CategoryService } from './services/categoryService';
import { CategoryController } from './controllers/categoryController';
import { createCategoryRouter } from './routes/categoryRoutes';
import { ItemRepository } from './repositories/itemRepository';
import { ItemService } from './services/itemService';
import { ItemController } from './controllers/itemController';
import { createItemRouter } from './routes/itemRoutes';
import { RentalRepository } from './repositories/rentalRepository';
import { RentalService } from './services/rentalService';
import { RentalController } from './controllers/rentalController';
import { createRentalRouter } from './routes/rentalRoutes';
import { CustomerRepository } from './repositories/customerRepository';
import { CustomerService } from './services/customerService';
import { CustomerController } from './controllers/customerController';
import { createCustomerRouter } from './routes/customerRoutes';
import { ReturnRepository } from './repositories/returnRepository';
import { ReturnService } from './services/returnService';
import { ReturnController } from './controllers/returnController';
import { createReturnRouter } from './routes/returnRoutes';
import { PaymentRepository } from './repositories/paymentRepository';
import { PaymentService } from './services/paymentService';
import { PaymentController } from './controllers/paymentController';
import { createPaymentRouter } from './routes/paymentRoutes';
import { DashboardRepository } from './repositories/dashboardRepository';
import { DashboardService } from './services/dashboardService';
import { DashboardController } from './controllers/dashboardController';
import { createDashboardRouter } from './routes/dashboardRoutes';
import { ReportRepository } from './repositories/reportRepository';
import { ReportService } from './services/reportService';
import { ReportController } from './controllers/reportController';
import { createReportRouter } from './routes/reportRoutes';
import { errorHandler } from './middlewares/errorHandler';

dotenv.config();

const app = express();

// Dependency chain for the auth module
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

// Dependency chain for the users module
const usersService = new UsersService(userRepository, authService);
const usersController = new UsersController(usersService);

// Dependency chain for the item categories module
const categoryRepository = new CategoryRepository();
const categoryService = new CategoryService(categoryRepository);
const categoryController = new CategoryController(categoryService);

// Dependency chain for the items module
const itemRepository = new ItemRepository();
const itemService = new ItemService(itemRepository, categoryRepository);
const itemController = new ItemController(itemService);

// Dependency chain for the rentals module (Phase 1: Rental Creation)
const rentalRepository = new RentalRepository();
const rentalService = new RentalService(rentalRepository, itemRepository);
const rentalController = new RentalController(rentalService);

// Dependency chain for the lightweight customer lookup (used by the Rentals creation form only)
const customerRepository = new CustomerRepository();
const customerService = new CustomerService(customerRepository);
const customerController = new CustomerController(customerService);

// Dependency chain for the returns module (Phase 1: Receiving Returned Items)
const returnRepository = new ReturnRepository();
const returnService = new ReturnService(returnRepository, rentalRepository);
const returnController = new ReturnController(returnService);

// Dependency chain for the payments module (Phase 1: Payment Recording & History)
const paymentRepository = new PaymentRepository();
const paymentService = new PaymentService(paymentRepository, rentalRepository);
const paymentController = new PaymentController(paymentService);

// Dependency chain for the dashboard module (read-only business overview)
const dashboardRepository = new DashboardRepository();
const dashboardService = new DashboardService(dashboardRepository);
const dashboardController = new DashboardController(dashboardService);

// Dependency chain for the reports module (read-only, filterable reports)
const reportRepository = new ReportRepository();
const reportService = new ReportService(reportRepository);
const reportController = new ReportController(reportService);

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

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});
app.use('/api/auth', createAuthRouter(authController));
app.use('/api', createUsersRouter(usersController));
app.use('/api', createCategoryRouter(categoryController));
app.use('/api', createItemRouter(itemController));
app.use('/api', createRentalRouter(rentalController));
app.use('/api', createCustomerRouter(customerController));
app.use('/api', createReturnRouter(returnController));
app.use('/api', createPaymentRouter(paymentController));
app.use('/api', createDashboardRouter(dashboardController));
app.use('/api', createReportRouter(reportController));

// We will mount other routes here (properties, tenants, payments, dashboard) as we build them.

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
