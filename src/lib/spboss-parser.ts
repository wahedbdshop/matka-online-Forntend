import { KalyanGroupedResult } from "@/types/kalyan";

const NOISE_PATTERNS = [
  /^join on whatsapp$/i,
  /^matka play app$/i,
  /^refresh$/i,
  /^jodi$/i,
  /^panel$/i,
  /^jodi panel$/i,
  /^add your game$/i,
  /^go to top$/i,
  /^advertisement$/i,
  /^home$/i,
  /^guessing forum$/i,
  /^privacy/i,
  /^term/i,
  /^satta market$/i,
  /^welcome to /i,
  /^instant satta matka results/i,
  /^live update$/i,
  /^aaj ka lucky number$/i,
  /^\(.*\)$/,
];

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeText(html: string) {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|li|tr|h1|h2|h3|h4|h5|h6)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function isNoiseLine(value: string) {
  return (
    value.length < 2 ||
    NOISE_PATTERNS.some((pattern) => pattern.test(value)) ||
    /^(copying|viewing this website|powered by|©)/i.test(value)
  );
}

function isLikelyTitle(value: string) {
  if (isNoiseLine(value)) return false;
  if (/\d/.test(value)) return false;
  if (value.length > 48) return false;

  return /^[a-z[\]/&\-\s]+$/i.test(value);
}

function isLikelyTimeRange(value: string) {
  return /\d{1,2}:\d{2}\s*(AM|PM).*\d{1,2}:\d{2}\s*(AM|PM)/i.test(value);
}

function toGameKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseResultValue(raw: string) {
  const compact = raw.replace(/\s+/g, "");

  const fullMatch = compact.match(/^(\d{3})-(\d{2})-(\d{3})$/);
  if (fullMatch) {
    return {
      openPatti: fullMatch[1],
      openTotal: fullMatch[2][0],
      closePatti: fullMatch[3],
      closeTotal: fullMatch[2][1],
      finalResult: fullMatch[2],
      finalDisplay: compact,
    };
  }

  const partialMatch = compact.match(/^(\d{3})-(\d)$/);
  if (partialMatch) {
    return {
      openPatti: partialMatch[1],
      openTotal: partialMatch[2],
      closePatti: null,
      closeTotal: null,
      finalResult: `${partialMatch[2]}X`,
      finalDisplay: compact,
    };
  }

  return null;
}

function dedupeResults(items: KalyanGroupedResult[]) {
  const map = new Map<string, KalyanGroupedResult>();

  for (const item of items) {
    const key = `${item.resultDate}::${item.gameKey}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return [...map.values()];
}

export function parseSpbossHomepage(html: string) {
  const normalized = normalizeText(html);
  const lines = normalized
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const dateMatch =
    normalized.match(/\((\d{2}-\d{2}-\d{4})\)/) ??
    normalized.match(/(\d{2}\/\d{2}\/\d{4})/);

  let resultDate = new Date().toISOString().slice(0, 10);
  if (dateMatch?.[1]) {
    const normalizedDate = dateMatch[1].replace(/\//g, "-");
    const [day, month, year] = normalizedDate.split("-");
    if (day && month && year) {
      resultDate = `${year}-${month}-${day}`;
    }
  }

  const results: KalyanGroupedResult[] = [];

  for (let index = 0; index < lines.length - 2; index += 1) {
    const title = lines[index];
    const resultValue = lines[index + 1];
    const timeValue = lines[index + 2];

    if (!isLikelyTitle(title) || !isLikelyTimeRange(timeValue)) {
      continue;
    }

    const parsedResult = parseResultValue(resultValue);
    if (!parsedResult) {
      continue;
    }

    results.push({
      gameKey: toGameKey(title),
      title,
      resultDate,
      openPatti: parsedResult.openPatti,
      openTotal: parsedResult.openTotal,
      closePatti: parsedResult.closePatti,
      closeTotal: parsedResult.closeTotal,
      finalResult: parsedResult.finalResult,
      finalDisplay: parsedResult.finalDisplay,
      status: "PUBLISHED",
    });
  }

  return {
    resultDate,
    results: dedupeResults(results),
  };
}
