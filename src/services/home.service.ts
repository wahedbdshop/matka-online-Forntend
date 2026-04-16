/* eslint-disable @typescript-eslint/no-explicit-any */
import { publicApi } from "@/lib/axios";
import { ApiResponse } from "@/types";

export const HomeService = {
  getHomeData: async () => {
    const res = await publicApi.get<ApiResponse<any>>("/home");
    return res.data;
  },

  getRecentWinners: async () => {
    const res = await publicApi.get<ApiResponse<any>>("/home/winners");
    return res.data;
  },
};
