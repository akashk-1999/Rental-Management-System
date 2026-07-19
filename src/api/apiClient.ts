import axios from "axios";

const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export default apiClient;