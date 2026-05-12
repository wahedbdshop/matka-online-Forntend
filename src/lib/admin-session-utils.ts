/* eslint-disable @typescript-eslint/no-explicit-any */

export function normalizeSessionList(source: any): any[] {
  if (Array.isArray(source)) return source;

  const candidates = [
    source?.data,
    source?.sessions,
    source?.items,
    source?.results,
    source?.list,
    source?.rows,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

export function pickSessionValue(session: any, paths: string[]) {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce<any>((acc, key) => acc?.[key], session);
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

export function normalizeBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "true" || normalized === "1" || normalized === "current"
    );
  }

  return false;
}

export function getSessionId(session: any) {
  return String(
    pickSessionValue(session, [
      "id",
      "_id",
      "sessionId",
      "session_id",
      "sid",
    ]) ?? "",
  );
}

export function getSessionDeviceLabel(session: any) {
  return (
    pickSessionValue(session, [
      "deviceName",
      "device.name",
      "device.label",
      "device.model",
      "deviceInfo.deviceName",
      "deviceInfo.name",
      "browser",
      "browserName",
      "deviceInfo.browser",
      "userAgent",
      "user_agent",
    ]) ?? "Unknown Device"
  );
}

export function getSessionIpLabel(session: any) {
  const rawIp =
    pickSessionValue(session, [
      "ipAddress",
      "ip",
      "ip_address",
      "location.ip",
      "device.ipAddress",
      "meta.ip",
    ]) ?? "";

  if (rawIp === "::1") return "127.0.0.1 (localhost)";
  if (typeof rawIp === "string" && rawIp.startsWith("::ffff:")) {
    return rawIp.replace("::ffff:", "");
  }

  return rawIp || "—";
}

export function getSessionLocationLabel(session: any) {
  return [
    pickSessionValue(session, [
      "city",
      "cityName",
      "location.city",
      "geo.city",
    ]),
    pickSessionValue(session, [
      "region",
      "regionName",
      "state",
      "location.region",
      "geo.region",
    ]),
    pickSessionValue(session, [
      "country",
      "countryName",
      "countryCode",
      "location.country",
      "location.countryName",
      "geo.country",
    ]),
  ]
    .filter(Boolean)
    .join(", ");
}

export function getSessionLastActive(session: any) {
  return pickSessionValue(session, [
    "lastActive",
    "lastSeenAt",
    "last_seen_at",
    "updatedAt",
    "updated_at",
    "createdAt",
    "created_at",
  ]);
}

export function getSessionCustomName(session: any) {
  const customName = pickSessionValue(session, [
    "customName",
    "custom_name",
    "deviceCustomName",
    "device.customName",
  ]);

  return typeof customName === "string" ? customName : "";
}
