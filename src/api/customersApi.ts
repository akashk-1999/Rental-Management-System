import apiClient from "./apiClient";
import type { CustomerLookupResponse, CustomerLookupResult } from "../types/customer";

async function lookupByMobile(mobileNumber: string): Promise<CustomerLookupResult> {
  const response = await apiClient.get<CustomerLookupResponse>("/customers/lookup", {
    params: { mobile: mobileNumber },
  });
  return response.data.data;
}

export const customersApi = {
  lookupByMobile,
};
