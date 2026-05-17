import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { toast } from "sonner";
import {
  clearServerSession,
  requestSessionRefresh,
} from "@/lib/auth-session";
import {
  getClientAccessTokenCookie,
  getClientSessionTokenCookie,
} from "@/lib/auth-cookie";
import {
  isAdminPortalRole,
  isSupportAgentRole,
  resolveLoginPathByPathname,
} from "@/lib/auth-role";
import { useAuthStore } from "@/store/auth.store";

type RequestConfigWithAuth = InternalAxiosRequestConfig & {
  skipAuthRedirect?: boolean;
  skipAuthRefresh?: boolean;
  _retry?: boolean;
};

export const api = axios.create({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")
      : "/backend-api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const publicApi = axios.create({
  baseURL:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "")
      : "/backend-api",
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

const USER_SESSION_EXPIRED_FALLBACK =
  "Your session has expired. User sessions last up to 12 hours. Please log in again.";
const ADMIN_SESSION_EXPIRED_FALLBACK =
  "Your session has expired. Admin sessions last up to 4 days. Please log in again.";
const SUPPORT_AGENT_SESSION_EXPIRED_FALLBACK =
  "Your session has expired. Support agent sessions last up to 4 days. Please log in again.";
let sessionExpiredToastShown = false;

function getErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  return typeof data?.message === "string" ? data.message : null;
}

function isSessionExpiredMessage(message: string | null) {
  return Boolean(message?.toLowerCase().includes("session") && message.toLowerCase().includes("expired"));
}

function getSessionExpiredFallback() {
  const role = useAuthStore.getState().user?.role;

  if (isSupportAgentRole(role)) {
    return SUPPORT_AGENT_SESSION_EXPIRED_FALLBACK;
  }

  if (isAdminPortalRole(role)) {
    return ADMIN_SESSION_EXPIRED_FALLBACK;
  }

  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;

    if (pathname.startsWith("/agent")) {
      return SUPPORT_AGENT_SESSION_EXPIRED_FALLBACK;
    }

    if (pathname.startsWith("/admin")) {
      return ADMIN_SESSION_EXPIRED_FALLBACK;
    }
  }

  return USER_SESSION_EXPIRED_FALLBACK;
}

function showSessionExpiredToast(message: string | null) {
  if (sessionExpiredToastShown) return;
  sessionExpiredToastShown = true;
  const normalizedMessage = message?.trim() ?? "";
  const shouldUseServerMessage =
    isSessionExpiredMessage(normalizedMessage) &&
    !normalizedMessage.includes("12h for users / 4d for admins");

  toast.error(
    shouldUseServerMessage ? normalizedMessage : getSessionExpiredFallback(),
  );
}

function getLoginPath() {
  if (typeof window === "undefined") {
    return "/login";
  }

  return resolveLoginPathByPathname(window.location.pathname);
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
  const token = useAuthStore.getState().token ?? getClientAccessTokenCookie();
  const sessionToken = getClientSessionTokenCookie();
  const existingAuthorization = config.headers?.Authorization;
  const existingSessionToken =
    config.headers?.["x-session-token"] ?? config.headers?.["X-Session-Token"];

  if (token && !existingAuthorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (sessionToken && !existingSessionToken) {
    config.headers["x-session-token"] = sessionToken;
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
    const skipAuthRefresh = Boolean(requestConfig.skipAuthRefresh);

    const isUnauthorized = error.response?.status === 401;
    const errorMessage = getErrorMessage(error);
    const isRefreshRequest =
      requestConfig.url?.includes("/auth/refresh-token");
    const isAuthLoginRequest =
      requestConfig.url?.includes("/auth/login") ||
      requestConfig.url?.includes("/auth/login-with-captcha") ||
      requestConfig.url?.includes("/auth/admin-login/verify-otp");

    if (
      isUnauthorized &&
      !skipAuthRefresh &&
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
        showSessionExpiredToast(errorMessage);

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
      showSessionExpiredToast(errorMessage);

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
      toast.error("Maximum 7 admin devices are already registered", {
        description:
          "To get access on a new device, remove one device from Profile › Sessions.",
        duration: 10000,
      });
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.message ===
        "Your email is not verified! Please verify your email first to unlock all features." &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("email-verification-required"));
    }

    return Promise.reject(error);
  },
);

