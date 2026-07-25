import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import UserTable from "../components/users/UserTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Modal from "../components/common/Modal";
import UserForm, { UserFormValues } from "../components/users/UserForm";
import DeleteUserDialog from "../components/users/DeleteUserDialog";
import { usersApi } from "../api/usersApi";
import { User } from "../types/user";
import { useToast } from "../context/ToastContext";

export default function Users() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      showToast("User created successfully.");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to create user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
    console.log("Selected User:", user);
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const closeEditUserModal = () => {
    setIsEditUserModalOpen(false);
    setSelectedUser(null);
  };

  const handleUpdateUser = async (formData: UserFormValues) => {
    if (!selectedUser) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await usersApi.updateUser(selectedUser.userId, formData);
      await fetchUsers();
      closeEditUserModal();
      showToast("User updated successfully.");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to update user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
    setSubmitError(null);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) {
      return;
    }

    setIsDeleting(true);
    setSubmitError(null);
    try {
      await usersApi.deleteUser(userToDelete.userId);
      await fetchUsers();
      closeDeleteDialog();
      showToast("User deactivated successfully.");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to deactivate user. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Users</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage system users</p>
        </div>
        <Button
          variant="accent"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setIsAddUserModalOpen(true)}
        >
          Add User
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading users..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <UserTable users={users} onEdit={handleEditUser} onDelete={handleDeleteUser} />
      )}

      <Modal
        isOpen={isAddUserModalOpen}
        onClose={closeAddUserModal}
        title="Add User"
        subtitle="Fill in the details to create a new user account"
      >
        {submitError && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {submitError}
          </div>
        )}
        <UserForm loading={isSubmitting} onSubmit={handleAddUser} />
      </Modal>

      <Modal
        isOpen={isEditUserModalOpen}
        onClose={closeEditUserModal}
        title="Edit User"
        subtitle="Update the selected user's details"
      >
        {submitError && (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {submitError}
          </div>
        )}
        {selectedUser && (
          <UserForm
            mode="edit"
            loading={isSubmitting}
            initialValues={{
              fullName: selectedUser.fullName,
              username: selectedUser.username,
              role: selectedUser.role as "Admin" | "Staff",
              isActive: selectedUser.isActive,
              email: selectedUser.email ?? "",
              contactNumber: selectedUser.contactNumber ?? "",
            }}
            onSubmit={handleUpdateUser}
          />
        )}
      </Modal>

      <DeleteUserDialog
        isOpen={isDeleteDialogOpen}
        user={userToDelete}
        loading={isDeleting}
        error={submitError}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
