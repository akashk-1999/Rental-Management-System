import type { FormEvent } from "react";
import Input from "../common/Input";
import Button from "../common/Button";
import { useEffect, useState } from "react";


export interface UserFormValues {
  username: string;
  password: string;
  fullName: string;
  role: "Admin" | "Staff";
  isActive: boolean;
}

interface UserFormProps {
  initialValues?: Partial<UserFormValues>;
  loading?: boolean;
  mode?: "create" | "edit";
  onSubmit: (formData: UserFormValues) => void;
}

const DEFAULT_VALUES: UserFormValues = {
  username: "",
  password: "",
  fullName: "",
  role: "Staff",
  isActive: true,
};

export default function UserForm({
  initialValues,
  loading = false,
  mode = "create",
  onSubmit,
}: UserFormProps) {
  const [values, setValues] = useState<UserFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });

  useEffect(() => {
    setValues({
      ...DEFAULT_VALUES,
      ...initialValues,
    });
  }, [initialValues]);

  const handleChange = <K extends keyof UserFormValues>(field: K, value: UserFormValues[K]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="fullName"
        label="Full Name"
        type="text"
        value={values.fullName}
        onChange={(e) => handleChange("fullName", e.target.value)}
        disabled={loading}
        placeholder="Enter full name"
        required
      />

      <Input
        id="username"
        label="Username"
        type="text"
        value={values.username}
        onChange={(e) => handleChange("username", e.target.value)}
        disabled={loading}
        placeholder="Enter username"
        required
      />

      {mode === "create" && (
        <Input
          id="password"
          label="Password"
          type="password"
          value={values.password}
          onChange={(e) => handleChange("password", e.target.value)}
          disabled={loading}
          placeholder="Enter password"
          required
        />
      )}

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1.5">
          Role
          <span className="ml-0.5 text-rose-500">*</span>
        </label>
        <select
          id="role"
          value={values.role}
          onChange={(e) => handleChange("role", e.target.value as UserFormValues["role"])}
          disabled={loading}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
        >
          <option value="Admin">Admin</option>
          <option value="Staff">Staff</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isActive"
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => handleChange("isActive", e.target.checked)}
          disabled={loading}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:cursor-not-allowed"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
          Active
        </label>
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button type="submit" variant="primary" loading={loading}>
          Save
        </Button>
      </div>
    </form>
  );
}
