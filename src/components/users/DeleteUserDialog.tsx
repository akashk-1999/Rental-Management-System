import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import { User } from "../../types/user";

interface DeleteUserDialogProps {
  isOpen: boolean;
  user: User | null;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DeleteUserDialog({
  isOpen,
  user,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: DeleteUserDialogProps) {
  if (!user) {
    return null;
  }

  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Delete User"
      subtitle="Please confirm you want to deactivate this user"
      confirmLabel="Delete User"
      loading={loading}
      error={error}
      details={[
        { label: "Username", value: user.username },
        { label: "Full Name", value: user.fullName },
        { label: "Role", value: user.role },
        { label: "Status", value: user.isActive ? "Active" : "Inactive" },
      ]}
    />
  );
}
