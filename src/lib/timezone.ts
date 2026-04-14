"use client";

import moment from "moment-timezone";

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

function buildUtcScheduleInstantFromBangladeshDate(
  value?: string | null,
  referenceDate: Date = new Date(),
) {
  if (!value) return null;

  const bangladeshDate = moment(referenceDate)
    .tz(BANGLADESH_TIME_ZONE)
    .format("YYYY-MM-DD");
  const bangladeshTime = convertUtcScheduleToBangladesh(value);

  if (!bangladeshTime) return null;

  const parsed = moment.tz(
    `${bangladeshDate} ${bangladeshTime}`,
    "YYYY-MM-DD HH:mm",
    true,
    BANGLADESH_TIME_ZONE,
  );

  return parsed.isValid() ? parsed.utc() : null;
}

function buildAbsoluteFormat(options: DateTimeFormatOptions) {
  const includeDate = options.includeDate ?? true;
  const includeTime = options.includeTime ?? true;
  const hour12 = options.hour12 ?? true;

  if (includeDate && includeTime) {
    return hour12 ? "DD MMM YYYY, h:mm A" : "DD MMM YYYY, HH:mm";
  }

  if (includeDate) {
    return "DD MMM YYYY";
  }

  if (includeTime) {
    return hour12 ? "h:mm A" : "HH:mm";
  }

  return "";
}

function buildScheduleFormat(hour12 = true) {
  return hour12 ? "h:mm A" : "HH:mm";
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
  const current = moment.utc(date);
  return current.hours() * 60 + current.minutes();
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
  const scheduleMoment = buildUtcScheduleInstantFromBangladeshDate(value, date);
  if (!scheduleMoment) return false;

  return moment(date).valueOf() >= scheduleMoment.valueOf();
}

export function isCurrentWithinUtcScheduleWindow(
  openTime?: string | null,
  closeTime?: string | null,
  date: Date = new Date(),
) {
  const openMoment = buildUtcScheduleInstantFromBangladeshDate(openTime, date);
  const closeMoment = buildUtcScheduleInstantFromBangladeshDate(closeTime, date);

  if (!openMoment || !closeMoment) {
    return false;
  }

  if (closeMoment.valueOf() <= openMoment.valueOf()) {
    closeMoment.add(1, "day");
  }

  const currentTime = moment(date).valueOf();
  return currentTime >= openMoment.valueOf() && currentTime < closeMoment.valueOf();
}

export function getLocalTimezoneLabel(date: Date = new Date()) {
  return formatOffset(moment(date).utcOffset());
}

export function getBangladeshTimezoneLabel() {
  return formatOffset(BANGLADESH_UTC_OFFSET_MINUTES);
}

export function getUserTimeZone() {
  return moment.tz.guess() || "Local time";
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
  const formatted = moment(parsed).format(
    buildAbsoluteFormat({ includeDate, includeTime, hour12 }),
  );
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
  const formatted = moment(parsed)
    .tz(BANGLADESH_TIME_ZONE)
    .format(buildAbsoluteFormat({ includeDate, includeTime, hour12 }));
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
  const localMoment = moment.utc(parsed).local();
  const formatted = localMoment.format(buildScheduleFormat(options.hour12 ?? true));
  return options.includeTimezone
    ? `${formatted} (${getLocalTimezoneLabel(localMoment.toDate())})`
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
  const bangladeshMoment = moment.utc(parsed).tz(BANGLADESH_TIME_ZONE);
  const formatted = bangladeshMoment.format(buildScheduleFormat(options.hour12 ?? true));
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

  const parsed = moment(value);
  return parsed.isValid() ? parsed.toDate().toISOString() : "";
}

export function toUtcIsoFromBangladeshDateTimeInput(value: string) {
  if (!value) return "";
  const parsed = moment.tz(value, "YYYY-MM-DDTHH:mm", true, BANGLADESH_TIME_ZONE);
  return parsed.isValid() ? parsed.toDate().toISOString() : "";
}

export function toLocalDateTimeInputValue(value: DateLike) {
  const parsed = parseAbsoluteDate(value);
  if (!parsed) return "";
  return moment(parsed).format("YYYY-MM-DDTHH:mm");
}

export function getBangladeshDateISO(date: Date = new Date()) {
  return moment(date).tz(BANGLADESH_TIME_ZONE).format("YYYY-MM-DD");
}
