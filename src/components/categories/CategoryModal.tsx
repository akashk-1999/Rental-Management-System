import Modal from "../common/Modal";
import CategoryForm, { CategoryFormValues } from "./CategoryForm";
import { Category } from "../../types/category";

interface CategoryModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  category?: Category | null;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (formData: CategoryFormValues) => void;
}

export default function CategoryModal({
  isOpen,
  mode,
  category,
  loading = false,
  error,
  onClose,
  onSubmit,
}: CategoryModalProps) {
  const isEdit = mode === "edit";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Category" : "Add Category"}
      subtitle={isEdit ? "Update the selected category's details" : "Fill in the details to create a new category"}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}
      {(!isEdit || category) && (
        <CategoryForm
          loading={loading}
          initialValues={isEdit && category ? { categoryName: category.categoryName } : undefined}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}
