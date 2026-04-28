/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, MessageCircle, PhoneCall, Save, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  COUNTRY_DIAL_CODES,
  DEFAULT_COUNTRY,
  findCountryByIso2,
  findCountryByPhoneNumber,
} from "@/lib/countries";
import { AdminService } from "@/services/admin.service";

const WHATSAPP_NUMBER_KEY = "live_chat_whatsapp_number";
const WHATSAPP_MESSAGE_KEY = "live_chat_whatsapp_message";
const WHATSAPP_COUNTRY_KEY = "live_chat_whatsapp_country";
const DEFAULT_WHATSAPP_MESSAGE = "Hello, I need support.";

function getSettingValue(settings: any[], key: string, fallback = "") {
  return settings.find((setting) => setting.key === key)?.value ?? fallback;
}

function cleanPhoneNumber(value: string) {
  return value.replace(/[^0-9+]/g, "").trim();
}

function getWhatsAppDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function getLocalNumber(fullNumber: string, dialCode: string) {
  const digits = getWhatsAppDigits(fullNumber);
  return digits.startsWith(dialCode) ? digits.slice(dialCode.length) : digits;
}

export default function AdminLiveChatSettingsPage() {
  const queryClient = useQueryClient();
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [localNumber, setLocalNumber] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => AdminService.getSettings(),
  });

  const settings = useMemo(() => data?.data ?? [], [data?.data]);
  const savedWhatsappNumber = getSettingValue(settings, WHATSAPP_NUMBER_KEY);
  const savedWhatsappCountry = getSettingValue(settings, WHATSAPP_COUNTRY_KEY);
  const savedWhatsappMessage = getSettingValue(
    settings,
    WHATSAPP_MESSAGE_KEY,
    DEFAULT_WHATSAPP_MESSAGE,
  );
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    const digitQuery = query.replace(/[^0-9]/g, "");
    if (!query) return COUNTRY_DIAL_CODES;
    return COUNTRY_DIAL_CODES.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.iso2.toLowerCase().includes(query) ||
        (digitQuery.length > 0 && country.dialCode.includes(digitQuery)),
    );
  }, [countrySearch]);

  useEffect(() => {
    if (isLoading) return;
    const country =
      findCountryByIso2(savedWhatsappCountry) ??
      findCountryByPhoneNumber(savedWhatsappNumber);
    setSelectedCountry(country);
    setLocalNumber(getLocalNumber(savedWhatsappNumber, country.dialCode));
    setWhatsappMessage(savedWhatsappMessage);
  }, [isLoading, savedWhatsappCountry, savedWhatsappMessage, savedWhatsappNumber]);

  const localDigits = getWhatsAppDigits(localNumber);
  const fullDigits = `${selectedCountry.dialCode}${localDigits}`;
  const normalizedNumber = cleanPhoneNumber(`+${fullDigits}`);
  const testNumber = getWhatsAppDigits(normalizedNumber);
  const maxLocalDigits =
    selectedCountry.maxPhoneDigits ?? 15 - selectedCountry.dialCode.length;
  const numberError =
    localDigits.length === 0
      ? "Enter the WhatsApp number."
      : localDigits.length < 4
        ? "Number is too short."
        : localDigits.length > maxLocalDigits
          ? `Too many digits for ${selectedCountry.name}. Maximum ${maxLocalDigits} local digits.`
          : testNumber.length > 15
            ? "WhatsApp number cannot be more than 15 digits including country code."
            : "";

  const { mutate: saveSettings, isPending } = useMutation({
    mutationFn: async () => {
      if (numberError) {
        throw new Error(numberError);
      }

      await Promise.all([
        AdminService.updateSetting(WHATSAPP_COUNTRY_KEY, selectedCountry.iso2),
        AdminService.updateSetting(WHATSAPP_NUMBER_KEY, normalizedNumber),
        AdminService.updateSetting(
          WHATSAPP_MESSAGE_KEY,
          whatsappMessage.trim() || DEFAULT_WHATSAPP_MESSAGE,
        ),
      ]);
    },
    onSuccess: () => {
      toast.success("Live chat WhatsApp settings saved");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      queryClient.invalidateQueries({ queryKey: ["floating-chat-global-agents"] });
    },
    onError: (error: any) => {
      toast.error(
        error?.message ||
          error?.response?.data?.message ||
          "Failed to save live chat settings",
      );
    },
  });

  const openWhatsAppTest = () => {
    if (numberError) {
      toast.error(numberError);
      return;
    }

    const message = encodeURIComponent(
      whatsappMessage.trim() || DEFAULT_WHATSAPP_MESSAGE,
    );
    window.open(`https://wa.me/${testNumber}?text=${message}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Live Chat Settings</h1>
          <p className="text-sm text-slate-400">
            Manage the WhatsApp support number shown from the user floating chat menu.
          </p>
        </div>
        <Badge className="w-fit bg-emerald-500/15 text-emerald-300">
          User Support
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="space-y-5 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/15 text-green-300">
                <PhoneCall className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  WhatsApp Support
                </h2>
                <p className="text-xs text-slate-400">
                  This number is used when users choose WhatsApp from the 24/7 chat button.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 bg-slate-700" />
                <Skeleton className="h-10 bg-slate-700" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Country</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCountryOpen((open) => !open)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-slate-600 bg-slate-700 px-3 text-left text-sm text-white"
                    >
                      <span className="truncate">
                        {selectedCountry.name} (+{selectedCountry.dialCode})
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    </button>
                    {isCountryOpen && (
                      <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl">
                        <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-2">
                          <Search className="h-4 w-4 text-slate-500" />
                          <Input
                            value={countrySearch}
                            onChange={(event) => setCountrySearch(event.target.value)}
                            placeholder="Search country or code"
                            className="h-9 border-0 bg-transparent px-0 text-white focus-visible:ring-0"
                            onKeyDown={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-52 overflow-y-auto">
                          {filteredCountries.map((country) => (
                            <button
                              key={`${country.iso2}-${country.name}`}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(country);
                                setCountrySearch("");
                                setIsCountryOpen(false);
                              }}
                              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-slate-200 hover:bg-slate-800"
                            >
                              <span>{country.name}</span>
                              <span className="text-slate-400">+{country.dialCode}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Search country first, then add that country's WhatsApp number.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    WhatsApp Number
                  </label>
                  <div className="flex overflow-hidden rounded-md border border-slate-600 bg-slate-700">
                    <span className="flex items-center border-r border-slate-600 px-3 text-sm font-semibold text-slate-200">
                      +{selectedCountry.dialCode}
                    </span>
                    <Input
                      value={localNumber}
                      onChange={(event) =>
                        setLocalNumber(event.target.value.replace(/[^0-9\s-]/g, ""))
                      }
                      placeholder="Local number"
                      className="border-0 bg-transparent text-white focus-visible:ring-0"
                    />
                  </div>
                  <p className={numberError ? "text-xs text-red-400" : "text-xs text-slate-500"}>
                    {numberError || `Saved as ${normalizedNumber}`}
                  </p>
                </div>
              </div>
            )}

            {!isLoading && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Default Message
                </label>
                <Input
                  value={whatsappMessage}
                  onChange={(event) => setWhatsappMessage(event.target.value)}
                  placeholder={DEFAULT_WHATSAPP_MESSAGE}
                  className="border-slate-600 bg-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  This text will be pre-filled in WhatsApp.
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={openWhatsAppTest}
                disabled={isLoading}
                className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-700"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Test WhatsApp
              </Button>
              <Button
                type="button"
                onClick={() => saveSettings()}
                disabled={isPending || isLoading}
                className="bg-green-600 text-white hover:bg-green-700"
              >
                <Save className="mr-2 h-4 w-4" />
                {isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Current Setup</h2>
                <p className="text-xs text-slate-400">Live chat menu target</p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-500">Number</p>
                <p className="mt-1 break-all font-semibold text-slate-100">
                  {savedWhatsappNumber || "Not set"}
                </p>
                {savedWhatsappCountry && (
                  <p className="mt-1 text-xs text-slate-500">
                    Country: {findCountryByIso2(savedWhatsappCountry)?.name ?? savedWhatsappCountry}
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                <p className="text-xs text-slate-500">Message</p>
                <p className="mt-1 text-slate-100">
                  {savedWhatsappMessage || DEFAULT_WHATSAPP_MESSAGE}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
