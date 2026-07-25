import { RentalStatus } from "./rental";

export interface ReturnableRental extends Record<string, unknown> {
  rentalId: number;
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  rentalStartDate: string;
  expectedReturnDate: string;
  status: RentalStatus;
}

export interface ReturnLineItem {
  rentalLineItemId: number;
  itemId: number;
  itemName: string;
  quantityRented: number;
  quantityAlreadyReturned: number;
  quantityRemaining: number;
  rentalPrice: number;
}

export interface ReturnRentalDetail {
  rentalId: number;
  rentalCode: string;
  customerId: number;
  customerName: string;
  mobileNumber: string;
  rentalStartDate: string;
  expectedReturnDate: string;
  status: RentalStatus;
  notes: string | null;
  lineItems: ReturnLineItem[];
}

export interface ReturnResult {
  rentalId: number;
  rentalCode: string;
  status: RentalStatus;
  returnDate: string;
  lineItems: ReturnLineItem[];
}

export interface GetReturnableRentalsResponse {
  success: boolean;
  data: ReturnableRental[];
}

export interface GetReturnRentalDetailResponse {
  success: boolean;
  data: ReturnRentalDetail;
}

export interface ReturnedItemInput {
  rentalLineItemId: number;
  quantityReturned: number;
}

export interface CreateReturnInput {
  rentalId: number;
  returnDate: string;
  notes?: string | null;
  returnedItems: ReturnedItemInput[];
}
