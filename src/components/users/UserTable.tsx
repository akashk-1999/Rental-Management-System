import Table, { TableColumn } from "../common/Table";

export interface UserRow extends Record<string, unknown> {
  username: string;
  fullName: string;
  role: string;
  status: string;
}

const columns: TableColumn<UserRow>[] = [
  { key: "username", header: "Username" },
  { key: "fullName", header: "Full Name" },
  { key: "role", header: "Role" },
  { key: "status", header: "Status" },
  { key: "actions", header: "Actions", render: () => null },
];

interface UserTableProps {
  users: UserRow[];
}

export default function UserTable({ users }: UserTableProps) {
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
