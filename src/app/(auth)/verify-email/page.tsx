"use client";

import { Suspense, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVerifyEmail, useResendVerification } from "@/hooks/use-auth";

const verifySchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type VerifyForm = z.infer<typeof verifySchema>;

// ✅ useSearchParams
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otpFromLink = searchParams.get("otp") || "";
  const hasAutoSubmitted = useRef(false);

  const { mutate: verify, isPending } = useVerifyEmail();
  const { mutate: resend, isPending: isResending } = useResendVerification();

  const form = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (otpFromLink && form.getValues("otp") !== otpFromLink) {
      form.setValue("otp", otpFromLink, { shouldValidate: true });
    }
  }, [form, otpFromLink]);

  useEffect(() => {
    if (hasAutoSubmitted.current) {
      return;
    }

    if (!email || !/^\d{6}$/.test(otpFromLink)) {
      return;
    }

    hasAutoSubmitted.current = true;
    verify({ email, otp: otpFromLink });
  }, [email, otpFromLink, verify]);

  const onSubmit = (data: VerifyForm) => {
    verify({ email, otp: data.otp });
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
            <Mail className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl text-white">Verify your email</CardTitle>
        <CardDescription className="text-slate-400">
          {email ? (
            <>
              We sent a 6-digit code to{" "}
              <span className="text-purple-400">{email}</span>
            </>
          ) : (
            "Open this page from your verification email or enter your email again after signing up."
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">
                    Verification Code
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center">
          <p className="text-slate-400 text-sm">
            Didn&apos;t receive the code?{" "}
            <button
              onClick={() => resend(email)}
              disabled={isResending || !email}
              className="text-purple-400 hover:text-purple-300 disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ Suspense
export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={<div className="text-white text-center">Loading...</div>}
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
