import { getCountryDataList } from "countries-list";

export interface Country {
  name: string;
  dialCode: string;
  maxPhoneDigits?: number;
}

export type CountryDialCode = {
  iso2: string;
  name: string;
  dialCode: string;
  maxPhoneDigits?: number;
};

const countryData = getCountryDataList();

export const COUNTRY_DIAL_CODES: CountryDialCode[] = countryData
  .map((country) => {
    const phoneCode = String(country.phone[0] ?? "");
    return {
      iso2: country.iso2,
      name: country.name,
      dialCode: phoneCode,
      maxPhoneDigits: Math.max(4, 15 - phoneCode.length),
    };
  })
  .filter((country) => country.dialCode.length > 0)
  .sort((a, b) => a.name.localeCompare(b.name));

export const COUNTRIES: Country[] = COUNTRY_DIAL_CODES.map((country) => ({
  name: country.name,
  dialCode: `+${country.dialCode}`,
  maxPhoneDigits: country.maxPhoneDigits,
}));

export const DEFAULT_COUNTRY =
  COUNTRY_DIAL_CODES.find((country) => country.iso2 === "BD") ??
  COUNTRY_DIAL_CODES[0];

export function findCountryByIso2(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();

  return (
    COUNTRY_DIAL_CODES.find(
      (country) =>
        country.iso2.toLowerCase() === normalized ||
        country.name.toLowerCase() === normalized,
    ) ?? null
  );
}

export function findCountryByPhoneNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/[^0-9]/g, "");
  return (
    [...COUNTRY_DIAL_CODES]
      .sort((a, b) => b.dialCode.length - a.dialCode.length)
      .find((country) => digits.startsWith(country.dialCode)) ?? DEFAULT_COUNTRY
  );
}
