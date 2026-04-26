"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Headset,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AuthService } from "@/services/auth.service";
import { useAuthStore } from "@/store/auth.store";
import { applyClientSession, syncServerSession } from "@/lib/auth-session";
import { getForcedPasswordResetSession, setForcedPasswordResetSession } from "@/lib/forced-password-reset";
import { isSupportAgentRole } from "@/lib/auth-role";

const schema = z.object({
  identifier: z.string().min(1, "Email or username is required").trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  captchaCode: z
    .string()
    .length(4, "Enter the 4-character code shown above")
    .toUpperCase(),
});

type FormValues = z.infer<typeof schema>;

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

export default function SupportAgentLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [captchaId, setCaptchaId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: "",
      password: "",
      captchaCode: "",
    },
  });

  const {
    data: captchaData,
    refetch: refetchCaptcha,
    isFetching: isCaptchaLoading,
    isError: isCaptchaError,
    error: captchaError,
  } = useQuery({
    queryKey: ["support-agent-login-captcha"],
    queryFn: async () => {
      const res = await AuthService.getCaptcha();
      setCaptchaId(res.data.captchaId);
      return res.data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });

  useEffect(() => {
    const forcedSession = getForcedPasswordResetSession();
    if (forcedSession) {
      window.location.replace("/force-password-reset");
    }
  }, []);

  const refreshCaptcha = useCallback(async () => {
    form.resetField("captchaCode");
    await refetchCaptcha();
  }, [form, refetchCaptcha]);

  const completeSupportAgentLogin = useCallback(
    async (payload: any) => {
      if (payload?.requiresPasswordChange) {
        setForcedPasswordResetSession({
          userId: payload.userId,
          email: payload.email,
        });
        router.replace("/force-password-reset");
        return;
      }

      const user = payload?.user;
      if (!user || !isSupportAgentRole(user.role)) {
        toast.error("Access denied. This portal is only for support agents.");
        await refreshCaptcha();
        return;
      }

      const accessToken = payload.accessToken ?? payload.token ?? null;
      const refreshToken = payload.refreshToken ?? null;
      const sessionToken = payload.token ?? null;

      applyClientSession({
        accessToken,
        refreshToken,
        sessionToken,
      });
      await syncServerSession({
        accessToken,
        refreshToken,
        sessionToken,
      });
      setAuth(user, accessToken);
      toast.success("Login successful!");
      router.push("/agent");
    },
    [refreshCaptcha, router, setAuth],
  );

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      const response = await AuthService.loginWithCaptcha({
        identifier: values.identifier.trim(),
        password: values.password,
        captchaId,
        captchaCode: values.captchaCode.toUpperCase(),
      });
      await completeSupportAgentLogin(response.data);
    } catch (error) {
      const message = getErrorMessage(error, "Login failed");
      toast.error(message);
      await refreshCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  const captchaErrorMessage =
    captchaError instanceof Error ? captchaError.message : "Unknown";

  return (
    <Card className="border-slate-700 bg-slate-800/60 backdrop-blur">
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
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <Headset className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl text-white">Support Agent Portal</CardTitle>
        <CardDescription className="text-slate-400">
          Sign in with your support agent account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">Email or Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <UserCircle2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        {...field}
                        type="text"
                        placeholder="support@email.com or username"
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
                        onClick={() => setShowPassword((value) => !value)}
                        className="absolute right-3 top-2.5 text-slate-400 transition-colors hover:text-white"
                        aria-label={showPassword ? "Hide password" : "Show password"}
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
                  <ShieldCheck className="h-4 w-4 text-cyan-400" />
                  Validation Code
                </span>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  disabled={isCaptchaLoading}
                  className="inline-flex items-center gap-1 text-xs text-cyan-400 transition-colors hover:text-cyan-300 disabled:opacity-50"
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
                        onChange={(event) =>
                          field.onChange(event.target.value.toUpperCase())
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
              disabled={isSubmitting || isCaptchaLoading || !captchaId}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              {isSubmitting ? (
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
      </CardContent>
    </Card>
  );
}
