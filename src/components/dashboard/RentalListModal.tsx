import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import RentalListTable from "./RentalListTable";
import { DashboardRentalListItem } from "../../types/dashboard";

type RentalListRow = DashboardRentalListItem & { daysOverdue?: number };

interface RentalListModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  rentals: RentalListRow[] | null;
  loading?: boolean;
  error?: string | null;
  showDaysOverdue?: boolean;
  emptyMessage?: string;
  onRowClick?: (rental: RentalListRow) => void;
  onClose: () => void;
}

export default function RentalListModal({
  isOpen,
  title,
  subtitle,
  rentals,
  loading = false,
  error,
  showDaysOverdue = false,
  emptyMessage,
  onRowClick,
  onClose,
}: RentalListModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle} size="lg">
      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading rentals..." className="min-h-[20vh]" />
      ) : rentals ? (
        <RentalListTable
          rentals={rentals}
          showDaysOverdue={showDaysOverdue}
          emptyMessage={emptyMessage}
          pageSize={8}
          onRowClick={onRowClick}
        />
      ) : null}
    </Modal>
  );
}
