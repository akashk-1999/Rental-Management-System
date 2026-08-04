import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import { changePassword } from "../../api/authApi";
import { useToast } from "../../context/ToastContext";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_VALUES = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { showToast } = useToast();

  const [values, setValues] = useState(DEFAULT_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValues(DEFAULT_VALUES);
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (field: keyof typeof DEFAULT_VALUES, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (values.newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (values.newPassword !== values.confirmNewPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      showToast("Password changed successfully.");
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to change password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      subtitle="Update the password used to sign in to your account"
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          id="currentPassword"
          label="Current Password"
          type="password"
          value={values.currentPassword}
          onChange={(e) => handleChange("currentPassword", e.target.value)}
          disabled={loading}
          placeholder="Enter current password"
          required
        />

        <Input
          id="newPassword"
          label="New Password"
          type="password"
          value={values.newPassword}
          onChange={(e) => handleChange("newPassword", e.target.value)}
          disabled={loading}
          placeholder="Enter new password"
          required
        />

        <Input
          id="confirmNewPassword"
          label="Confirm New Password"
          type="password"
          value={values.confirmNewPassword}
          onChange={(e) => handleChange("confirmNewPassword", e.target.value)}
          disabled={loading}
          placeholder="Re-enter new password"
          required
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
