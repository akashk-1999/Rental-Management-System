import logger from '../utils/logger';
import { CustomerRepository } from '../repositories/customerRepository';
import { Customer } from '../types/rental';
import { HttpError } from '../errors/HttpError';
import { CustomerLookupResult, SafeCustomer } from '../types/customer';

/**
 * CustomerService handles the lightweight customer lookup used to speed up rental creation.
 * This is intentionally not a full Customer Management service — there is no create/update/delete
 * here; Customer records are only ever created via the Rentals module's rental-creation transaction.
 */
export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository
  ) {}

  private mapToSafeCustomer(customer: Customer): SafeCustomer {
    return {
      customerId: customer.CustomerId,
      customerName: customer.CustomerName,
      mobileNumber: customer.MobileNumber,
      alternateNumber: customer.AlternateNumber,
      address: customer.Address,
      idProof: customer.IdProof,
      notes: customer.Notes
    };
  }

  /**
   * Express's query parser decodes an unencoded literal "+" (e.g. a request pasted into a browser
   * or Postman as "?mobile=+9187..." instead of the percent-encoded "?mobile=%2B9187...") as a
   * leading space, since query strings follow the application/x-www-form-urlencoded convention.
   * Recovers the intended "+" so callers aren't required to know about this encoding quirk.
   */
  private recoverLostPlusPrefix(rawMobile: string): string {
    return rawMobile.startsWith(' ') ? `+${rawMobile.trim()}` : rawMobile.trim();
  }

  /**
   * Looks up a customer by mobile number for rental-creation autofill. Never throws a 404 — a
   * missing customer is a normal, expected outcome (a new customer), represented as found: false
   * rather than an error.
   */
  async lookupByMobile(mobileNumber: string | undefined): Promise<CustomerLookupResult> {
    if (!mobileNumber) {
      logger.warn('[CustomerService.lookupByMobile] Failed: mobile query parameter is required.');
      throw new HttpError(400, 'Mobile number is required');
    }

    const normalizedMobile = this.recoverLostPlusPrefix(mobileNumber);
    if (!normalizedMobile) {
      logger.warn('[CustomerService.lookupByMobile] Failed: mobile query parameter is required.');
      throw new HttpError(400, 'Mobile number is required');
    }

    const customer = await this.customerRepository.getCustomerByMobile(normalizedMobile);
    if (!customer) {
      logger.info('[CustomerService.lookupByMobile] No customer found for the given mobile number.');
      return { found: false };
    }

    logger.info(`[CustomerService.lookupByMobile] Found customer ${customer.CustomerId} for the given mobile number.`);
    return { found: true, customer: this.mapToSafeCustomer(customer) };
  }
}
