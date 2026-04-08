export interface ExternalThaiLotteryResult {
  id: string;
  drawDate: string;
  drawLabel: string;
  firstPrize: string;
  firstThreeDigits: string[];
  lastThreeDigits: string[];
  lastTwoDigits: string;
  sourceLabel: string;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function toIsoDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
}

function getSection(text: string, startPattern: RegExp, endPattern?: RegExp) {
  const startMatch = text.match(startPattern);
  if (!startMatch || startMatch.index === undefined) {
    return "";
  }

  const sliced = text.slice(startMatch.index);

  if (!endPattern) {
    return sliced;
  }

  const endMatch = sliced.match(endPattern);
  if (!endMatch || endMatch.index === undefined) {
    return sliced;
  }

  return sliced.slice(0, endMatch.index);
}

function extractRecentBlocks(text: string) {
  return (
    text.match(
      /Government lottery results \d{2} [A-Za-z]+ \d{4}[\s\S]*?(?=Government lottery results \d{2} [A-Za-z]+ \d{4}|Copyright|$)/gi,
    ) ?? []
  );
}

function extractDigits(line: string, length: number) {
  return (line.match(new RegExp(`\\b\\d{${length}}\\b`, "g")) ?? []).map((item) =>
    item.trim(),
  );
}

function parseBlock(block: string) {
  const dateMatch = block.match(/Government lottery results (\d{2} [A-Za-z]+ \d{4})/i);
  if (!dateMatch) {
    return null;
  }

  const firstPrize = block.match(/1st prize\s+(\d{6})/i)?.[1] ?? "";
  const firstThreeDigits = extractDigits(
    block.match(/first 3 digits\s+([0-9\s]+)/i)?.[1] ?? "",
    3,
  );
  const lastThreeDigits = extractDigits(
    block.match(/last 3 digits\s+([0-9\s]+)/i)?.[1] ?? "",
    3,
  );
  const lastTwoDigits = block.match(/last 2 digits\s+(\d{2})/i)?.[1] ?? "";

  if (!firstPrize) {
    return null;
  }

  const drawLabel = normalizeWhitespace(dateMatch[1]);

  return {
    id: drawLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    drawDate: toIsoDate(drawLabel),
    drawLabel,
    firstPrize,
    firstThreeDigits,
    lastThreeDigits,
    lastTwoDigits,
    sourceLabel: "Thaiger Thai Lottery",
  } satisfies ExternalThaiLotteryResult;
}

export function parseThaigerThaiLottery(html: string) {
  const flattened = normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );

  const heroSection = getSection(
    flattened,
    /Government Lottery Results\s+\d{2} [A-Za-z]+ \d{4}/i,
    /Check lottery results/i,
  );

  const heroDate =
    heroSection.match(/Government Lottery Results\s+(\d{2} [A-Za-z]+ \d{4})/i)?.[1] ??
    "";
  const heroFirstPrize = heroSection.match(/1st prize\s+(\d{6})/i)?.[1] ?? "";
  const heroFirstThreeDigits = extractDigits(
    heroSection.match(/first 3 digits\s+([0-9\s]+)/i)?.[1] ?? "",
    3,
  );
  const heroLastThreeDigits = extractDigits(
    heroSection.match(/last 3 digits\s+([0-9\s]+)/i)?.[1] ?? "",
    3,
  );
  const heroLastTwoDigits =
    heroSection.match(/last 2 digits\s+(\d{2})/i)?.[1] ?? "";

  const recentSection = getSection(
    flattened,
    /Government lottery results \d{2} [A-Za-z]+ \d{4}/i,
  );
  const recentResults = extractRecentBlocks(recentSection)
    .map(parseBlock)
    .filter((item): item is ExternalThaiLotteryResult => Boolean(item));

  const combined = [
    ...(heroFirstPrize && heroDate
      ? [
          {
            id: heroDate.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            drawDate: toIsoDate(heroDate),
            drawLabel: normalizeWhitespace(heroDate),
            firstPrize: heroFirstPrize,
            firstThreeDigits: heroFirstThreeDigits,
            lastThreeDigits: heroLastThreeDigits,
            lastTwoDigits: heroLastTwoDigits,
            sourceLabel: "Thaiger Thai Lottery",
          } satisfies ExternalThaiLotteryResult,
        ]
      : []),
    ...recentResults,
  ];

  const deduped = new Map<string, ExternalThaiLotteryResult>();
  for (const item of combined) {
    if (!deduped.has(item.id)) {
      deduped.set(item.id, item);
    }
  }

  return [...deduped.values()];
}
