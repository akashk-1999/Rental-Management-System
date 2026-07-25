import apiClient from "./apiClient";
import type {
  Rental,
  RentalSummary,
  GetRentalsResponse,
  GetRentalResponse,
  CreateRentalInput,
} from "../types/rental";

interface CreateRentalResponse {
  success: boolean;
  data: Rental;
}

async function getRentals(): Promise<RentalSummary[]> {
  const response = await apiClient.get<GetRentalsResponse>("/rentals");
  return response.data.data;
}

async function getRentalById(rentalId: number): Promise<Rental> {
  const response = await apiClient.get<GetRentalResponse>(`/rentals/${rentalId}`);
  return response.data.data;
}

async function createRental(rental: CreateRentalInput): Promise<Rental> {
  const response = await apiClient.post<CreateRentalResponse>("/rentals", rental);
  return response.data.data;
}

export const rentalsApi = {
  getRentals,
  getRentalById,
  createRental,
};
