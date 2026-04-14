"use client";

const KALYAN_TIMEZONE = "Asia/Dhaka";

function parseTimeToMinutes(time: string): number | null {
  const [hours, minutes] = time.split(":").map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function getCurrentMinutesInDhaka(date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: KALYAN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

export function isDhakaTimeWithinWindow(
  openTime: string,
  closeTime: string,
  date = new Date(),
): boolean {
  const nowMinutes = getCurrentMinutesInDhaka(date);
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (openMinutes === null || closeMinutes === null) {
    return false;
  }

  if (openMinutes === closeMinutes) {
    return false;
  }

  if (openMinutes < closeMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
}

export function isDhakaTimePastOrEqual(targetTime: string, date = new Date()): boolean {
  const nowMinutes = getCurrentMinutesInDhaka(date);
  const targetMinutes = parseTimeToMinutes(targetTime);

  if (targetMinutes === null) {
    return false;
  }

  return nowMinutes >= targetMinutes;
}
