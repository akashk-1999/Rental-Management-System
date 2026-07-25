import apiClient from "./apiClient";
import type {
  PaymentSummary,
  PaymentRentalDetail,
  GetPaymentSummariesResponse,
  GetPaymentRentalDetailResponse,
  CreatePaymentInput,
} from "../types/payment";

interface CreatePaymentResponse {
  success: boolean;
  data: PaymentRentalDetail;
}

async function getPaymentSummaries(): Promise<PaymentSummary[]> {
  const response = await apiClient.get<GetPaymentSummariesResponse>("/payments");
  return response.data.data;
}

async function getRentalPaymentDetail(rentalId: number): Promise<PaymentRentalDetail> {
  const response = await apiClient.get<GetPaymentRentalDetailResponse>(`/payments/${rentalId}`);
  return response.data.data;
}

async function createPayment(input: CreatePaymentInput): Promise<PaymentRentalDetail> {
  const response = await apiClient.post<CreatePaymentResponse>("/payments", input);
  return response.data.data;
}

export const paymentsApi = {
  getPaymentSummaries,
  getRentalPaymentDetail,
  createPayment,
};
