import { query, execute } from '../config/db';
import logger from '../utils/logger';

export interface CategoryRecord {
  CategoryId: number;
  CategoryName: string;
  IsActive: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export class CategoryRepositoryError extends Error {
  constructor(message: string, public readonly originalError?: any) {
    super(message);
    this.name = 'CategoryRepositoryError';
  }
}

/**
 * CategoryRepository provides SQL Server direct operations for managing the ItemCategories table.
 * All queries are strictly parameterized and type-safe.
 */
export class CategoryRepository {
  /**
   * Retrieves a single category record by its unique integer primary key (CategoryId).
   *
   * SQL Query:
   * SELECT CategoryId, CategoryName, IsActive, CreatedAt, UpdatedAt
   * FROM ItemCategories
   * WHERE CategoryId = @CategoryId
   */
  static async getCategoryById(id: number): Promise<CategoryRecord | null> {
    try {
      const rows = await query<CategoryRecord>(
        `SELECT CategoryId, CategoryName, IsActive, CreatedAt, UpdatedAt
         FROM ItemCategories
         WHERE CategoryId = @CategoryId`,
        { CategoryId: id }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[CategoryRepository.getCategoryById] Database query failed: ${err.message}`);
      throw new CategoryRepositoryError(`Failed to retrieve category by ID: ${err.message}`, err);
    }
  }

  /**
   * Retrieves a single category record by its unique CategoryName identifier.
   *
   * SQL Query:
   * SELECT CategoryId, CategoryName, IsActive, CreatedAt, UpdatedAt
   * FROM ItemCategories
   * WHERE CategoryName = @CategoryName
   */
  static async getCategoryByName(categoryName: string): Promise<CategoryRecord | null> {
    try {
      const rows = await query<CategoryRecord>(
        `SELECT CategoryId, CategoryName, IsActive, CreatedAt, UpdatedAt
         FROM ItemCategories
         WHERE CategoryName = @CategoryName`,
        { CategoryName: categoryName }
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err: any) {
      logger.error(`[CategoryRepository.getCategoryByName] Database query failed: ${err.message}`);
      throw new CategoryRepositoryError(`Failed to retrieve category by name: ${err.message}`, err);
    }
  }

  /**
   * Retrieves all category records from the ItemCategories table, ordered alphabetically by CategoryName.
   * Inactive categories are included so they remain visible for reactivation.
   *
   * SQL Query:
   * SELECT CategoryId, CategoryName, IsActive, CreatedAt, UpdatedAt
   * FROM ItemCategories
   * ORDER BY CategoryName ASC
   */
  static async getAllCategories(): Promise<CategoryRecord[]> {
    try {
      const rows = await query<CategoryRecord>(
        `SELECT CategoryId, CategoryName, IsActive, CreatedAt, UpdatedAt
         FROM ItemCategories
         ORDER BY CategoryName ASC`
      );
      return rows;
    } catch (err: any) {
      logger.error(`[CategoryRepository.getAllCategories] Database query failed: ${err.message}`);
      throw new CategoryRepositoryError(`Failed to retrieve all categories: ${err.message}`, err);
    }
  }

  /**
   * Inserts a new category record into the ItemCategories table and returns the fully initialized entity.
   * Leverages SQL Server's OUTPUT clause for atomic creation and field retrieval in a single query.
   *
   * SQL Query:
   * INSERT INTO ItemCategories (CategoryName, IsActive)
   * OUTPUT INSERTED.CategoryId, INSERTED.CategoryName, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
   * VALUES (@CategoryName, 1)
   */
  static async createCategory(category: Pick<CategoryRecord, 'CategoryName'>): Promise<CategoryRecord> {
    try {
      const rows = await query<CategoryRecord>(
        `INSERT INTO ItemCategories (CategoryName, IsActive)
         OUTPUT INSERTED.CategoryId, INSERTED.CategoryName, INSERTED.IsActive, INSERTED.CreatedAt, INSERTED.UpdatedAt
         VALUES (@CategoryName, 1)`,
        { CategoryName: category.CategoryName }
      );

      if (rows.length === 0) {
        throw new Error('No row returned from insert execution.');
      }
      return rows[0];
    } catch (err: any) {
      logger.error(`[CategoryRepository.createCategory] Database insertion failed: ${err.message}`);
      const isDuplicate = err.number === 2627 || err.number === 2601 ||
                          err.originalError?.number === 2627 || err.originalError?.number === 2601 ||
                          (err.message && (err.message.includes('Violation of UNIQUE KEY') || err.message.includes('duplicate key')));
      if (isDuplicate) {
        throw new CategoryRepositoryError(`Duplicate category violation: Category name '${category.CategoryName}' already exists.`, err);
      }
      throw new CategoryRepositoryError(`Failed to create category record: ${err.message}`, err);
    }
  }

  /**
   * Updates the CategoryName of an existing category and timestamps the change. Checks existence
   * first to distinguish between 'Category not found' and a successful update.
   *
   * SQL Query:
   * UPDATE ItemCategories
   * SET CategoryName = @CategoryName,
   *     UpdatedAt = SYSUTCDATETIME()
   * WHERE CategoryId = @CategoryId
   */
  static async updateCategory(category: Pick<CategoryRecord, 'CategoryId' | 'CategoryName'>): Promise<void> {
    try {
      // Pre-check category existence to distinguish "not found" vs "successful update"
      const existingCategory = await CategoryRepository.getCategoryById(category.CategoryId);
      if (!existingCategory) {
        throw new Error(`Category with ID ${category.CategoryId} not found.`);
      }

      await execute(
        `UPDATE ItemCategories
         SET CategoryName = @CategoryName,
             UpdatedAt = SYSUTCDATETIME()
         WHERE CategoryId = @CategoryId`,
        {
          CategoryId: category.CategoryId,
          CategoryName: category.CategoryName
        }
      );
    } catch (err: any) {
      logger.error(`[CategoryRepository.updateCategory] Database update failed: ${err.message}`);
      // Throw the direct "not found" error if that's what was raised
      if (err.message && err.message.includes('not found')) {
        throw new CategoryRepositoryError(err.message, err);
      }
      throw new CategoryRepositoryError(`Failed to update category record: ${err.message}`, err);
    }
  }

  /**
   * Activates or deactivates a category by setting IsActive for the specified CategoryId.
   * Physical deletion is never performed on this table.
   *
   * SQL Query:
   * UPDATE ItemCategories
   * SET IsActive = @IsActive,
   *     UpdatedAt = SYSUTCDATETIME()
   * WHERE CategoryId = @CategoryId
   */
  static async updateCategoryStatus(id: number, isActive: boolean): Promise<void> {
    try {
      const { rowsAffected } = await execute(
        `UPDATE ItemCategories
         SET IsActive = @IsActive,
             UpdatedAt = SYSUTCDATETIME()
         WHERE CategoryId = @CategoryId`,
        {
          CategoryId: id,
          IsActive: isActive ? 1 : 0
        }
      );

      if (rowsAffected === 0) {
        throw new Error(`Category with ID ${id} not found.`);
      }
    } catch (err: any) {
      logger.error(`[CategoryRepository.updateCategoryStatus] Database operation failed: ${err.message}`);
      if (err.message && err.message.includes('not found')) {
        throw new CategoryRepositoryError(err.message, err);
      }
      throw new CategoryRepositoryError(`Failed to update category status: ${err.message}`, err);
    }
  }

  // --- Instance Wrapper Methods for Dependency Injection ---

  async getCategoryById(id: number): Promise<CategoryRecord | null> {
    return CategoryRepository.getCategoryById(id);
  }

  async getCategoryByName(categoryName: string): Promise<CategoryRecord | null> {
    return CategoryRepository.getCategoryByName(categoryName);
  }

  async getAllCategories(): Promise<CategoryRecord[]> {
    return CategoryRepository.getAllCategories();
  }

  async createCategory(category: Pick<CategoryRecord, 'CategoryName'>): Promise<CategoryRecord> {
    return CategoryRepository.createCategory(category);
  }

  async updateCategory(category: Pick<CategoryRecord, 'CategoryId' | 'CategoryName'>): Promise<void> {
    return CategoryRepository.updateCategory(category);
  }

  async updateCategoryStatus(id: number, isActive: boolean): Promise<void> {
    return CategoryRepository.updateCategoryStatus(id, isActive);
  }
}
