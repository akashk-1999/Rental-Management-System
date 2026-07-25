export interface SafeCustomer {
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
  customer?: SafeCustomer;
}
