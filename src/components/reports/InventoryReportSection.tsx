import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, PackageCheck, Boxes } from "lucide-react";
import ReportFilterBar, { ReportFilterFieldConfig } from "./ReportFilterBar";
import ReportPanel from "./ReportPanel";
import ReportSummaryBar from "./ReportSummaryBar";
import ReportExportButtons from "./ReportExportButtons";
import { TableColumn } from "../common/Table";
import { ExportColumn } from "../../utils/exportUtils";
import { reportsApi } from "../../api/reportsApi";
import { categoriesApi } from "../../api/categoriesApi";
import { InventoryReportRow } from "../../types/report";

const STATUS_BADGE: Record<"Active" | "Inactive", string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  Inactive: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
};

const DEFAULT_FILTERS = { categoryId: "", status: "" };

export default function InventoryReportSection() {
  const [categoryOptions, setCategoryOptions] = useState<{ value: string; label: string }[]>([{ value: "", label: "All" }]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rows, setRows] = useState<InventoryReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    categoriesApi
      .getCategories()
      .then((categories) => {
        setCategoryOptions([
          { value: "", label: "All" },
          ...categories.map((category) => ({ value: String(category.categoryId), label: category.categoryName })),
        ]);
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchReport = useCallback(async (activeFilters: typeof DEFAULT_FILTERS) => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getInventoryReport({
        categoryId: activeFilters.categoryId || undefined,
        status: (activeFilters.status || undefined) as "Active" | "Inactive" | undefined,
      });
      setRows(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load the inventory report. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    setHasSearched(true);
    fetchReport(filters);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setHasSearched(false);
    setRows([]);
    setError(null);
  };

  const summary = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          totalQuantity: acc.totalQuantity + row.totalQuantity,
          currentlyRented: acc.currentlyRented + row.currentlyRented,
          availableStock: acc.availableStock + row.availableStock,
        }),
        { totalQuantity: 0, currentlyRented: 0, availableStock: 0 }
      ),
    [rows]
  );

  const fields: ReportFilterFieldConfig[] = [
    { type: "select", key: "categoryId", label: "Category", options: categoryOptions },
    {
      type: "select",
      key: "status",
      label: "Status",
      options: [
        { value: "", label: "All" },
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
      ],
    },
  ];

  const columns: TableColumn<InventoryReportRow>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_row, index) => index + 1 },
    { key: "itemName", header: "Item Name" },
    { key: "categoryName", header: "Category" },
    { key: "itemCode", header: "Item Code", align: "center", render: (row) => row.itemCode ?? "-" },
    { key: "unitType", header: "Unit Type", align: "center" },
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
    { key: "totalQuantity", header: "Total Quantity", align: "center" },
    { key: "currentlyRented", header: "Currently Rented", align: "center" },
    { key: "damagedStock", header: "Damaged", align: "center" },
    { key: "lostStock", header: "Lost", align: "center" },
    { key: "availableStock", header: "Available Stock", align: "center" },
  ];

  const exportColumns: ExportColumn<InventoryReportRow>[] = [
    { header: "Item Name", accessor: (row) => row.itemName },
    { header: "Category", accessor: (row) => row.categoryName },
    { header: "Item Code", accessor: (row) => row.itemCode ?? "-" },
    { header: "Unit Type", accessor: (row) => row.unitType },
    { header: "Status", accessor: (row) => row.status },
    { header: "Total Quantity", accessor: (row) => row.totalQuantity },
    { header: "Currently Rented", accessor: (row) => row.currentlyRented },
    { header: "Damaged", accessor: (row) => row.damagedStock },
    { header: "Lost", accessor: (row) => row.lostStock },
    { header: "Available Stock", accessor: (row) => row.availableStock },
  ];

  return (
    <div className="space-y-4">
      <ReportFilterBar
        fields={fields}
        values={filters}
        onChange={handleFilterChange}
        onApply={handleSearch}
        onReset={handleReset}
        loading={loading}
      />
      {hasSearched && !loading && !error && (
        <ReportSummaryBar
          items={[
            { icon: Package, label: "Total Items", value: String(rows.length), iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" },
            { icon: Boxes, label: "Total Quantity", value: String(summary.totalQuantity), iconAccent: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300" },
            { icon: PackageCheck, label: "Available Stock", value: String(summary.availableStock), iconAccent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300" },
            { icon: Package, label: "Currently Rented", value: String(summary.currentlyRented), iconAccent: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300" },
          ]}
        />
      )}
      <ReportPanel
        title="Inventory Report"
        icon={Package}
        loading={loading}
        error={error}
        data={rows}
        columns={columns}
        emptyMessage="No items found for the selected filters."
        getRowKey={(row) => row.itemId}
        idle={!hasSearched}
        idleMessage="Choose a category or status filter (optional) and click Search to generate the inventory report."
        actions={
          <ReportExportButtons
            data={rows}
            columns={exportColumns}
            reportName="Inventory_Report"
            disabled={loading}
          />
        }
      />
    </div>
  );
}
