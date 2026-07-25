import { query, execute } from '../config/db';
import logger from '../utils/logger';
import { Item } from '../types/item';

export interface ItemWithCategory extends Item {
  CategoryName: string;
}

export class ItemRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'ItemRepositoryError';
  }
}

/**
 * ItemRepository provides SQL Server direct operations for managing the Items table.
 * All queries are strictly parameterized and type-safe.
 */
export class ItemRepository {
  /**
   * Retrieves a single item record by its unique integer primary key (ItemId), joined with
   * its parent ItemCategories record to include the category name.
   *
   * SQL Query:
   * SELECT i.ItemId, i.ItemName, i.CategoryId, c.CategoryName, i.ItemCode, i.UnitType,
   *        i.TotalQuantity, i.RentalPrice, i.SecurityDeposit, i.Description, i.ImageUrl,
   *        i.Status, i.CreatedAt, i.UpdatedAt
   * FROM Items i
   * JOIN ItemCategories c ON c.CategoryId = i.CategoryId
   * WHERE i.ItemId = @ItemId
   */
  static async getItemById(id: number): Promise<ItemWithCategory | null> {
    try {
      const rows = await query<ItemWithCategory>(
        `SELECT i.ItemId, i.ItemName, i.CategoryId, c.CategoryName, i.ItemCode, i.UnitType,
                i.TotalQuantity, i.RentalPrice, i.SecurityDeposit, i.Description, i.ImageUrl,
                i.Status, i.CreatedAt, i.UpdatedAt
         FROM Items i
         JOIN ItemCategories c ON c.CategoryId = i.CategoryId
         WHERE i.ItemId = @ItemId`,
        { ItemId: id }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[ItemRepository.getItemById] Database query failed: ${err.message}`);
      throw new ItemRepositoryError(`Failed to retrieve item by ID: ${err.message}`, err);
    }
  }

  /**
   * Retrieves a single item record by its unique ItemCode identifier. ItemCode is nullable
   * and only enforced as unique by the database when populated.
   *
   * SQL Query:
   * SELECT ItemId, ItemName, CategoryId, ItemCode, UnitType, TotalQuantity, RentalPrice,
   *        SecurityDeposit, Description, ImageUrl, Status, CreatedAt, UpdatedAt
   * FROM Items
   * WHERE ItemCode = @ItemCode
   */
  static async getItemByCode(itemCode: string): Promise<Item | null> {
    try {
      const rows = await query<Item>(
        `SELECT ItemId, ItemName, CategoryId, ItemCode, UnitType, TotalQuantity, RentalPrice,
                SecurityDeposit, Description, ImageUrl, Status, CreatedAt, UpdatedAt
         FROM Items
         WHERE ItemCode = @ItemCode`,
        { ItemCode: itemCode }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[ItemRepository.getItemByCode] Database query failed: ${err.message}`);
      throw new ItemRepositoryError(`Failed to retrieve item by code: ${err.message}`, err);
    }
  }

  /**
   * Retrieves all item records (active and inactive) from the Items table, joined with
   * ItemCategories to include the category name, ordered alphabetically by ItemName.
   *
   * SQL Query:
   * SELECT i.ItemId, i.ItemName, i.CategoryId, c.CategoryName, i.ItemCode, i.UnitType,
   *        i.TotalQuantity, i.RentalPrice, i.SecurityDeposit, i.Description, i.ImageUrl,
   *        i.Status, i.CreatedAt, i.UpdatedAt
   * FROM Items i
   * JOIN ItemCategories c ON c.CategoryId = i.CategoryId
   * ORDER BY i.ItemName ASC
   */
  static async getAllItems(): Promise<ItemWithCategory[]> {
    try {
      const rows = await query<ItemWithCategory>(
        `SELECT i.ItemId, i.ItemName, i.CategoryId, c.CategoryName, i.ItemCode, i.UnitType,
                i.TotalQuantity, i.RentalPrice, i.SecurityDeposit, i.Description, i.ImageUrl,
                i.Status, i.CreatedAt, i.UpdatedAt
         FROM Items i
         JOIN ItemCategories c ON c.CategoryId = i.CategoryId
         ORDER BY i.ItemName ASC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[ItemRepository.getAllItems] Database query failed: ${err.message}`);
      throw new ItemRepositoryError(`Failed to retrieve all items: ${err.message}`, err);
    }
  }

  /**
   * Inserts a new item record into the Items table and returns the fully initialized entity.
   * Leverages SQL Server's OUTPUT clause for atomic creation and field retrieval in a single query.
   * New items always start with Status = 'Active'.
   *
   * SQL Query:
   * INSERT INTO Items (ItemName, CategoryId, ItemCode, UnitType, TotalQuantity, RentalPrice,
   *                     SecurityDeposit, Description, ImageUrl, Status)
   * OUTPUT INSERTED.ItemId, INSERTED.ItemName, INSERTED.CategoryId, INSERTED.ItemCode,
   *        INSERTED.UnitType, INSERTED.TotalQuantity, INSERTED.RentalPrice, INSERTED.SecurityDeposit,
   *        INSERTED.Description, INSERTED.ImageUrl, INSERTED.Status, INSERTED.CreatedAt, INSERTED.UpdatedAt
   * VALUES (@ItemName, @CategoryId, @ItemCode, @UnitType, @TotalQuantity, @RentalPrice,
   *         @SecurityDeposit, @Description, @ImageUrl, 'Active')
   */
  static async createItem(
    item: Omit<Item, 'ItemId' | 'Status' | 'CreatedAt' | 'UpdatedAt'>
  ): Promise<Item> {
    try {
      const rows = await query<Item>(
        `INSERT INTO Items (ItemName, CategoryId, ItemCode, UnitType, TotalQuantity, RentalPrice,
                             SecurityDeposit, Description, ImageUrl, Status)
         OUTPUT INSERTED.ItemId, INSERTED.ItemName, INSERTED.CategoryId, INSERTED.ItemCode,
                INSERTED.UnitType, INSERTED.TotalQuantity, INSERTED.RentalPrice, INSERTED.SecurityDeposit,
                INSERTED.Description, INSERTED.ImageUrl, INSERTED.Status, INSERTED.CreatedAt, INSERTED.UpdatedAt
         VALUES (@ItemName, @CategoryId, @ItemCode, @UnitType, @TotalQuantity, @RentalPrice,
                 @SecurityDeposit, @Description, @ImageUrl, 'Active')`,
        {
          ItemName: item.ItemName,
          CategoryId: item.CategoryId,
          ItemCode: item.ItemCode,
          UnitType: item.UnitType,
          TotalQuantity: item.TotalQuantity,
          RentalPrice: item.RentalPrice,
          SecurityDeposit: item.SecurityDeposit,
          Description: item.Description,
          ImageUrl: item.ImageUrl
        }
      );

      if (rows.length === 0) {
        throw new Error('No row returned from insert execution.');
      }
      return rows[0];
    } catch (err: any) {
      logger.error(`[ItemRepository.createItem] Database insertion failed: ${err.message}`);
      const isDuplicate = err.number === 2627 || err.number === 2601 ||
                          err.originalError?.number === 2627 || err.originalError?.number === 2601 ||
                          (err.message && (err.message.includes('Violation of UNIQUE KEY') || err.message.includes('duplicate key')));
      if (isDuplicate) {
        throw new ItemRepositoryError(`Duplicate item violation: Item code '${item.ItemCode}' already exists.`, err);
      }
      throw new ItemRepositoryError(`Failed to create item record: ${err.message}`, err);
    }
  }

  /**
   * Updates mutable attributes (ItemName, CategoryId, ItemCode, UnitType, TotalQuantity,
   * RentalPrice, SecurityDeposit, Description, ImageUrl) of an existing item and timestamps
   * the change. Checks existence first to distinguish between 'Item not found' and a
   * successful update. Status is never modified here; use updateItemStatus() instead.
   *
   * SQL Query:
   * UPDATE Items
   * SET ItemName = @ItemName,
   *     CategoryId = @CategoryId,
   *     ItemCode = @ItemCode,
   *     UnitType = @UnitType,
   *     TotalQuantity = @TotalQuantity,
   *     RentalPrice = @RentalPrice,
   *     SecurityDeposit = @SecurityDeposit,
   *     Description = @Description,
   *     ImageUrl = @ImageUrl,
   *     UpdatedAt = SYSUTCDATETIME()
   * WHERE ItemId = @ItemId
   */
  static async updateItem(
    item: Pick<
      Item,
      | 'ItemId'
      | 'ItemName'
      | 'CategoryId'
      | 'ItemCode'
      | 'UnitType'
      | 'TotalQuantity'
      | 'RentalPrice'
      | 'SecurityDeposit'
      | 'Description'
      | 'ImageUrl'
    >
  ): Promise<void> {
    try {
      // Pre-check item existence to distinguish "not found" vs "successful update"
      const existingItem = await ItemRepository.getItemById(item.ItemId);
      if (!existingItem) {
        throw new Error(`Item with ID ${item.ItemId} not found.`);
      }

      await execute(
        `UPDATE Items
         SET ItemName = @ItemName,
             CategoryId = @CategoryId,
             ItemCode = @ItemCode,
             UnitType = @UnitType,
             TotalQuantity = @TotalQuantity,
             RentalPrice = @RentalPrice,
             SecurityDeposit = @SecurityDeposit,
             Description = @Description,
             ImageUrl = @ImageUrl,
             UpdatedAt = SYSUTCDATETIME()
         WHERE ItemId = @ItemId`,
        {
          ItemId: item.ItemId,
          ItemName: item.ItemName,
          CategoryId: item.CategoryId,
          ItemCode: item.ItemCode,
          UnitType: item.UnitType,
          TotalQuantity: item.TotalQuantity,
          RentalPrice: item.RentalPrice,
          SecurityDeposit: item.SecurityDeposit,
          Description: item.Description,
          ImageUrl: item.ImageUrl
        }
      );
    } catch (err: any) {
      logger.error(`[ItemRepository.updateItem] Database update failed: ${err.message}`);
      const isDuplicate = err.number === 2627 || err.number === 2601 ||
                          err.originalError?.number === 2627 || err.originalError?.number === 2601 ||
                          (err.message && (err.message.includes('Violation of UNIQUE KEY') || err.message.includes('duplicate key')));
      if (isDuplicate) {
        throw new ItemRepositoryError(`Duplicate item violation: Item code '${item.ItemCode}' already exists.`, err);
      }
      // Throw the direct "not found" error if that's what was raised
      if (err.message && err.message.includes('not found')) {
        throw new ItemRepositoryError(err.message, err);
      }
      throw new ItemRepositoryError(`Failed to update item record: ${err.message}`, err);
    }
  }

  /**
   * Activates or deactivates an item by setting Status for the specified ItemId.
   * Physical deletion is never performed on this table.
   *
   * SQL Query:
   * UPDATE Items
   * SET Status = @Status,
   *     UpdatedAt = SYSUTCDATETIME()
   * WHERE ItemId = @ItemId
   */
  static async updateItemStatus(id: number, status: 'Active' | 'Inactive'): Promise<void> {
    try {
      const { rowsAffected } = await execute(
        `UPDATE Items
         SET Status = @Status,
             UpdatedAt = SYSUTCDATETIME()
         WHERE ItemId = @ItemId`,
        {
          ItemId: id,
          Status: status
        }
      );

      if (rowsAffected === 0) {
        throw new Error(`Item with ID ${id} not found.`);
      }
    } catch (err: any) {
      logger.error(`[ItemRepository.updateItemStatus] Database operation failed: ${err.message}`);
      if (err.message && err.message.includes('not found')) {
        throw new ItemRepositoryError(err.message, err);
      }
      throw new ItemRepositoryError(`Failed to update item status: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getItemById(id: number): Promise<ItemWithCategory | null> {
    return ItemRepository.getItemById(id);
  }

  async getItemByCode(itemCode: string): Promise<Item | null> {
    return ItemRepository.getItemByCode(itemCode);
  }

  async getAllItems(): Promise<ItemWithCategory[]> {
    return ItemRepository.getAllItems();
  }

  async createItem(item: Omit<Item, 'ItemId' | 'Status' | 'CreatedAt' | 'UpdatedAt'>): Promise<Item> {
    return ItemRepository.createItem(item);
  }

  async updateItem(
    item: Pick<
      Item,
      | 'ItemId'
      | 'ItemName'
      | 'CategoryId'
      | 'ItemCode'
      | 'UnitType'
      | 'TotalQuantity'
      | 'RentalPrice'
      | 'SecurityDeposit'
      | 'Description'
      | 'ImageUrl'
    >
  ): Promise<void> {
    return ItemRepository.updateItem(item);
  }

  async updateItemStatus(id: number, status: 'Active' | 'Inactive'): Promise<void> {
    return ItemRepository.updateItemStatus(id, status);
  }
}
