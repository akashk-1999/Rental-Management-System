import logger from '../utils/logger';
import { ReturnRepository, RentalLineItemForReturn } from '../repositories/returnRepository';
import { RentalRepository } from '../repositories/rentalRepository';
import { HttpError } from '../errors/HttpError';
import { RentalStatus } from '../types/rental';
import {
  CreateReturnInput,
  SafeReturnableRental,
  SafeReturnLineItem,
  SafeReturnRentalDetail,
  SafeReturnResult
} from '../types/return';

interface ResolvedReturnItem {
  rentalLineItemId: number;
  itemId: number;
  itemName: string;
  quantityReturned: number;
}

/**
 * ReturnService handles business logic for receiving returned rental items (Phase 1: recording
 * the return, updating the rental's status, and bumping Item.TotalQuantity back up — no late
 * fees, damage charges, deposit deductions, payments, or inventory forecasting).
 *
 * It is framework-independent and relies on constructor injection of ReturnRepository and
 * RentalRepository (reused for rental existence/status checks), consistent with the rentals module.
 */
export class ReturnService {
  constructor(
    private readonly returnRepository: ReturnRepository,
    private readonly rentalRepository: RentalRepository
  ) {}

  private mapToSafeLineItem(lineItem: RentalLineItemForReturn): SafeReturnLineItem {
    const quantityAlreadyReturned = Number(lineItem.QuantityAlreadyReturned);
    return {
      rentalLineItemId: lineItem.RentalLineItemId,
      itemId: lineItem.ItemId,
      itemName: lineItem.ItemName,
      quantityRented: lineItem.QuantityRented,
      quantityAlreadyReturned,
      quantityRemaining: lineItem.QuantityRented - quantityAlreadyReturned,
      rentalPrice: Number(lineItem.UnitPrice)
    };
  }

  /**
   * Retrieves lightweight summaries of every rental that has not been fully returned.
   */
  async getReturnableRentals(): Promise<SafeReturnableRental[]> {
    const rentals = await this.returnRepository.getReturnableRentals();
    logger.info(`[ReturnService.getReturnableRentals] Retrieved ${rentals.length} returnable rental(s).`);
    return rentals.map((rental) => ({
      rentalId: rental.RentalId,
      rentalCode: rental.RentalCode,
      customerName: rental.CustomerName,
      mobileNumber: rental.MobileNumber,
      rentalStartDate: rental.RentalStartDate.toISOString(),
      expectedReturnDate: rental.ExpectedReturnDate.toISOString(),
      status: rental.Status
    }));
  }

  /**
   * Retrieves a single rental's full detail for the returns workflow, including every line item's
   * rented/already-returned/remaining quantities, throwing a 404 HttpError if it does not exist.
   */
  async getRentalForReturn(rentalId: number): Promise<SafeReturnRentalDetail> {
    const rental = await this.rentalRepository.getRentalById(rentalId);
    if (!rental) {
      logger.warn(`[ReturnService.getRentalForReturn] Rental with ID ${rentalId} not found.`);
      throw new HttpError(404, 'Rental not found');
    }

    const lineItems = await this.returnRepository.getRentalLineItemsForReturn(rentalId);

    return {
      rentalId: rental.RentalId,
      rentalCode: rental.RentalCode,
      customerId: rental.CustomerId,
      customerName: rental.CustomerName,
      mobileNumber: rental.MobileNumber,
      rentalStartDate: rental.RentalStartDate.toISOString(),
      expectedReturnDate: rental.ExpectedReturnDate.toISOString(),
      status: rental.Status,
      notes: rental.Notes,
      lineItems: lineItems.map((lineItem) => this.mapToSafeLineItem(lineItem))
    };
  }

  /**
   * Validates and records a return against a rental's line items, then atomically persists the
   * ReturnEvents rows, restores the returned quantity to each Item's TotalQuantity, and recomputes
   * the rental's Status (Returned once every line item is fully returned, otherwise PartialReturn).
   */
  async createReturn(input: CreateReturnInput, recordedByUserId: number): Promise<SafeReturnResult> {
    const rentalId = Number(input.rentalId);
    if (!input.rentalId || Number.isNaN(rentalId)) {
      throw new HttpError(400, 'A valid rental must be specified');
    }

    if (!input.returnDate) {
      logger.warn('[ReturnService.createReturn] Failed: Return date is required.');
      throw new HttpError(400, 'Return date is required');
    }
    const returnDate = new Date(input.returnDate);
    if (Number.isNaN(returnDate.getTime())) {
      throw new HttpError(400, 'Return date is invalid');
    }

    if (!Array.isArray(input.returnedItems) || input.returnedItems.length === 0) {
      logger.warn('[ReturnService.createReturn] Failed: At least one returned item is required.');
      throw new HttpError(400, 'At least one returned item is required');
    }

    const rental = await this.rentalRepository.getRentalById(rentalId);
    if (!rental) {
      logger.warn(`[ReturnService.createReturn] Failed: Rental with ID ${rentalId} not found.`);
      throw new HttpError(404, 'Rental not found');
    }
    if (rental.Status !== 'Active' && rental.Status !== 'PartialReturn') {
      logger.warn(
        `[ReturnService.createReturn] Failed: Rental ${rentalId} has status '${rental.Status}' and cannot accept returns.`
      );
      throw new HttpError(400, `Rental cannot accept returns while its status is '${rental.Status}'`);
    }

    const lineItems = await this.returnRepository.getRentalLineItemsForReturn(rentalId);
    const lineItemsById = new Map(lineItems.map((lineItem) => [lineItem.RentalLineItemId, lineItem]));

    const seenLineItemIds = new Set<number>();
    const resolvedItems: ResolvedReturnItem[] = [];

    for (const returnedItem of input.returnedItems) {
      const rentalLineItemId = Number(returnedItem?.rentalLineItemId);
      if (!returnedItem?.rentalLineItemId || Number.isNaN(rentalLineItemId)) {
        throw new HttpError(400, 'Each returned item must reference a valid rental line item');
      }

      if (seenLineItemIds.has(rentalLineItemId)) {
        logger.warn(
          `[ReturnService.createReturn] Failed: Duplicate rental line item ${rentalLineItemId} in return request.`
        );
        throw new HttpError(400, `Rental line item ${rentalLineItemId} was specified more than once`);
      }
      seenLineItemIds.add(rentalLineItemId);

      const lineItem = lineItemsById.get(rentalLineItemId);
      if (!lineItem) {
        logger.warn(
          `[ReturnService.createReturn] Failed: Rental line item ${rentalLineItemId} does not belong to rental ${rentalId}.`
        );
        throw new HttpError(400, `Rental line item ${rentalLineItemId} does not belong to this rental`);
      }

      const quantityReturned = Number(returnedItem.quantityReturned);
      if (Number.isNaN(quantityReturned) || quantityReturned <= 0) {
        throw new HttpError(400, `Quantity returned for '${lineItem.ItemName}' must be greater than zero`);
      }

      const quantityRemaining = lineItem.QuantityRented - Number(lineItem.QuantityAlreadyReturned);
      if (quantityReturned > quantityRemaining) {
        logger.warn(
          `[ReturnService.createReturn] Failed: Quantity returned ${quantityReturned} for '${lineItem.ItemName}' exceeds remaining quantity ${quantityRemaining}.`
        );
        throw new HttpError(400, `Quantity returned for '${lineItem.ItemName}' exceeds the remaining quantity`);
      }

      resolvedItems.push({
        rentalLineItemId,
        itemId: lineItem.ItemId,
        itemName: lineItem.ItemName,
        quantityReturned
      });
    }

    // A rental is fully returned only once every one of its line items — including any not
    // touched by this request — has a cumulative returned quantity matching what was rented.
    const isFullyReturned = lineItems.every((lineItem) => {
      const returnedInThisBatch =
        resolvedItems.find((resolved) => resolved.rentalLineItemId === lineItem.RentalLineItemId)?.quantityReturned ||
        0;
      const totalReturned = Number(lineItem.QuantityAlreadyReturned) + returnedInThisBatch;
      return totalReturned >= lineItem.QuantityRented;
    });
    const newRentalStatus: RentalStatus = isFullyReturned ? 'Returned' : 'PartialReturn';

    await this.returnRepository.createReturnTransaction({
      rentalId,
      returnDate,
      notes: input.notes?.trim() || null,
      recordedByUserId,
      returnedItems: resolvedItems.map((resolved) => ({
        rentalLineItemId: resolved.rentalLineItemId,
        itemId: resolved.itemId,
        quantityReturned: resolved.quantityReturned
      })),
      newRentalStatus
    });

    logger.info(`[ReturnService.createReturn] Recorded return for rental ${rentalId}; new status '${newRentalStatus}'.`);

    const updatedRental = await this.getRentalForReturn(rentalId);
    return {
      rentalId: updatedRental.rentalId,
      rentalCode: updatedRental.rentalCode,
      status: updatedRental.status,
      returnDate: returnDate.toISOString(),
      lineItems: updatedRental.lineItems
    };
  }
}
