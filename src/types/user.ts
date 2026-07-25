export interface User extends Record<string, unknown> {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  email: string | null;
  contactNumber: string | null;
  createdAt: string;
  updatedAt: string;
}