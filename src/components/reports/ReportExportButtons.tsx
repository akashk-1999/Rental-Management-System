import { FileSpreadsheet, FileText } from "lucide-react";
import Button from "../common/Button";
import { buildExportFileName, exportRowsToCsv, exportRowsToExcel, ExportColumn } from "../../utils/exportUtils";
import { useToast } from "../../context/ToastContext";

interface ReportExportButtonsProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  /** Underscore_separated report name used to build the file (e.g. "Rental_Report"). */
  reportName: string;
  disabled?: boolean;
}

/**
 * Reusable Export Excel / Export CSV button pair shared by every report section. Exports exactly
 * what's already loaded in the browser (the currently filtered `data`) — no extra API calls.
 */
export default function ReportExportButtons<T>({ data, columns, reportName, disabled = false }: ReportExportButtonsProps<T>) {
  const { showToast } = useToast();
  const isDisabled = disabled || data.length === 0;
  const displayName = reportName.replace(/_/g, " ");

  const handleExportExcel = () => {
    exportRowsToExcel(data, columns, buildExportFileName(reportName));
    showToast(`${displayName} exported as Excel.`);
  };

  const handleExportCsv = () => {
    exportRowsToCsv(data, columns, buildExportFileName(reportName));
    showToast(`${displayName} exported as CSV.`);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<FileSpreadsheet className="h-3.5 w-3.5" />}
        onClick={handleExportExcel}
        disabled={isDisabled}
      >
        Export Excel
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        leftIcon={<FileText className="h-3.5 w-3.5" />}
        onClick={handleExportCsv}
        disabled={isDisabled}
      >
        Export CSV
      </Button>
    </div>
  );
}
