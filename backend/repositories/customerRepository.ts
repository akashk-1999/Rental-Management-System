import { query } from '../config/db';
import logger from '../utils/logger';
import { Customer } from '../types/rental';

export class CustomerRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'CustomerRepositoryError';
  }
}

/**
 * CustomerRepository provides SQL Server read operations for the Customers table used by the
 * lightweight rental-creation lookup. This is intentionally not a full CRUD repository — Customer
 * records are only ever created via RentalRepository's rental-creation transaction.
 */
export class CustomerRepository {
  /**
   * Retrieves a single customer record by mobile number.
   *
   * SQL Query:
   * SELECT CustomerId, CustomerName, MobileNumber, AlternateNumber, Address, IdProof, Notes, CreatedAt, UpdatedAt
   * FROM Customers
   * WHERE MobileNumber = @MobileNumber
   */
  static async getCustomerByMobile(mobileNumber: string): Promise<Customer | null> {
    try {
      const rows = await query<Customer>(
        `SELECT CustomerId, CustomerName, MobileNumber, AlternateNumber, Address, IdProof, Notes, CreatedAt, UpdatedAt
         FROM Customers
         WHERE MobileNumber = @MobileNumber`,
        { MobileNumber: mobileNumber }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[CustomerRepository.getCustomerByMobile] Database query failed: ${err.message}`);
      throw new CustomerRepositoryError(`Failed to retrieve customer by mobile number: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getCustomerByMobile(mobileNumber: string): Promise<Customer | null> {
    return CustomerRepository.getCustomerByMobile(mobileNumber);
  }
}
