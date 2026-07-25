import { useMemo, useState } from "react";
import { History, IndianRupee, Search } from "lucide-react";
import Table, { TableColumn } from "../common/Table";
import { PaymentSummary } from "../../types/payment";
import { RentalPaymentStatus } from "../../types/rental";

interface PaymentTableProps {
  rentals: PaymentSummary[];
  onRecordPayment?: (rental: PaymentSummary) => void;
  onViewHistory?: (rental: PaymentSummary) => void;
}

const PAYMENT_BADGE: Record<RentalPaymentStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Partial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

export default function PaymentTable({ rentals, onRecordPayment, onViewHistory }: PaymentTableProps) {
  const [searchText, setSearchText] = useState("");

  const filteredRentals = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (query === "") {
      return rentals;
    }
    return rentals.filter(
      (rental) =>
        rental.rentalCode.toLowerCase().includes(query) ||
        rental.customerName.toLowerCase().includes(query) ||
        rental.mobileNumber.toLowerCase().includes(query)
    );
  }, [rentals, searchText]);

  const columns: TableColumn<PaymentSummary>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_rental, index) => index + 1 },
    { key: "rentalCode", header: "Rental Code" },
    { key: "customerName", header: "Customer" },
    {
      key: "rentalAmount",
      header: "Rental Amount",
      align: "center",
      render: (rental) => formatCurrency(rental.rentalAmount),
    },
    {
      key: "advancePaid",
      header: "Advance Paid",
      align: "center",
      render: (rental) => formatCurrency(rental.advancePaid),
    },
    {
      key: "securityDepositPaid",
      header: "Security Deposit Paid",
      align: "center",
      render: (rental) => formatCurrency(rental.securityDepositPaid),
    },
    {
      key: "amountAlreadyPaid",
      header: "Already Paid",
      align: "center",
      render: (rental) => formatCurrency(rental.amountAlreadyPaid),
    },
    {
      key: "remainingBalance",
      header: "Remaining Balance",
      align: "center",
      render: (rental) => formatCurrency(rental.remainingBalance),
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      align: "center",
      render: (rental) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_BADGE[rental.paymentStatus]}`}
        >
          {rental.paymentStatus}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (rental) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onRecordPayment?.(rental)}
            title="Record Payment"
            aria-label={`Record payment for rental ${rental.rentalCode}`}
            disabled={rental.remainingBalance <= 0}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <IndianRupee className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onViewHistory?.(rental)}
            title="View History"
            aria-label={`View payment history for rental ${rental.rentalCode}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <History className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="flex items-center justify-end gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="relative min-w-0 max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search rentals..."
            className="w-full rounded-lg border border-indigo-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_0_10px_rgba(99,102,241,0.25)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-indigo-500/40 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-b-2xl">
        <Table columns={columns} data={filteredRentals} emptyMessage="No rentals found." />
      </div>
    </div>
  );
}
