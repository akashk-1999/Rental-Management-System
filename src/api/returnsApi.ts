import apiClient from "./apiClient";
import type {
  ReturnableRental,
  ReturnRentalDetail,
  ReturnResult,
  GetReturnableRentalsResponse,
  GetReturnRentalDetailResponse,
  CreateReturnInput,
} from "../types/return";

interface CreateReturnResponse {
  success: boolean;
  data: ReturnResult;
}

async function getReturnableRentals(): Promise<ReturnableRental[]> {
  const response = await apiClient.get<GetReturnableRentalsResponse>("/returns/rentals");
  return response.data.data;
}

async function getRentalForReturn(rentalId: number): Promise<ReturnRentalDetail> {
  const response = await apiClient.get<GetReturnRentalDetailResponse>(`/returns/rentals/${rentalId}`);
  return response.data.data;
}

async function createReturn(input: CreateReturnInput): Promise<ReturnResult> {
  const response = await apiClient.post<CreateReturnResponse>("/returns", input);
  return response.data.data;
}

export const returnsApi = {
  getReturnableRentals,
  getRentalForReturn,
  createReturn,
};
