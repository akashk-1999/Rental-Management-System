import { useState } from "react";
import ReportTabs, { ReportKey } from "../components/reports/ReportTabs";
import RentalReportSection from "../components/reports/RentalReportSection";
import PaymentReportSection from "../components/reports/PaymentReportSection";
import ReturnReportSection from "../components/reports/ReturnReportSection";
import InventoryReportSection from "../components/reports/InventoryReportSection";
import CustomerHistoryReportSection from "../components/reports/CustomerHistoryReportSection";

export default function Reports() {
  const [activeReport, setActiveReport] = useState<ReportKey>("rentals");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Reports</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
          Filter and review rental, payment, return, inventory, and customer history data
        </p>
      </div>

      <ReportTabs active={activeReport} onChange={setActiveReport} />

      {activeReport === "rentals" && <RentalReportSection />}
      {activeReport === "payments" && <PaymentReportSection />}
      {activeReport === "returns" && <ReturnReportSection />}
      {activeReport === "inventory" && <InventoryReportSection />}
      {activeReport === "customer-history" && <CustomerHistoryReportSection />}
    </div>
  );
}
