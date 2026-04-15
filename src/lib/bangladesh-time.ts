"use client";

export const BANGLADESH_TIMEZONE = "Asia/Dhaka";

const DHAKA_OFFSET_MINUTES = 6 * 60;
const DEFAULT_LOCALE = "en-BD";

type DateLike = Date | number | string | null | undefined;

type BangladeshFormatOptions = Intl.DateTimeFormatOptions & {
  locale?: string;
  timeZone?: string;
};

function isPlainDateString(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTimeZone(timeZone?: string | null) {
  return timeZone || BANGLADESH_TIMEZONE;
}

function toDate(value: DateLike) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatPlainDate(
  value: string,
  { locale = DEFAULT_LOCALE, ...options }: BangladeshFormatOptions = {},
) {
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatInTimeZone(
  value: DateLike,
  defaults: Intl.DateTimeFormatOptions,
  options: BangladeshFormatOptions = {},
) {
  if (!value) return "-";

  if (typeof value === "string" && isPlainDateString(value)) {
    return formatPlainDate(value, { ...defaults, ...options });
  }

  const parsed = toDate(value);
  if (!parsed) return String(value);

  const { locale = DEFAULT_LOCALE, timeZone, ...formatOptions } = options;

  return new Intl.DateTimeFormat(locale, {
    ...defaults,
    ...formatOptions,
    timeZone: getTimeZone(timeZone),
  }).format(parsed);
}

function formatPartsInTimeZone(
  value: DateLike,
  options: BangladeshFormatOptions = {},
) {
  if (!value) return null;

  if (typeof value === "string" && isPlainDateString(value)) {
    const [year, month, day] = value.split("-");
    return {
      year,
      month,
      day,
      hour: "00",
      minute: "00",
    };
  }

  const parsed = toDate(value);
  if (!parsed) return null;

  const { locale = "en-CA", timeZone, ...formatOptions } = options;
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: getTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...formatOptions,
  });

  const parts = formatter.formatToParts(parsed);
  return {
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
    hour: parts.find((part) => part.type === "hour")?.value ?? "00",
    minute: parts.find((part) => part.type === "minute")?.value ?? "00",
  };
}

export function formatBangladeshDate(
  value: DateLike,
  options: BangladeshFormatOptions = {},
) {
  return formatInTimeZone(
    value,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
    options,
  );
}

export function formatBangladeshTime(
  value: DateLike,
  options: BangladeshFormatOptions = {},
) {
  return formatInTimeZone(
    value,
    {
      hour: "2-digit",
      minute: "2-digit",
    },
    options,
  );
}

export function formatBangladeshDateTime(
  value: DateLike,
  options: BangladeshFormatOptions = {},
) {
  return formatInTimeZone(
    value,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    options,
  );
}

export function getBangladeshCalendarDate(
  value: DateLike,
  timeZone?: string | null,
) {
  if (!value) return "";

  if (typeof value === "string" && isPlainDateString(value)) {
    return value;
  }

  const parts = formatPartsInTimeZone(value, {
    timeZone: timeZone ?? undefined,
  });
  if (!parts) return "";

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toBangladeshDateTimeInputValue(
  value: DateLike,
  timeZone?: string | null,
) {
  const parts = formatPartsInTimeZone(value, {
    timeZone: timeZone ?? undefined,
  });
  if (!parts) return "";

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function bangladeshDateTimeInputToIso(
  value: string,
  timeZone?: string | null,
) {
  if (!value) return "";

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText ?? "0");

  if (getTimeZone(timeZone) !== BANGLADESH_TIMEZONE) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }

  const utcTimestamp =
    Date.UTC(year, month - 1, day, hour, minute, second) -
    DHAKA_OFFSET_MINUTES * 60_000;

  return new Date(utcTimestamp).toISOString();
}
