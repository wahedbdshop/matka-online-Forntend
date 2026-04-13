"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Lock, ShieldAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AdminService } from "@/services/admin.service";
import { useAuthStore } from "@/store/auth.store";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .trim()
      .min(1, "New password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .trim()
      .min(1, "Confirm password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Confirm password must match new password",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function extractApiErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

interface ResetUserPasswordActionProps {
  userId: string;
  userName?: string;
  buttonLabel?: string;
  buttonClassName?: string;
}

export function ResetUserPasswordAction({
  userId,
  userName,
  buttonLabel = "Reset Password",
  buttonClassName,
}: ResetUserPasswordActionProps) {
  const [open, setOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const adminRole = useAuthStore((state) => state.user?.role);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { mutate: resetPassword, isPending } = useMutation({
    mutationFn: ({ newPassword }: ResetPasswordFormValues) =>
      AdminService.resetUserPassword(userId, newPassword.trim()),
    onSuccess: () => {
      toast.success(
        "Password updated successfully. User has been logged out from all active sessions.",
      );
      form.reset();
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setOpen(false);
    },
    onError: (error) => {
      toast.error(extractApiErrorMessage(error, "Failed to reset password"));
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) {
      setOpen(nextOpen);
    }

    if (!nextOpen) {
      form.reset();
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  };

  if (adminRole !== "ADMIN") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName}
      >
        <Lock className="h-3.5 w-3.5" />
        {buttonLabel}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={!isPending}
          className="border border-amber-500/20 bg-slate-900 p-0 text-white ring-1 ring-amber-500/10 sm:max-w-md"
        >
          <DialogHeader className="border-b border-slate-800 px-5 py-4">
            <DialogTitle className="flex items-center gap-2 text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
                <ShieldAlert className="h-4 w-4" />
              </span>
              Reset User Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              This will set a new password for the user and log them out from
              all devices.
            </DialogDescription>
            {userName ? (
              <p className="text-[11px] text-slate-500">
                Target user:{" "}
                <span className="font-medium text-slate-300">{userName}</span>
              </p>
            ) : null}
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => resetPassword(values))}
              className="space-y-4 px-5 py-5"
            >
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-300">
                      New Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <Input
                          {...field}
                          type={showNewPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Enter new password"
                          className="h-10 border-slate-700 bg-slate-950 pl-9 pr-10 text-white placeholder:text-slate-500 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                          aria-label={
                            showNewPassword
                              ? "Hide new password"
                              : "Show new password"
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-slate-300">
                      Confirm Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="Re-enter new password"
                          className="h-10 border-slate-700 bg-slate-950 pl-9 pr-10 text-white placeholder:text-slate-500 focus-visible:border-amber-500/60 focus-visible:ring-amber-500/20"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <p className="text-[11px] text-amber-100/80">
                  This is a sensitive action. Use a strong password with at
                  least 6 characters.
                </p>
              </div>

              <DialogFooter className="mx-0 mb-0 border-t border-slate-800 bg-transparent px-0 pb-0 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                  className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !form.formState.isValid}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
