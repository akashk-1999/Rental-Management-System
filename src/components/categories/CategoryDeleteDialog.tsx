import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import { Category } from "../../types/category";

interface CategoryDeleteDialogProps {
  isOpen: boolean;
  category: Category | null;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function CategoryDeleteDialog({
  isOpen,
  category,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: CategoryDeleteDialogProps) {
  if (!category) {
    return null;
  }

  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Delete Category"
      subtitle="Please confirm you want to deactivate this category"
      confirmLabel="Delete Category"
      loading={loading}
      error={error}
      details={[
        { label: "Category Name", value: category.categoryName },
        { label: "Status", value: category.isActive ? "Active" : "Inactive" },
      ]}
    />
  );
}
