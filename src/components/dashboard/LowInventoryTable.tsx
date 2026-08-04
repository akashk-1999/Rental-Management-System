import Table, { TableColumn } from "../common/Table";
import { DashboardLowInventoryItem } from "../../types/dashboard";

interface LowInventoryTableProps {
  items: DashboardLowInventoryItem[];
}

export default function LowInventoryTable({ items }: LowInventoryTableProps) {
  const columns: TableColumn<DashboardLowInventoryItem>[] = [
    { key: "itemName", header: "Item Name" },
    { key: "totalQuantity", header: "Total Quantity", align: "center" },
    {
      key: "availableStock",
      header: "Available Stock",
      align: "center",
      render: (item) => (
        <span
          className={`font-semibold ${
            item.availableStock <= 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {item.availableStock}
        </span>
      ),
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <Table columns={columns} data={items} emptyMessage="No inventory data available." pageSize={5} />
    </div>
  );
}
