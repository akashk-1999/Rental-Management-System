import { Pencil, Trash2 } from "lucide-react";
import Table, { TableColumn } from "../common/Table";
import { User } from "../../types/user";

interface UserTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export default function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const columns: TableColumn<User>[] = [
    { key: "username", header: "Username" },
    { key: "fullName", header: "Full Name" },
    { key: "role", header: "Role" },
    {
      key: "isActive",
      header: "Status",
      render: (user) => (user.isActive ? "Active" : "Inactive"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (user) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit?.(user)}
            title="Edit"
            aria-label={`Edit ${user.username}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-indigo-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(user)}
            title="Delete"
            aria-label={`Delete ${user.username}`}
            className="rounded text-slate-500 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      <Table
        columns={columns}
        data={users}
        emptyMessage="No users found. Click 'Add User' to create the first user."
      />
    </div>
  );
}
