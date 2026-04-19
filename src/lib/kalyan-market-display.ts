export function normalizeKalyanMarketText(value?: string | null) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getKalyanMarketBaseName(market: any) {
  return normalizeKalyanMarketText(
    market?.name ??
      market?.marketName ??
      market?.title ??
      market?.gameName,
  );
}

export function getKalyanMarketSessionName(
  market: any,
  sessionType?: "OPEN" | "CLOSE" | string | null,
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

export function getKalyanMarketOptionLabel(market: any) {
  return getKalyanMarketBaseName(market) || "-";
}

export function getKalyanMarketSessionOptionLabel(market: any) {
  const baseName = getKalyanMarketBaseName(market) || "-";
  const sessionType = String(market?.sessionType ?? market?.timings?.[0]?.sessionType ?? "").toUpperCase();
  if (sessionType === "CLOSE") return `${baseName} — Close`;
  if (sessionType === "OPEN") return `${baseName} — Open`;
  return baseName;
}

export function getKalyanMarketSessionLabel(
  market: any,
  sessionType?: "OPEN" | "CLOSE" | string | null,
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
