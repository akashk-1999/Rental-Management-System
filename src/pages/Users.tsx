import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import UserTable, { UserRow } from "../components/users/UserTable";

export default function Users() {
  const users: UserRow[] = [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system users</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Add User</Button>
      </div>

      <UserTable users={users} />
    </div>
  );
}
