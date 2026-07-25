export interface CustomerLookupMatch {
  customerId: number;
  customerName: string;
  mobileNumber: string;
  alternateNumber: string | null;
  address: string | null;
  idProof: string | null;
  notes: string | null;
}

export interface CustomerLookupResult {
  found: boolean;
  customer?: CustomerLookupMatch;
}

export interface CustomerLookupResponse {
  success: boolean;
  data: CustomerLookupResult;
}
