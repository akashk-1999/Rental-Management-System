import { useCallback, useEffect, useState } from "react";
import ReturnTable from "../components/returns/ReturnTable";
import ReturnModal, { ReturnSubmitPayload } from "../components/returns/ReturnModal";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { returnsApi } from "../api/returnsApi";
import { ReturnableRental, ReturnRentalDetail } from "../types/return";
import { useToast } from "../context/ToastContext";

export default function Returns() {
  const { showToast } = useToast();

  const [rentals, setRentals] = useState<ReturnableRental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<ReturnRentalDetail | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await returnsApi.getReturnableRentals();
      setRentals(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load rentals. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const openReturnModal = async (rental: ReturnableRental) => {
    setIsModalOpen(true);
    setIsLoadingDetails(true);
    setDetailsError(null);
    setSelectedRental(null);
    setSubmitError(null);
    try {
      const data = await returnsApi.getRentalForReturn(rental.rentalId);
      setSelectedRental(data);
    } catch (err) {
      console.error(err);
      setDetailsError("Failed to load rental details. Please try again.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRental(null);
    setDetailsError(null);
    setSubmitError(null);
  };

  const handleSubmit = async (payload: ReturnSubmitPayload) => {
    if (!selectedRental || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await returnsApi.createReturn({
        rentalId: selectedRental.rentalId,
        returnDate: payload.returnDate,
        notes: payload.notes,
        returnedItems: payload.returnedItems,
      });

      await fetchRentals();
      closeModal();
      showToast("Return recorded successfully.");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to record return. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Returns</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage returned rental items</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading rentals..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <ReturnTable rentals={rentals} onReturnItems={openReturnModal} />
      )}

      <ReturnModal
        isOpen={isModalOpen}
        rental={selectedRental}
        loading={isLoadingDetails}
        error={detailsError}
        submitting={isSubmitting}
        submitError={submitError}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
