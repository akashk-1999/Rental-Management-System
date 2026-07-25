import logger from '../utils/logger';
import { CategoryRepository, CategoryRecord } from '../repositories/categoryRepository';
import { HttpError } from '../errors/HttpError';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../types/category';

/**
 * CategoryService handles business logic for retrieving, creating, and updating item category records.
 *
 * It is framework-independent and relies on constructor injection of CategoryRepository,
 * consistent with the users module.
 */
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository
  ) {}

  /**
   * Utility to map a database CategoryRecord model to a client-facing Category DTO.
   */
  private mapToCategory(category: CategoryRecord): Category {
    return {
      categoryId: category.CategoryId,
      categoryName: category.CategoryName,
      isActive: category.IsActive,
      createdAt: category.CreatedAt.toISOString(),
      updatedAt: category.UpdatedAt ? category.UpdatedAt.toISOString() : null
    };
  }

  /**
   * Retrieves all categories (active and inactive) and maps them into client-facing DTOs.
   */
  async getAllCategories(): Promise<Category[]> {
    const categories = await this.categoryRepository.getAllCategories();
    logger.info(`[CategoryService.getAllCategories] Retrieved ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}.`);
    return categories.map((category) => this.mapToCategory(category));
  }

  /**
   * Retrieves a single category by its ID, throwing a 404 HttpError if it does not exist.
   */
  async getCategoryById(categoryId: number): Promise<Category> {
    const category = await this.categoryRepository.getCategoryById(categoryId);
    if (!category) {
      logger.warn(`[CategoryService.getCategoryById] Category with ID ${categoryId} not found.`);
      throw new HttpError(404, 'Category not found');
    }
    return this.mapToCategory(category);
  }

  /**
   * Creates a new category record. Validates that the category name is present and unique
   * before persisting, and maps the created record to a client-facing DTO before returning.
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const categoryName = input.categoryName?.trim();
    if (!categoryName) {
      logger.warn('[CategoryService.createCategory] Failed to create category: Category name is required.');
      throw new HttpError(400, 'Category name is required');
    }

    const existingCategory = await this.categoryRepository.getCategoryByName(categoryName);
    if (existingCategory) {
      logger.warn(`[CategoryService.createCategory] Failed to create category: Category name '${categoryName}' already exists.`);
      throw new HttpError(409, 'Category name already exists');
    }

    const createdCategory = await this.categoryRepository.createCategory({
      CategoryName: categoryName
    });

    logger.info(`[CategoryService.createCategory] Created new category: ${createdCategory.CategoryId} (${createdCategory.CategoryName}).`);
    return this.mapToCategory(createdCategory);
  }

  /**
   * Updates an existing category's name. Validates that the category exists, the name
   * is present, and the new name doesn't collide with a different existing category.
   */
  async updateCategory(categoryId: number, input: UpdateCategoryInput): Promise<Category> {
    const existingCategory = await this.categoryRepository.getCategoryById(categoryId);
    if (!existingCategory) {
      logger.warn(`[CategoryService.updateCategory] Failed to update category: Category with ID ${categoryId} not found.`);
      throw new HttpError(404, 'Category not found');
    }

    const categoryName = input.categoryName?.trim();
    if (!categoryName) {
      logger.warn('[CategoryService.updateCategory] Failed to update category: Category name is required.');
      throw new HttpError(400, 'Category name is required');
    }

    const categoryWithSameName = await this.categoryRepository.getCategoryByName(categoryName);
    if (categoryWithSameName && categoryWithSameName.CategoryId !== categoryId) {
      logger.warn(`[CategoryService.updateCategory] Failed to update category: Category name '${categoryName}' already exists.`);
      throw new HttpError(409, 'Category name already exists');
    }

    await this.categoryRepository.updateCategory({
      CategoryId: categoryId,
      CategoryName: categoryName
    });

    const updatedCategory = await this.categoryRepository.getCategoryById(categoryId);
    if (!updatedCategory) {
      throw new HttpError(500, 'Failed to retrieve updated category.');
    }

    logger.info(`[CategoryService.updateCategory] Updated category: ${categoryId} (${categoryName}).`);
    return this.mapToCategory(updatedCategory);
  }

  /**
   * Activates or deactivates a category. Physical deletion is never performed;
   * this is the only supported way to remove a category from active use.
   */
  async updateCategoryStatus(categoryId: number, isActive: boolean): Promise<Category> {
    const existingCategory = await this.categoryRepository.getCategoryById(categoryId);
    if (!existingCategory) {
      logger.warn(`[CategoryService.updateCategoryStatus] Failed to update status: Category with ID ${categoryId} not found.`);
      throw new HttpError(404, 'Category not found');
    }

    if (typeof isActive !== 'boolean') {
      logger.warn(`[CategoryService.updateCategoryStatus] Failed to update status: isActive must be a boolean value.`);
      throw new HttpError(400, 'isActive must be a boolean value');
    }

    await this.categoryRepository.updateCategoryStatus(categoryId, isActive);

    const updatedCategory = await this.categoryRepository.getCategoryById(categoryId);
    if (!updatedCategory) {
      throw new HttpError(500, 'Failed to retrieve updated category.');
    }

    logger.info(`[CategoryService.updateCategoryStatus] ${isActive ? 'Activated' : 'Deactivated'} category: ${categoryId} (${existingCategory.CategoryName}).`);
    return this.mapToCategory(updatedCategory);
  }
}
