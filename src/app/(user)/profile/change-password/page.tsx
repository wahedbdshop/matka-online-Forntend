/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
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
import { api } from "@/lib/axios";

const schema = z
  .object({
    currentPassword: z.string().min(6, "Current password required"),
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
  disabled = false,
}: {
  field: any;
  placeholder: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <Input
        {...field}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-10 pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function ChangePasswordPage() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      api.post("/auth/change-password", payload).then((r) => r.data),
    onSuccess: () => {
      toast.success("Password changed successfully");
      form.reset();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to change password"),
  });

  const onSubmit = (data: FormData) => {
    mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const currentPassword = useWatch({
    control: form.control,
    name: "currentPassword",
    defaultValue: "",
  });
  const newPassword = useWatch({
    control: form.control,
    name: "newPassword",
    defaultValue: "",
  });
  const confirmPassword = useWatch({
    control: form.control,
    name: "confirmPassword",
    defaultValue: "",
  });

  const canEditNewPassword = currentPassword.trim().length > 0;
  const canEditConfirmPassword = newPassword.trim().length > 0;
  const passwordChecks = [
    {
      label: "Use at least 6 characters",
      valid: newPassword.length >= 6,
    },
    {
      label: "Add at least one letter",
      valid: /[A-Za-z]/.test(newPassword),
    },
    {
      label: "Add at least one number",
      valid: /[0-9]/.test(newPassword),
    },
    {
      label: "Add at least one symbol",
      valid: /[^A-Za-z0-9]/.test(newPassword),
    },
    {
      label: "Avoid using your name or email",
      valid: true,
    },
  ];
  const canSubmit =
    form.formState.isValid &&
    currentPassword.trim().length > 0 &&
    newPassword.trim().length > 0 &&
    confirmPassword.trim().length > 0 &&
    !isPending;

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-white">Change Password</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Keep your account secure
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400 text-xs">
                    Current Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput field={field} placeholder="••••••••" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400 text-xs">
                    New Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      field={field}
                      placeholder="••••••••"
                      disabled={!canEditNewPassword}
                    />
                  </FormControl>
                  {!canEditNewPassword && (
                    <p className="text-[11px] text-slate-500">
                      Enter current password first
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400 text-xs">
                    Confirm New Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput
                      field={field}
                      placeholder="••••••••"
                      disabled={!canEditConfirmPassword}
                    />
                  </FormControl>
                  {!canEditConfirmPassword && (
                    <p className="text-[11px] text-slate-500">
                      Enter new password first
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>

            {!canSubmit && (
              <p className="text-center text-[11px] text-slate-500">
                Fill all password fields correctly to enable submit
              </p>
            )}
          </form>
        </Form>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-400">Password tips</p>
        {passwordChecks.map((tip) => (
          <div
            key={tip.label}
            className={`flex items-center gap-2 text-xs ${
              tip.valid ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <span className={tip.valid ? "text-emerald-400" : "text-slate-600"}>
              {tip.valid ? "•" : "○"}
            </span>
            {tip.label}
          </div>
        ))}
      </div>
    </div>
  );
}
