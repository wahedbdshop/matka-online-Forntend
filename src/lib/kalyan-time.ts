"use client";

import moment from "moment-timezone";

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
  const current = moment(date).tz(KALYAN_TIMEZONE);
  return current.hours() * 60 + current.minutes();
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
