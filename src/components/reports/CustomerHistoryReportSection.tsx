import { useCallback, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, History, IndianRupee, Receipt, Search, User, Wallet } from "lucide-react";
import Button from "../common/Button";
import ReportFilterBar, { ReportFilterFieldConfig } from "./ReportFilterBar";
import ReportPanel from "./ReportPanel";
import ReportSummaryBar from "./ReportSummaryBar";
import ReportExportButtons from "./ReportExportButtons";
import { TableColumn } from "../common/Table";
import { ExportColumn } from "../../utils/exportUtils";
import { reportsApi } from "../../api/reportsApi";
import { customersApi } from "../../api/customersApi";
import { CustomerHistoryReport, RentalReportRow } from "../../types/report";
import { RentalStatus } from "../../types/rental";

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
];

const DEFAULT_FILTERS = { startDate: "", endDate: "", status: "" };

export default function CustomerHistoryReportSection() {
  const [mobileInput, setMobileInput] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [report, setReport] = useState<CustomerHistoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (resolvedCustomerId: number, activeFilters: typeof DEFAULT_FILTERS) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getCustomerHistory(resolvedCustomerId, {
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        status: (activeFilters.status || undefined) as RentalStatus | undefined,
      });
      setReport(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load the customer's rental history. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = mobileInput.trim();
    if (trimmed.length !== 10) {
      setSearchError("Enter a valid 10-digit mobile number.");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setReport(null);
    try {
      const result = await customersApi.lookupByMobile(`+91${trimmed}`);
      if (!result.found || !result.customer) {
        setCustomerId(null);
        setSearchError("No customer found for this mobile number.");
        return;
      }

      setCustomerId(result.customer.customerId);
      setFilters(DEFAULT_FILTERS);
      setAppliedFilters(DEFAULT_FILTERS);
      await fetchHistory(result.customer.customerId, DEFAULT_FILTERS);
    } catch (err) {
      console.error(err);
      setSearchError("Failed to look up the customer. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    setAppliedFilters(filters);
    if (customerId) {
      fetchHistory(customerId, filters);
    }
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    if (customerId) {
      fetchHistory(customerId, DEFAULT_FILTERS);
    }
  };

  const columns: TableColumn<RentalReportRow>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_row, index) => index + 1 },
    { key: "rentalCode", header: "Rental Code" },
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
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
          Find Customer
        </div>
        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-64">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Customer Mobile Number
            </label>
            <input
              type="tel"
              value={mobileInput}
              onChange={(e) => setMobileInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              disabled={searching}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="w-full sm:w-auto">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Search className="h-3.5 w-3.5" />}
              loading={searching}
            >
              Search Customer
            </Button>
          </div>
        </form>
        {searchError && (
          <div className="mt-3 flex items-start gap-2 text-sm text-rose-600 dark:text-rose-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{searchError}</span>
          </div>
        )}
      </div>

      {report && (
        <>
          <ReportSummaryBar
            items={[
              {
                icon: User,
                label: "Customer",
                value: `${report.customerName} • ${report.mobileNumber}`,
                iconAccent: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300",
              },
              {
                icon: History,
                label: "Total Rentals",
                value: String(report.summary.totalRentals),
                iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
              },
              {
                icon: IndianRupee,
                label: "Total Amount",
                value: formatCurrency(report.summary.totalAmount),
                iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300",
              },
              {
                icon: Wallet,
                label: "Total Paid",
                value: formatCurrency(report.summary.totalPaid),
                iconAccent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
              },
              {
                icon: Receipt,
                label: "Outstanding",
                value: formatCurrency(report.summary.totalOutstanding),
                iconAccent: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
              },
            ]}
          />

          <ReportFilterBar
            fields={FIELDS}
            values={filters}
            onChange={handleFilterChange}
            onApply={handleApply}
            onReset={handleReset}
            loading={loading}
          />

          <ReportPanel
            title="Customer Rental History"
            icon={History}
            loading={loading}
            error={error}
            data={report.rentals}
            columns={columns}
            emptyMessage="No rentals found for this customer with the selected filters."
            getRowKey={(row) => row.rentalId}
            actions={
              <ReportExportButtons
                data={report.rentals}
                columns={exportColumns}
                reportName="Customer_Rental_History"
                disabled={loading}
              />
            }
          />
        </>
      )}
    </div>
  );
}
