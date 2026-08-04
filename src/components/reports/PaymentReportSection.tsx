import { useCallback, useMemo, useState } from "react";
import { CreditCard, IndianRupee, Receipt } from "lucide-react";
import ReportFilterBar, { ReportFilterFieldConfig } from "./ReportFilterBar";
import ReportPanel from "./ReportPanel";
import ReportSummaryBar from "./ReportSummaryBar";
import ReportExportButtons from "./ReportExportButtons";
import { TableColumn } from "../common/Table";
import { ExportColumn } from "../../utils/exportUtils";
import { reportsApi } from "../../api/reportsApi";
import { PaymentReportRow } from "../../types/report";
import { PaymentType } from "../../types/payment";

const PAYMENT_MODE_OPTIONS = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const FIELDS: ReportFilterFieldConfig[] = [
  { type: "dateRange", startKey: "startDate", endKey: "endDate", label: "Payment Date" },
  {
    type: "select",
    key: "paymentType",
    label: "Payment Type",
    options: [
      { value: "", label: "All" },
      { value: "Advance", label: "Advance" },
      { value: "Partial", label: "Partial" },
      { value: "Final", label: "Final" },
      { value: "SecurityDeposit", label: "Security Deposit" },
      { value: "Refund", label: "Refund" },
    ],
  },
  {
    type: "select",
    key: "paymentMode",
    label: "Payment Mode",
    options: [{ value: "", label: "All" }, ...PAYMENT_MODE_OPTIONS.map((mode) => ({ value: mode, label: mode }))],
  },
  { type: "text", key: "customer", label: "Customer", placeholder: "Name or mobile number" },
];

const DEFAULT_FILTERS = { startDate: "", endDate: "", paymentType: "", paymentMode: "", customer: "" };

export default function PaymentReportSection() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rows, setRows] = useState<PaymentReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchReport = useCallback(async (activeFilters: typeof DEFAULT_FILTERS) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getPaymentReport({
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        paymentType: (activeFilters.paymentType || undefined) as PaymentType | undefined,
        paymentMode: activeFilters.paymentMode || undefined,
        customer: activeFilters.customer || undefined,
      });
      setRows(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load the payment report. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    if (!filters.startDate || !filters.endDate) {
      setValidationError("Select a payment date range (from and to), then click Search.");
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

  const totalAmount = useMemo(() => rows.reduce((sum, row) => sum + row.amount, 0), [rows]);

  const columns: TableColumn<PaymentReportRow>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_row, index) => index + 1 },
    { key: "paymentDate", header: "Payment Date", align: "center", render: (row) => formatDate(row.paymentDate) },
    { key: "rentalCode", header: "Rental Code" },
    { key: "customerName", header: "Customer" },
    { key: "mobileNumber", header: "Mobile Number" },
    { key: "amount", header: "Amount", align: "center", render: (row) => formatCurrency(row.amount) },
    { key: "paymentType", header: "Payment Type", align: "center" },
    { key: "paymentMode", header: "Payment Mode", align: "center", render: (row) => row.paymentMode ?? "-" },
    { key: "recordedByName", header: "Recorded By" },
  ];

  const exportColumns: ExportColumn<PaymentReportRow>[] = [
    { header: "Payment Date", accessor: (row) => formatDate(row.paymentDate) },
    { header: "Rental Code", accessor: (row) => row.rentalCode },
    { header: "Customer", accessor: (row) => row.customerName },
    { header: "Mobile Number", accessor: (row) => row.mobileNumber },
    { header: "Amount", accessor: (row) => row.amount },
    { header: "Payment Type", accessor: (row) => row.paymentType },
    { header: "Payment Mode", accessor: (row) => row.paymentMode ?? "-" },
    { header: "Recorded By", accessor: (row) => row.recordedByName },
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
            { icon: Receipt, label: "Total Payments", value: String(rows.length), iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" },
            { icon: IndianRupee, label: "Total Amount", value: formatCurrency(totalAmount), iconAccent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
          ]}
        />
      )}
      <ReportPanel
        title="Payment Report"
        icon={CreditCard}
        loading={loading}
        error={error}
        data={rows}
        columns={columns}
        emptyMessage="No payments found for the selected filters."
        getRowKey={(row) => row.paymentId}
        idle={!hasSearched}
        idleMessage="Select a payment date range and click Search to generate the payment report."
        actions={
          <ReportExportButtons
            data={rows}
            columns={exportColumns}
            reportName="Payment_Report"
            disabled={loading}
          />
        }
      />
    </div>
  );
}
