"use client";

import { useEffect, useRef, useState } from "react";
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
  ChevronDown,
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
import { useRegister } from "@/hooks/use-auth";
import { hasClientAuthCookie } from "@/lib/auth-cookie";
import { COUNTRIES } from "@/lib/countries";


// ── Zod Schema ────────────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z
      .string()
      .email("Invalid email address")
      .refine((val) => !val.includes("+"), "Email address cannot contain a plus (+) sign"),
    country: z.string().min(1, "Please select a country"),
    phone: z.string().min(7, "Invalid phone number"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    const country = COUNTRIES.find((c) => c.name === data.country);
    const max = country?.maxPhoneDigits;
    if (max && data.phone.replace(/\D/g, "").length > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Phone number cannot exceed ${max} digits for ${data.country}`,
        path: ["phone"],
      });
    }
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { mutate: register, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        countryDropdownRef.current &&
        !countryDropdownRef.current.contains(event.target as Node)
      ) {
        setCountryOpen(false);
        setCountrySearch("");
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

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
    register(
      {
        ...rest,
        username: rest.username.trim().toLowerCase(),
        email: rest.email.trim().toLowerCase(),
        ...(referralCode?.trim()
          ? { referralCode: referralCode.trim().toLowerCase() }
          : {}),
      },
      {
        onError: (error: any) => {
          const message: string = error.response?.data?.message ?? "";
          if (message.includes("+") || /plus/i.test(message)) {
            form.setError("email", { message });
          }
        },
      },
    );
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
      {/* Header */}
      <CardHeader className="px-4 pt-2 pb-2 text-center space-y-0">
        <button
          type="button"
          onClick={() =>
            router.push(hasClientAuthCookie() ? "/dashboard" : "/")
          }
          className="w-full flex justify-start items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors mb-2 group py-1"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back</span>
        </button>
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
        <CardTitle className="text-lg sm:text-2xl text-white">
          Create account
        </CardTitle>
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
                    <FormLabel className="text-slate-300 text-xs">
                      Full Name
                    </FormLabel>
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
                    <FormLabel className="text-slate-300 text-xs">
                      Username
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          {...field}
                          placeholder="johndoe"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                          onChange={(e) =>
                            field.onChange(e.target.value.toLowerCase())
                          }
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
                  <FormLabel className="text-slate-300 text-xs">
                    Email
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="your@email.com"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                          onChange={(e) =>
                            field.onChange(e.target.value.toLowerCase())
                          }
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
              render={({ field }) => {
                const selectedCountry = COUNTRIES.find(
                  (country) => country.name === field.value,
                );

                return (
                <FormItem className="space-y-1">
                  <FormLabel className="text-slate-300 text-xs">
                    Country
                  </FormLabel>
                  <div ref={countryDropdownRef} className="relative">
                    <FormControl>
                      <button
                        type="button"
                        onClick={() => setCountryOpen((open) => !open)}
                        className="relative flex h-8 w-full items-center justify-between rounded-md border border-slate-600 bg-slate-700/50 pl-8 pr-3 text-left text-xs text-white outline-none transition-colors focus:border-purple-400 focus:ring-2 focus:ring-purple-500/25"
                        aria-expanded={countryOpen}
                      >
                        <Globe className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <span
                          className={
                            selectedCountry ? "truncate text-white" : "truncate text-slate-400"
                          }
                        >
                          {selectedCountry
                            ? `${selectedCountry.name} (${selectedCountry.dialCode})`
                            : "Select country"}
                        </span>
                        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      </button>
                    </FormControl>
                    {countryOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl">
                        <div className="border-b border-slate-600 bg-slate-800 px-2 py-1.5">
                        <Input
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          autoFocus
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          placeholder="Search country..."
                          className="h-7 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setCountryOpen(false);
                              setCountrySearch("");
                            }
                          }}
                        />
                      </div>
                        <div className="max-h-[min(14rem,45vh)] overflow-y-auto overscroll-contain py-1">
                        {filteredCountries.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              field.onChange(c.name);
                              setCountrySearch("");
                              setCountryOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs text-white transition-colors hover:bg-slate-700 focus:bg-slate-700 focus:outline-none"
                          >
                            <span className="truncate">{c.name}</span>
                            <span className="shrink-0 text-slate-400">
                              {c.dialCode}
                            </span>
                          </button>
                        ))}
                        {filteredCountries.length === 0 && (
                          <div className="px-3 py-2 text-xs text-slate-400">
                            No country found
                          </div>
                        )}
                      </div>
                      </div>
                    )}
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
                );
              }}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => {
                const selectedCountry = form.watch("country");
                const maxDigits = COUNTRIES.find((c) => c.name === selectedCountry)?.maxPhoneDigits;
                return (
                <FormItem className="space-y-1">
                  <FormLabel className="text-slate-300 text-xs">
                    Phone Number
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        {...field}
                        placeholder="01XXXXXXXXX"
                        maxLength={maxDigits}
                        className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
                );
              }}
            />

            {/* Password + Confirm Password */}
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-slate-300 text-xs">
                      Password
                    </FormLabel>
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
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
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
                    <FormLabel className="text-slate-300 text-xs">
                      Confirm
                    </FormLabel>
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
                          {showConfirmPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
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
                    <span className="text-slate-500 font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Gift className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        {...field}
                        placeholder="Friend's referral code"
                        className="h-8 pl-8 text-xs bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase())
                        }
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
