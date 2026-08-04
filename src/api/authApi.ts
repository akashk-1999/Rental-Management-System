import apiClient from "./apiClient";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const login = async (data: LoginRequest) => {
  const response = await apiClient.post("/auth/login", data);
  return response.data;
};

export const changePassword = async (data: ChangePasswordRequest) => {
  const response = await apiClient.post("/auth/change-password", data);
  return response.data;
};