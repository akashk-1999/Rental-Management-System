import { ReturnLineItem } from "../../types/return";

interface ReturnItemsTableProps {
  lineItems: ReturnLineItem[];
  quantities: Record<number, number>;
  onChange: (rentalLineItemId: number, quantity: number) => void;
  disabled?: boolean;
}

function formatCurrency(value: number): string {
  return `₹${value.toFixed(2)}`;
}

export default function ReturnItemsTable({ lineItems, quantities, onChange, disabled = false }: ReturnItemsTableProps) {
  const handleQuantityInput = (lineItem: ReturnLineItem, rawValue: string) => {
    let quantity = rawValue === "" ? 0 : Number(rawValue);
    if (Number.isNaN(quantity) || quantity < 0) {
      quantity = 0;
    }
    if (quantity > lineItem.quantityRemaining) {
      quantity = lineItem.quantityRemaining;
    }
    onChange(lineItem.rentalLineItemId, quantity);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Item Name
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Quantity Rented
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Already Returned
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Remaining Quantity
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Rental Price
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Return Quantity
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {lineItems.map((lineItem) => {
            const quantity = quantities[lineItem.rentalLineItemId] ?? 0;
            const canReturn = lineItem.quantityRemaining > 0;

            return (
              <tr key={lineItem.rentalLineItemId}>
                <td className="px-3 py-2 text-sm text-slate-700 dark:text-slate-300">{lineItem.itemName}</td>
                <td className="px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300">
                  {lineItem.quantityRented}
                </td>
                <td className="px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300">
                  {lineItem.quantityAlreadyReturned}
                </td>
                <td className="px-3 py-2 text-center text-sm font-medium text-slate-900 dark:text-slate-100">
                  {lineItem.quantityRemaining}
                </td>
                <td className="px-3 py-2 text-center text-sm text-slate-700 dark:text-slate-300">
                  {formatCurrency(lineItem.rentalPrice)}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number"
                    min={0}
                    max={lineItem.quantityRemaining}
                    value={quantity}
                    disabled={disabled || !canReturn}
                    onChange={(e) => handleQuantityInput(lineItem, e.target.value)}
                    aria-label={`Return quantity for ${lineItem.itemName}`}
                    className="w-20 rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
