import { useCallback, useMemo, useState } from "react";
import { ClipboardList, IndianRupee, Wallet, Receipt } from "lucide-react";
import ReportFilterBar, { ReportFilterFieldConfig } from "./ReportFilterBar";
import ReportPanel from "./ReportPanel";
import ReportSummaryBar from "./ReportSummaryBar";
import ReportExportButtons from "./ReportExportButtons";
import { TableColumn } from "../common/Table";
import { ExportColumn } from "../../utils/exportUtils";
import { reportsApi } from "../../api/reportsApi";
import { RentalReportRow } from "../../types/report";
import { RentalStatus } from "../../types/rental";

const STATUS_BADGE: Record<RentalStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  PartialReturn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Returned: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

const PAYMENT_BADGE: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Partial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Pending: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const FIELDS: ReportFilterFieldConfig[] = [
  { type: "dateRange", startKey: "startDate", endKey: "endDate", label: "Rental Date" },
  {
    type: "select",
    key: "status",
    label: "Status",
    options: [
      { value: "", label: "All" },
      { value: "Active", label: "Active" },
      { value: "PartialReturn", label: "Partial Return" },
      { value: "Returned", label: "Returned" },
      { value: "Overdue", label: "Overdue" },
      { value: "Cancelled", label: "Cancelled" },
    ],
  },
  { type: "text", key: "customer", label: "Customer", placeholder: "Name or mobile number" },
];

const DEFAULT_FILTERS = { startDate: "", endDate: "", status: "", customer: "" };

export default function RentalReportSection() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rows, setRows] = useState<RentalReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchReport = useCallback(async (activeFilters: typeof DEFAULT_FILTERS) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getRentalReport({
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        status: (activeFilters.status || undefined) as RentalStatus | undefined,
        customer: activeFilters.customer || undefined,
      });
      setRows(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load the rental report. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    if (!filters.startDate || !filters.endDate) {
      setValidationError("Select a rental date range (from and to), then click Search.");
      return;
    }
    setValidationError(null);
    setHasSearched(true);
    fetchReport(filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setValidationError(null);
    setHasSearched(false);
    setRows([]);
    setError(null);
  };

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          totalAmount: acc.totalAmount + row.totalAmount,
          amountPaid: acc.amountPaid + row.amountPaid,
          outstandingBalance: acc.outstandingBalance + row.outstandingBalance,
        }),
        { totalAmount: 0, amountPaid: 0, outstandingBalance: 0 }
      ),
    [rows]
  );

  const columns: TableColumn<RentalReportRow>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_row, index) => index + 1 },
    { key: "rentalCode", header: "Rental Code" },
    { key: "customerName", header: "Customer" },
    { key: "mobileNumber", header: "Mobile Number" },
    { key: "rentalStartDate", header: "Rental Date", align: "center", render: (row) => formatDate(row.rentalStartDate) },
    {
      key: "expectedReturnDate",
      header: "Expected Return",
      align: "center",
      render: (row) => formatDate(row.expectedReturnDate),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[row.status]}`}>
          {row.status}
        </span>
      ),
    },
    { key: "totalAmount", header: "Total Amount", align: "center", render: (row) => formatCurrency(row.totalAmount) },
    { key: "amountPaid", header: "Amount Paid", align: "center", render: (row) => formatCurrency(row.amountPaid) },
    {
      key: "outstandingBalance",
      header: "Outstanding",
      align: "center",
      render: (row) => formatCurrency(row.outstandingBalance),
    },
    {
      key: "paymentStatus",
      header: "Payment Status",
      align: "center",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${PAYMENT_BADGE[row.paymentStatus]}`}
        >
          {row.paymentStatus}
        </span>
      ),
    },
  ];

  const exportColumns: ExportColumn<RentalReportRow>[] = [
    { header: "Rental Code", accessor: (row) => row.rentalCode },
    { header: "Customer", accessor: (row) => row.customerName },
    { header: "Mobile Number", accessor: (row) => row.mobileNumber },
    { header: "Rental Date", accessor: (row) => formatDate(row.rentalStartDate) },
    { header: "Expected Return", accessor: (row) => formatDate(row.expectedReturnDate) },
    { header: "Status", accessor: (row) => row.status },
    { header: "Total Amount", accessor: (row) => row.totalAmount },
    { header: "Amount Paid", accessor: (row) => row.amountPaid },
    { header: "Outstanding", accessor: (row) => row.outstandingBalance },
    { header: "Payment Status", accessor: (row) => row.paymentStatus },
  ];

  return (
    <div className="space-y-4">
      <ReportFilterBar
        fields={FIELDS}
        values={filters}
        onChange={handleFilterChange}
        onApply={handleSearch}
        onReset={handleReset}
        loading={loading}
        validationError={validationError}
      />
      {hasSearched && !loading && !error && (
        <ReportSummaryBar
          items={[
            { icon: ClipboardList, label: "Total Rentals", value: String(rows.length), iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" },
            { icon: IndianRupee, label: "Total Amount", value: formatCurrency(summary.totalAmount), iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" },
            { icon: Wallet, label: "Amount Paid", value: formatCurrency(summary.amountPaid), iconAccent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
            { icon: Receipt, label: "Outstanding", value: formatCurrency(summary.outstandingBalance), iconAccent: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" },
          ]}
        />
      )}
      <ReportPanel
        title="Rental Report"
        icon={ClipboardList}
        loading={loading}
        error={error}
        data={rows}
        columns={columns}
        emptyMessage="No rentals found for the selected filters."
        getRowKey={(row) => row.rentalId}
        idle={!hasSearched}
        idleMessage="Select a rental date range and click Search to generate the rental report."
        actions={
          <ReportExportButtons
            data={rows}
            columns={exportColumns}
            reportName="Rental_Report"
            disabled={loading}
          />
        }
      />
    </div>
  );
}
