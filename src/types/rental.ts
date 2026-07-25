export type RentalStatus = "Active" | "PartialReturn" | "Returned" | "Overdue" | "Cancelled";
export type RentalPaymentStatus = "Paid" | "Partial" | "Pending";

export interface RentalLineItem {
  rentalLineItemId: number;
  itemId: number;
  itemName: string;
  itemCode: string | null;
  unitType: string;
  quantityRented: number;
  unitPrice: number;
  lineTotal: number;
}

export interface RentalSummary extends Record<string, unknown> {
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

export interface Rental extends RentalSummary {
  lineItems: RentalLineItem[];
}

export interface GetRentalsResponse {
  success: boolean;
  data: RentalSummary[];
}

export interface GetRentalResponse {
  success: boolean;
  data: Rental;
}

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
