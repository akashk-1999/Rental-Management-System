import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { PaymentSummary, PaymentType } from "../../types/payment";

export interface PaymentSubmitPayload {
  paymentDate: string;
  amount: number;
  paymentType: PaymentType;
  paymentMode: string;
  notes: string | null;
}

interface PaymentModalProps {
  isOpen: boolean;
  rental: PaymentSummary | null;
  submitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: PaymentSubmitPayload) => void;
}

const PAYMENT_TYPE_OPTIONS: PaymentType[] = ["Advance", "Partial", "Final", "SecurityDeposit"];
const PAYMENT_MODE_OPTIONS = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

export default function PaymentModal({ isOpen, rental, submitting = false, error, onClose, onSubmit }: PaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState(todayDateString());
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("Partial");
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODE_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (rental) {
      setPaymentDate(todayDateString());
      setAmount("");
      setPaymentType("Partial");
      setPaymentMode(PAYMENT_MODE_OPTIONS[0]);
      setNotes("");
      setValidationError(null);
    }
  }, [rental]);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting || !rental) return;

    const numericAmount = Number(amount);
    if (amount.trim() === "" || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setValidationError("Amount must be greater than zero.");
      return;
    }
    if (numericAmount > rental.remainingBalance) {
      setValidationError("Amount cannot exceed the remaining balance.");
      return;
    }
    if (!paymentMode.trim()) {
      setValidationError("Payment mode is required.");
      return;
    }

    setValidationError(null);
    onSubmit({
      paymentDate,
      amount: numericAmount,
      paymentType,
      paymentMode,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment" subtitle={rental ? rental.rentalCode : undefined}>
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {rental && (
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Rental Code</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{rental.rentalCode}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Customer</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{rental.customerName}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Rental Amount</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(rental.rentalAmount)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Already Paid</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(rental.amountAlreadyPaid)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-700 dark:text-slate-300">Remaining Balance</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(rental.remainingBalance)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="paymentDate" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                Payment Date<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
              />
            </div>
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                Amount<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <input
                id="amount"
                type="number"
                min={0.01}
                max={rental.remainingBalance}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={submitting}
                placeholder="0.00"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700"
              />
            </div>
            <div>
              <label htmlFor="paymentType" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                Payment Type<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <select
                id="paymentType"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
              >
                {PAYMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="paymentMode" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
                Payment Mode<span className="ml-0.5 text-rose-500">*</span>
              </label>
              <select
                id="paymentMode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
              >
                {PAYMENT_MODE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="paymentNotes" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
              Notes
            </label>
            <textarea
              id="paymentNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Optional notes about this payment"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700"
            />
          </div>

          {validationError && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {validationError}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Record Payment
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
