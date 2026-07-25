import { useMemo, useState } from "react";
import { Search, Undo2 } from "lucide-react";
import Table, { TableColumn } from "../common/Table";
import { ReturnableRental } from "../../types/return";
import { RentalStatus } from "../../types/rental";

interface ReturnTableProps {
  rentals: ReturnableRental[];
  onReturnItems?: (rental: ReturnableRental) => void;
}

const STATUS_BADGE: Record<RentalStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  PartialReturn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Returned: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const datePart = date.toLocaleDateString();
  const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

export default function ReturnTable({ rentals, onReturnItems }: ReturnTableProps) {
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

  const columns: TableColumn<ReturnableRental>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_rental, index) => index + 1 },
    { key: "rentalCode", header: "Rental Code" },
    { key: "customerName", header: "Customer" },
    { key: "mobileNumber", header: "Mobile Number" },
    {
      key: "rentalStartDate",
      header: "Rental Date",
      align: "center",
      render: (rental) => formatDateTime(rental.rentalStartDate),
    },
    {
      key: "expectedReturnDate",
      header: "Expected Return",
      align: "center",
      render: (rental) => formatDateTime(rental.expectedReturnDate),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (rental) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[rental.status]}`}
        >
          {rental.status}
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
            onClick={() => onReturnItems?.(rental)}
            title="Return Items"
            aria-label={`Return items for rental ${rental.rentalCode}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
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
        <Table
          columns={columns}
          data={filteredRentals}
          emptyMessage="No rentals pending return."
        />
      </div>
    </div>
  );
}
