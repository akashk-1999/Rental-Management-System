import apiClient from "./apiClient";
import type {
  Category,
  GetCategoriesResponse,
  GetCategoryResponse,
  CreateCategoryInput,
  UpdateCategoryInput,
  UpdateCategoryStatusInput,
} from "../types/category";

interface CreateCategoryResponse {
  success: boolean;
  data: Category;
}

interface UpdateCategoryResponse {
  success: boolean;
  data: Category;
}

async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<GetCategoriesResponse>("/categories");
  return response.data.data;
}

async function getCategoryById(categoryId: number): Promise<Category> {
  const response = await apiClient.get<GetCategoryResponse>(`/categories/${categoryId}`);
  return response.data.data;
}

async function createCategory(category: CreateCategoryInput): Promise<Category> {
  const response = await apiClient.post<CreateCategoryResponse>("/categories", category);
  return response.data.data;
}

async function updateCategory(categoryId: number, category: UpdateCategoryInput): Promise<Category> {
  const response = await apiClient.put<UpdateCategoryResponse>(`/categories/${categoryId}`, category);
  return response.data.data;
}

async function updateCategoryStatus(categoryId: number, status: UpdateCategoryStatusInput): Promise<Category> {
  const response = await apiClient.patch<UpdateCategoryResponse>(`/categories/${categoryId}/status`, status);
  return response.data.data;
}

export const categoriesApi = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  updateCategoryStatus,
};
