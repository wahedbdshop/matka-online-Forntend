export function normalizeKalyanMarketText(value?: string | null) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

type KalyanMarketSessionType = "OPEN" | "CLOSE" | string | null;

interface KalyanMarketDisplaySource {
  name?: string | null;
  marketName?: string | null;
  title?: string | null;
  gameName?: string | null;
  openName?: string | null;
  openMarketName?: string | null;
  closeName?: string | null;
  closeMarketName?: string | null;
  sessionType?: KalyanMarketSessionType;
  timings?: Array<{
    sessionType?: KalyanMarketSessionType;
  }> | null;
}

export function formatKalyanMarketTitle(value?: string | null) {
  const normalized = normalizeKalyanMarketText(value)
    .replace(/(\bclose\b)(\s+\bclose\b)+/gi, "Close");

  if (!normalized) return "Kalyan Game";

  return normalized
    .toLowerCase()
    .replace(/\b[a-z0-9]/g, (char) => char.toUpperCase());
}

export function getKalyanMarketBaseName(market?: KalyanMarketDisplaySource | null) {
  return normalizeKalyanMarketText(
    market?.name ??
      market?.marketName ??
      market?.title ??
      market?.gameName,
  );
}

export function getKalyanMarketSessionName(
  market?: KalyanMarketDisplaySource | null,
  sessionType?: KalyanMarketSessionType,
) {
  const normalizedSession = String(sessionType ?? "")
    .trim()
    .toUpperCase();

  if (normalizedSession === "CLOSE") {
    return (
      normalizeKalyanMarketText(market?.closeName ?? market?.closeMarketName) ||
      getKalyanMarketBaseName(market)
    );
  }

  if (normalizedSession === "OPEN") {
    return (
      normalizeKalyanMarketText(market?.openName ?? market?.openMarketName) ||
      getKalyanMarketBaseName(market)
    );
  }

  return getKalyanMarketBaseName(market);
}

export function getKalyanMarketOptionLabel(market?: KalyanMarketDisplaySource | null) {
  return getKalyanMarketBaseName(market) || "-";
}

export function getKalyanMarketSessionOptionLabel(market?: KalyanMarketDisplaySource | null) {
  const baseName = getKalyanMarketBaseName(market) || "-";
  const sessionType = String(market?.sessionType ?? market?.timings?.[0]?.sessionType ?? "").toUpperCase();
  if (sessionType === "CLOSE") return `${baseName} — Close`;
  if (sessionType === "OPEN") return `${baseName} — Open`;
  return baseName;
}

export function getKalyanMarketSessionLabel(
  market?: KalyanMarketDisplaySource | null,
  sessionType?: KalyanMarketSessionType,
) {
  const baseName = getKalyanMarketBaseName(market);
  const sessionName = getKalyanMarketSessionName(market, sessionType);
  const normalizedSession = String(sessionType ?? "")
    .trim()
    .toUpperCase();
  const normalizedBaseName = normalizeKalyanMarketText(baseName).toLowerCase();
  const normalizedSessionName = normalizeKalyanMarketText(sessionName).toLowerCase();

  if (!normalizedSession || normalizedSession === "OPEN" || normalizedSession === "CLOSE") {
    const sessionLabel = normalizedSession === "CLOSE" ? "Close" : "Open";

    if (!baseName || normalizedBaseName === normalizedSessionName) {
      return `${sessionName} (${sessionLabel})`;
    }

    return `${baseName} - ${sessionName} (${sessionLabel})`;
  }

  return sessionName || baseName || "-";
}
