import { ReturnRentalDetail } from "../../types/return";
import { RentalStatus } from "../../types/rental";

interface ReturnDetailsProps {
  rental: ReturnRentalDetail;
}

const STATUS_BADGE: Record<RentalStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  PartialReturn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  Returned: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  Overdue: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const datePart = date.toLocaleDateString();
  const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${datePart} ${timePart}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50/60 px-4 py-2.5 dark:bg-slate-800/40">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

export default function ReturnDetails({ rental }: ReturnDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[rental.status]}`}
        >
          {rental.status}
        </span>
      </div>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Customer Information
        </h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-700">
          <DetailRow label="Customer Name" value={rental.customerName} />
          <DetailRow label="Mobile Number" value={rental.mobileNumber} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Rental Information
        </h3>
        <div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-700">
          <DetailRow label="Rental Code" value={rental.rentalCode} />
          <DetailRow label="Rental Start Date" value={formatDateTime(rental.rentalStartDate)} />
          <DetailRow label="Expected Return Date" value={formatDateTime(rental.expectedReturnDate)} />
          {rental.notes && <DetailRow label="Notes" value={rental.notes} />}
        </div>
      </section>
    </div>
  );
}
