import apiClient from "./apiClient";
import type { User } from "../types/user";

interface GetUsersResponse {
  success: boolean;
  data: User[];
}

interface CreateUserRequest {
  username: string;
  password: string;
  fullName: string;
  role: "Admin" | "Staff";
}

interface CreateUserResponse {
  success: boolean;
  data: User;
}

interface UpdateUserRequest {
  username: string;
  fullName: string;
  role: "Admin" | "Staff";
  isActive: boolean;
}

interface UpdateUserResponse {
  success: boolean;
  data: User;
}

async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<GetUsersResponse>("/users");
  return response.data.data;
}

async function createUser(user: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<CreateUserResponse>("/users", user);
  return response.data.data;
}

async function updateUser(userId: number, user: UpdateUserRequest): Promise<User> {
  const response = await apiClient.put<UpdateUserResponse>(`/users/${userId}`, user);
  return response.data.data;
}

async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}`);
}

export const usersApi = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
