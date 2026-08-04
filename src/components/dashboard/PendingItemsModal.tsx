import Modal from "../common/Modal";
import Table, { TableColumn } from "../common/Table";
import { DashboardRentalDueItem } from "../../types/dashboard";

interface PendingItemsModalProps {
  isOpen: boolean;
  rentalCode: string;
  customerName: string;
  dueDate: string;
  items: DashboardRentalDueItem[];
  onClose: () => void;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString();
}

export default function PendingItemsModal({
  isOpen,
  rentalCode,
  customerName,
  dueDate,
  items,
  onClose,
}: PendingItemsModalProps) {
  const columns: TableColumn<DashboardRentalDueItem>[] = [
    { key: "itemName", header: "Item" },
    { key: "quantityDue", header: "Qty Due", align: "center" },
    { key: "dueDate", header: "Due Date", align: "center", render: () => formatDate(dueDate) },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pending Items — ${rentalCode}`}
      subtitle={`${customerName} · Due ${formatDate(dueDate)}`}
      size="md"
    >
      <Table
        columns={columns}
        data={items}
        emptyMessage="No pending items on this rental."
        getRowKey={(item) => item.itemId}
      />
    </Modal>
  );
}
