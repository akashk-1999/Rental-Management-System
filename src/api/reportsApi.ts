import apiClient from "./apiClient";
import type {
  RentalReportRow,
  PaymentReportRow,
  ReturnReportRow,
  InventoryReportRow,
  CustomerHistoryReport,
  RentalReportFilters,
  PaymentReportFilters,
  ReturnReportFilters,
  InventoryReportFilters,
  CustomerHistoryFilters,
  GetRentalReportResponse,
  GetPaymentReportResponse,
  GetReturnReportResponse,
  GetInventoryReportResponse,
  GetCustomerHistoryResponse,
} from "../types/report";

async function getRentalReport(filters: RentalReportFilters): Promise<RentalReportRow[]> {
  const response = await apiClient.get<GetRentalReportResponse>("/reports/rentals", { params: filters });
  return response.data.data;
}

async function getPaymentReport(filters: PaymentReportFilters): Promise<PaymentReportRow[]> {
  const response = await apiClient.get<GetPaymentReportResponse>("/reports/payments", { params: filters });
  return response.data.data;
}

async function getReturnReport(filters: ReturnReportFilters): Promise<ReturnReportRow[]> {
  const response = await apiClient.get<GetReturnReportResponse>("/reports/returns", { params: filters });
  return response.data.data;
}

async function getInventoryReport(filters: InventoryReportFilters): Promise<InventoryReportRow[]> {
  const response = await apiClient.get<GetInventoryReportResponse>("/reports/inventory", { params: filters });
  return response.data.data;
}

async function getCustomerHistory(
  customerId: number,
  filters: CustomerHistoryFilters
): Promise<CustomerHistoryReport> {
  const response = await apiClient.get<GetCustomerHistoryResponse>(`/reports/customer-history/${customerId}`, {
    params: filters,
  });
  return response.data.data;
}

export const reportsApi = {
  getRentalReport,
  getPaymentReport,
  getReturnReport,
  getInventoryReport,
  getCustomerHistory,
};
