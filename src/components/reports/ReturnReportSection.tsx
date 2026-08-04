import { useCallback, useMemo, useState } from "react";
import { PackageCheck, PackageX, AlertTriangle } from "lucide-react";
import ReportFilterBar, { ReportFilterFieldConfig } from "./ReportFilterBar";
import ReportPanel from "./ReportPanel";
import ReportSummaryBar from "./ReportSummaryBar";
import ReportExportButtons from "./ReportExportButtons";
import { TableColumn } from "../common/Table";
import { ExportColumn } from "../../utils/exportUtils";
import { reportsApi } from "../../api/reportsApi";
import { ReturnReportRow } from "../../types/report";

const DAMAGE_BADGE: Record<string, string> = {
  Repairable: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Damaged: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Lost: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
};

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

const FIELDS: ReportFilterFieldConfig[] = [
  { type: "dateRange", startKey: "startDate", endKey: "endDate", label: "Return Date" },
  { type: "text", key: "customer", label: "Customer", placeholder: "Name or mobile number" },
  { type: "text", key: "item", label: "Item", placeholder: "Item name" },
];

const DEFAULT_FILTERS = { startDate: "", endDate: "", customer: "", item: "" };

export default function ReturnReportSection() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rows, setRows] = useState<ReturnReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchReport = useCallback(async (activeFilters: typeof DEFAULT_FILTERS) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getReturnReport({
        startDate: activeFilters.startDate || undefined,
        endDate: activeFilters.endDate || undefined,
        customer: activeFilters.customer || undefined,
        item: activeFilters.item || undefined,
      });
      setRows(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load the return report. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    if (!filters.startDate || !filters.endDate) {
      setValidationError("Select a return date range (from and to), then click Search.");
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
          quantityReturned: acc.quantityReturned + row.quantityReturned,
          quantityDamaged: acc.quantityDamaged + row.quantityDamaged,
          quantityMissing: acc.quantityMissing + row.quantityMissing,
        }),
        { quantityReturned: 0, quantityDamaged: 0, quantityMissing: 0 }
      ),
    [rows]
  );

  const columns: TableColumn<ReturnReportRow>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_row, index) => index + 1 },
    { key: "returnDate", header: "Return Date", align: "center", render: (row) => formatDate(row.returnDate) },
    { key: "rentalCode", header: "Rental Code" },
    { key: "customerName", header: "Customer" },
    { key: "mobileNumber", header: "Mobile Number" },
    { key: "itemName", header: "Item" },
    { key: "quantityReturned", header: "Qty Returned", align: "center" },
    { key: "quantityDamaged", header: "Qty Damaged", align: "center" },
    { key: "quantityMissing", header: "Qty Missing", align: "center" },
    {
      key: "damageStatus",
      header: "Damage Status",
      align: "center",
      render: (row) =>
        row.damageStatus ? (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${DAMAGE_BADGE[row.damageStatus]}`}
          >
            {row.damageStatus}
          </span>
        ) : (
          "-"
        ),
    },
  ];

  const exportColumns: ExportColumn<ReturnReportRow>[] = [
    { header: "Return Date", accessor: (row) => formatDate(row.returnDate) },
    { header: "Rental Code", accessor: (row) => row.rentalCode },
    { header: "Customer", accessor: (row) => row.customerName },
    { header: "Mobile Number", accessor: (row) => row.mobileNumber },
    { header: "Item", accessor: (row) => row.itemName },
    { header: "Qty Returned", accessor: (row) => row.quantityReturned },
    { header: "Qty Damaged", accessor: (row) => row.quantityDamaged },
    { header: "Qty Missing", accessor: (row) => row.quantityMissing },
    { header: "Damage Status", accessor: (row) => row.damageStatus ?? "-" },
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
            { icon: PackageCheck, label: "Total Returns", value: String(rows.length), iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" },
            { icon: PackageCheck, label: "Qty Returned", value: String(summary.quantityReturned), iconAccent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
            { icon: AlertTriangle, label: "Qty Damaged", value: String(summary.quantityDamaged), iconAccent: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" },
            { icon: PackageX, label: "Qty Missing", value: String(summary.quantityMissing), iconAccent: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300" },
          ]}
        />
      )}
      <ReportPanel
        title="Return Report"
        icon={PackageCheck}
        loading={loading}
        error={error}
        data={rows}
        columns={columns}
        emptyMessage="No returns found for the selected filters."
        getRowKey={(row) => row.returnEventId}
        idle={!hasSearched}
        idleMessage="Select a return date range and click Search to generate the return report."
        actions={
          <ReportExportButtons
            data={rows}
            columns={exportColumns}
            reportName="Return_Report"
            disabled={loading}
          />
        }
      />
    </div>
  );
}
