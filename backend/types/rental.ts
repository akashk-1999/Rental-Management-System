export type RentalStatus = 'Active' | 'PartialReturn' | 'Returned' | 'Overdue' | 'Cancelled';
export type RentalPaymentStatus = 'Paid' | 'Partial' | 'Pending';

export interface Customer {
  CustomerId: number;
  CustomerName: string;
  MobileNumber: string;
  AlternateNumber: string | null;
  Address: string | null;
  IdProof: string | null;
  Notes: string | null;
  DeleteStatus: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export interface Rental {
  RentalId: number;
  RentalCode: string;
  CustomerId: number;
  RentalStartDate: Date;
  ExpectedReturnDate: Date;
  Status: RentalStatus;
  TotalAmount: number;
  AdvancePaid: number;
  SecurityDepositPaid: number;
  PaymentStatus: RentalPaymentStatus;
  Notes: string | null;
  CreatedByUserId: number;
  DeleteStatus: boolean;
  CreatedAt: Date;
  UpdatedAt: Date | null;
}

export interface RentalLineItem {
  RentalLineItemId: number;
  RentalId: number;
  ItemId: number;
  QuantityRented: number;
  UnitPrice: number;
  LineTotal: number;
  DeleteStatus: boolean;
  CreatedAt: Date;
}

// --- API-facing request shapes ---

export interface CustomerInput {
  customerName: string;
  mobileNumber: string;
  alternateNumber?: string | null;
  address?: string | null;
  idProof?: string | null;
  notes?: string | null;
}

export interface RentalLineItemInput {
  itemId: number;
  quantityRented: number;
}

export interface CreateRentalInput {
  customer: CustomerInput;
  rentalStartDate: string;
  expectedReturnDate: string;
  advancePaid?: number;
  securityDepositPaid?: number;
  notes?: string | null;
  lineItems: RentalLineItemInput[];
}

// --- API-facing response DTOs ---

export interface SafeRentalLineItem {
  rentalLineItemId: number;
  itemId: number;
  itemName: string;
  itemCode: string | null;
  unitType: string;
  quantityRented: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SafeRentalSummary {
  rentalId: number;
  rentalCode: string;
  customerId: number;
  customerName: string;
  mobileNumber: string;
  rentalStartDate: string;
  expectedReturnDate: string;
  status: RentalStatus;
  totalAmount: number;
  advancePaid: number;
  securityDepositPaid: number;
  paymentStatus: RentalPaymentStatus;
  notes: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface SafeRental extends SafeRentalSummary {
  lineItems: SafeRentalLineItem[];
}
