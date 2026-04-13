/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from "@/lib/axios";
import { ApiResponse } from "@/types";

export interface ReferralLevelConfigInput {
  level: number;
  signupBonus: number;
  depositCommissionPct: number;
  isActive: boolean;
}

export interface ReferralMilestoneInput {
  numberOfReferrals: number;
  bonusAmount: number;
}

export interface ReferralBulkConfigPayload {
  configs: ReferralLevelConfigInput[];
  monthlyLoginBonus?: {
    amount: number;
    isActive: boolean;
  };
  milestones?: ReferralMilestoneInput[];
}

const toNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;

const normalizeBulkConfigPayload = (payload: ReferralBulkConfigPayload) => ({
  configs: (payload.configs ?? []).map((config) => {
    const commissionPct = toNumber(config.depositCommissionPct);

    return {
      level: toNumber(config.level),
      signupBonus: toNumber(config.signupBonus),
      // Keep the legacy field for APIs that still persist signup reward as bonusAmount.
      bonusAmount: toNumber(config.signupBonus),
      depositCommissionPct: commissionPct,
      // Keep the legacy field for APIs that still validate against commissionPct.
      commissionPct,
      isActive: Boolean(config.isActive),
    };
  }),
  monthlyLoginBonus: payload.monthlyLoginBonus
    ? {
        amount: toNumber(payload.monthlyLoginBonus.amount),
        isActive: Boolean(payload.monthlyLoginBonus.isActive),
      }
    : undefined,
  milestones: payload.milestones?.map((milestone) => ({
    numberOfReferrals: toNumber(milestone.numberOfReferrals),
    bonusAmount: toNumber(milestone.bonusAmount),
  })),
});

export const ReferralService = {
  // User
  getMyReferrals: async () => {
    const res = await api.get<ApiResponse<any>>("/referral/my");
    return res.data;
  },

  getMyEarnings: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/referral/my/earnings?page=${page}&limit=${limit}`,
    );
    return res.data;
  },

  // Admin
  getConfig: async () => {
    const res = await api.get<ApiResponse<any>>("/referral/config");
    return res.data;
  },

  bulkUpdateConfig: async (payload: ReferralBulkConfigPayload) => {
    const res = await api.put<ApiResponse<any>>(
      "/referral/config/bulk",
      normalizeBulkConfigPayload(payload),
    );
    return res.data;
  },

  getAllEarnings: async (page = 1, limit = 20) => {
    const res = await api.get<ApiResponse<any>>(
      `/referral/earnings?page=${page}&limit=${limit}`,
    );
    return res.data;
  },
};
