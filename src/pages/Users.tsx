import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import UserTable from "../components/users/UserTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Modal from "../components/common/Modal";
import UserForm, { UserFormValues } from "../components/users/UserForm";
import { usersApi } from "../api/usersApi";
import { User } from "../types/user";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load users. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const closeAddUserModal = () => {
    setIsAddUserModalOpen(false);
    setSubmitError(null);
  };

  const handleAddUser = async (formData: UserFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await usersApi.createUser(formData);
      await fetchUsers();
      closeAddUserModal();
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to create user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system users</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setIsAddUserModalOpen(true)}>
          Add User
        </Button>
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

      <Modal isOpen={isAddUserModalOpen} onClose={closeAddUserModal} title="Add User">
        {submitError && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
            {submitError}
          </div>
        )}
        <UserForm loading={isSubmitting} onSubmit={handleAddUser} onCancel={closeAddUserModal} />
      </Modal>
    </div>
  );
}
