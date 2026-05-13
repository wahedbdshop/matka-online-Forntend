export const LUDO_COMMISSION_STORAGE_KEY = "ludo.commission.pct";

const COMMISSION_KEYS = [
  "commissionPct",
  "commission",
  "commissionPercentage",
  "winCommissionPct",
  "ludoCommissionPct",
];

function toFiniteNumber(value: unknown) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(num) ? num : null;
}

function clampCommissionPct(value: number) {
  return Math.max(0, Math.min(100, value));
}

function extractFromObject(source: Record<string, unknown>): number | null {
  for (const key of COMMISSION_KEYS) {
    const directValue = toFiniteNumber(source[key]);
    if (directValue !== null) {
      return clampCommissionPct(directValue);
    }
  }

  for (const value of Object.values(source)) {
    if (Array.isArray(value)) continue;
    if (typeof value === "object" && value !== null) {
      const nestedValue: number | null = extractFromObject(
        value as Record<string, unknown>,
      );
      if (nestedValue !== null) return nestedValue;
    }
  }

  return null;
}

export function extractLudoCommissionPct(...sources: unknown[]) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const value = extractFromObject(source as Record<string, unknown>);
    if (value !== null) return value;
  }

  return 0;
}

export function calculateLudoGrossPrize(stakeAmount: number) {
  return Math.max(0, Number(stakeAmount) || 0) * 2;
}

export function calculateLudoNetPrize(
  stakeAmount: number,
  commissionPct: number,
) {
  const grossPrize = calculateLudoGrossPrize(stakeAmount);
  const commissionAmount = grossPrize * (clampCommissionPct(commissionPct) / 100);
  return Number((grossPrize - commissionAmount).toFixed(2));
}

export function formatLudoPrizeAmount(amount: number) {
  if (!Number.isFinite(amount)) return "0";

  return Number.isInteger(amount)
    ? amount.toLocaleString("en-BD")
    : amount.toLocaleString("en-BD", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function storeLudoCommissionPct(commissionPct: number) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    LUDO_COMMISSION_STORAGE_KEY,
    String(clampCommissionPct(commissionPct)),
  );
}

export function readStoredLudoCommissionPct() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(LUDO_COMMISSION_STORAGE_KEY);
  const value = toFiniteNumber(raw);
  return value === null ? null : clampCommissionPct(value);
}
