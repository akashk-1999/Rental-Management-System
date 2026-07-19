import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import UserTable from "../components/users/UserTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { usersApi } from "../api/usersApi";
import { User } from "../types/user";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUsers() {
      setLoading(true);
      setError(null);
      try {
        const data = await usersApi.getUsers();
        if (isMounted) {
          setUsers(data);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load users. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system users</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />}>Add User</Button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading users..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
          {error}
        </div>
      ) : (
        <UserTable users={users} />
      )}
    </div>
  );
}
