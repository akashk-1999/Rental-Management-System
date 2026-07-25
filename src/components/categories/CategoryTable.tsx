import { useMemo, useState } from "react";
import { Pencil, Trash2, Power, Search, Filter } from "lucide-react";
import Table, { TableColumn } from "../common/Table";
import { Category } from "../../types/category";

interface CategoryTableProps {
  categories: Category[];
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
  onActivate?: (category: Category) => void;
}

type StatusFilter = "All" | "Active" | "Inactive";

export default function CategoryTable({ categories, onEdit, onDelete, onActivate }: CategoryTableProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredCategories = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return categories.filter((category) => {
      const matchesSearch = query === "" || category.categoryName.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && category.isActive) ||
        (statusFilter === "Inactive" && !category.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [categories, searchText, statusFilter]);

  const isFilterActive = statusFilter !== "All";

  const columns: TableColumn<Category>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_category, index) => index + 1 },
    { key: "categoryName", header: "Category Name" },
    {
      key: "isActive",
      header: "Status",
      align: "center",
      render: (category) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            category.isActive
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          {category.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (category) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onEdit?.(category)}
            title="Edit"
            aria-label={`Edit ${category.categoryName}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          {category.isActive ? (
            <button
              type="button"
              onClick={() => onDelete?.(category)}
              title="Delete"
              aria-label={`Delete ${category.categoryName}`}
              className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onActivate?.(category)}
              title="Activate"
              aria-label={`Activate ${category.categoryName}`}
              className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-emerald-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400"
            >
              <Power className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
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
            placeholder="Search categories..."
            className="w-full rounded-lg border border-indigo-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_0_10px_rgba(99,102,241,0.25)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-indigo-500/40 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-b-2xl">
        <Table
          columns={columns}
          data={filteredCategories}
          emptyMessage="No categories found. Click 'Add Category' to create the first category."
        />
      </div>
    </div>
  );
}
