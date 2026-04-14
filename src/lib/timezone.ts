"use client";

type DateLike = Date | string | number | null | undefined;

type DateTimeFormatOptions = {
  includeDate?: boolean;
  includeTime?: boolean;
  includeTimezone?: boolean;
  hour12?: boolean;
};

const BANGLADESH_TIME_ZONE = "Asia/Dhaka";
const BANGLADESH_UTC_OFFSET_MINUTES = 6 * 60;
const BANGLADESH_TIME_LABEL = "Bangladesh time";

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

function formatScheduleTimeValue(totalMinutes: number) {
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
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

export function getBangladeshTimezoneLabel() {
  return formatOffset(BANGLADESH_UTC_OFFSET_MINUTES);
}

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Local time";
}

export function formatLocalTimezoneNotice(date: Date = new Date()) {
  return `${getLocalTimezoneLabel(date)} (Your local time)`;
}

export function formatBangladeshTimezoneNotice() {
  return `${getBangladeshTimezoneLabel()} (${BANGLADESH_TIME_LABEL})`;
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

export function formatAbsoluteUtcDateTimeForBangladeshDisplay(
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
    timeZone: BANGLADESH_TIME_ZONE,
  });

  const formatted = formatter.format(parsed);
  return includeTimezone
    ? `${formatted}, ${getBangladeshTimezoneLabel()}`
    : formatted;
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

export function convertUtcScheduleToBangladesh(value?: string | null) {
  const scheduleMinutes = getUtcScheduleMinutes(value);
  if (scheduleMinutes === null) return value || "";

  return formatScheduleTimeValue(
    scheduleMinutes + BANGLADESH_UTC_OFFSET_MINUTES,
  );
}

export function convertBangladeshScheduleToUtc(value?: string | null) {
  const parsed = parseScheduleTime(value);
  if (!parsed) return value || "";

  return formatScheduleTimeValue(
    parsed.hours * 60 + parsed.minutes - BANGLADESH_UTC_OFFSET_MINUTES,
  );
}

export function formatUtcScheduleTimeForBangladeshDisplay(
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
    timeZone: BANGLADESH_TIME_ZONE,
  });

  const formatted = formatter.format(parsed);
  return options.includeTimezone
    ? `${formatted} (${getBangladeshTimezoneLabel()})`
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

export function toUtcIsoFromBangladeshDateTimeInput(value: string) {
  if (!value) return "";

  const [datePart = "", timePart = ""] = value.split("T");
  const [yearText = "0", monthText = "0", dayText = "0"] = datePart.split("-");
  const [hoursText = "0", minutesText = "0"] = timePart.split(":");

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (
    [year, month, day, hours, minutes].some((part) => Number.isNaN(part)) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return "";
  }

  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes - BANGLADESH_UTC_OFFSET_MINUTES, 0, 0),
  ).toISOString();
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

export function getBangladeshDateISO(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BANGLADESH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}
