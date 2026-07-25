export interface Category extends Record<string, unknown> {
  categoryId: number;
  categoryName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface GetCategoriesResponse {
  success: boolean;
  data: Category[];
}

export interface GetCategoryResponse {
  success: boolean;
  data: Category;
}

export interface CreateCategoryInput {
  categoryName: string;
}

export interface UpdateCategoryInput {
  categoryName: string;
}

export interface UpdateCategoryStatusInput {
  isActive: boolean;
}
