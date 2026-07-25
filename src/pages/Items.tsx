import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import ItemTable from "../components/items/ItemTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ItemModal from "../components/items/ItemModal";
import ItemStatusDialog from "../components/items/ItemStatusDialog";
import { ItemFormValues } from "../components/items/ItemForm";
import { itemsApi } from "../api/itemsApi";
import { categoriesApi } from "../api/categoriesApi";
import { Item } from "../types/item";
import { Category } from "../types/category";
import { useToast } from "../context/ToastContext";

export default function Items() {
  const { showToast } = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [itemForStatusChange, setItemForStatusChange] = useState<Item | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await itemsApi.getItems();
      setItems(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load items. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, [fetchItems, fetchCategories]);

  const activeCategories = categories.filter((category) => category.isActive);

  const openAddModal = () => {
    setModalMode("create");
    setSelectedItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setModalMode("edit");
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setSubmitError(null);
  };

  const handleSubmit = async (formData: ItemFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        itemName: formData.itemName,
        categoryId: Number(formData.categoryId),
        itemCode: formData.itemCode,
        unitType: formData.unitType,
        totalQuantity: formData.totalQuantity,
        rentalPrice: formData.rentalPrice,
        securityDeposit: formData.securityDeposit.trim() === "" ? null : Number(formData.securityDeposit),
        description: formData.description,
        imageUrl: formData.imageUrl,
      };

      if (modalMode === "edit" && selectedItem) {
        await itemsApi.updateItem(selectedItem.itemId, payload);
        showToast("Item updated successfully.");
      } else {
        await itemsApi.createItem(payload);
        showToast("Item created successfully.");
      }
      await fetchItems();
      closeModal();
    } catch (err) {
      console.error(err);
      setSubmitError(`Failed to ${modalMode === "edit" ? "update" : "create"} item. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (item: Item) => {
    setItemForStatusChange(item);
    setIsStatusDialogOpen(true);
  };

  const closeStatusDialog = () => {
    setIsStatusDialogOpen(false);
    setItemForStatusChange(null);
    setStatusError(null);
  };

  const handleConfirmStatusChange = async () => {
    if (!itemForStatusChange) {
      return;
    }

    const nextStatus = itemForStatusChange.status === "Active" ? "Inactive" : "Active";

    setIsChangingStatus(true);
    setStatusError(null);
    try {
      await itemsApi.updateItemStatus(itemForStatusChange.itemId, { status: nextStatus });
      await fetchItems();
      closeStatusDialog();
      showToast(`Item ${nextStatus === "Active" ? "activated" : "deactivated"} successfully.`);
    } catch (err) {
      console.error(err);
      setStatusError(`Failed to ${nextStatus === "Active" ? "activate" : "deactivate"} item. Please try again.`);
    } finally {
      setIsChangingStatus(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Items</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage rental items</p>
        </div>
        <Button variant="accent" leftIcon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
          Add Item
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading items..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <ItemTable items={items} onEdit={openEditModal} onToggleStatus={handleToggleStatus} />
      )}

      <ItemModal
        isOpen={isModalOpen}
        mode={modalMode}
        item={selectedItem}
        categories={activeCategories}
        loading={isSubmitting}
        error={submitError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <ItemStatusDialog
        isOpen={isStatusDialogOpen}
        item={itemForStatusChange}
        loading={isChangingStatus}
        error={statusError}
        onCancel={closeStatusDialog}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}
