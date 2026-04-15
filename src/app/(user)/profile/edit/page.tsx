"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Loader2, User, Phone, Globe, Mail } from "lucide-react";
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
import { UserService } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/axios";


const schema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormData = z.infer<typeof schema>;

export default function EditProfilePage() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => UserService.getProfile(),
  });

  const profile = data?.data;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      name: profile?.name ?? "",
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: FormData) =>
      api.patch("/user/profile", payload).then((r) => r.data),
    onSuccess: (res) => {
      toast.success("Profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      updateUser({ name: res.data?.name });
    },
    onError: () => toast.error("Failed to update profile"),
  });

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded bg-slate-800" />
        <div className="h-64 rounded-2xl bg-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div className="space-y-3">
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <h1 className="text-xl font-bold text-white">Edit Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Update your personal information
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) => mutate(d))}
            className="space-y-4"
          >
            {/* Email — readonly */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  value={profile?.email ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 pl-10 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-600">
                Email cannot be changed
              </p>
            </div>

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-slate-400 text-xs">
                    Full Name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        {...field}
                        placeholder="Your name"
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone — readonly */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  value={profile?.phone ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 pl-10 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-600">
                Phone number cannot be changed
              </p>
            </div>

            {/* Country — readonly */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                Country
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  value={profile?.country ?? ""}
                  readOnly
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 pl-10 text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-600">
                Country cannot be changed
              </p>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
