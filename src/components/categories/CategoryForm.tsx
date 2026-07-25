import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Input from "../common/Input";
import Button from "../common/Button";

export interface CategoryFormValues {
  categoryName: string;
}

interface CategoryFormProps {
  initialValues?: Partial<CategoryFormValues>;
  loading?: boolean;
  onSubmit: (formData: CategoryFormValues) => void;
}

const DEFAULT_VALUES: CategoryFormValues = {
  categoryName: "",
};

export default function CategoryForm({ initialValues, loading = false, onSubmit }: CategoryFormProps) {
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

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Save
        </Button>
      </div>
    </form>
  );
}
