export interface Item {
  ItemId: number;
  ItemName: string;
  CategoryId: number;
  ItemCode: string | null;
  UnitType: string;
  TotalQuantity: number;
  RentalPrice: number;
  SecurityDeposit: number | null;
  Description: string | null;
  ImageUrl: string | null;
  Status: 'Active' | 'Inactive';
  CreatedAt: Date;
  UpdatedAt: Date | null;
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
  status: 'Active' | 'Inactive';
}

export interface SafeItem {
  itemId: number;
  itemName: string;
  categoryId: number;
  categoryName: string;
  itemCode: string | null;
  unitType: string;
  totalQuantity: number;
  rentalPrice: number;
  securityDeposit: number | null;
  description: string | null;
  imageUrl: string | null;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string | null;
}
