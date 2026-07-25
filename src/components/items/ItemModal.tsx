import Modal from "../common/Modal";
import ItemForm, { ItemFormValues } from "./ItemForm";
import { Item } from "../../types/item";
import { Category } from "../../types/category";

interface ItemModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  item?: Item | null;
  categories: Category[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (formData: ItemFormValues) => void;
}

export default function ItemModal({
  isOpen,
  mode,
  item,
  categories,
  loading = false,
  error,
  onClose,
  onSubmit,
}: ItemModalProps) {
  const isEdit = mode === "edit";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Item" : "Add Item"}
      subtitle={isEdit ? "Update the selected item's details" : "Fill in the details to create a new item"}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}
      {(!isEdit || item) && (
        <ItemForm
          categories={categories}
          loading={loading}
          initialValues={
            isEdit && item
              ? {
                  itemName: item.itemName,
                  categoryId: item.categoryId,
                  itemCode: item.itemCode ?? "",
                  unitType: item.unitType,
                  totalQuantity: item.totalQuantity,
                  rentalPrice: item.rentalPrice,
                  securityDeposit: item.securityDeposit !== null ? String(item.securityDeposit) : "",
                  description: item.description ?? "",
                  imageUrl: item.imageUrl ?? "",
                }
              : undefined
          }
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}
