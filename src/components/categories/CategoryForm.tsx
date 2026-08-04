import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";

export interface CategoryFormValues {
  categoryName: string;
  isActive: boolean;
}

interface CategoryFormProps {
  initialValues?: Partial<CategoryFormValues>;
  loading?: boolean;
  mode?: "create" | "edit";
  onSubmit: (formData: CategoryFormValues) => void;
}

const DEFAULT_VALUES: CategoryFormValues = {
  categoryName: "",
  isActive: true,
};

export default function CategoryForm({ initialValues, loading = false, mode = "create", onSubmit }: CategoryFormProps) {
  const [values, setValues] = useState<CategoryFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  useEffect(() => {
    setValues({
      ...DEFAULT_VALUES,
      ...initialValues,
    });
  }, [initialValues]);

  const handleChange = <K extends keyof CategoryFormValues>(field: K, value: CategoryFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="categoryName"
        label="Category Name"
        type="text"
        value={values.categoryName}
        onChange={(e) => handleChange("categoryName", e.target.value)}
        disabled={loading}
        placeholder="Enter category name"
        required
      />

      {mode === "edit" && (
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
            disabled={loading}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Active
          </label>
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Save
        </Button>
      </div>
    </form>
  );
}
