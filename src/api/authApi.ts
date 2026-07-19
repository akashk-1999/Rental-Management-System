import apiClient from "./apiClient";

export interface LoginRequest {
  username: string;
  password: string;
}

export const login = async (data: LoginRequest) => {
  const response = await apiClient.post("/auth/login", data);
  return response.data;
};