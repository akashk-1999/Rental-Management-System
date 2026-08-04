import { useMemo, useState } from "react";
import { Pencil, Trash2, Search, Filter } from "lucide-react";
import Table, { TableColumn } from "../common/Table";
import { Item } from "../../types/item";

interface ItemTableProps {
  items: Item[];
  onEdit?: (item: Item) => void;
  onToggleStatus?: (item: Item) => void;
}

type StatusFilter = "All" | "Active" | "Inactive";

function formatCurrency(value: number | null): string {
  return value !== null ? `₹${value.toFixed(2)}` : "-";
}

export default function ItemTable({ items, onEdit, onToggleStatus }: ItemTableProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        query === "" ||
        item.itemName.toLowerCase().includes(query) ||
        item.categoryName.toLowerCase().includes(query) ||
        (item.itemCode ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && item.status === "Active") ||
        (statusFilter === "Inactive" && item.status === "Inactive");

      return matchesSearch && matchesStatus;
    });
  }, [items, searchText, statusFilter]);

  const isFilterActive = statusFilter !== "All";

  const columns: TableColumn<Item>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_item, index) => index + 1 },
    { key: "itemName", header: "Item Name" },
    { key: "categoryName", header: "Category" },
    { key: "itemCode", header: "Item Code", align: "center", render: (item) => item.itemCode ?? "-" },
    { key: "unitType", header: "Unit Type", align: "center" },
    { key: "totalQuantity", header: "Total Quantity", align: "center" },
    {
      key: "rentalPrice",
      header: "Rental Price",
      align: "center",
      render: (item) => formatCurrency(item.rentalPrice),
    },
    {
      key: "securityDeposit",
      header: "Security Deposit",
      align: "center",
      render: (item) => formatCurrency(item.securityDeposit),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (item) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            item.status === "Active"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          {item.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (item) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onEdit?.(item)}
            title="Edit"
            aria-label={`Edit ${item.itemName}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onToggleStatus?.(item)}
            disabled={item.status !== "Active"}
            title={item.status === "Active" ? "Delete" : "Already inactive — edit the item to reactivate"}
            aria-label={`Delete ${item.itemName}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-40 disabled:hover:scale-100 dark:text-slate-400 dark:hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-900">
      <div className="relative flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-100 px-4 py-4 dark:border-slate-800">
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsFilterOpen((open) => !open)}
            aria-expanded={isFilterOpen}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ease-in-out ${
              isFilterActive
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Filter
          </button>

          {isFilterOpen && (
            <div className="absolute left-0 z-10 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="All">All</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="relative min-w-0 max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search items..."
            className="w-full rounded-lg border border-indigo-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_0_10px_rgba(99,102,241,0.25)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-indigo-500/40 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-b-2xl">
        <Table
          columns={columns}
          data={filteredItems}
          emptyMessage="No items found. Click 'Add Item' to create the first item."
        />
      </div>
    </div>
  );
}
