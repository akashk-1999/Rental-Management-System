import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import CategoryTable from "../components/categories/CategoryTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CategoryModal from "../components/categories/CategoryModal";
import CategoryDeleteDialog from "../components/categories/CategoryDeleteDialog";
import { CategoryFormValues } from "../components/categories/CategoryForm";
import { categoriesApi } from "../api/categoriesApi";
import { Category } from "../types/category";
import { useToast } from "../context/ToastContext";

export default function Categories() {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await categoriesApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load categories. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAddModal = () => {
    setModalMode("create");
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setModalMode("edit");
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
    setSubmitError(null);
  };

  const handleSubmit = async (formData: CategoryFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (modalMode === "edit" && selectedCategory) {
        await categoriesApi.updateCategory(selectedCategory.categoryId, formData);
        showToast("Category updated successfully.");
      } else {
        await categoriesApi.createCategory(formData);
        showToast("Category created successfully.");
      }
      await fetchCategories();
      closeModal();
    } catch (err) {
      console.error(err);
      setSubmitError(`Failed to ${modalMode === "edit" ? "update" : "create"} category. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
    setSubmitError(null);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) {
      return;
    }

    setIsDeleting(true);
    setSubmitError(null);
    try {
      await categoriesApi.updateCategoryStatus(categoryToDelete.categoryId, { isActive: false });
      await fetchCategories();
      closeDeleteDialog();
      showToast("Category deactivated successfully.");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to deactivate category. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleActivateCategory = async (category: Category) => {
    try {
      await categoriesApi.updateCategoryStatus(category.categoryId, { isActive: true });
      await fetchCategories();
      showToast("Category activated successfully.");
    } catch (err) {
      console.error(err);
      showToast("Failed to activate category. Please try again.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Item Categories</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage item categories</p>
        </div>
        <Button variant="accent" leftIcon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
          Add Category
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading categories..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <CategoryTable
          categories={categories}
          onEdit={openEditModal}
          onDelete={handleDeleteCategory}
          onActivate={handleActivateCategory}
        />
      )}

      <CategoryModal
        isOpen={isModalOpen}
        mode={modalMode}
        category={selectedCategory}
        loading={isSubmitting}
        error={submitError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <CategoryDeleteDialog
        isOpen={isDeleteDialogOpen}
        category={categoryToDelete}
        loading={isDeleting}
        error={submitError}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
