import apiClient from "./apiClient";
import type { User } from "../types/user";

interface GetUsersResponse {
  success: boolean;
  data: User[];
}

async function getUsers(): Promise<User[]> {
  const response = await apiClient.get<GetUsersResponse>("/users");
  return response.data.data;
}

export const usersApi = {
  getUsers,
};
