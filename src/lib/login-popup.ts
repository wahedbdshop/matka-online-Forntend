"use client";

const LOGIN_POPUP_PENDING_KEY = "login_popup_pending";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function markLoginPopupPending() {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(LOGIN_POPUP_PENDING_KEY, "1");
}

export function hasPendingLoginPopup() {
  if (!canUseSessionStorage()) return false;
  return sessionStorage.getItem(LOGIN_POPUP_PENDING_KEY) === "1";
}

export function consumePendingLoginPopup() {
  if (!canUseSessionStorage()) return false;

  const isPending = sessionStorage.getItem(LOGIN_POPUP_PENDING_KEY) === "1";
  if (isPending) {
    sessionStorage.removeItem(LOGIN_POPUP_PENDING_KEY);
  }

  return isPending;
}

export function clearPendingLoginPopup() {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(LOGIN_POPUP_PENDING_KEY);
}
