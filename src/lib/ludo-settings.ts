type SettingLike = {
  key?: string | null;
  value?: string | null;
};

export const DEFAULT_LUDO_STAKES = [250, 500, 1000, 2000];

export const DEFAULT_LUDO_DISABLED_MESSAGE =
  "Ludo is currently unavailable. Please try again later.";

export const DEFAULT_LUDO_FREE_STAKE = 0;

export function getSettingValue(
  settings: SettingLike[] | undefined,
  key: string,
) {
  return settings?.find((setting) => setting.key === key)?.value ?? "";
}

export function parseStakeList(value?: string | null) {
  const parsed = String(value ?? "")
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  return Array.from(new Set(parsed)).sort((a, b) => a - b);
}

export function getLudoConfig(settings: SettingLike[] | undefined) {
  const enabled = getSettingValue(settings, "global_ludo") !== "false";
  const freeMode = getSettingValue(settings, "ludo_free_mode") === "true";
  const message =
    getSettingValue(settings, "global_ludo_message") ||
    DEFAULT_LUDO_DISABLED_MESSAGE;
  const stakes =
    parseStakeList(getSettingValue(settings, "ludo_stake_options")) ||
    DEFAULT_LUDO_STAKES;

  const bannerImage = getSettingValue(settings, "ludo_banner_image") || "";
  const bannerTitle =
    getSettingValue(settings, "ludo_banner_title") ||
    "Ludo Bet — Coming Soon";
  const bannerMessage =
    getSettingValue(settings, "ludo_banner_message") ||
    "We are preparing something amazing. Ludo Bet will be available very soon. Stay tuned!";

  return {
    enabled,
    freeMode,
    freeStake: DEFAULT_LUDO_FREE_STAKE,
    message,
    stakes: stakes.length > 0 ? stakes : DEFAULT_LUDO_STAKES,
    bannerImage,
    bannerTitle,
    bannerMessage,
  };
}
