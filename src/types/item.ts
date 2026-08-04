export interface Item extends Record<string, unknown> {
  itemId: number;
  itemName: string;
  categoryId: number;
  categoryName: string;
  itemCode: string | null;
  unitType: string;
  totalQuantity: number;
  availableStock: number;
  rentalPrice: number;
  securityDeposit: number | null;
  description: string | null;
  imageUrl: string | null;
  status: "Active" | "Inactive";
  createdAt: string;
  updatedAt: string | null;
}

export interface GetItemsResponse {
  success: boolean;
  data: Item[];
}

export interface GetItemResponse {
  success: boolean;
  data: Item;
}

export interface CreateItemInput {
  itemName: string;
  categoryId: number;
  itemCode?: string | null;
  unitType?: string;
  totalQuantity?: number;
  rentalPrice?: number;
  securityDeposit?: number | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface UpdateItemInput {
  itemName: string;
  categoryId: number;
  itemCode?: string | null;
  unitType?: string;
  totalQuantity?: number;
  rentalPrice?: number;
  securityDeposit?: number | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface UpdateItemStatusInput {
  status: "Active" | "Inactive";
}
