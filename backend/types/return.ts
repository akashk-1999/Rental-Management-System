import { RentalStatus } from './rental';

export interface ReturnEvent {
  ReturnEventId: number;
  RentalLineItemId: number;
  ReturnDate: Date;
  QuantityReturned: number;
  QuantityDamaged: number;
  QuantityMissing: number;
  DamageStatus: 'Repairable' | 'Damaged' | 'Lost' | null;
  Notes: string | null;
  RecordedByUserId: number;
  DeleteStatus: boolean;
  CreatedAt: Date;
}

// --- API-facing request shapes ---

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

// --- API-facing response DTOs ---

export interface SafeReturnableRental {
  rentalId: number;
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  rentalStartDate: string;
  expectedReturnDate: string;
  status: RentalStatus;
}

export interface SafeReturnLineItem {
  rentalLineItemId: number;
  itemId: number;
  itemName: string;
  quantityRented: number;
  quantityAlreadyReturned: number;
  quantityRemaining: number;
  rentalPrice: number;
}

export interface SafeReturnRentalDetail {
  rentalId: number;
  rentalCode: string;
  customerId: number;
  customerName: string;
  mobileNumber: string;
  rentalStartDate: string;
  expectedReturnDate: string;
  status: RentalStatus;
  notes: string | null;
  lineItems: SafeReturnLineItem[];
}

export interface SafeReturnResult {
  rentalId: number;
  rentalCode: string;
  status: RentalStatus;
  returnDate: string;
  lineItems: SafeReturnLineItem[];
}
