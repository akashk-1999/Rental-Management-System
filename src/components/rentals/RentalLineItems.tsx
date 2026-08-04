import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search, Trash2 } from "lucide-react";
import { Item } from "../../types/item";
import { useToast } from "../../context/ToastContext";

export interface RentalLineItemDraft {
  itemId: number | "";
  quantityRented: number | "";
}

interface RentalLineItemsProps {
  items: Item[];
  lineItems: RentalLineItemDraft[];
  onChange: (lineItems: RentalLineItemDraft[]) => void;
  disabled?: boolean;
}

// minmax(0,1fr) — not plain 1fr — so the Item column can shrink below its content's intrinsic
// width; otherwise the long combobox label refuses to shrink and the row overflows the container.
const ROW_GRID_COLS = "sm:grid-cols-[minmax(0,1fr)_6rem_7rem_7rem_2.5rem]";

function formatItemLabel(item: Item): string {
  const availability = item.availableStock > 0 ? `Avail: ${item.availableStock}` : "Out of Stock";
  return `${item.itemName} (${item.categoryName}) — ${availability}`;
}

interface ItemComboboxProps {
  items: Item[];
  value: number | "";
  onChange: (itemId: number | "") => void;
  disabled?: boolean;
}

function ItemCombobox({ items, value, onChange, disabled = false }: ItemComboboxProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.itemId === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === "") {
      return items;
    }
    return items.filter(
      (item) =>
        item.itemName.toLowerCase().includes(normalizedQuery) ||
        item.categoryName.toLowerCase().includes(normalizedQuery) ||
        (item.itemCode ?? "").toLowerCase().includes(normalizedQuery)
    );
  }, [items, query]);

  const handleSelect = (item: Item) => {
    if (item.availableStock <= 0) {
      showToast(`'${item.itemName}' has no stock available.`, "error");
      return;
    }
    onChange(item.itemId);
    setIsOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setIsOpen(false);
          setQuery("");
        }
      }}
    >
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-left text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
      >
        <span className={`truncate ${selectedItem ? "" : "text-slate-400 dark:text-slate-500"}`}>
          {selectedItem ? formatItemLabel(selectedItem) : "Select an item"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-20 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="relative border-b border-slate-100 p-2 dark:border-slate-700">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full rounded-md border border-slate-200 py-1.5 pl-7 pr-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto py-1">
            {filteredItems.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No items found.</li>
            ) : (
              filteredItems.map((item) => {
                const outOfStock = item.availableStock <= 0;
                return (
                  <li key={item.itemId}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.itemId === value}
                      aria-disabled={outOfStock}
                      onClick={() => handleSelect(item)}
                      className={`block w-full px-3 py-2 text-left text-sm ${
                        outOfStock
                          ? "cursor-not-allowed text-rose-400 dark:text-rose-400/70"
                          : `hover:bg-indigo-50 dark:hover:bg-indigo-500/10 ${
                              item.itemId === value
                                ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                                : "text-slate-700 dark:text-slate-200"
                            }`
                      }`}
                    >
                      {formatItemLabel(item)}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function RentalLineItems({ items, lineItems, onChange, disabled = false }: RentalLineItemsProps) {
  const selectedItemIds = new Set(lineItems.map((li) => li.itemId).filter((id): id is number => id !== ""));

  const getItemById = (itemId: number | ""): Item | undefined =>
    itemId === "" ? undefined : items.find((item) => item.itemId === itemId);

  const handleAddRow = () => {
    onChange([...lineItems, { itemId: "", quantityRented: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, itemId: number | "") => {
    const next = [...lineItems];
    next[index] = { ...next[index], itemId };
    onChange(next);
  };

  const handleQuantityChange = (index: number, quantityRented: number | "") => {
    const next = [...lineItems];
    next[index] = { ...next[index], quantityRented };
    onChange(next);
  };

  return (
    <div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700">
        {/* Column headers — shown from sm: up, where rows switch to the grid layout below */}
        <div
          className={`hidden bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:grid sm:items-center sm:gap-3 ${ROW_GRID_COLS}`}
        >
          <span>Item</span>
          <span className="text-center">Quantity</span>
          <span className="text-center">Rental Price</span>
          <span className="text-center">Subtotal</span>
          <span />
        </div>

        <div className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
          {lineItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No items added yet. Click "Add Item" below.
            </p>
          ) : (
            lineItems.map((lineItem, index) => {
              const selectedItem = getItemById(lineItem.itemId);
              const quantity = lineItem.quantityRented === "" ? 0 : lineItem.quantityRented;
              const subtotal = selectedItem ? quantity * selectedItem.rentalPrice : 0;
              const availableItems = items.filter(
                (item) => item.itemId === lineItem.itemId || !selectedItemIds.has(item.itemId)
              );

              return (
                <div
                  key={index}
                  className={`grid grid-cols-1 gap-2 p-3 sm:items-center sm:gap-3 sm:py-2 ${ROW_GRID_COLS}`}
                >
                  <ItemCombobox
                    items={availableItems}
                    value={lineItem.itemId}
                    onChange={(itemId) => handleItemChange(index, itemId)}
                    disabled={disabled}
                  />

                  <div className="flex items-center justify-between gap-2 sm:block">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:hidden">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={selectedItem?.availableStock}
                      value={lineItem.quantityRented}
                      onChange={(e) => {
                        if (e.target.value === "") {
                          handleQuantityChange(index, "");
                          return;
                        }
                        let nextQuantity = Number(e.target.value);
                        if (selectedItem && nextQuantity > selectedItem.availableStock) {
                          nextQuantity = selectedItem.availableStock;
                        }
                        handleQuantityChange(index, nextQuantity);
                      }}
                      disabled={disabled || !selectedItem}
                      required
                      className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-center text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700 sm:w-full"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:block sm:text-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:hidden">
                      Rental Price
                    </span>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {selectedItem ? `₹${selectedItem.rentalPrice.toFixed(2)}` : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:block sm:text-center">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:hidden">
                      Subtotal
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {selectedItem ? `₹${subtotal.toFixed(2)}` : "-"}
                    </span>
                  </div>

                  <div className="flex justify-end sm:block sm:text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(index)}
                      disabled={disabled}
                      title="Remove item"
                      aria-label="Remove item"
                      className="rounded text-slate-400 transition-transform duration-150 ease-in-out hover:scale-110 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed dark:hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={handleAddRow}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors duration-150 ease-in-out hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/40 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add Item
        </button>
      </div>
    </div>
  );
}
