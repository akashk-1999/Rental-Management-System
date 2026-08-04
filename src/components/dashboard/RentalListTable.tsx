import Table, { TableColumn } from "../common/Table";
import { DashboardRentalListItem } from "../../types/dashboard";
import { RentalStatus } from "../../types/rental";

type RentalListRow = DashboardRentalListItem & { daysOverdue?: number };

interface RentalListTableProps {
  rentals: RentalListRow[];
  emptyMessage?: string;
  showDaysOverdue?: boolean;
  pageSize?: number;
  onRowClick?: (rental: RentalListRow) => void;
}

const STATUS_BADGE: Record<RentalStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  PartialReturn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Returned: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
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

export default function RentalListTable({
  rentals,
  emptyMessage = "No rentals found.",
  showDaysOverdue = false,
  pageSize = 5,
  onRowClick,
}: RentalListTableProps) {
  const columns: TableColumn<RentalListRow>[] = [
    { key: "rentalCode", header: "Rental Code" },
    { key: "customerName", header: "Customer" },
    { key: "mobileNumber", header: "Mobile Number" },
    { key: "rentalStartDate", header: "Rental Date", align: "center", render: (rental) => formatDate(rental.rentalStartDate) },
    {
      key: "expectedReturnDate",
      header: "Expected Return",
      align: "center",
      render: (rental) => formatDate(rental.expectedReturnDate),
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
    ...(showDaysOverdue
      ? [
          {
            key: "daysOverdue",
            header: "Days Overdue",
            align: "center" as const,
            render: (rental: RentalListRow) => (
              <span className="font-semibold text-rose-600 dark:text-rose-400">{rental.daysOverdue ?? "-"}</span>
            ),
          },
        ]
      : []),
    {
      key: "remainingBalance",
      header: "Remaining Balance",
      align: "center",
      render: (rental) => formatCurrency(rental.remainingBalance),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <Table columns={columns} data={rentals} emptyMessage={emptyMessage} pageSize={pageSize} onRowClick={onRowClick} />
    </div>
  );
}
