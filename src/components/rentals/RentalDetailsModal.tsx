import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import { Rental, RentalPaymentStatus, RentalStatus } from "../../types/rental";

interface RentalDetailsModalProps {
  isOpen: boolean;
  rental: Rental | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
}

const STATUS_BADGE: Record<RentalStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  PartialReturn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Returned: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

const PAYMENT_BADGE: Record<RentalPaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Partial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const datePart = date.toLocaleDateString();
  const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50/60 px-4 py-2.5 dark:bg-slate-800/40">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

export default function RentalDetailsModal({ isOpen, rental, loading = false, error, onClose }: RentalDetailsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rental Details"
      subtitle={rental ? rental.rentalCode : undefined}
      size="lg"
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading rental..." className="min-h-[20vh]" />
      ) : rental ? (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[rental.status]}`}
            >
              {rental.status}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_BADGE[rental.paymentStatus]}`}
            >
              {rental.paymentStatus}
            </span>
          </div>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Customer Information
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-700">
              <DetailRow label="Customer Name" value={rental.customerName} />
              <DetailRow label="Mobile Number" value={rental.mobileNumber} />
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Rental Information
            </h3>
            <div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-700">
              <DetailRow label="Rental Code" value={rental.rentalCode} />
              <DetailRow label="Rental Start Date" value={formatDateTime(rental.rentalStartDate)} />
              <DetailRow label="Expected Return Date" value={formatDateTime(rental.expectedReturnDate)} />
              {rental.notes && <DetailRow label="Notes" value={rental.notes} />}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Rental Items
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Item
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Quantity
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Rental Price
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {rental.lineItems.map((lineItem) => (
                    <tr key={lineItem.rentalLineItemId}>
                      <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">{lineItem.itemName}</td>
                      <td className="px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300">
                        {lineItem.quantityRented}
                      </td>
                      <td className="px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300">
                        {formatCurrency(lineItem.unitPrice)}
                      </td>
                      <td className="px-3 py-2 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(lineItem.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Total Amount</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(rental.totalAmount)}</span>
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
            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm dark:border-slate-700">
              <span className="font-medium text-slate-700 dark:text-slate-300">Balance</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {formatCurrency(rental.totalAmount - rental.advancePaid)}
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
