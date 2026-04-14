"use client";

type DateLike = Date | string | number | null | undefined;

type DateTimeFormatOptions = {
  includeDate?: boolean;
  includeTime?: boolean;
  includeTimezone?: boolean;
  hour12?: boolean;
};

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

function parseAbsoluteDate(value: DateLike) {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);
  return isValidDate(parsed) ? parsed : null;
}

function parseScheduleTime(value?: string | null) {
  if (!value) return null;

  const [hoursText = "0", minutesText = "0"] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return { hours, minutes };
}

function buildUtcScheduleDate(
  value?: string | null,
  baseDate: Date = new Date(),
) {
  const parsedTime = parseScheduleTime(value);
  if (!parsedTime) return null;

  return new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate(),
      parsedTime.hours,
      parsedTime.minutes,
      0,
      0,
    ),
  );
}

function formatOffset(minutesOffset: number) {
  const sign = minutesOffset >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(minutesOffset);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }

  return `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

export function getCurrentUtcMinutes(date: Date = new Date()) {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function getUtcScheduleMinutes(value?: string | null) {
  const parsed = parseScheduleTime(value);
  if (!parsed) return null;

  return parsed.hours * 60 + parsed.minutes;
}

export function hasUtcScheduleTimePassed(
  value?: string | null,
  date: Date = new Date(),
) {
  const scheduleMinutes = getUtcScheduleMinutes(value);
  if (scheduleMinutes === null) return false;

  return getCurrentUtcMinutes(date) >= scheduleMinutes;
}

export function isCurrentWithinUtcScheduleWindow(
  openTime?: string | null,
  closeTime?: string | null,
  date: Date = new Date(),
) {
  const openMinutes = getUtcScheduleMinutes(openTime);
  const closeMinutes = getUtcScheduleMinutes(closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return false;
  }

  const currentMinutes = getCurrentUtcMinutes(date);

  if (openMinutes <= closeMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
}

export function getLocalTimezoneLabel(date: Date = new Date()) {
  return formatOffset(-date.getTimezoneOffset());
}

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
}

export function formatLocalTimezoneNotice(date: Date = new Date()) {
  return `${getLocalTimezoneLabel(date)} (Your local time)`;
}

export function formatAbsoluteUtcDateTimeForLocalDisplay(
  value: DateLike,
  options: DateTimeFormatOptions = {},
) {
  const parsed = parseAbsoluteDate(value);
  if (!parsed) return "-";

  const {
    includeDate = true,
    includeTime = true,
    includeTimezone = false,
    hour12 = true,
  } = options;

  const formatter = new Intl.DateTimeFormat(undefined, {
    ...(includeDate
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      : {}),
    ...(includeTime
      ? {
          hour: "numeric",
          minute: "2-digit",
          hour12,
        }
      : {}),
  });

  const formatted = formatter.format(parsed);
  return includeTimezone
    ? `${formatted}, ${getLocalTimezoneLabel(parsed)}`
    : formatted;
}

export function formatAbsoluteUtcDateForLocalDisplay(value: DateLike) {
  return formatAbsoluteUtcDateTimeForLocalDisplay(value, {
    includeDate: true,
    includeTime: false,
  });
}

export function formatUtcScheduleTimeForLocalDisplay(
  value?: string | null,
  options: Pick<DateTimeFormatOptions, "includeTimezone" | "hour12"> & {
    baseDate?: Date;
  } = {},
) {
  const parsed = buildUtcScheduleDate(value, options.baseDate);
  if (!parsed) return value || "-";

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: options.hour12 ?? true,
  });

  const formatted = formatter.format(parsed);
  return options.includeTimezone
    ? `${formatted} (${getLocalTimezoneLabel(parsed)})`
    : formatted;
}

export function formatUtcScheduleRangeForLocalDisplay(
  openTime?: string | null,
  closeTime?: string | null,
  options: Pick<DateTimeFormatOptions, "includeTimezone" | "hour12"> & {
    baseDate?: Date;
  } = {},
) {
  if (!openTime || !closeTime) return "-";

  const start = formatUtcScheduleTimeForLocalDisplay(openTime, {
    baseDate: options.baseDate,
    hour12: options.hour12,
  });
  const end = formatUtcScheduleTimeForLocalDisplay(closeTime, {
    baseDate: options.baseDate,
    hour12: options.hour12,
  });

  if (!options.includeTimezone) {
    return `${start} - ${end}`;
  }

  return `${start} - ${end} (${getLocalTimezoneLabel(options.baseDate ?? new Date())})`;
}

export function toUtcIsoFromLocalDateTimeInput(value: string) {
  if (!value) return "";

  const parsed = new Date(value);
  return isValidDate(parsed) ? parsed.toISOString() : "";
}

export function toLocalDateTimeInputValue(value: DateLike) {
  const parsed = parseAbsoluteDate(value);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
