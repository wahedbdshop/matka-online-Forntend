"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  AtSign,
  Globe,
  Gift,
  ArrowLeft,
} from "lucide-react";
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
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegister } from "@/hooks/use-auth";
import { hasClientAuthCookie } from "@/lib/auth-cookie";

// ── Country list ──────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: "Bangladesh", dialCode: "+880" },
  { name: "India", dialCode: "+91" },
  { name: "Pakistan", dialCode: "+92" },
  { name: "United States", dialCode: "+1" },
  { name: "United Kingdom", dialCode: "+44" },
  { name: "Saudi Arabia", dialCode: "+966" },
  { name: "UAE", dialCode: "+971" },
  { name: "Malaysia", dialCode: "+60" },
  { name: "Singapore", dialCode: "+65" },
  { name: "Australia", dialCode: "+61" },
  { name: "Canada", dialCode: "+1" },
  { name: "Qatar", dialCode: "+974" },
  { name: "Kuwait", dialCode: "+965" },
  { name: "Bahrain", dialCode: "+973" },
  { name: "Oman", dialCode: "+968" },
] as const;

// ── Zod Schema ────────────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    country: z.string().min(1, "Please select a country"),
    phone: z.string().min(7, "Invalid phone number"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      country: "",
      phone: "",
      password: "",
      confirmPassword: "",
      referralCode: "",
    },
  });

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      form.setValue("referralCode", ref.trim().toLowerCase());
    }
  }, [form]);

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(countrySearch.trim().toLowerCase()) ||
          c.dialCode.includes(countrySearch.trim()),
      )
    : COUNTRIES;

  const onSubmit = (data: RegisterForm) => {
    const { confirmPassword, referralCode, ...rest } = data;
    void confirmPassword;
    register({
      ...rest,
      ...(referralCode?.trim()
        ? { referralCode: referralCode.trim().toLowerCase() }
        : {}),
    });
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      {/* Header */}
      <CardHeader className="px-4 pt-2 pb-2 text-center space-y-0">
        <div className="flex justify-start mb-1">
          <button
            type="button"
            onClick={() => router.push(hasClientAuthCookie() ? "/dashboard" : "/")}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="flex justify-center -mt-6 -mb-5">
          <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]">
            <Image
              src="/logo.png?v=20260331-1726"
              alt="Company logo"
              width={96}
              height={96}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>
        <CardTitle className="text-lg sm:text-2xl text-white">Create account</CardTitle>
        <p className="text-xs text-slate-400">Join Matka Online 24 today</p>
      </CardHeader>

      {/* Form */}
      <CardContent className="px-3 sm:px-6 pb-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            {/* Name + Username */}
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-300 text-xs">Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          {...field}
                          placeholder="John Doe"
                          className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-300 text-xs">Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          {...field}
                          placeholder="johndoe"
                          className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-slate-300 text-xs">Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="your@email.com"
                        className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Country — search inside dropdown */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-slate-300 text-xs">Country</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    onOpenChange={(open) => { if (!open) setCountrySearch(""); }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 w-full text-xs bg-slate-700/50 border-slate-600 text-white pl-8 relative">
                        <Globe className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <SelectValue placeholder="Select country" className="text-slate-500" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800 border-slate-600 text-white">
                      {/* Search inside dropdown */}
                      <div className="px-2 py-1.5 sticky top-0 bg-slate-800 border-b border-slate-600">
                        <Input
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder="Search country..."
                          className="h-7 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {filteredCountries.map((c) => (
                          <SelectItem
                            key={c.name}
                            value={c.name}
                            className="text-xs focus:bg-slate-700 focus:text-white"
                          >
                            {c.name} ({c.dialCode})
                          </SelectItem>
                        ))}
                        {filteredCountries.length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            No country found
                          </div>
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-slate-300 text-xs">Phone Number</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        {...field}
                        placeholder="01XXXXXXXXX"
                        className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Password + Confirm Password */}
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-300 text-xs">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-8 pl-8 pr-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-300 text-xs">Confirm</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-8 pl-8 pr-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                          aria-label={showConfirmPassword ? "Hide" : "Show"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* Referral Code */}
            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-slate-300 text-xs">
                    Referral Code{" "}
                    <span className="text-slate-500 font-normal">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Gift className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        {...field}
                        placeholder="Friend's referral code"
                        className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-9 text-sm bg-purple-600 hover:bg-purple-700 mt-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="justify-center py-2">
        <p className="text-slate-400 text-xs">
          Already have an account?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300">
            Login
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
