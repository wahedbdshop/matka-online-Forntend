"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, ShieldAlert } from "lucide-react";
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
import { useForceChangePassword } from "@/hooks/use-auth";
import { getForcedPasswordResetSession } from "@/lib/forced-password-reset";

const schema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Use at least 6 characters")
      .regex(/[A-Za-z]/, "Include at least one letter")
      .regex(/[0-9]/, "Include at least one number")
      .regex(/[^A-Za-z0-9]/, "Include at least one symbol"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

function PasswordInput({
  field,
  placeholder,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  field: any;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <Input
        {...field}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function ForcePasswordResetPage() {
  const router = useRouter();
  const [forcedSession] = useState(() => getForcedPasswordResetSession());

  useEffect(() => {
    if (!forcedSession) {
      router.replace("/login");
    }
  }, [forcedSession, router]);

  const { mutate: forceChangePassword, isPending } = useForceChangePassword();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const newPassword = useWatch({
    control: form.control,
    name: "newPassword",
    defaultValue: "",
  });
  const userId = forcedSession?.userId ?? "";
  const email = forcedSession?.email ?? "";

  const passwordChecks = [
    { label: "At least 6 characters", valid: newPassword.length >= 6 },
    { label: "At least one letter", valid: /[A-Za-z]/.test(newPassword) },
    { label: "At least one number", valid: /[0-9]/.test(newPassword) },
    { label: "At least one symbol", valid: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const onSubmit = (data: FormData) => {
    if (!userId) {
      router.replace("/login");
      return;
    }

    forceChangePassword({ userId, newPassword: data.newPassword });
  };

  if (!forcedSession) return null;

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      <CardHeader className="space-y-1 text-center">
        <div className="mb-2 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl text-white">
          Set your new password
        </CardTitle>
        <CardDescription className="text-slate-400">
          {email ? (
            <>
              First-time sign in for{" "}
              <span className="text-amber-400">{email}</span>
            </>
          ) : (
            "Complete the required first-login password change"
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="mb-1 font-medium text-amber-300">
            Password change required
          </p>
          <p className="leading-relaxed text-slate-300">
            This page is only for migrated accounts on first login. Set a new
            password to continue to your account.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">New Password</FormLabel>
                  <FormControl>
                    <PasswordInput field={field} placeholder="••••••••" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-300">
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput field={field} placeholder="••••••••" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1.5 rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
              <p className="text-xs font-semibold text-slate-400">
                Password requirements
              </p>
              {passwordChecks.map((check) => (
                <div
                  key={check.label}
                  className={`flex items-center gap-2 text-xs ${
                    check.valid ? "text-emerald-400" : "text-slate-500"
                  }`}
                >
                  <span>{check.valid ? "•" : "○"}</span>
                  {check.label}
                </div>
              ))}
            </div>

            <Button
              type="submit"
              disabled={!form.formState.isValid || isPending}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Set Password & Continue"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
