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

        if (typeof window !== "undefined" && window.location.pathname !== "/login") {
          window.location.replace("/login");
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
      return fallback;
    }
  }

  return fallback;
}

/*
 * อ่าน response body ของ error ที่ backend แนบ field เพิ่มมา
 * เช่น 400 ตอนถูก Workflow Rule บล็อกการย้ายขั้นตอน
 * ที่มี errorCode + unmetRules นอกเหนือจาก message
 */
export function getErrorPayload<T>(
  error: unknown,
): T | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data && typeof data === "object") {
      return data as T;
    }
  }

  return undefined;
}

/*
 * รหัสข้อผิดพลาดสั้น ๆ ที่ backend กำหนด (เช่น WORKFLOW_RULE_BLOCKED)
 * ไม่ใช่ทุก error จะมี -> คืน undefined เมื่อไม่พบ
 */
export function getErrorCode(error: unknown): string | undefined {
  const code = getErrorPayload<{ errorCode?: unknown }>(
    error,
  )?.errorCode;

  return typeof code === "string" ? code : undefined;
}
