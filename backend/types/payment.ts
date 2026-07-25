import { RentalPaymentStatus } from './rental';

export type PaymentType = 'Advance' | 'Partial' | 'Final' | 'SecurityDeposit' | 'Refund';

export interface Payment {
  PaymentId: number;
  RentalId: number;
  PaymentDate: Date;
  Amount: number;
  PaymentType: PaymentType;
  PaymentMode: string | null;
  Notes: string | null;
  RecordedByUserId: number;
  CreatedAt: Date;
}

// --- API-facing request shapes ---

export interface CreatePaymentInput {
  rentalId: number;
  paymentDate: string;
  amount: number;
  paymentType: PaymentType;
  paymentMode: string;
  notes?: string | null;
}

// --- API-facing response DTOs ---

export interface SafePaymentSummary {
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

export interface SafePaymentRecord {
  paymentId: number;
  paymentDate: string;
  amount: number;
  paymentType: PaymentType;
  paymentMode: string | null;
  notes: string | null;
  recordedByName: string;
}

export interface SafePaymentRentalDetail {
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
  payments: SafePaymentRecord[];
}
