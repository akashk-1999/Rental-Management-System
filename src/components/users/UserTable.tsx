import { useMemo, useState } from "react";
import { Pencil, Trash2, Search, Filter } from "lucide-react";
import Table, { TableColumn } from "../common/Table";
import { User } from "../../types/user";

interface UserTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

type RoleFilter = "All" | "Admin" | "Staff";
type StatusFilter = "All" | "Active" | "Inactive";

export default function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        query === "" ||
        user.username.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query);

      const matchesRole = roleFilter === "All" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && user.isActive) ||
        (statusFilter === "Inactive" && !user.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchText, roleFilter, statusFilter]);

  const isFilterActive = roleFilter !== "All" || statusFilter !== "All";

  const columns: TableColumn<User>[] = [
    { key: "slNo", header: "Sl No.", align: "center", render: (_user, index) => index + 1 },
    { key: "username", header: "Username" },
    { key: "fullName", header: "Full Name" },
    { key: "email", header: "Email", render: (user) => user.email || "-" },
    { key: "contactNumber", header: "Contact Number", render: (user) => user.contactNumber || "-" },
    { key: "role", header: "Role" },
    {
      key: "isActive",
      header: "Status",
      align: "center",
      render: (user) => (user.isActive ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (user) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onEdit?.(user)}
            title="Edit"
            aria-label={`Edit ${user.username}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(user)}
            title="Delete"
            aria-label={`Delete ${user.username}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-slate-400 dark:hover:text-rose-400"
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
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="All">All</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
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
            placeholder="Search anything..."
            className="w-full rounded-lg border border-indigo-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 shadow-[0_0_0_3px_rgba(99,102,241,0.10),0_0_10px_rgba(99,102,241,0.25)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-indigo-500/40 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-b-2xl">
        <Table
          columns={columns}
          data={filteredUsers}
          emptyMessage="No users found. Click 'Add User' to create the first user."
        />
      </div>
    </div>
  );
}
