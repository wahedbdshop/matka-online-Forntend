"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  UserCircle2,
  Lock,
  RefreshCw,
  ShieldCheck,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  useAdminLoginWithCaptcha,
  useAdminLogin,
  useResendAdminLoginOtp,
  useVerifyAdminLoginOtp,
} from "@/hooks/use-auth";
import { AuthService } from "@/services/auth.service";
import { getForcedPasswordResetSession } from "@/lib/forced-password-reset";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or username is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  captchaCode: z
    .string()
    .length(4, "Enter the 4-character code shown above")
    .toUpperCase(),
});

type LoginForm = z.infer<typeof loginSchema>;

const adminOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit verification code"),
});

type AdminOtpForm = z.infer<typeof adminOtpSchema>;

function maskEmail(email: string) {
  const [localPart = "", domain = ""] = email.split("@");
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) return `${localPart[0] ?? ""}***@${domain}`;
  return `${localPart[0]}${"*".repeat(Math.max(localPart.length - 2, 1))}${localPart.at(-1) ?? ""}@${domain}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "data" in error.response &&
    typeof error.response.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
}

function getErrorStatus(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof error.response === "object" &&
    error.response !== null &&
    "status" in error.response &&
    typeof error.response.status === "number"
  ) {
    return error.response.status;
  }

  return null;
}

function shouldFallbackToPlainAdminLogin(error: unknown) {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error, "").toLowerCase();

  if (status === 404 || status === 405) {
    return true;
  }

  if (status === 400) {
    return (
      message.includes("captcha") &&
      (message.includes("not required") ||
        message.includes("unsupported") ||
        message.includes("not supported"))
    );
  }

  return false;
}

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [captchaId, setCaptchaId] = useState<string>("");
  const [pendingAdminOtp, setPendingAdminOtp] = useState<{
    pendingToken: string;
    email: string;
    expiresInSeconds: number;
  } | null>(null);
  const [lastAdminCredentials, setLastAdminCredentials] = useState<{
    identifier: string;
    password: string;
  } | null>(null);
  const [otpErrorMessage, setOtpErrorMessage] = useState<string | null>(null);
  const [showExpiredCta, setShowExpiredCta] = useState(false);

  const {
    data: captchaData,
    refetch: refetchCaptcha,
    isFetching: isCaptchaLoading,
    isError: isCaptchaError,
    error: captchaError,
  } = useQuery({
    queryKey: ["admin-login-captcha"],
    queryFn: async () => {
      const res = await AuthService.getCaptcha();
      setCaptchaId(res.data.captchaId);
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });

  const captchaErrorMessage =
    captchaError instanceof Error ? captchaError.message : "Unknown";

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", captchaCode: "" },
  });
  const otpForm = useForm<AdminOtpForm>({
    resolver: zodResolver(adminOtpSchema),
    defaultValues: { otp: "" },
  });

  const handleRefreshCaptcha = useCallback(async () => {
    form.resetField("captchaCode");
    await refetchCaptcha();
  }, [refetchCaptcha, form]);

  const { mutate: loginWithCaptcha, isPending: isCaptchaLoginPending } =
    useAdminLoginWithCaptcha();
  const { mutate: login, isPending: isLoginPending } = useAdminLogin();
  const { mutate: resendAdminOtp, isPending: isResendingAdminOtp } =
    useResendAdminLoginOtp();
  const { mutate: verifyAdminOtp, isPending: isOtpPending } =
    useVerifyAdminLoginOtp();

  useEffect(() => {
    if (pendingAdminOtp) return;
    const forcedSession = getForcedPasswordResetSession();
    if (forcedSession) {
      window.location.replace("/force-password-reset");
    }
  }, [pendingAdminOtp]);

  const handleBackToLogin = useCallback(() => {
    setPendingAdminOtp(null);
    setOtpErrorMessage(null);
    setShowExpiredCta(false);
    otpForm.reset();
    handleRefreshCaptcha();
  }, [handleRefreshCaptcha, otpForm]);

  const onSubmit = (data: LoginForm) => {
    setOtpErrorMessage(null);
    setShowExpiredCta(false);
    setLastAdminCredentials({
      identifier: data.identifier.trim(),
      password: data.password,
    });

    const handleAdminLoginResponse = (response: {
      data:
        | {
            requiresAdminOtp?: boolean;
            pendingToken?: string;
            email?: string;
            expiresInSeconds?: number;
          }
        | {
            user?: { role?: string };
          };
    }) => {
      if (
        "requiresAdminOtp" in response.data &&
        response.data.requiresAdminOtp === true
      ) {
        setPendingAdminOtp({
          pendingToken: response.data.pendingToken ?? "",
          email: response.data.email ?? "",
          expiresInSeconds: response.data.expiresInSeconds ?? 0,
        });
        otpForm.reset({ otp: "" });
        return;
      }

      if (
        "user" in response.data &&
        (response.data.user?.role === "ADMIN" ||
          response.data.user?.role === "AGENT")
      ) {
        resendAdminOtp(
          {
            emailOrUsername: data.identifier.trim(),
            password: data.password,
          },
          {
            onSuccess: (otpResponse) => {
              if (
                "requiresAdminOtp" in otpResponse.data &&
                otpResponse.data.requiresAdminOtp === true
              ) {
                setPendingAdminOtp({
                  pendingToken: otpResponse.data.pendingToken,
                  email: otpResponse.data.email,
                  expiresInSeconds: otpResponse.data.expiresInSeconds,
                });
                otpForm.reset({ otp: "" });
                return;
              }

              setOtpErrorMessage(
                "Admin OTP is not enabled in backend response yet.",
              );
            },
          },
        );
      }
    };

    loginWithCaptcha(
      {
        identifier: data.identifier.trim(),
        password: data.password,
        captchaId,
        captchaCode: data.captchaCode.toUpperCase(),
      },
      {
        onSuccess: handleAdminLoginResponse,
        onError: (error: unknown) => {
          if (shouldFallbackToPlainAdminLogin(error)) {
            login(
              {
                emailOrUsername: data.identifier.trim(),
                password: data.password,
              },
              {
                onSuccess: handleAdminLoginResponse,
                onError: () => handleRefreshCaptcha(),
              },
            );
            return;
          }

          handleRefreshCaptcha();
        },
      },
    );
  };

  const handleResendAdminOtp = useCallback(() => {
    if (!lastAdminCredentials) return;

    setOtpErrorMessage(null);
    setShowExpiredCta(false);

    resendAdminOtp(
      {
        emailOrUsername: lastAdminCredentials.identifier,
        password: lastAdminCredentials.password,
      },
      {
        onSuccess: (response) => {
          if (
            "requiresAdminOtp" in response.data &&
            response.data.requiresAdminOtp === true
          ) {
            setPendingAdminOtp({
              pendingToken: response.data.pendingToken,
              email: response.data.email,
              expiresInSeconds: response.data.expiresInSeconds,
            });
            otpForm.reset({ otp: "" });
          }
        },
      },
    );
  }, [lastAdminCredentials, otpForm, resendAdminOtp]);

  const onSubmitAdminOtp = (data: AdminOtpForm) => {
    if (!pendingAdminOtp) return;

    setOtpErrorMessage(null);
    setShowExpiredCta(false);

    verifyAdminOtp(
      { pendingToken: pendingAdminOtp.pendingToken, otp: data.otp },
      {
        onError: (error: unknown) => {
          const message = getErrorMessage(error, "OTP verification failed");
          const normalizedMessage = String(message).toLowerCase();
          setOtpErrorMessage(message);
          setShowExpiredCta(
            normalizedMessage.includes("expire") ||
              normalizedMessage.includes("expired"),
          );
        },
      },
    );
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardHeader className="space-y-1 px-6 pb-6 pt-2 text-center">
        <div className="flex justify-start">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            User Login
          </Link>
        </div>
        <div className="-mb-8 -mt-3 flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden p-1">
            <Image
              src="/logo.png?v=20260331-1726"
              alt="Company logo"
              width={128}
              height={128}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>
        <CardTitle className="text-2xl text-white">Admin Portal</CardTitle>
        <CardDescription className="text-slate-400">
          Restricted access — admins only
        </CardDescription>
      </CardHeader>

      <CardContent>
        {pendingAdminOtp ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-slate-200">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-purple-300" />
                <div className="space-y-1">
                  <p className="font-medium text-white">
                    A verification code has been sent to your email.
                  </p>
                  <p className="text-slate-300">
                    Enter the 6-digit code sent to{" "}
                    {maskEmail(pendingAdminOtp.email)}.
                  </p>
                </div>
              </div>
            </div>

            <Form {...otpForm}>
              <form
                onSubmit={otpForm.handleSubmit(onSubmitAdminOtp)}
                className="space-y-4"
              >
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-300">
                        Admin Verification Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          placeholder="000000"
                          autoComplete="one-time-code"
                          onChange={(e) =>
                            field.onChange(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          className="border-slate-600 bg-slate-700/50 text-center text-2xl tracking-[0.5em] text-white placeholder:text-slate-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {otpErrorMessage ? (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    <p>{otpErrorMessage}</p>
                    {showExpiredCta ? (
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="mt-2 text-sm font-medium text-white underline underline-offset-4"
                      >
                        Back to login
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <p className="text-xs text-slate-400">
                  This code expires in about{" "}
                  {Math.max(1, Math.ceil(pendingAdminOtp.expiresInSeconds / 60))}{" "}
                  minute
                  {Math.ceil(pendingAdminOtp.expiresInSeconds / 60) === 1
                    ? ""
                    : "s"}
                  .
                </p>

                <button
                  type="button"
                  onClick={handleResendAdminOtp}
                  disabled={isResendingAdminOtp || !lastAdminCredentials}
                  className="text-sm font-medium text-purple-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResendingAdminOtp ? "Resending code..." : "Resend code"}
                </button>

                <Button
                  type="submit"
                  disabled={isOtpPending || isResendingAdminOtp}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {isOtpPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify and continue"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="w-full border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700/50 hover:text-white"
                >
                  Back to login
                </Button>
              </form>
            </Form>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">
                      Email or Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          {...field}
                          type="text"
                          placeholder="admin@email.com or username"
                          className="border-slate-600 bg-slate-700/50 pl-10 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-300">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="********"
                          className="border-slate-600 bg-slate-700/50 pl-10 pr-10 text-white placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-2.5 text-slate-400 transition-colors hover:text-white"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                    <ShieldCheck className="h-4 w-4 text-purple-400" />
                    Validation Code
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshCaptcha}
                    disabled={isCaptchaLoading}
                    className="inline-flex items-center gap-1 text-xs text-purple-400 transition-colors hover:text-purple-300 disabled:opacity-50"
                    aria-label="Refresh captcha"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isCaptchaLoading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                </div>

                <div className="flex min-h-[52px] items-center justify-center rounded-lg border border-slate-600/60 bg-slate-900/60 px-4 py-3">
                  {isCaptchaLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                  ) : captchaData?.captchaSvg ? (
                    <div
                      className="select-none"
                      dangerouslySetInnerHTML={{ __html: captchaData.captchaSvg }}
                    />
                  ) : (
                    <span className="text-center text-xs leading-snug text-red-400">
                      {isCaptchaError
                        ? `Error: ${captchaErrorMessage} - click Refresh`
                        : "Click Refresh to load"}
                    </span>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="captchaCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          maxLength={4}
                          placeholder="Type the code above"
                          autoComplete="off"
                          onChange={(e) =>
                            field.onChange(e.target.value.toUpperCase())
                          }
                          className="border-slate-600 bg-slate-700/50 text-center font-mono tracking-widest text-white uppercase placeholder:text-slate-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                disabled={
                  isCaptchaLoginPending ||
                  isLoginPending ||
                  isCaptchaLoading ||
                  !captchaId
                }
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isCaptchaLoginPending || isLoginPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
