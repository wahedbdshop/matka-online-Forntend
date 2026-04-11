import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import {
  clearServerSession,
  requestSessionRefresh,
} from "@/lib/auth-session";
import { useAuthStore } from "@/store/auth.store";

type RequestConfigWithAuth = InternalAxiosRequestConfig & {
  skipAuthRedirect?: boolean;
  _retry?: boolean;
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, ""),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, ""),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function getLoginPath() {
  if (typeof window === "undefined") {
    return "/login";
  }

  return window.location.pathname.startsWith("/admin")
    ? "/admin/login"
    : "/login";
}

async function refreshAccessToken() {
  const result = await requestSessionRefresh("axios-interceptor");
  return {
    accessToken: result.accessToken,
    status: result.status,
    blocked: result.blocked,
  };
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  const existingAuthorization = config.headers?.Authorization;

  if (token && !existingAuthorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (response.headers["x-session-limit-reached"] === "true") {
      toast.warning(
        "আপনি ৩টি device-এ login আছেন। নতুন session track হচ্ছে না।",
      );
    }

    return response;
  },
  async (error) => {
    const requestConfig = (error.config ?? {}) as RequestConfigWithAuth;
    const skipAuthRedirect = Boolean(
      requestConfig.skipAuthRedirect,
    );

    const isUnauthorized = error.response?.status === 401;
    const isRefreshRequest =
      requestConfig.url?.includes("/auth/refresh-token");
    const isAuthLoginRequest =
      requestConfig.url?.includes("/auth/login") ||
      requestConfig.url?.includes("/auth/login-with-captcha") ||
      requestConfig.url?.includes("/auth/admin-login/verify-otp");

    if (
      isUnauthorized &&
      !requestConfig._retry &&
      !isRefreshRequest &&
      !isAuthLoginRequest
    ) {
      requestConfig._retry = true;

      const refreshResult = await refreshAccessToken();
      const accessToken = refreshResult.accessToken;

      if (accessToken) {
        requestConfig.headers = requestConfig.headers ?? {};
        requestConfig.headers.Authorization = `Bearer ${accessToken}`;

        return api(requestConfig);
      }

      if (
        refreshResult.blocked &&
        (refreshResult.status === 401 || refreshResult.status === 429)
      ) {
        await clearServerSession();
        useAuthStore.getState().clearAuth();

        if (typeof window !== "undefined") {
          const loginPath = getLoginPath();

          if (window.location.pathname !== loginPath && !skipAuthRedirect) {
            window.location.href = loginPath;
          }
        }
      }

      return Promise.reject(error);
    }

    if (isUnauthorized && isRefreshRequest) {
      await clearServerSession();
      useAuthStore.getState().clearAuth();

      if (typeof window !== "undefined") {
        const loginPath = getLoginPath();
        if (window.location.pathname !== loginPath && !skipAuthRedirect) {
          window.location.href = loginPath;
        }
      }
    }

    if (
      error.response?.status === 403 &&
      typeof error.response?.data?.message === "string" &&
      (error.response.data.message as string).toLowerCase().includes("banned")
    ) {
      toast.error("Your account is banned. Contact support.");
      if (typeof window !== "undefined") {
        if (window.location.pathname !== "/profile") {
          window.location.href = "/profile";
        }
      }
      return Promise.reject(error);
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "MAX_SESSIONS_REACHED"
    ) {
      toast.error("Maximum 3 devices are already logged in", {
        description:
          "To get access on a new device, remove one device from Profile › Sessions.",
        duration: 10000,
        action: {
          label: "Manage Sessions",
          onClick: () => {
            if (typeof window !== "undefined") {
              window.location.href = "/admin/admin/profile";
            }
          },
        },
      });
    }

    return Promise.reject(error);
  },
);
