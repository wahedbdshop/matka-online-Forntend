"use client";

const APP_DOWNLOAD_PROMPT_PENDING_KEY = "app_download_prompt_pending";
const APP_DOWNLOAD_PROMPT_DISMISSED_KEY = "app_download_prompt_dismissed";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function markAppDownloadPromptPending() {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(APP_DOWNLOAD_PROMPT_DISMISSED_KEY);
  sessionStorage.setItem(APP_DOWNLOAD_PROMPT_PENDING_KEY, "1");
}

export function consumeAppDownloadPromptPending() {
  if (!canUseSessionStorage()) return false;

  const isPending =
    sessionStorage.getItem(APP_DOWNLOAD_PROMPT_PENDING_KEY) === "1";
  if (isPending) {
    sessionStorage.removeItem(APP_DOWNLOAD_PROMPT_PENDING_KEY);
  }

  return isPending;
}

export function hasDismissedAppDownloadPrompt() {
  if (!canUseSessionStorage()) return true;
  return sessionStorage.getItem(APP_DOWNLOAD_PROMPT_DISMISSED_KEY) === "1";
}

export function dismissAppDownloadPrompt() {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(APP_DOWNLOAD_PROMPT_DISMISSED_KEY, "1");
}
