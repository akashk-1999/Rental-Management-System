export interface User extends Record<string, unknown> {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}