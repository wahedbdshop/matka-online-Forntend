// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { api } from "@/lib/axios";
// import { ApiResponse } from "@/types";

// export const TransferService = {
//   create: async (payload: {
//     receiverUsername: string;
//     amount: number;
//     note?: string;
//   }) => {
//     const res = await api.post<ApiResponse<any>>("/transfer", payload);
//     return res.data;
//   },

//   getMyAll: async () => {
//     const res = await api.get<ApiResponse<any>>("/transfer/my");
//     return res.data;
//   },

//   getMySent: async () => {
//     const res = await api.get<ApiResponse<any>>("/transfer/my/sent");
//     return res.data;
//   },

//   getMyReceived: async () => {
//     const res = await api.get<ApiResponse<any>>("/transfer/my/received");
//     return res.data;
//   },
// };

/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const TransferService = {
  searchUser: async (q: string) => {
    const res = await api.get<ApiResponse<any>>(
      `/transfer/search?q=${encodeURIComponent(q)}`,
    );
    return res.data;
  },
  getRecentRecipients: async () => {
    const res = await api.get<ApiResponse<any>>("/transfer/recent");
    return res.data;
  },
  previewCharge: async (amount: number) => {
    const res = await api.get<ApiResponse<any>>(
      `/transfer/preview-charge?amount=${amount}`,
    );
    return res.data;
  },
  create: async (payload: {
    receiverQuery: string;
    amount: number;
    note?: string;
  }) => {
    const res = await api.post<ApiResponse<any>>("/transfer", payload);
    return res.data;
  },
  getMyTransfers: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/transfer/my?page=${page}&limit=${limit}`,
    );
    return res.data;
  },
};
