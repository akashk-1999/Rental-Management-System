import type { FormEvent } from "react";
import { useMemo, useRef, useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import RentalLineItems, { RentalLineItemDraft } from "./RentalLineItems";
import { Item } from "../../types/item";
import { customersApi } from "../../api/customersApi";

export interface RentalFormValues {
  customerName: string;
  mobileNumber: string;
  alternateNumber: string;
  address: string;
  idProof: string;
  customerNotes: string;
  rentalStartDate: string;
  rentalStartTime: string;
  expectedReturnDate: string;
  expectedReturnTime: string;
  advancePaid: string;
  securityDepositPaid: string;
  rentalNotes: string;
  lineItems: RentalLineItemDraft[];
}

interface RentalFormProps {
  items: Item[];
  loading?: boolean;
  onSubmit: (formData: RentalFormValues) => void;
}

const DEFAULT_VALUES: RentalFormValues = {
  customerName: "",
  mobileNumber: "",
  alternateNumber: "",
  address: "",
  idProof: "",
  customerNotes: "",
  rentalStartDate: "",
  rentalStartTime: "",
  expectedReturnDate: "",
  expectedReturnTime: "",
  advancePaid: "",
  securityDepositPaid: "",
  rentalNotes: "",
  lineItems: [],
};

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function RentalForm({ items, loading = false, onSubmit }: RentalFormProps) {
  const [values, setValues] = useState<RentalFormValues>(() => {
    const todayStr = getTodayDateString();
    const nowTimeStr = getCurrentTimeString();
    return {
      ...DEFAULT_VALUES,
      rentalStartDate: todayStr,
      rentalStartTime: nowTimeStr,
      expectedReturnDate: addDays(todayStr, 1),
      expectedReturnTime: nowTimeStr,
    };
  });
  const [lineItemsError, setLineItemsError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);

  const handleChange = <K extends keyof RentalFormValues>(field: K, value: RentalFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  // Changing the start date can invalidate an already-picked return date; clear it rather than
  // silently keep an expected return date that's no longer after the (new) start date.
  const handleRentalStartDateChange = (newDate: string) => {
    setValues((prev) => ({
      ...prev,
      rentalStartDate: newDate,
      expectedReturnDate:
        prev.expectedReturnDate !== "" && prev.expectedReturnDate <= newDate ? "" : prev.expectedReturnDate,
    }));
  };

  const minExpectedReturnDate = values.rentalStartDate ? addDays(values.rentalStartDate, 1) : undefined;

  // Avoids repeating the same lookup call (e.g. tabbing through fields without changing the number).
  const lastLookedUpMobileRef = useRef<string | null>(null);

  // Looks up an existing customer by mobile number once the field is complete (10 digits) and
  // loses focus, autofilling the rest of the customer section. Only fills fields that are still
  // empty, so it never overwrites something the user has already typed. Silently does nothing on
  // no-match or failure — this is a convenience lookup, not a required step.
  const handleMobileNumberBlur = async () => {
    if (values.mobileNumber.length !== 10) {
      return;
    }
    if (lastLookedUpMobileRef.current === values.mobileNumber) {
      return;
    }
    lastLookedUpMobileRef.current = values.mobileNumber;

    try {
      const result = await customersApi.lookupByMobile(`+91${values.mobileNumber}`);
      if (!result.found || !result.customer) {
        return;
      }

      const customer = result.customer;
      const strippedAlternate = customer.alternateNumber ? customer.alternateNumber.replace(/^\+91/, "") : "";

      setValues((prev) => ({
        ...prev,
        customerName: prev.customerName === "" ? customer.customerName : prev.customerName,
        alternateNumber: prev.alternateNumber === "" ? strippedAlternate : prev.alternateNumber,
        address: prev.address === "" ? customer.address ?? "" : prev.address,
        idProof: prev.idProof === "" ? customer.idProof ?? "" : prev.idProof,
        customerNotes: prev.customerNotes === "" ? customer.notes ?? "" : prev.customerNotes,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  // Mobile/alternate numbers are stored as bare 10-digit strings; the +91 prefix is purely
  // presentational (via Input's prefix prop) and gets prepended on submit.
  const handlePhoneChange = (field: "mobileNumber" | "alternateNumber", rawValue: string) => {
    handleChange(field, rawValue.replace(/\D/g, "").slice(0, 10));
  };

  // Advance/security deposit amounts are capped at 8 digits before the decimal point.
  const handleAmountChange = (field: "advancePaid" | "securityDepositPaid", rawValue: string) => {
    const integerDigits = rawValue.split(".")[0].replace(/[^0-9]/g, "");
    if (integerDigits.length > 8) {
      return;
    }
    handleChange(field, rawValue);
  };

  const totalAmount = useMemo(() => {
    return values.lineItems.reduce((sum, lineItem) => {
      if (lineItem.itemId === "" || lineItem.quantityRented === "") {
        return sum;
      }
      const item = items.find((candidate) => candidate.itemId === lineItem.itemId);
      return item ? sum + item.rentalPrice * Number(lineItem.quantityRented) : sum;
    }, 0);
  }, [values.lineItems, items]);

  const advancePaidNumber = values.advancePaid.trim() === "" ? 0 : Number(values.advancePaid);
  const safeAdvancePaid = Number.isNaN(advancePaidNumber) ? 0 : advancePaidNumber;
  const balance = totalAmount - safeAdvancePaid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (values.rentalStartDate !== "" && values.rentalStartDate < getTodayDateString()) {
      setDateError("Rental start date cannot be in the past.");
      return;
    }
    if (values.expectedReturnDate !== "" && values.expectedReturnDate <= values.rentalStartDate) {
      setDateError("Expected return date must be after the rental start date.");
      return;
    }
    setDateError(null);

    const validLineItems = values.lineItems.filter(
      (lineItem) => lineItem.itemId !== "" && lineItem.quantityRented !== "" && Number(lineItem.quantityRented) > 0
    );
    if (validLineItems.length === 0) {
      setLineItemsError("Add at least one rental item with a valid quantity.");
      return;
    }
    setLineItemsError(null);

    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Customer Information
        </h3>
        <div className="space-y-5">
          <Input
            id="customerName"
            label="Customer Name"
            type="text"
            value={values.customerName}
            onChange={(e) => handleChange("customerName", e.target.value)}
            disabled={loading}
            placeholder="Enter customer name"
            required
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              id="mobileNumber"
              label="Mobile Number"
              type="tel"
              inputMode="numeric"
              prefix="+91"
              pattern="[0-9]{10}"
              title="Enter a 10-digit mobile number"
              value={values.mobileNumber}
              onChange={(e) => handlePhoneChange("mobileNumber", e.target.value)}
              onBlur={handleMobileNumberBlur}
              disabled={loading}
              placeholder="10-digit mobile number"
              required
            />

            <Input
              id="alternateNumber"
              label="Alternate Number"
              type="tel"
              inputMode="numeric"
              prefix="+91"
              pattern="[0-9]{10}"
              title="Enter a 10-digit mobile number"
              value={values.alternateNumber}
              onChange={(e) => handlePhoneChange("alternateNumber", e.target.value)}
              disabled={loading}
              placeholder="10-digit mobile number (optional)"
            />
          </div>

          <Input
            id="address"
            label="Address"
            type="text"
            value={values.address}
            onChange={(e) => handleChange("address", e.target.value)}
            disabled={loading}
            placeholder="Enter address (optional)"
          />

          <Input
            id="idProof"
            label="ID Proof"
            type="text"
            value={values.idProof}
            onChange={(e) => handleChange("idProof", e.target.value)}
            disabled={loading}
            placeholder="Enter ID proof detail (optional)"
          />

          <div>
            <label htmlFor="customerNotes" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
              Notes
            </label>
            <textarea
              id="customerNotes"
              value={values.customerNotes}
              onChange={(e) => handleChange("customerNotes", e.target.value)}
              disabled={loading}
              placeholder="Enter customer notes (optional)"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Rental Information
        </h3>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="rentalStartDate"
              label="Rental Start Date"
              type="date"
              min={getTodayDateString()}
              value={values.rentalStartDate}
              onChange={(e) => handleRentalStartDateChange(e.target.value)}
              disabled={loading}
              required
            />
            <Input
              id="rentalStartTime"
              label="Rental Start Time"
              type="time"
              value={values.rentalStartTime}
              onChange={(e) => handleChange("rentalStartTime", e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="expectedReturnDate"
              label="Expected Return Date"
              type="date"
              min={minExpectedReturnDate}
              value={values.expectedReturnDate}
              onChange={(e) => handleChange("expectedReturnDate", e.target.value)}
              disabled={loading}
              required
            />
            <Input
              id="expectedReturnTime"
              label="Expected Return Time"
              type="time"
              value={values.expectedReturnTime}
              onChange={(e) => handleChange("expectedReturnTime", e.target.value)}
              disabled={loading}
              required
            />
          </div>
          {dateError && <p className="text-xs text-rose-600 dark:text-rose-400">{dateError}</p>}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              id="advancePaid"
              label="Advance Paid"
              type="number"
              min={0}
              max={99999999.99}
              step="0.01"
              value={values.advancePaid}
              onChange={(e) => handleAmountChange("advancePaid", e.target.value)}
              disabled={loading}
              placeholder="0.00 (optional)"
            />
            <Input
              id="securityDepositPaid"
              label="Security Deposit Paid"
              type="number"
              min={0}
              max={99999999.99}
              step="0.01"
              value={values.securityDepositPaid}
              onChange={(e) => handleAmountChange("securityDepositPaid", e.target.value)}
              disabled={loading}
              placeholder="0.00 (optional)"
            />
          </div>

          <div>
            <label htmlFor="rentalNotes" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
              Notes
            </label>
            <textarea
              id="rentalNotes"
              value={values.rentalNotes}
              onChange={(e) => handleChange("rentalNotes", e.target.value)}
              disabled={loading}
              placeholder="Enter rental notes (optional)"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700"
            />
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Rental Items
        </h3>
        <RentalLineItems
          items={items}
          lineItems={values.lineItems}
          onChange={(lineItems) => handleChange("lineItems", lineItems)}
          disabled={loading}
        />
        {lineItemsError && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{lineItemsError}</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">₹{totalAmount.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400">Advance Paid</span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">₹{safeAdvancePaid.toFixed(2)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
          <span className="font-medium text-slate-700 dark:text-slate-300">Balance</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{balance.toFixed(2)}</span>
        </div>
      </section>

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Create Rental
        </Button>
      </div>
    </form>
  );
}
