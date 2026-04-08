// src/hooks/use-currency.ts
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { ThaiLotteryUserService } from "@/services/thai-lottery.service";

export function useCurrency() {
  const { user } = useAuthStore();
  const userCurrency = user?.currency ?? "BDT";

  const { data: rateData } = useQuery({
    queryKey: ["thai-currency-rate"],
    queryFn: () => ThaiLotteryUserService.getCurrencyRate(),
    staleTime: 5 * 60 * 1000,
  });

  // ✅ bdtPerDollar (ThaiCurrencyRate model)
  const usdToBdt = Number(rateData?.data?.bdtPerDollar ?? 110);

  const convert = (amountInBdt: number): number => {
    if (userCurrency === "USD")
      return Number((amountInBdt / usdToBdt).toFixed(2));
    return amountInBdt;
  };

  const fmt = (amountInBdt: number): string => {
    const converted = convert(amountInBdt);
    if (userCurrency === "USD")
      return `$${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `৳${converted.toLocaleString("en-BD")}`;
  };

  const symbol = userCurrency === "USD" ? "$" : "৳";

  return { currency: userCurrency, convert, fmt, symbol, usdToBdt };
}
