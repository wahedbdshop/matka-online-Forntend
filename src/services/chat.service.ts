/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const ChatService = {
  startSession: async () => {
    const res = await api.post<ApiResponse<any>>("/chat/session");
    return res.data;
  },

  getSession: async (sessionId: string) => {
    const res = await api.get<ApiResponse<any>>(`/chat/session/${sessionId}`);
    return res.data;
  },

  sendMessage: async (sessionId: string, message: string) => {
    const res = await api.post<ApiResponse<any>>(
      `/chat/session/${sessionId}/message`,
      { message },
    );
    return res.data;
  },

  requestAgent: async (sessionId: string, userIdentifier: string) => {
    const res = await api.post<ApiResponse<any>>(
      `/chat/session/${sessionId}/request-agent`,
      { userIdentifier },
    );
    return res.data;
  },

  closeSession: async (sessionId: string) => {
    const res = await api.patch<ApiResponse<any>>(
      `/chat/session/${sessionId}/close`,
    );
    return res.data;
  },

  sendMedia: async (sessionId: string, formData: FormData) => {
    const res = await api.post<ApiResponse<any>>(
      `/chat/session/${sessionId}/media`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },

  sendAgentMedia: async (sessionId: string, formData: FormData) => {
    const res = await api.post<ApiResponse<any>>(
      `/chat/agent/session/${sessionId}/media`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data;
  },
};
