import logger from '../utils/logger';
import { ItemRepository, ItemWithCategory } from '../repositories/itemRepository';
import { CategoryRepository } from '../repositories/categoryRepository';
import { HttpError } from '../errors/HttpError';
import { SafeItem, CreateItemInput, UpdateItemInput, UpdateItemStatusInput } from '../types/item';

const ALLOWED_STATUSES = ['Active', 'Inactive'] as const;
const DEFAULT_UNIT_TYPE = 'Piece';

interface ValidatedItemFields {
  itemName: string;
  categoryId: number;
  totalQuantity: number;
  rentalPrice: number;
  securityDeposit: number | null;
}

/**
 * ItemService handles business logic for retrieving, creating, and updating item master records.
 *
 * It is framework-independent and relies on constructor injection of ItemRepository and
 * CategoryRepository (reused for category existence/active checks), consistent with the
 * users and categories modules.
 */
export class ItemService {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly categoryRepository: CategoryRepository
  ) {}

  /**
   * Utility to map a database ItemWithCategory record to a client-facing SafeItem DTO.
   */
  private mapToSafeItem(item: ItemWithCategory): SafeItem {
    return {
      itemId: item.ItemId,
      itemName: item.ItemName,
      categoryId: item.CategoryId,
      categoryName: item.CategoryName,
      itemCode: item.ItemCode,
      unitType: item.UnitType,
      totalQuantity: item.TotalQuantity,
      rentalPrice: Number(item.RentalPrice),
      securityDeposit: item.SecurityDeposit !== null ? Number(item.SecurityDeposit) : null,
      description: item.Description,
      imageUrl: item.ImageUrl,
      status: item.Status,
      createdAt: item.CreatedAt.toISOString(),
      updatedAt: item.UpdatedAt ? item.UpdatedAt.toISOString() : null
    };
  }

  /**
   * Validates the fields shared by create and update payloads: item name, category
   * existence/active state, and non-negative quantities/pricing. ItemCode uniqueness is
   * validated separately by each caller since "not found" vs "same record" checks differ.
   */
  private async validateItemFields(
    context: 'createItem' | 'updateItem',
    input: {
      itemName?: string;
      categoryId?: number;
      totalQuantity?: number;
      rentalPrice?: number;
      securityDeposit?: number | null;
    }
  ): Promise<ValidatedItemFields> {
    const itemName = input.itemName?.trim();
    if (!itemName) {
      logger.warn(`[ItemService.${context}] Failed: Item name is required.`);
      throw new HttpError(400, 'Item name is required');
    }

    const categoryId = Number(input.categoryId);
    if (input.categoryId === undefined || input.categoryId === null || Number.isNaN(categoryId)) {
      logger.warn(`[ItemService.${context}] Failed: Category is required.`);
      throw new HttpError(400, 'Category is required');
    }

    const category = await this.categoryRepository.getCategoryById(categoryId);
    if (!category) {
      logger.warn(`[ItemService.${context}] Failed: Category with ID ${categoryId} not found.`);
      throw new HttpError(400, 'Invalid category');
    }
    if (!category.IsActive) {
      logger.warn(`[ItemService.${context}] Failed: Category '${category.CategoryName}' is inactive.`);
      throw new HttpError(400, 'Category is inactive');
    }

    const totalQuantity = input.totalQuantity ?? 0;
    if (Number.isNaN(Number(totalQuantity)) || Number(totalQuantity) < 0) {
      logger.warn(`[ItemService.${context}] Failed: Total quantity must be zero or greater.`);
      throw new HttpError(400, 'Total quantity must be zero or greater');
    }

    const rentalPrice = input.rentalPrice ?? 0;
    if (Number.isNaN(Number(rentalPrice)) || Number(rentalPrice) < 0) {
      logger.warn(`[ItemService.${context}] Failed: Rental price must be zero or greater.`);
      throw new HttpError(400, 'Rental price must be zero or greater');
    }

    let securityDeposit: number | null = null;
    if (input.securityDeposit !== undefined && input.securityDeposit !== null) {
      if (Number.isNaN(Number(input.securityDeposit)) || Number(input.securityDeposit) < 0) {
        logger.warn(`[ItemService.${context}] Failed: Security deposit must be zero or greater.`);
        throw new HttpError(400, 'Security deposit must be zero or greater');
      }
      securityDeposit = Number(input.securityDeposit);
    }

    return {
      itemName,
      categoryId,
      totalQuantity: Number(totalQuantity),
      rentalPrice: Number(rentalPrice),
      securityDeposit
    };
  }

  /**
   * Retrieves all items (active and inactive) and maps them into client-facing DTOs.
   */
  async getAllItems(): Promise<SafeItem[]> {
    const items = await this.itemRepository.getAllItems();
    logger.info(`[ItemService.getAllItems] Retrieved ${items.length} item(s).`);
    return items.map((item) => this.mapToSafeItem(item));
  }

  /**
   * Retrieves a single item by its ID, throwing a 404 HttpError if it does not exist.
   */
  async getItemById(itemId: number): Promise<SafeItem> {
    const item = await this.itemRepository.getItemById(itemId);
    if (!item) {
      logger.warn(`[ItemService.getItemById] Item with ID ${itemId} not found.`);
      throw new HttpError(404, 'Item not found');
    }
    return this.mapToSafeItem(item);
  }

  /**
   * Creates a new item record. Validates the item name, category, quantities, pricing,
   * and item code uniqueness before persisting. New items always start as Active.
   */
  async createItem(input: CreateItemInput): Promise<SafeItem> {
    const { itemName, categoryId, totalQuantity, rentalPrice, securityDeposit } = await this.validateItemFields(
      'createItem',
      input
    );

    const itemCode = input.itemCode?.trim() || null;
    if (itemCode) {
      const existingItem = await this.itemRepository.getItemByCode(itemCode);
      if (existingItem) {
        logger.warn(`[ItemService.createItem] Failed to create item: Item code '${itemCode}' already exists.`);
        throw new HttpError(409, 'Item code already exists');
      }
    }

    const createdItem = await this.itemRepository.createItem({
      ItemName: itemName,
      CategoryId: categoryId,
      ItemCode: itemCode,
      UnitType: input.unitType?.trim() || DEFAULT_UNIT_TYPE,
      TotalQuantity: totalQuantity,
      RentalPrice: rentalPrice,
      SecurityDeposit: securityDeposit,
      Description: input.description?.trim() || null,
      ImageUrl: input.imageUrl?.trim() || null
    });

    logger.info(`[ItemService.createItem] Created new item: ${createdItem.ItemId} (${createdItem.ItemName}).`);
    return this.getItemById(createdItem.ItemId);
  }

  /**
   * Updates an existing item's master fields. Validates existence, item name, category,
   * quantities, pricing, and that the item code doesn't collide with a different item.
   * Status is never modified here; use updateItemStatus() instead.
   */
  async updateItem(itemId: number, input: UpdateItemInput): Promise<SafeItem> {
    const existingItem = await this.itemRepository.getItemById(itemId);
    if (!existingItem) {
      logger.warn(`[ItemService.updateItem] Failed to update item: Item with ID ${itemId} not found.`);
      throw new HttpError(404, 'Item not found');
    }

    const { itemName, categoryId, totalQuantity, rentalPrice, securityDeposit } = await this.validateItemFields(
      'updateItem',
      input
    );

    const itemCode = input.itemCode?.trim() || null;
    if (itemCode) {
      const itemWithSameCode = await this.itemRepository.getItemByCode(itemCode);
      if (itemWithSameCode && itemWithSameCode.ItemId !== itemId) {
        logger.warn(`[ItemService.updateItem] Failed to update item: Item code '${itemCode}' already exists.`);
        throw new HttpError(409, 'Item code already exists');
      }
    }

    await this.itemRepository.updateItem({
      ItemId: itemId,
      ItemName: itemName,
      CategoryId: categoryId,
      ItemCode: itemCode,
      UnitType: input.unitType?.trim() || DEFAULT_UNIT_TYPE,
      TotalQuantity: totalQuantity,
      RentalPrice: rentalPrice,
      SecurityDeposit: securityDeposit,
      Description: input.description?.trim() || null,
      ImageUrl: input.imageUrl?.trim() || null
    });

    logger.info(`[ItemService.updateItem] Updated item: ${itemId} (${itemName}).`);
    return this.getItemById(itemId);
  }

  /**
   * Activates or deactivates an item. Physical deletion is never performed; this is the
   * only supported way to remove an item from active use.
   */
  async updateItemStatus(itemId: number, input: UpdateItemStatusInput): Promise<SafeItem> {
    const existingItem = await this.itemRepository.getItemById(itemId);
    if (!existingItem) {
      logger.warn(`[ItemService.updateItemStatus] Failed to update status: Item with ID ${itemId} not found.`);
      throw new HttpError(404, 'Item not found');
    }

    if (!ALLOWED_STATUSES.includes(input.status)) {
      logger.warn(`[ItemService.updateItemStatus] Failed to update status: Invalid status '${input.status}' received.`);
      throw new HttpError(400, 'Status must be Active or Inactive');
    }

    await this.itemRepository.updateItemStatus(itemId, input.status);

    logger.info(
      `[ItemService.updateItemStatus] Set item ${itemId} (${existingItem.ItemName}) status to ${input.status}.`
    );
    return this.getItemById(itemId);
  }
}
