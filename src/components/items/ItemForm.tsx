import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import { Category } from "../../types/category";

export interface ItemFormValues {
  itemName: string;
  categoryId: number | "";
  itemCode: string;
  unitType: string;
  totalQuantity: number;
  rentalPrice: number;
  securityDeposit: string;
  description: string;
  imageUrl: string;
}

interface ItemFormProps {
  categories: Category[];
  initialValues?: Partial<ItemFormValues>;
  loading?: boolean;
  onSubmit: (formData: ItemFormValues) => void;
}

const UNIT_TYPE_OPTIONS = ["Piece", "Kg", "Ltr", "Nos"];

const DEFAULT_VALUES: ItemFormValues = {
  itemName: "",
  categoryId: "",
  itemCode: "",
  unitType: "Piece",
  totalQuantity: 0,
  rentalPrice: 0,
  securityDeposit: "",
  description: "",
  imageUrl: "",
};

export default function ItemForm({ categories, initialValues, loading = false, onSubmit }: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  useEffect(() => {
    setValues({
      ...DEFAULT_VALUES,
      ...initialValues,
    });
  }, [initialValues]);

  const handleChange = <K extends keyof ItemFormValues>(field: K, value: ItemFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  // Preserve an existing item's unit type even if it predates this fixed option list.
  const unitTypeOptions = UNIT_TYPE_OPTIONS.includes(values.unitType)
    ? UNIT_TYPE_OPTIONS
    : [values.unitType, ...UNIT_TYPE_OPTIONS];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="itemName"
        label="Item Name"
        type="text"
        value={values.itemName}
        onChange={(e) => handleChange("itemName", e.target.value)}
        disabled={loading}
        placeholder="Enter item name"
        required
      />

      <div>
        <label htmlFor="categoryId" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
          Category
          <span className="ml-0.5 text-rose-500">*</span>
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          onChange={(e) => handleChange("categoryId", e.target.value ? Number(e.target.value) : "")}
          disabled={loading}
          required
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.categoryId} value={category.categoryId}>
              {category.categoryName}
            </option>
          ))}
        </select>
      </div>

      <Input
        id="itemCode"
        label="Item Code"
        type="text"
        value={values.itemCode}
        onChange={(e) => handleChange("itemCode", e.target.value)}
        disabled={loading}
        placeholder="Enter item code (optional)"
      />

      <div>
        <label htmlFor="unitType" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
          Unit Type
          <span className="ml-0.5 text-rose-500">*</span>
        </label>
        <select
          id="unitType"
          value={values.unitType}
          onChange={(e) => handleChange("unitType", e.target.value)}
          disabled={loading}
          required
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:disabled:bg-slate-700"
        >
          {unitTypeOptions.map((unitType) => (
            <option key={unitType} value={unitType}>
              {unitType}
            </option>
          ))}
        </select>
      </div>

      <Input
        id="totalQuantity"
        label="Total Quantity"
        type="number"
        min={0}
        value={values.totalQuantity}
        onChange={(e) => handleChange("totalQuantity", Number(e.target.value))}
        disabled={loading}
        placeholder="0"
        required
      />

      <Input
        id="rentalPrice"
        label="Rental Price"
        type="number"
        min={0}
        step="0.01"
        value={values.rentalPrice}
        onChange={(e) => handleChange("rentalPrice", Number(e.target.value))}
        disabled={loading}
        placeholder="0.00"
        required
      />

      <Input
        id="securityDeposit"
        label="Security Deposit"
        type="number"
        min={0}
        step="0.01"
        value={values.securityDeposit}
        onChange={(e) => handleChange("securityDeposit", e.target.value)}
        disabled={loading}
        placeholder="0.00 (optional)"
      />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5 dark:text-slate-200">
          Description
        </label>
        <textarea
          id="description"
          value={values.description}
          onChange={(e) => handleChange("description", e.target.value)}
          disabled={loading}
          placeholder="Enter item description (optional)"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-700"
        />
      </div>

      <Input
        id="imageUrl"
        label="Image URL"
        type="text"
        value={values.imageUrl}
        onChange={(e) => handleChange("imageUrl", e.target.value)}
        disabled={loading}
        placeholder="Enter image URL (optional)"
      />

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Save
        </Button>
      </div>
    </form>
  );
}
