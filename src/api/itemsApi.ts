import apiClient from "./apiClient";
import type {
  Item,
  GetItemsResponse,
  GetItemResponse,
  CreateItemInput,
  UpdateItemInput,
  UpdateItemStatusInput,
} from "../types/item";

interface CreateItemResponse {
  success: boolean;
  data: Item;
}

interface UpdateItemResponse {
  success: boolean;
  data: Item;
}

async function getItems(): Promise<Item[]> {
  const response = await apiClient.get<GetItemsResponse>("/items");
  return response.data.data;
}

async function getItemById(itemId: number): Promise<Item> {
  const response = await apiClient.get<GetItemResponse>(`/items/${itemId}`);
  return response.data.data;
}

async function createItem(item: CreateItemInput): Promise<Item> {
  const response = await apiClient.post<CreateItemResponse>("/items", item);
  return response.data.data;
}

async function updateItem(itemId: number, item: UpdateItemInput): Promise<Item> {
  const response = await apiClient.put<UpdateItemResponse>(`/items/${itemId}`, item);
  return response.data.data;
}

async function updateItemStatus(itemId: number, status: UpdateItemStatusInput): Promise<Item> {
  const response = await apiClient.patch<UpdateItemResponse>(`/items/${itemId}/status`, status);
  return response.data.data;
}

export const itemsApi = {
  getItems,
  getItemById,
  createItem,
  updateItem,
  updateItemStatus,
};
