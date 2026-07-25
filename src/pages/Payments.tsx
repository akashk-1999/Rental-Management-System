import { useCallback, useEffect, useState } from "react";
import PaymentTable from "../components/payments/PaymentTable";
import PaymentModal, { PaymentSubmitPayload } from "../components/payments/PaymentModal";
import PaymentHistoryModal from "../components/payments/PaymentHistoryModal";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { paymentsApi } from "../api/paymentsApi";
import { PaymentSummary, PaymentRentalDetail } from "../types/payment";
import { useToast } from "../context/ToastContext";

export default function Payments() {
  const { showToast } = useToast();

  const [rentals, setRentals] = useState<PaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<PaymentSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyRental, setHistoryRental] = useState<PaymentRentalDetail | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await paymentsApi.getPaymentSummaries();
      setRentals(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load payments. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const openPaymentModal = (rental: PaymentSummary) => {
    setSelectedRental(rental);
    setSubmitError(null);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedRental(null);
    setSubmitError(null);
  };

  const handleSubmit = async (payload: PaymentSubmitPayload) => {
    if (!selectedRental || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await paymentsApi.createPayment({
        rentalId: selectedRental.rentalId,
        paymentDate: payload.paymentDate,
        amount: payload.amount,
        paymentType: payload.paymentType,
        paymentMode: payload.paymentMode,
        notes: payload.notes,
      });

      await fetchRentals();
      closePaymentModal();
      showToast("Payment recorded successfully.");
    } catch (err) {
      console.error(err);
      setSubmitError("Failed to record payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openHistoryModal = async (rental: PaymentSummary) => {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setHistoryError(null);
    setHistoryRental(null);
    try {
      const data = await paymentsApi.getRentalPaymentDetail(rental.rentalId);
      setHistoryRental(data);
    } catch (err) {
      console.error(err);
      setHistoryError("Failed to load payment history. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const closeHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setHistoryRental(null);
    setHistoryError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Payments</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Record and track rental payments</p>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading payments..." />
      ) : error ? (
        <div className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <PaymentTable rentals={rentals} onRecordPayment={openPaymentModal} onViewHistory={openHistoryModal} />
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        rental={selectedRental}
        submitting={isSubmitting}
        error={submitError}
        onClose={closePaymentModal}
        onSubmit={handleSubmit}
      />

      <PaymentHistoryModal
        isOpen={isHistoryModalOpen}
        rental={historyRental}
        loading={isLoadingHistory}
        error={historyError}
        onClose={closeHistoryModal}
      />
    </div>
  );
}
