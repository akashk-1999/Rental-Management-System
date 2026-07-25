import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import { User } from "../../types/user";

interface ResetPasswordDialogProps {
  isOpen: boolean;
  user: User | null;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ResetPasswordDialog({
  isOpen,
  user,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: ResetPasswordDialogProps) {
  if (!user) {
    return null;
  }

  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      onClose={onCancel}
      onConfirm={onConfirm}
      tone="info"
      title="Reset Password"
      subtitle="Please confirm you want to reset this user's password"
      confirmLabel="Reset Password"
      loading={loading}
      error={error}
      details={[
        { label: "Username", value: user.username },
        { label: "Full Name", value: user.fullName },
        { label: "New Password", value: "123456" },
      ]}
    />
  );
}
