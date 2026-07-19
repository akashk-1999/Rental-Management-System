import { Pencil, Trash2 } from "lucide-react";
import Table, { TableColumn } from "../common/Table";
import Button from "../common/Button";
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
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEdit?.(user)}
            aria-label={`Edit ${user.username}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete?.(user)}
            aria-label={`Delete ${user.username}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
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
