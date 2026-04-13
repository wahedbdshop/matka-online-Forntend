/* eslint-disable @typescript-eslint/no-explicit-any */
import { api, publicApi } from "@/lib/axios";
import { clearServerSession } from "@/lib/auth-session";
import { ApiResponse } from "@/types";

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  username: string;
}

export interface LoginPayload {
  emailOrUsername: string;
  password: string;
}

export interface AuthenticatedLoginResponse {
  token: string;
  user: any;
  accessToken: string;
  refreshToken: string;
}

export interface AdminOtpRequiredResponse {
  requiresAdminOtp: true;
  pendingToken: string;
  email: string;
  expiresInSeconds: number;
}

export interface ForcePasswordResetResponse {
  requiresPasswordChange: true;
  userId: string;
  email: string;
}

export type LoginResponseData =
  | AuthenticatedLoginResponse
  | AdminOtpRequiredResponse
  | ForcePasswordResetResponse;

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface CaptchaResponse {
  captchaId: string;
  captchaSvg: string;
}

export interface LoginWithCaptchaPayload {
  identifier: string;
  password: string;
  captchaId: string;
  captchaCode: string;
}

export interface VerifyAdminLoginOtpPayload {
  pendingToken: string;
  otp: string;
}

export interface ForceChangePasswordPayload {
  userId: string;
  newPassword: string;
}

export const AuthService = {
  getCaptcha: async () => {
    const res = await publicApi.get<ApiResponse<CaptchaResponse>>(
      "/auth/captcha",
      {
        params: {
          _: Date.now(),
        },
        headers: {
          "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
    return res.data;
  },

  loginWithCaptcha: async (payload: LoginWithCaptchaPayload) => {
    const res = await publicApi.post<ApiResponse<LoginResponseData>>(
      "/auth/login-with-captcha",
      payload,
    );
    return res.data;
  },

  adminLoginWithCaptcha: async (payload: LoginWithCaptchaPayload) => {
    const res = await publicApi.post<ApiResponse<LoginResponseData>>(
      "/auth/admin-login-with-captcha",
      payload,
    );
    return res.data;
  },

  register: async (payload: RegisterPayload) => {
    const res = await publicApi.post<ApiResponse<any>>("/auth/register", payload);
    return res.data;
  },

  login: async (payload: LoginPayload) => {
    const res = await publicApi.post<ApiResponse<LoginResponseData>>(
      "/auth/login",
      payload,
    );
    return res.data;
  },

  verifyAdminLoginOtp: async (payload: VerifyAdminLoginOtpPayload) => {
    const res = await publicApi.post<ApiResponse<AuthenticatedLoginResponse>>(
      "/auth/admin-login/verify-otp",
      payload,
    );
    return res.data;
  },

  verifyEmail: async (payload: VerifyEmailPayload) => {
    const res = await api.post<ApiResponse<null>>(
      "/auth/verify-email",
      payload,
    );
    return res.data;
  },

  resendVerification: async (email: string) => {
    const res = await api.post<ApiResponse<null>>("/auth/resend-verification", {
      email,
    });
    return res.data;
  },

  forgotPassword: async (payload: ForgotPasswordPayload) => {
    const res = await api.post<ApiResponse<null>>(
      "/auth/forgot-password",
      payload,
    );
    return res.data;
  },

  resetPassword: async (payload: ResetPasswordPayload) => {
    const res = await api.post<ApiResponse<null>>(
      "/auth/reset-password",
      payload,
    );
    return res.data;
  },

  forceChangePassword: async (payload: ForceChangePasswordPayload) => {
    const res = await publicApi.post<ApiResponse<AuthenticatedLoginResponse>>(
      "/auth/set-forced-password",
      payload,
    );
    return res.data;
  },

  logout: async () => {
    const [backendResult] = await Promise.allSettled([
      api.post<ApiResponse<null>>("/auth/logout"),
      clearServerSession(),
    ]);

    if (backendResult.status === "fulfilled") {
      return backendResult.value.data;
    }

    return {
      success: true,
      message: "Logged out locally",
      data: null,
    } as ApiResponse<null>;
  },
};
