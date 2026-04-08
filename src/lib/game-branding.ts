export const GAME_LOGO_SRC = {
  thai: "/thai.png",
  pcso: "/pcso.png",
  ludo: "/ludo.svg",
  kalyan: "/kalyan.png",
} as const;

const normalizeGameText = (value?: string | null) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const getGameLogoSrc = (value?: string | null) => {
  const normalized = normalizeGameText(value);

  if (normalized.includes("thai")) return GAME_LOGO_SRC.thai;
  if (normalized.includes("pcso")) return GAME_LOGO_SRC.pcso;
  if (normalized.includes("ludo")) return GAME_LOGO_SRC.ludo;
  return null;
};
