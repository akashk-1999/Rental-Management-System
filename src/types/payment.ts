import { RentalPaymentStatus } from "./rental";

export type PaymentType = "Advance" | "Partial" | "Final" | "SecurityDeposit" | "Refund";

export interface PaymentSummary extends Record<string, unknown> {
  rentalId: number;
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  rentalAmount: number;
  advancePaid: number;
  securityDepositPaid: number;
  amountAlreadyPaid: number;
  remainingBalance: number;
  paymentStatus: RentalPaymentStatus;
}

export interface PaymentRecord {
  paymentId: number;
  paymentDate: string;
  amount: number;
  paymentType: PaymentType;
  paymentMode: string | null;
  notes: string | null;
  recordedByName: string;
}

export interface PaymentRentalDetail {
  rentalId: number;
  rentalCode: string;
  customerName: string;
  mobileNumber: string;
  rentalAmount: number;
  advancePaid: number;
  securityDepositPaid: number;
  amountAlreadyPaid: number;
  remainingBalance: number;
  paymentStatus: RentalPaymentStatus;
  payments: PaymentRecord[];
}

export interface GetPaymentSummariesResponse {
  success: boolean;
  data: PaymentSummary[];
}

export interface GetPaymentRentalDetailResponse {
  success: boolean;
  data: PaymentRentalDetail;
}

export interface CreatePaymentInput {
  rentalId: number;
  paymentDate: string;
  amount: number;
  paymentType: PaymentType;
  paymentMode: string;
  notes?: string | null;
}
