import logger from '../utils/logger';
import { RentalRepository, RentalWithCustomer, RentalLineItemWithItem } from '../repositories/rentalRepository';
import { ItemRepository } from '../repositories/itemRepository';
import { HttpError } from '../errors/HttpError';
import {
  CreateRentalInput,
  RentalPaymentStatus,
  SafeRental,
  SafeRentalLineItem,
  SafeRentalSummary
} from '../types/rental';

interface ResolvedLineItem {
  itemId: number;
  itemName: string;
  quantityRented: number;
  unitPrice: number;
}

/**
 * RentalService handles business logic for creating and retrieving rentals (Phase 1: Rental
 * Creation only — no returns, payments, status changes, or inventory calculations).
 *
 * It is framework-independent and relies on constructor injection of RentalRepository and
 * ItemRepository (reused for item existence/active/quantity checks), consistent with the
 * users, categories, and items modules.
 */
export class RentalService {
  constructor(
    private readonly rentalRepository: RentalRepository,
    private readonly itemRepository: ItemRepository
  ) {}

  private mapToSafeSummary(rental: RentalWithCustomer): SafeRentalSummary {
    return {
      rentalId: rental.RentalId,
      rentalCode: rental.RentalCode,
      customerId: rental.CustomerId,
      customerName: rental.CustomerName,
      mobileNumber: rental.MobileNumber,
      rentalStartDate: rental.RentalStartDate.toISOString(),
      expectedReturnDate: rental.ExpectedReturnDate.toISOString(),
      status: rental.Status,
      totalAmount: Number(rental.TotalAmount),
      advancePaid: Number(rental.AdvancePaid),
      securityDepositPaid: Number(rental.SecurityDepositPaid),
      paymentStatus: rental.PaymentStatus,
      notes: rental.Notes,
      createdByUserId: rental.CreatedByUserId,
      createdAt: rental.CreatedAt.toISOString(),
      updatedAt: rental.UpdatedAt ? rental.UpdatedAt.toISOString() : null
    };
  }

  private mapToSafeLineItem(lineItem: RentalLineItemWithItem): SafeRentalLineItem {
    return {
      rentalLineItemId: lineItem.RentalLineItemId,
      itemId: lineItem.ItemId,
      itemName: lineItem.ItemName,
      itemCode: lineItem.ItemCode,
      unitType: lineItem.UnitType,
      quantityRented: lineItem.QuantityRented,
      unitPrice: Number(lineItem.UnitPrice),
      lineTotal: Number(lineItem.LineTotal)
    };
  }

  /**
   * This is an India-only rental business (₹ pricing, no DST), so calendar-date comparisons use a
   * fixed IST (UTC+5:30) offset rather than the server process's own timezone or raw UTC — using
   * raw UTC would misclassify early-morning IST times (e.g. 00:30 IST = 19:00 UTC the previous
   * day) as being "yesterday".
   */
  private static readonly IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

  /**
   * The IST calendar date (year/month/day, time stripped) of a datetime, used to compare "which
   * day" two datetimes fall on regardless of their time-of-day component.
   */
  private toIstCalendarDate(date: Date): number {
    const shifted = new Date(date.getTime() + RentalService.IST_OFFSET_MS);
    return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  }

  /**
   * Retrieves all rental headers (lightweight summaries, no line items) most recently created first.
   */
  async getAllRentals(): Promise<SafeRentalSummary[]> {
    const rentals = await this.rentalRepository.getAllRentals();
    logger.info(`[RentalService.getAllRentals] Retrieved ${rentals.length} rental(s).`);
    return rentals.map((rental) => this.mapToSafeSummary(rental));
  }

  /**
   * Retrieves a single rental with its full line item detail, throwing a 404 HttpError if it
   * does not exist.
   */
  async getRentalById(rentalId: number): Promise<SafeRental> {
    const rental = await this.rentalRepository.getRentalById(rentalId);
    if (!rental) {
      logger.warn(`[RentalService.getRentalById] Rental with ID ${rentalId} not found.`);
      throw new HttpError(404, 'Rental not found');
    }

    const lineItems = await this.rentalRepository.getRentalLineItems(rentalId);
    return {
      ...this.mapToSafeSummary(rental),
      lineItems: lineItems.map((lineItem) => this.mapToSafeLineItem(lineItem))
    };
  }

  /**
   * Validates and creates a new rental: resolves or creates the customer, validates every line
   * item (item exists, is Active, quantity > 0, quantity does not exceed the item's true available
   * stock — TotalQuantity minus units already out on other active rentals, damaged, or lost, per
   * vw_ItemInventoryStatus, not just the master TotalQuantity), computes totals server-side from
   * the Items master pricing, and persists everything atomically.
   */
  async createRental(input: CreateRentalInput, createdByUserId: number): Promise<SafeRental> {
    if (!input.customer) {
      throw new HttpError(400, 'Customer information is required');
    }

    const customerName = input.customer.customerName?.trim();
    if (!customerName) {
      logger.warn('[RentalService.createRental] Failed: Customer name is required.');
      throw new HttpError(400, 'Customer name is required');
    }

    const mobileNumber = input.customer.mobileNumber?.trim();
    if (!mobileNumber) {
      logger.warn('[RentalService.createRental] Failed: Customer phone number is required.');
      throw new HttpError(400, 'Customer phone number is required');
    }

    if (!input.rentalStartDate) {
      logger.warn('[RentalService.createRental] Failed: Rental start date and time is required.');
      throw new HttpError(400, 'Rental start date and time is required');
    }
    if (!input.expectedReturnDate) {
      logger.warn('[RentalService.createRental] Failed: Expected return date and time is required.');
      throw new HttpError(400, 'Expected return date and time is required');
    }

    const rentalStartDate = new Date(input.rentalStartDate);
    const expectedReturnDate = new Date(input.expectedReturnDate);
    if (Number.isNaN(rentalStartDate.getTime())) {
      throw new HttpError(400, 'Rental start date and time is invalid');
    }
    if (Number.isNaN(expectedReturnDate.getTime())) {
      throw new HttpError(400, 'Expected return date and time is invalid');
    }
    if (this.toIstCalendarDate(rentalStartDate) < this.toIstCalendarDate(new Date())) {
      logger.warn('[RentalService.createRental] Failed: Rental start date is in the past.');
      throw new HttpError(400, 'Rental start date cannot be in the past');
    }
    if (this.toIstCalendarDate(expectedReturnDate) <= this.toIstCalendarDate(rentalStartDate)) {
      logger.warn('[RentalService.createRental] Failed: Expected return date is not after the rental start date.');
      throw new HttpError(400, 'Expected return date must be after the rental start date');
    }

    if (!Array.isArray(input.lineItems) || input.lineItems.length === 0) {
      logger.warn('[RentalService.createRental] Failed: At least one rental line item is required.');
      throw new HttpError(400, 'At least one rental line item is required');
    }

    const resolvedLineItems: ResolvedLineItem[] = [];
    for (const lineItem of input.lineItems) {
      const itemId = Number(lineItem?.itemId);
      if (!lineItem?.itemId || Number.isNaN(itemId)) {
        throw new HttpError(400, 'Each line item must reference a valid item');
      }

      const quantityRented = Number(lineItem.quantityRented);
      if (Number.isNaN(quantityRented) || quantityRented <= 0) {
        throw new HttpError(400, 'Line item quantity must be greater than zero');
      }

      const item = await this.itemRepository.getItemById(itemId);
      if (!item) {
        logger.warn(`[RentalService.createRental] Failed: Item with ID ${itemId} does not exist.`);
        throw new HttpError(400, `Item with ID ${itemId} does not exist`);
      }
      if (item.Status !== 'Active') {
        logger.warn(`[RentalService.createRental] Failed: Item '${item.ItemName}' is not active.`);
        throw new HttpError(400, `Item '${item.ItemName}' is not active`);
      }
      if (quantityRented > item.AvailableStock) {
        logger.warn(
          `[RentalService.createRental] Failed: Requested quantity ${quantityRented} for '${item.ItemName}' exceeds available stock ${item.AvailableStock}.`
        );
        throw new HttpError(400, `Requested quantity for '${item.ItemName}' exceeds available quantity`);
      }

      resolvedLineItems.push({
        itemId: item.ItemId,
        itemName: item.ItemName,
        quantityRented,
        unitPrice: Number(item.RentalPrice)
      });
    }

    const advancePaid = input.advancePaid !== undefined && input.advancePaid !== null ? Number(input.advancePaid) : 0;
    if (Number.isNaN(advancePaid) || advancePaid < 0) {
      throw new HttpError(400, 'Advance paid must be zero or greater');
    }

    const securityDepositPaid =
      input.securityDepositPaid !== undefined && input.securityDepositPaid !== null
        ? Number(input.securityDepositPaid)
        : 0;
    if (Number.isNaN(securityDepositPaid) || securityDepositPaid < 0) {
      throw new HttpError(400, 'Security deposit paid must be zero or greater');
    }

    const existingCustomer = await this.rentalRepository.getCustomerByMobileNumber(mobileNumber);

    const totalAmount = resolvedLineItems.reduce((sum, li) => sum + li.quantityRented * li.unitPrice, 0);
    const paymentStatus: RentalPaymentStatus =
      advancePaid <= 0 ? 'Pending' : advancePaid >= totalAmount ? 'Paid' : 'Partial';

    const rentalId = await this.rentalRepository.createRentalTransaction({
      existingCustomerId: existingCustomer ? existingCustomer.CustomerId : null,
      customer: {
        customerName,
        mobileNumber,
        alternateNumber: input.customer.alternateNumber?.trim() || null,
        address: input.customer.address?.trim() || null,
        idProof: input.customer.idProof?.trim() || null,
        notes: input.customer.notes?.trim() || null
      },
      rentalStartDate,
      expectedReturnDate,
      totalAmount,
      advancePaid,
      securityDepositPaid,
      paymentStatus,
      notes: input.notes?.trim() || null,
      createdByUserId,
      lineItems: resolvedLineItems.map((li) => ({
        itemId: li.itemId,
        quantityRented: li.quantityRented,
        unitPrice: li.unitPrice
      }))
    });

    logger.info(`[RentalService.createRental] Created new rental: ${rentalId}.`);
    return this.getRentalById(rentalId);
  }
}
