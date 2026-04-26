/* eslint-disable @typescript-eslint/no-explicit-any */
import { api, publicApi } from "@/lib/axios";
import { ApiResponse } from "@/types";
import type { LoginPayload, LoginWithCaptchaPayload } from "@/services/auth.service";

export interface SupportAgentProfilePayload {
  name?: string;
  phone?: string;
}

export interface SupportAgentAdminPayload {
  name: string;
  username: string;
  email: string;
  phone?: string;
  temporaryPassword: string;
  password?: string;
  role?: "SUPPORT_AGENT";
  note?: string;
}

export interface SupportAgentAdminUpdatePayload {
  name?: string;
  phone?: string;
  note?: string;
  isActive?: boolean;
}

export const SupportAgentService = {
  loginWithCaptcha: async (payload: LoginWithCaptchaPayload) => {
    const res = await publicApi.post<ApiResponse<any>>(
      "/auth/login-with-captcha",
      {
        emailOrUsername: payload.identifier,
        password: payload.password,
        captchaId: payload.captchaId,
        captchaCode: payload.captchaCode,
      },
    );
    return res.data;
  },

  login: async (payload: LoginPayload) => {
    const res = await publicApi.post<ApiResponse<any>>("/auth/login", payload);
    return res.data;
  },

  getMe: async () => {
    const res = await api.get<ApiResponse<any>>("/support-agent/me");
    return res.data;
  },

  updateMe: async (payload: SupportAgentProfilePayload) => {
    const res = await api.patch<ApiResponse<any>>("/support-agent/me", payload);
    return res.data;
  },

  list: async (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams({
      page: String(params?.page || 1),
      limit: String(params?.limit || 20),
      ...(params?.search ? { search: params.search } : {}),
    });
    const res = await api.get<ApiResponse<any>>(`/support-agent?${query}`);
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get<ApiResponse<any>>(`/support-agent/${id}`);
    return res.data;
  },

  create: async (payload: SupportAgentAdminPayload) => {
    const res = await api.post<ApiResponse<any>>("/support-agent", payload);
    return res.data;
  },

  update: async (id: string, payload: SupportAgentAdminUpdatePayload) => {
    const res = await api.patch<ApiResponse<any>>(`/support-agent/${id}`, payload);
    return res.data;
  },

  toggleStatus: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/support-agent/${id}/toggle-status`,
    );
    return res.data;
  },

  remove: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/support-agent/${id}`);
    return res.data;
  },
};
