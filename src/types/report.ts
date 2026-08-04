import { RentalStatus, RentalPaymentStatus } from "./rental";
import { PaymentType } from "./payment";

// --- Filter (request) shapes ---

export interface RentalReportFilters {
  startDate?: string;
  endDate?: string;
  status?: RentalStatus | "";
  customer?: string;
}

export interface PaymentReportFilters {
  startDate?: string;
  endDate?: string;
  paymentMode?: string;
  paymentType?: PaymentType | "";
  customer?: string;
}

export interface ReturnReportFilters {
  startDate?: string;
  endDate?: string;
  customer?: string;
  item?: string;
}

export interface InventoryReportFilters {
  categoryId?: string;
  status?: "Active" | "Inactive" | "";
}

export interface CustomerHistoryFilters {
  startDate?: string;
  endDate?: string;
  status?: RentalStatus | "";
}

// --- Response row DTOs ---

export interface RentalReportRow extends Record<string, unknown> {
  rentalId: number;
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  rentalStartDate: string;
  expectedReturnDate: string;
  status: RentalStatus;
  totalAmount: number;
  advancePaid: number;
  securityDepositPaid: number;
  amountPaid: number;
  outstandingBalance: number;
  paymentStatus: RentalPaymentStatus;
  createdAt: string;
}

export interface PaymentReportRow extends Record<string, unknown> {
  paymentId: number;
  paymentDate: string;
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  amount: number;
  paymentType: PaymentType;
  paymentMode: string | null;
  recordedByName: string;
}

export interface ReturnReportRow extends Record<string, unknown> {
  returnEventId: number;
  returnDate: string;
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  itemName: string;
  quantityReturned: number;
  quantityDamaged: number;
  quantityMissing: number;
  damageStatus: "Repairable" | "Damaged" | "Lost" | null;
}

export interface InventoryReportRow extends Record<string, unknown> {
  itemId: number;
  itemName: string;
  categoryName: string;
  itemCode: string | null;
  unitType: string;
  status: "Active" | "Inactive";
  totalQuantity: number;
  currentlyRented: number;
  damagedStock: number;
  lostStock: number;
  availableStock: number;
}

export interface CustomerHistorySummary {
  totalRentals: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface CustomerHistoryReport {
  customerId: number;
  customerName: string;
  mobileNumber: string;
  summary: CustomerHistorySummary;
  rentals: RentalReportRow[];
}

// --- API response wrappers ---

export interface GetRentalReportResponse {
  success: boolean;
  data: RentalReportRow[];
}

export interface GetPaymentReportResponse {
  success: boolean;
  data: PaymentReportRow[];
}

export interface GetReturnReportResponse {
  success: boolean;
  data: ReturnReportRow[];
}

export interface GetInventoryReportResponse {
  success: boolean;
  data: InventoryReportRow[];
}

export interface GetCustomerHistoryResponse {
  success: boolean;
  data: CustomerHistoryReport;
}
