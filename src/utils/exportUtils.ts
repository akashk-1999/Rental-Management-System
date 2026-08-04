import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T, index: number) => string | number;
}

/** Builds today's date as "YYYY-MM-DD" for use in exported file names. */
function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Builds an export file base name (no extension) from a report name and today's date. */
export function buildExportFileName(reportName: string): string {
  return `${reportName}_${todayDateString()}`;
}

function buildExportRows<T>(data: T[], columns: ExportColumn<T>[]): Record<string, string | number>[] {
  return data.map((row, index) => {
    const record: Record<string, string | number> = {};
    columns.forEach((column) => {
      record[column.header] = column.accessor(row, index);
    });
    return record;
  });
}

/** Generates and downloads an .xlsx workbook from the given (already filtered) rows. */
export function exportRowsToExcel<T>(data: T[], columns: ExportColumn<T>[], fileNameBase: string): void {
  const rows = buildExportRows(data, columns);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${fileNameBase}.xlsx`);
}

/** Generates and downloads a .csv file from the given (already filtered) rows. */
export function exportRowsToCsv<T>(data: T[], columns: ExportColumn<T>[], fileNameBase: string): void {
  const rows = buildExportRows(data, columns);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileNameBase}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
