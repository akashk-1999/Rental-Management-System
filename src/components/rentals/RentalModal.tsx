import Modal from "../common/Modal";
import RentalForm, { RentalFormValues } from "./RentalForm";
import { Item } from "../../types/item";

interface RentalModalProps {
  isOpen: boolean;
  items: Item[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (formData: RentalFormValues) => void;
}

export default function RentalModal({ isOpen, items, loading = false, error, onClose, onSubmit }: RentalModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Rental"
      subtitle="Fill in the details to create a new rental"
      size="lg"
    >
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}
      <RentalForm items={items} loading={loading} onSubmit={onSubmit} />
    </Modal>
  );
}
