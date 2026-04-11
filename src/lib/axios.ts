import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const skipAuthRedirect = Boolean(
      (error.config as { skipAuthRedirect?: boolean } | undefined)
        ?.skipAuthRedirect,
    );

    if (error.response?.status === 401 && !skipAuthRedirect) {
      useAuthStore.getState().clearAuth();

      if (typeof window !== "undefined") {
        const isAdminPath = window.location.pathname.startsWith("/admin");
        const loginPath = isAdminPath ? "/admin/login" : "/login";
        if (window.location.pathname !== loginPath) {
          window.location.href = loginPath;
        }
      }
    }

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "MAX_SESSIONS_REACHED"
    ) {
      toast.error("সর্বোচ্চ ২টি ডিভাইসে লগইন করা আছে", {
        description:
          "নতুন ডিভাইসে access পেতে Profile › Sessions থেকে একটি ডিভাইস সরিয়ে দিন।",
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
