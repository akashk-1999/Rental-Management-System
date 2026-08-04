import apiClient from "./apiClient";
import type {
  DashboardOverview,
  DashboardPeriod,
  DashboardRentalFilter,
  DashboardRentalListItem,
  GetDashboardOverviewResponse,
  GetDashboardRentalsResponse,
} from "../types/dashboard";

async function getDashboardOverview(period: DashboardPeriod): Promise<DashboardOverview> {
  const response = await apiClient.get<GetDashboardOverviewResponse>("/dashboard", { params: { period } });
  return response.data.data;
}

async function getRentalsByFilter(
  filter: DashboardRentalFilter,
  period: DashboardPeriod
): Promise<DashboardRentalListItem[]> {
  const response = await apiClient.get<GetDashboardRentalsResponse>("/dashboard/rentals", {
    params: { filter, period },
  });
  return response.data.data;
}

export const dashboardApi = {
  getDashboardOverview,
  getRentalsByFilter,
};
