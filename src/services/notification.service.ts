/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const NotificationService = {
  getAll: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/notification?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  markAsRead: async (id: string) => {
    const res = await api.patch<ApiResponse<any>>(`/notification/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await api.patch<ApiResponse<any>>("/notification/read-all");
    return res.data;
  },
};
