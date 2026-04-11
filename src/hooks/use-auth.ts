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
import { setClientAuthCookies } from "@/lib/auth-cookie";
import {
  clearForcedPasswordResetSession,
  setForcedPasswordResetSession,
} from "@/lib/forced-password-reset";

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
  setClientAuthCookies({
    accessToken,
    refreshToken,
    sessionToken: token,
  });
  await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      accessToken,
      refreshToken,
      sessionToken: token,
    }),
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
  return "requiresPasswordChange" in data && data.requiresPasswordChange === true;
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
      if (isAdminOtpRequiredResponse(data.data)) {
        return;
      }

      if (isForcePasswordResetResponse(data.data)) {
        const { userId, email } = data.data;
        setForcedPasswordResetSession({ userId, email });
        router.replace("/force-password-reset");
        return;
      }

      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      toast.success("Login successful!");
      if (user.role === "ADMIN" || user.role === "AGENT") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    },
    onError: (error: any) => {
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
      if (isAdminOtpRequiredResponse(data.data)) {
        return;
      }

      if (isForcePasswordResetResponse(data.data)) {
        const { userId, email } = data.data;
        setForcedPasswordResetSession({ userId, email });
        router.replace("/force-password-reset");
        return;
      }

      const user = await completeLogin(data.data, setAuth);
      if (!user) return;

      toast.success("Login successful!");
      if (user.role === "ADMIN" || user.role === "AGENT") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Login failed");
    },
  });
};

export const useAdminLoginWithCaptcha = () => {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  return useMutation({
    mutationFn: AuthService.loginWithCaptcha,
    onSuccess: async (data) => {
      if (isAdminOtpRequiredResponse(data.data)) {
        return;
      }

      if (isForcePasswordResetResponse(data.data)) {
        const { userId, email } = data.data;
        setForcedPasswordResetSession({ userId, email });
        router.replace("/force-password-reset");
        return;
      }

      const userRole = (data.data as AuthenticatedLoginResponse).user?.role;
      if (userRole !== "ADMIN" && userRole !== "AGENT") {
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
      if (user.role === "ADMIN" || user.role === "AGENT") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update password");
    },
  });
};
