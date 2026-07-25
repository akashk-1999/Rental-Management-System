import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import RentalTable from "../components/rentals/RentalTable";
import LoadingSpinner from "../components/common/LoadingSpinner";
import RentalModal from "../components/rentals/RentalModal";
import RentalDetailsModal from "../components/rentals/RentalDetailsModal";
import { RentalFormValues } from "../components/rentals/RentalForm";
import { rentalsApi } from "../api/rentalsApi";
import { itemsApi } from "../api/itemsApi";
import { RentalSummary, Rental } from "../types/rental";
import { Item } from "../types/item";
import { useToast } from "../context/ToastContext";

function combineDateAndTimeToIso(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

export default function Rentals() {
  const { showToast } = useToast();

  const [rentals, setRentals] = useState<RentalSummary[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rentalsApi.getRentals();
      setRentals(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load rentals. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const data = await itemsApi.getItems();
      setItems(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchRentals();
    fetchItems();
  }, [fetchRentals, fetchItems]);

  const activeItems = items.filter((item) => item.status === "Active");

  const openAddModal = () => {
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSubmitError(null);
  };

  const handleSubmit = async (formData: RentalFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const lineItems = formData.lineItems
        .filter((lineItem) => lineItem.itemId !== "" && lineItem.quantityRented !== "")
        .map((lineItem) => ({
          itemId: Number(lineItem.itemId),
          quantityRented: Number(lineItem.quantityRented),
        }));

      await rentalsApi.createRental({
        customer: {
          customerName: formData.customerName,
          mobileNumber: `+91${formData.mobileNumber}`,
          alternateNumber: formData.alternateNumber ? `+91${formData.alternateNumber}` : null,
          address: formData.address || null,
          idProof: formData.idProof || null,
          notes: formData.customerNotes || null,
        },
        rentalStartDate: combineDateAndTimeToIso(formData.rentalStartDate, formData.rentalStartTime),
        expectedReturnDate: combineDateAndTimeToIso(formData.expectedReturnDate, formData.expectedReturnTime),
        advancePaid: formData.advancePaid.trim() === "" ? undefined : Number(formData.advancePaid),
        securityDepositPaid:
          formData.securityDepositPaid.trim() === "" ? undefined : Number(formData.securityDepositPaid),
        notes: formData.rentalNotes || null,
        lineItems,
      });

      await fetchRentals();
      closeModal();
      showToast("Rental created successfully.");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to create rental. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRental = async (rentalSummary: RentalSummary) => {
    setIsDetailsModalOpen(true);
    setIsLoadingDetails(true);
    setDetailsError(null);
    setSelectedRental(null);
    try {
      const data = await rentalsApi.getRentalById(rentalSummary.rentalId);
      setSelectedRental(data);
    } catch (err) {
      console.error(err);
      setDetailsError("Failed to load rental details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedRental(null);
    setDetailsError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Rentals</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage rental transactions</p>
        </div>
        <Button variant="accent" leftIcon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
          New Rental
        </Button>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading rentals..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <RentalTable rentals={rentals} onView={handleViewRental} />
      )}

      <RentalModal
        isOpen={isModalOpen}
        items={activeItems}
        loading={isSubmitting}
        error={submitError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <RentalDetailsModal
        isOpen={isDetailsModalOpen}
        rental={selectedRental}
        loading={isLoadingDetails}
        error={detailsError}
        onClose={closeDetailsModal}
      />
    </div>
  );
}
