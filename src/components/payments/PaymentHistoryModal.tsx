import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import { PaymentRentalDetail } from "../../types/payment";
import { RentalPaymentStatus } from "../../types/rental";

interface PaymentHistoryModalProps {
  isOpen: boolean;
  rental: PaymentRentalDetail | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

const PAYMENT_BADGE: Record<RentalPaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Partial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

export default function PaymentHistoryModal({ isOpen, rental, loading = false, error, onClose }: PaymentHistoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Payment History" subtitle={rental ? rental.rentalCode : undefined} size="lg">
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading payment history..." className="min-h-[20vh]" />
      ) : rental ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_BADGE[rental.paymentStatus]}`}
            >
              {rental.paymentStatus}
            </span>
          </div>

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
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
              <span className="text-slate-500 dark:text-slate-400">Advance Paid</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(rental.advancePaid)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Security Deposit Paid</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(rental.securityDepositPaid)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Already Paid</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(rental.amountAlreadyPaid)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-700 dark:text-slate-300">Remaining Balance</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(rental.remainingBalance)}</span>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Payment Transactions
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Payment Date
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Amount
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Payment Type
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Payment Mode
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Notes
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Recorded By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {rental.payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    rental.payments.map((payment) => (
                      <tr key={payment.paymentId}>
                        <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                          {formatDate(payment.paymentDate)}
                        </td>
                        <td className="px-3 py-2 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300">
                          {payment.paymentType}
                        </td>
                        <td className="px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300">
                          {payment.paymentMode ?? "-"}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">{payment.notes ?? "-"}</td>
                        <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">{payment.recordedByName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
