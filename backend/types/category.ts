export interface Category {
  categoryId: number;
  categoryName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCategoryInput {
  categoryName: string;
}

export interface UpdateCategoryInput {
  categoryName: string;
}
