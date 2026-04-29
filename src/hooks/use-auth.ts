/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AuthService,
  AuthenticatedLoginResponse,
  LoginResponseData,
} from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { applyClientSession, syncServerSession } from "@/lib/auth-session";
import {
  clearForcedPasswordResetSession,
  setForcedPasswordResetSession,
} from "@/lib/forced-password-reset";
import { markAppDownloadPromptPending } from "@/lib/app-download-prompt";
import { markLoginPopupPending } from "@/lib/login-popup";
import {
  isAdminPortalRole,
  isSupportAgentRole,
  resolveHomePathByRole,
} from "@/lib/auth-role";

function isAdminRole(role?: string | null) {
  return isAdminPortalRole(role);
}

async function completeLogin(
  data: AuthenticatedLoginResponse,
  setAuth: (user: any, token?: string | null) => void,
) {
  const { user, refreshToken, token } = data;
  const accessToken = data.accessToken ?? data.token ?? null;

  if (!user) {
    toast.error("Login response is missing user data");
    return null;
  }

  clearForcedPasswordResetSession();
  applyClientSession({
    accessToken,
    refreshToken,
    sessionToken: token,
    sessionMaxAgeMs: data.sessionMaxAgeMs,
    refreshTokenMaxAgeMs: data.refreshTokenMaxAgeMs,
  });
  await syncServerSession({
    accessToken,
    refreshToken,
    sessionToken: token,
    sessionMaxAgeMs: data.sessionMaxAgeMs,
    refreshTokenMaxAgeMs: data.refreshTokenMaxAgeMs,
  });

  setAuth(user, accessToken);

  return user;
}

function isAdminOtpRequiredResponse(
  data: LoginResponseData,
): data is Extract<LoginResponseData, { requiresAdminOtp: true }> {
  return "requiresAdminOtp" in data && data.requiresAdminOtp === true;
}

function isForcePasswordResetResponse(
  data: LoginResponseData,
): data is Extract<LoginResponseData, { requiresPasswordChange: true }> {
  return (
    "requiresPasswordChange" in data && data.requiresPasswordChange === true
  );
}

function isAdminSessionLimitResponse(
  data: LoginResponseData,
): data is Extract<LoginResponseData, { adminSessionLimitReached: true }> {
  return (
    "adminSessionLimitReached" in data &&
    data.adminSessionLimitReached === true
  );
}

function isAuthenticatedLoginResponse(
  data: LoginResponseData,
): data is AuthenticatedLoginResponse {
  return "user" in data;
}

function isDeviceLoginConflict(error: any) {
  return error?.response?.data?.message === "DEVICE_LOGIN_CONFLICT";
}

export const useRegister = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: AuthService.register,
    onSuccess: (_, variables) => {
      toast.success("Registration successful! Please verify your email.");
      router.push(`/verify-email?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Registration failed");
    },
  });
};

export const useLogin = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: AuthService.login,
    onSuccess: async (data) => {
      if (data.message === "DEVICE_LOGIN_CONFLICT") return;

      if (isAdminSessionLimitResponse(data.data)) {
        toast.error(data.data.message);
        return;
      }

      if (isAdminOtpRequiredResponse(data.data)) {
        toast.error("Admin accounts must sign in from the admin login page.");
        router.push("/admin/login");
        return;
      }

      if (isForcePasswordResetResponse(data.data)) {
        const { userId, email } = data.data;
        setForcedPasswordResetSession({ userId, email });
        router.replace("/force-password-reset");
        return;
      }

      if (
        isAuthenticatedLoginResponse(data.data) &&
        isAdminRole(data.data.user?.role)
      ) {
        toast.error("Admin accounts must sign in from the admin login page.");
        router.push("/admin/login");
        return;
      }

      if (
        isAuthenticatedLoginResponse(data.data) &&
        isSupportAgentRole(data.data.user?.role)
      ) {
        toast.error(
          "Support agents must sign in from the support agent login page.",
        );
        router.push("/agent/login");
        return;
      }

      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      markLoginPopupPending();
      markAppDownloadPromptPending();
      toast.success("Login successful!");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      if (isDeviceLoginConflict(error)) return;
      toast.error(error.response?.data?.message || "Login failed");
    },
  });
};

export const useLoginWithCaptcha = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: AuthService.loginWithCaptcha,
    onSuccess: async (data) => {
      if (data.message === "DEVICE_LOGIN_CONFLICT") return;

      if (isAdminSessionLimitResponse(data.data)) {
        toast.error(data.data.message);
        return;
      }

      if (isAdminOtpRequiredResponse(data.data)) {
        toast.error("Admin accounts must sign in from the admin login page.");
        router.push("/admin/login");
        return;
      }

      if (isForcePasswordResetResponse(data.data)) {
        const { userId, email } = data.data;
        setForcedPasswordResetSession({ userId, email });
        router.replace("/force-password-reset");
        return;
      }

      if (
        isAuthenticatedLoginResponse(data.data) &&
        isAdminRole(data.data.user?.role)
      ) {
        toast.error("Admin accounts must sign in from the admin login page.");
        router.push("/admin/login");
        return;
      }

      if (
        isAuthenticatedLoginResponse(data.data) &&
        isSupportAgentRole(data.data.user?.role)
      ) {
        toast.error(
          "Support agents must sign in from the support agent login page.",
        );
        router.push("/agent/login");
        return;
      }

      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      markLoginPopupPending();
      markAppDownloadPromptPending();
      toast.success("Login successful!");
      router.push("/dashboard");
    },
    onError: (error: any) => {
      if (isDeviceLoginConflict(error)) return;
      toast.error(error.response?.data?.message || "Login failed");
    },
  });
};

export const useAdminLoginWithCaptcha = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: AuthService.adminLoginWithCaptcha,
    onSuccess: async (data) => {
      if (isAdminSessionLimitResponse(data.data)) {
        toast.error(data.data.message);
        return;
      }

      if (isAdminOtpRequiredResponse(data.data)) {
        return;
      }

      if (isForcePasswordResetResponse(data.data)) {
        const { userId, email } = data.data;
        setForcedPasswordResetSession({ userId, email });
        router.replace("/force-password-reset");
        return;
      }

      if (!isAuthenticatedLoginResponse(data.data)) {
        toast.error("Admin login response is invalid");
        return;
      }

      const userRole = data.data.user?.role;
      if (!isAdminRole(userRole)) {
        toast.error("Access denied. This portal is for admins only.");
        return;
      }

      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      toast.success("Login successful!");
      router.push("/admin");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Login failed");
    },
  });
};

export const useAdminLogin = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: AuthService.login,
    onSuccess: async (data) => {
      if (isAdminSessionLimitResponse(data.data)) {
        toast.error(data.data.message);
        return;
      }

      if (isAdminOtpRequiredResponse(data.data)) {
        return;
      }

      if (isForcePasswordResetResponse(data.data)) {
        const { userId, email } = data.data;
        setForcedPasswordResetSession({ userId, email });
        router.replace("/force-password-reset");
        return;
      }

      if (!isAuthenticatedLoginResponse(data.data)) {
        toast.error("Admin login response is invalid");
        return;
      }

      const userRole = data.data.user?.role;
      if (!isAdminRole(userRole)) {
        toast.error("Access denied. This portal is for admins only.");
        return;
      }

      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      toast.success("Login successful!");
      router.push("/admin");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Login failed");
    },
  });
};

export const useVerifyAdminLoginOtp = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: AuthService.verifyAdminLoginOtp,
    onSuccess: async (data) => {
      if (isAdminSessionLimitResponse(data.data)) {
        toast.error(data.data.message);
        return;
      }

      if (!isAuthenticatedLoginResponse(data.data)) {
        toast.error("Admin OTP response is invalid");
        return;
      }

      const responseUser = data.data.user;
      if (!isAdminRole(responseUser?.role)) {
        toast.error("Access denied. This portal is for admins only.");
        router.push("/login");
        return;
      }

      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      toast.success("Login successful!");
      router.push("/admin");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "OTP verification failed");
    },
  });
};

export const useResendAdminLoginOtp = () => {
  return useMutation({
    mutationFn: AuthService.login,
    onSuccess: (data) => {
      if (isAdminOtpRequiredResponse(data.data)) {
        toast.success("A new verification code has been sent to your email");
        return;
      }

      toast.error("Unable to resend the admin verification code");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resend code");
    },
  });
};

export const useVerifyEmail = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: AuthService.verifyEmail,
    onSuccess: () => {
      toast.success("Email verified successfully!");
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Verification failed");
    },
  });
};

export const useResendVerification = () => {
  return useMutation({
    mutationFn: (email: string) => AuthService.resendVerification(email),
    onSuccess: () => {
      toast.success("Verification code sent to your email");
    },

    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to resend code");
    },
  });
};

export const useForgotPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: AuthService.forgotPassword,
    onSuccess: (_, variables) => {
      toast.success("OTP sent to your email");
      router.push(
        `/reset-password?email=${encodeURIComponent(variables.email)}`,
      );
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    },
  });
};

export const useResetPassword = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: AuthService.resetPassword,
    onSuccess: () => {
      toast.success("Password reset successfully!");
      router.push("/login");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reset password");
    },
  });
};

export const useForceChangePassword = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: AuthService.forceChangePassword,
    onSuccess: async (data) => {
      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      toast.success("Password updated successfully!");
      if (isAdminRole(user.role) || isSupportAgentRole(user.role)) {
        router.push(resolveHomePathByRole(user.role));
      } else {
        markLoginPopupPending();
        markAppDownloadPromptPending();
        router.push("/dashboard");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update password");
    },
  });
};
