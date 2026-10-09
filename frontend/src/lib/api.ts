import axios from "axios";

import { clearAuth, getAccessToken } from "./auth";

export const api = axios.create({
  baseURL: "",
  headers: {
    "Cache-Control": "no-cache",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      typeof window !== "undefined"
    ) {
      const url = error.config?.url ?? "";

      if (!url.includes("/auth/login")) {
        clearAuth();

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;

    if (Array.isArray(data?.message)) {
      return data.message[0] ?? fallback;
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (!error.response) {
      return "ไม่สามารถเชื่อมต่อ Server ได้";
    }
  }

  return fallback;
}
