"use client";

import moment from "moment-timezone";

const BANGLADESH_TIME_ZONE = "Asia/Dhaka";

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
] as const;

type ScheduleConfig = {
  enabled: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  selectedDays?: number[];
  now?: Date;
};

function parseTimeValue(value?: string | null) {
  if (!value) return null;
  const normalizedValue = value.trim().toUpperCase();

  const parsedMoment = moment(normalizedValue, ["HH:mm", "H:mm", "hh:mm A", "h:mm A"], true);
  if (!parsedMoment.isValid()) {
    return null;
  }

  return {
    hours: parsedMoment.hour(),
    minutes: parsedMoment.minute(),
  };
}

function normalizeDays(days?: number[]) {
  const filtered = (days ?? []).filter(
    (value): value is number =>
      Number.isInteger(value) && value >= 0 && value <= 6,
  );

  if (filtered.length === 0) {
    return WEEKDAY_OPTIONS.map((day) => day.value);
  }

  return Array.from(new Set(filtered)).sort((a, b) => a - b);
}

function getScheduleMoments(baseDay: moment.Moment, openTime: string, closeTime: string) {
  const parsedOpen = parseTimeValue(openTime);
  const parsedClose = parseTimeValue(closeTime);

  if (!parsedOpen || !parsedClose) {
    return null;
  }

  const openMoment = baseDay
    .clone()
    .hour(parsedOpen.hours)
    .minute(parsedOpen.minutes)
    .second(0)
    .millisecond(0);
  const closeMoment = baseDay
    .clone()
    .hour(parsedClose.hours)
    .minute(parsedClose.minutes)
    .second(0)
    .millisecond(0);

  if (closeMoment.valueOf() <= openMoment.valueOf()) {
    closeMoment.add(1, "day");
  }

  return { openMoment, closeMoment };
}

export function parseScheduleDaysValue(value?: string | null) {
  if (!value?.trim()) {
    return WEEKDAY_OPTIONS.map((day) => day.value);
  }

  const parsed = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);

  return normalizeDays(parsed);
}

export function stringifyScheduleDaysValue(days?: number[]) {
  return normalizeDays(days).join(",");
}

export function normalizeScheduleTimeValue(value?: string | null) {
  const parsed = parseTimeValue(value);
  if (!parsed) return "";

  return `${String(parsed.hours).padStart(2, "0")}:${String(parsed.minutes).padStart(2, "0")}`;
}

export function formatScheduleDaysSummary(days?: number[]) {
  const normalizedDays = normalizeDays(days);

  if (normalizedDays.length === 7) {
    return "Every day";
  }

  return normalizedDays
    .map((day) => WEEKDAY_OPTIONS.find((item) => item.value === day)?.label ?? "")
    .filter(Boolean)
    .join(", ");
}

export function isScheduleConfigured(openTime?: string | null, closeTime?: string | null) {
  return Boolean(parseTimeValue(openTime) && parseTimeValue(closeTime));
}

export function isFeatureEnabledBySchedule({
  enabled,
  openTime,
  closeTime,
  selectedDays,
  now = new Date(),
}: ScheduleConfig) {
  if (!enabled || !isScheduleConfigured(openTime, closeTime)) {
    return false;
  }

  const currentMoment = moment.tz(now, BANGLADESH_TIME_ZONE);
  const days = normalizeDays(selectedDays);

  for (const offset of [0, -1]) {
    const baseDay = currentMoment.clone().startOf("day").add(offset, "day");
    if (!days.includes(baseDay.day())) {
      continue;
    }

    const scheduleMoments = getScheduleMoments(baseDay, openTime!, closeTime!);
    if (!scheduleMoments) {
      continue;
    }

    if (
      currentMoment.valueOf() >= scheduleMoments.openMoment.valueOf() &&
      currentMoment.valueOf() < scheduleMoments.closeMoment.valueOf()
    ) {
      return true;
    }
  }

  return false;
}

export function getNextScheduledOpenIso({
  enabled,
  openTime,
  closeTime,
  selectedDays,
  now = new Date(),
}: ScheduleConfig) {
  if (!enabled || !isScheduleConfigured(openTime, closeTime)) {
    return "";
  }

  const currentMoment = moment.tz(now, BANGLADESH_TIME_ZONE);
  const days = normalizeDays(selectedDays);

  for (let offset = 0; offset <= 7; offset += 1) {
    const baseDay = currentMoment.clone().startOf("day").add(offset, "day");
    if (!days.includes(baseDay.day())) {
      continue;
    }

    const scheduleMoments = getScheduleMoments(baseDay, openTime!, closeTime!);
    if (!scheduleMoments) {
      continue;
    }

    if (scheduleMoments.openMoment.valueOf() > currentMoment.valueOf()) {
      return scheduleMoments.openMoment.toDate().toISOString();
    }
  }

  return "";
}
