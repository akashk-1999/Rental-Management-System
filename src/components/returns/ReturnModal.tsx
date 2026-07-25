import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import ReturnDetails from "./ReturnDetails";
import ReturnItemsTable from "./ReturnItemsTable";
import { ReturnRentalDetail, ReturnedItemInput } from "../../types/return";

export interface ReturnSubmitPayload {
  returnDate: string;
  notes: string | null;
  returnedItems: ReturnedItemInput[];
}

interface ReturnModalProps {
  isOpen: boolean;
  rental: ReturnRentalDetail | null;
  loading?: boolean;
  error?: string | null;
  submitting?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: ReturnSubmitPayload) => void;
}

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ReturnModal({
  isOpen,
  rental,
  loading = false,
  error,
  submitting = false,
  submitError,
  onClose,
  onSubmit,
}: ReturnModalProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [returnDate, setReturnDate] = useState(todayDateString());
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (rental) {
      const initialQuantities: Record<number, number> = {};
      rental.lineItems.forEach((lineItem) => {
        initialQuantities[lineItem.rentalLineItemId] = 0;
      });
      setQuantities(initialQuantities);
      setReturnDate(todayDateString());
      setNotes("");
      setValidationError(null);
    }
  }, [rental]);

  const handleQuantityChange = (rentalLineItemId: number, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [rentalLineItemId]: quantity }));
  };

  const totalItemsBeingReturned = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !rental) return;

    const returnedItems = rental.lineItems
      .map((lineItem) => ({
        rentalLineItemId: lineItem.rentalLineItemId,
        quantityReturned: quantities[lineItem.rentalLineItemId] ?? 0,
      }))
      .filter((entry) => entry.quantityReturned > 0);

    if (returnedItems.length === 0) {
      setValidationError("At least one item must have a return quantity greater than zero.");
      return;
    }

    setValidationError(null);
    onSubmit({ returnDate, notes: notes.trim() || null, returnedItems });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Items" subtitle={rental ? rental.rentalCode : undefined} size="lg">
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading rental..." className="min-h-[20vh]" />
      ) : rental ? (
        <form onSubmit={handleFormSubmit} className="space-y-6">
          <ReturnDetails rental={rental} />

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Rental Line Items
            </h3>
            <ReturnItemsTable
              lineItems={rental.lineItems}
              quantities={quantities}
              onChange={handleQuantityChange}
              disabled={submitting}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="returnDate" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                Return Date<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id="returnDate"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
              />
            </div>
            <div>
              <label htmlFor="returnNotes" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                Notes
              </label>
              <textarea
                id="returnNotes"
                rows={1}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                placeholder="Optional notes about this return"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700"
              />
            </div>
          </section>

          {validationError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {validationError}
            </div>
          )}

          {submitError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {submitError}
            </div>
          )}

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total Items Being Returned</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{totalItemsBeingReturned}</span>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Confirm Return
            </Button>
          </div>
        </form>
      ) : null}
    </Modal>
  );
}
