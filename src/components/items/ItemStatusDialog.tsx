import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import { Item } from "../../types/item";

interface ItemStatusDialogProps {
  isOpen: boolean;
  item: Item | null;
  loading?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ItemStatusDialog({
  isOpen,
  item,
  loading = false,
  error,
  onCancel,
  onConfirm,
}: ItemStatusDialogProps) {
  if (!item) {
    return null;
  }

  const isActivating = item.status === "Inactive";

  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      onClose={onCancel}
      onConfirm={onConfirm}
      tone={isActivating ? "success" : "danger"}
      title={isActivating ? "Activate this item?" : "Deactivate this item?"}
      subtitle={
        isActivating
          ? "This item will become available for new rentals again."
          : "This item will no longer be available for new rentals."
      }
      confirmLabel={isActivating ? "Activate" : "Deactivate"}
      loading={loading}
      error={error}
      details={[
        { label: "Item Name", value: item.itemName },
        { label: "Category", value: item.categoryName },
        { label: "Current Status", value: item.status },
      ]}
    />
  );
}
